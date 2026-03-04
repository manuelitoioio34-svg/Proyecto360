import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import type { Flags } from "lighthouse";
import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Carga .env con ruta absoluta relativa a ESTE archivo (microPagespeed/src/ → ../  → microPagespeed/).
// dotenv.config() sin argumentos usa el CWD del proceso, que puede ser la raíz del proyecto,
// y no encontraría microPagespeed/.env. Con ruta explícita funciona desde cualquier CWD.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

/**
 * I18N: utilidades de traducción (fallback)
 */
import { tTitle, tRich, tSavings } from "./lib/lh-i18n-es.js";

// Cache simple en memoria (1h) por url+strategy+categories
const CACHE_TTL_MS = 60 * 60 * 1000;

// PSI config — leído una vez raíz, ya con .env cargado
const PSI_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 55_000; // PSI puede tardar hasta 45s en sites complejos

/** Lee la API key siempre en tiempo de ejecución (nunca al cargar el módulo). */
function getPsiKey(): string { return process.env.PSI_API_KEY || ""; }
const cache = new Map<string, { time: number; data: any }>();

// In-flight deduplication: evita múltiples Lighthouse simultáneos para la misma clave.
// Si ya hay un run en progreso, los demás requests esperan el mismo Promise.
const inFlight = new Map<string, Promise<any>>();

// Quita parámetros de tracking que a veces disparan WAF/reglas
function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
      // 👇 muy comunes en MSN/News
      "ocid",
      "cvid",
      "ei",
    ].forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

// ---------- Helpers de extracción ----------
function extractMetricsFromLHR(lhr: any) {
  const audits = lhr?.audits || {};
  return {
    fcp: audits["first-contentful-paint"]?.numericValue ?? null,
    lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    tbt: audits["total-blocking-time"]?.numericValue ?? null,
    si: audits["speed-index"]?.numericValue ?? null,
    ttfb: audits["server-response-time"]?.numericValue ?? null,
  };
}

function extractCategoryScores(lhr: any) {
  const cats = lhr?.categories || {};
  const out: Record<string, number> = {};
  (["performance", "accessibility", "best-practices", "seo"] as const).forEach(
    (k) => {
      const s = cats?.[k]?.score;
      if (typeof s === "number" && !Number.isNaN(s)) {
        out[k] = Math.round(s * 100);
      }
    }
  );
  return out;
}

/** 🔵 Localiza el LHR IN-PLACE (ES). */
function localizeLhrInPlace(lhr: any) {
  try {
    const audits = lhr?.audits || {};
    for (const id of Object.keys(audits)) {
      const a = audits[id] || {};
      if (typeof a.title === "string") a.title = tTitle(a.title);
      if (typeof a.description === "string") a.description = tRich(a.description);
      if (typeof a.displayValue === "string") a.displayValue = tSavings(a.displayValue);
    }
    (lhr as any).__i18n = "es";
  } catch {
    // no romper por i18n
  }
}

/** 🔵 Plan de acción simple (opportunities + algunos diagnostics) ya en ES */
function buildPlanChecklistEs(lhr: any) {
  const audits = lhr?.audits || {};
  const list: Array<{ title: string; recommendation: string; savings: string }> = [];

  for (const id of Object.keys(audits)) {
    const a = audits[id] || {};
    const d = a.details || {};
    const isOpp = d?.type === "opportunity";
    const hasSavings =
      typeof d?.overallSavingsMs === "number" ||
      typeof d?.overallSavingsBytes === "number" ||
      /savings/i.test(String(a.displayValue || ""));

    if (isOpp || hasSavings) {
      let savings = "";
      if (typeof d?.overallSavingsMs === "number" && d.overallSavingsMs > 0) {
        const ms = d.overallSavingsMs;
        savings = ms >= 100 ? `${Math.round((ms / 1000) * 10) / 10}s` : `${Math.round(ms)}ms`;
      } else if (typeof d?.overallSavingsBytes === "number" && d.overallSavingsBytes > 0) {
        const kb = d.overallSavingsBytes / 1024;
        savings = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
      } else if (typeof a.displayValue === "string") {
        savings = tSavings(a.displayValue);
      }

      list.push({
        title: tTitle(a.title || id),
        recommendation: tRich(a.description || ""),
        savings,
      });
    }
  }

  const score = (x: (typeof list)[number]) => {
    const m = x.savings.match(/([\d.]+)\s*s/);
    const ms = x.savings.match(/([\d.]+)\s*ms/);
    const kb = x.savings.match(/([\d.]+)\s*KB/i);
    const mb = x.savings.match(/([\d.]+)\s*MB/i);
    if (m) return parseFloat(m[1]) * 10000;
    if (mb) return parseFloat(mb[1]) * 1000;
    if (kb) return parseFloat(kb[1]) * 10;
    if (ms) return parseFloat(ms[1]);
    return 0;
  };
  list.sort((b, a) => score(a) - score(b));

  const md = list
    .map(
      (x) =>
        `- [ ] ${x.recommendation || x.title}${x.savings ? ` (ahorro: ${x.savings})` : ""}`
    )
    .join("\n");

  return { items: list, markdown: md };
}

// ---------- Tipos/entrada ----------
export type RunPageSpeedArgs = {
  url: string;
  strategy?: "mobile" | "desktop" | (string & {});
  categories?: string[]; // ["performance","accessibility","best-practices","seo"]
  key?: string;
};

// ---------- Entrada pública ----------
export async function runPageSpeed({
  url,
  strategy = "mobile",
  categories = ["performance", "accessibility", "best-practices", "seo"],
  // key param se conserva en la firma para compatibilidad pero ya no se usa
  key: _key,
}: RunPageSpeedArgs): Promise<any> {
  // 1) Normaliza URL y clave de caché
  const cleanUrl = sanitizeUrl(url);
  const catsKey = (categories || []).slice().sort().join("|");
  const cacheKey = `${cleanUrl}::${strategy}::${catsKey}`;

  // Invalida SOLO si Lighthouse crasheó completamente (ninguna categoría capturada).
  // Un sitio con performance=0 pero accessibility/seo válidos es un resultado legítimo
  // y NO debe invalidarse — hacerlo provoca un loop infinito de re-análisis.
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) {
    const scores = hit.data?.categoryScores ?? {};
    const requestedCats = categories || [];
    const hasAnyCaptured = requestedCats.some(
      (c) => typeof scores[c] === "number" && scores[c] > 0
    );
    const isLighthouseCrash = !hit.data?.meta?.lighthouseVersion && !hasAnyCaptured;
    if (!isLighthouseCrash) {
      console.log("[micro] cache hit → source=local ms=%d", hit.data?.meta?.duration_ms ?? -1);
      return hit.data;
    }
    console.warn("[micro] cache invalided → Lighthouse crasheó (sin categorías capturadas)");
    cache.delete(cacheKey);
  }

  // 2) Deduplicación de concurrencia: si ya hay un run en curso para esta clave,
  //    reusar el mismo Promise en lugar de lanzar un Chrome adicional.
  const existing = inFlight.get(cacheKey);
  if (existing) {
    console.log(`[micro] in-flight hit → esperando run activo para ${cleanUrl}`);
    return existing;
  }

  // 3) Intentar PSI primero (rápido, 5-15s), caer a Lighthouse local si falla.
  const psiKey = getPsiKey();
  const runPromise = (async () => {
    if (psiKey) {
      try {
        console.log(`[micro] PSI API → url: ${cleanUrl} strategy: ${strategy} (key: ...${psiKey.slice(-6)})`);
        const payload = await runPsiApi({ url: cleanUrl, strategy, categories, apiKey: psiKey });
        cache.set(cacheKey, { time: Date.now(), data: payload });
        console.log("[micro] source=psi ms=%d", payload?.meta?.duration_ms ?? -1);
        return payload;
      } catch (psiErr: any) {
        // Log detallado para diagnóstico: status HTTP + mensaje de la API de PSI
        const httpStatus = psiErr?.response?.status;
        const psiApiMsg  = psiErr?.response?.data?.error?.message || psiErr?.response?.data?.error || '';
        const errCode    = psiErr?.code || psiErr?.errno || '';
        console.warn(
          `[micro] PSI falló → status=${httpStatus ?? 'N/A'} code=${errCode || 'N/A'} msg="${psiApiMsg || psiErr?.message || psiErr}" → ${
            httpStatus && httpStatus < 500 ? 'error permanente, NO fallback' : 'fallback a Lighthouse local'
          }`
        );
        // 4xx = error permanente (URL inaccesible, API key inválida, quota) → Lighthouse tampoco ayudará
        // 5xx / sin respuesta / timeout → sí vale la pena intentar Lighthouse
        if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
          throw psiErr; // propagar error al caller (tarjeta mostrará score 0)
        }
        // Para timeouts y 5xx: continuar con fallback
      }
    } else {
      console.warn("[micro] PSI_API_KEY no configurada, usando Lighthouse local");
    }
    // Fallback: Lighthouse local
    console.log(`[micro] Lighthouse local → url: ${cleanUrl} strategy: ${strategy}`);
    const payload = await runLocalLighthouse({ url: cleanUrl, strategy, categories });
    cache.set(cacheKey, { time: Date.now(), data: payload });
    console.log("[micro] source=local ms=%d", payload?.meta?.duration_ms ?? -1);
    return payload;
  })().finally(() => {
    inFlight.delete(cacheKey);
  });

  inFlight.set(cacheKey, runPromise);
  return runPromise;
}

// ---------- Google PageSpeed Insights API ----------
async function runPsiApi({
  url,
  strategy = "mobile",
  categories = ["performance", "accessibility", "best-practices", "seo"],
  apiKey,
}: {
  url: string;
  strategy?: string;
  categories?: string[];
  apiKey: string;
}): Promise<any> {
  const params = new URLSearchParams({
    url,
    strategy: strategy === "mobile" ? "mobile" : "desktop",
    key: apiKey,
    locale: "es",
  });
  (categories || []).forEach((c) => params.append("category", c));

  const t0 = Date.now();
  const resp = await axios.get(`${PSI_BASE}?${params.toString()}`, {
    timeout: PSI_TIMEOUT_MS,
    headers: { "Accept-Encoding": "gzip" },
  });
  const durationMs = Date.now() - t0;

  const lhr = resp.data?.lighthouseResult;
  if (!lhr) throw new Error("PSI no devolvio lighthouseResult");

  // Localizar en ES si hay audits
  localizeLhrInPlace(lhr);

  const metrics = extractMetricsFromLHR(lhr);
  const categoryScores = extractCategoryScores(lhr);
  const plan = buildPlanChecklistEs(lhr);

  console.log("[psi] categories:", Object.entries(categoryScores).map(([k, v]) => `${k}=${v}`).join(", "));

  return {
    url: lhr?.finalUrl || url,
    strategy,
    fetchedAt: lhr?.fetchTime ?? new Date().toISOString(),
    performance: categoryScores.performance ?? 0,
    categoryScores,
    metrics,
    plan_es: plan,
    meta: {
      finalUrl: lhr?.finalUrl,
      lighthouseVersion: lhr?.lighthouseVersion,
      userAgent: lhr?.userAgent,
      duration_ms: durationMs,
      source: "psi",
      i18n: "es",
    },
    raw: lhr,
  };
}

// ---------- Chrome persistente ----------
// Mantener una sola instancia de Chrome viva entre requests ahorra ~3-5s de arranque
// por análisis. Si Chrome cae, se relanza automáticamente antes del siguiente run.

const CHROME_FLAGS = [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-extensions",
  "--no-first-run",
  "--disable-background-networking",
  "--disable-default-apps",
  "--mute-audio",
];

let persistentChrome: { instance: Awaited<ReturnType<typeof chromeLauncher.launch>>; port: number } | null = null;

async function getOrLaunchChrome(): Promise<{ instance: any; port: number }> {
  // Verificar si Chrome sigue respondiendo (ping al endpoint /json/version)
  if (persistentChrome) {
    try {
      const http = await import("http");
      await new Promise<void>((resolve, reject) => {
        const req = http.default.get(`http://127.0.0.1:${persistentChrome!.port}/json/version`, (res) => {
          res.resume();
          res.statusCode === 200 ? resolve() : reject(new Error(`status ${res.statusCode}`));
        });
        req.setTimeout(2000, () => { req.destroy(); reject(new Error("ping timeout")); });
        req.on("error", reject);
      });
      return persistentChrome;
    } catch {
      console.warn("[chrome] instancia persistente no responde, relanzando...");
      try { await persistentChrome.instance.kill(); } catch { /* ignorar */ }
      persistentChrome = null;
    }
  }

  console.log("[chrome] lanzando nueva instancia persistente...");
  const instance = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS });
  persistentChrome = { instance, port: instance.port };
  console.log(`[chrome] listo en puerto ${instance.port}`);
  return persistentChrome;
}

// Cierre limpio al apagar el proceso
process.once("SIGINT",  () => { try { persistentChrome?.instance.kill(); } catch { /* ignorar */ } process.exit(0); });
process.once("SIGTERM", () => { try { persistentChrome?.instance.kill(); } catch { /* ignorar */ } process.exit(0); });

// ---------- Lighthouse local ----------
async function runLocalLighthouse({
  url,
  strategy = "mobile",
  categories = ["performance", "accessibility", "best-practices", "seo"], // ✅ FULL por defecto
}: {
  url: string;
  strategy?: "mobile" | "desktop" | (string & {});
  categories?: string[];
}): Promise<any> {
  const chrome = await getOrLaunchChrome();
  try {
    const opts: Flags = {
      port: chrome.port,
      logLevel: "error",
      output: "json",
      // 👇 Localización para Lighthouse local
      locale: "es",
    } as any;

    const config = {
      extends: "lighthouse:default",
      settings: {
        onlyCategories: categories,
        formFactor: strategy === "mobile" ? "mobile" : "desktop",
        screenEmulation:
          strategy === "mobile"
            ? {
                mobile: true,
                width: 360,
                height: 640,
                deviceScaleFactor: 2,
                disabled: false,
              }
            : {
                mobile: false,
                width: 1350,
                height: 940,
                deviceScaleFactor: 1,
                disabled: false,
              },
        // Throttling: valores oficiales de Google PSI para resultados comparables.
        // - "simulate" es seguro en LH 12.x ("provided" rompe las performance marks).
        // - Ambas estrategias usan los mismos parámetros PSI Mobile para resultados
        //   consistentes y comparables entre móvil y escritorio.
        throttlingMethod: "simulate",
        throttling: {
          // PSI Mobile — Moto G4 standard (aplicado a ambas estrategias)
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.56,
          uploadThroughputKbps: 675,
        },
        // Límites de espera: evita que Lighthouse cuelgue indefinidamente
        // en páginas muy lentas, bloqueadas por WAF o que requieren auth.
        maxWaitForLoad: 35000,  // 35s máx para que la página se considere cargada
        maxWaitForFcp: 15000,   // 15s máx esperando el primer contenido visible
      },
    };

    const t0 = Date.now();
    const rr: any = await lighthouse(url, opts, (config as any));
    const durationMs = Date.now() - t0;

    const lhr = rr?.lhr;

    // 🔵 Localizamos el LHR local (fallback)
    localizeLhrInPlace(lhr);

    const metrics = extractMetricsFromLHR(lhr);
    const categoryScores = extractCategoryScores(lhr);
    const perfScore =
      typeof lhr?.categories?.performance?.score === "number"
        ? Math.round(lhr.categories.performance.score * 100)
        : 0;

    const plan = buildPlanChecklistEs(lhr);

    // Log categories actually returned (helps debug missing scores)
    console.log("[micro] LHR categories:", Object.entries(lhr?.categories || {}).map(([k, v]: [string, any]) => `${k}=${Math.round((v?.score ?? 0) * 100)}`).join(", "));

    return {
      url: lhr?.finalUrl || url,
      strategy,
      fetchedAt: lhr?.fetchTime ?? new Date().toISOString(),
      performance: categoryScores.performance ?? perfScore,
      categoryScores,
      metrics,
      plan_es: plan,
      meta: {
        finalUrl: lhr?.finalUrl,
        lighthouseVersion: lhr?.lighthouseVersion,
        userAgent: lhr?.userAgent,
        configSettings: lhr?.configSettings,
        duration_ms: durationMs,
        source: "local",
        i18n: "es",
      },
      raw: lhr,
    };
  } catch (lhErr: any) {
    // Si Lighthouse crasheó, marcar la instancia de Chrome como no confiable
    // para que el próximo request la relance limpiamente.
    console.error("[chrome] Lighthouse error, descartando instancia persistente:", lhErr?.message);
    try { await persistentChrome?.instance.kill(); } catch { /* ignorar EPERM */ }
    persistentChrome = null;
    throw lhErr;
  }
  // No matamos Chrome — la instancia persistente queda viva para el siguiente análisis.
}

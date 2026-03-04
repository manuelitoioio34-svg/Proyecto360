// server/controllers/diagnostic.controller.ts
import type { Request, Response } from "express";
import Audit from "../database/esquemaBD.js";
import { DiagnosticRun } from "../database/diagnosticRun.js";
import {
  readMetrics,
  extractOpportunities,
  // packMetrics,
  THRESHOLDS,
} from "../utils/lh.js";
import { runAxeAudit } from "../utils/apiClients/axeClient.js";
import { runUptimeCheck } from "../utils/apiClients/uptimeClient.js";
import { runStackAnalysis } from "../utils/apiClients/wappalyzerClient.js";
import { runPortabilityCheck } from "../utils/apiClients/portabilityClient.js";
import { emitTelemetry, hashUrl } from "../utils/telemetry.js";
import {
  MS_PAGESPEED_URL, MS_SECURITY_URL,
  PAGESPEED_TIMEOUT_MS, SECURITY_TIMEOUT_MS,
  ALL_CATEGORIES, withAudit,
  runPagespeedViaMicro, runSecurityMicro,
  resolvePerformanceFromPagespeed,
} from "../utils/microClients.js";
import { getScoreColor, getScoreLabel, generateRecommendations } from "../utils/scoreHelpers.js";

// ===== Cache en memoria para Dashboard (TTL configurable) =====
type DashCacheEntry = { diagnostics: any; overallScore: number; timestamp: number; url: string };
const DASHBOARD_CACHE_TTL_MS = Number.parseInt(process.env.DASHBOARD_CACHE_TTL_MS || "3600000", 10);
const DASHBOARD_CACHE: Map<string, DashCacheEntry> = (global as any).__DASHBOARD_CACHE__ || new Map();
(global as any).__DASHBOARD_CACHE__ = DASHBOARD_CACHE;

// ===== Deduplicación de guardado de DiagnosticRun =====
// Evita doble guardado causado por React StrictMode (double-invoke en dev) o
// llamadas concurrentes. TTL: 10 segundos por URL.
const RUN_DEDUP_MAP: Map<string, number> = (global as any).__RUN_DEDUP_MAP__ || new Map();
(global as any).__RUN_DEDUP_MAP__ = RUN_DEDUP_MAP;
const RUN_DEDUP_TTL_MS = 10_000;
function canSaveRun(url: string): boolean {
  const key = normalizeUrlKey(url);
  const last = RUN_DEDUP_MAP.get(key);
  if (last && Date.now() - last < RUN_DEDUP_TTL_MS) return false;
  RUN_DEDUP_MAP.set(key, Date.now());
  return true;
}

// ===== Cache en memoria para Full Check (TTL 1h) =====
const ONE_HOUR = 1000 * 60 * 60;
type FullCheckCacheEntry = { data: any; timestamp: number; typesKey: string };
const FULLCHECK_CACHE: Map<string, FullCheckCacheEntry> = (global as any).__FULLCHECK_CACHE__ || new Map();
(global as any).__FULLCHECK_CACHE__ = FULLCHECK_CACHE;

function normalizeUrlKey(u: string) {
  try {
    const parsed = new URL(u);
    parsed.hash = '';
    let s = parsed.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return u.trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
  }
}

// ---------------- Types mínimos para no romper contratos ----------------
type Opportunity = {
  id: string;
  title: string;
  savingsLabel?: string | null;
  impactScore?: number;
  recommendation?: string | null;
};

type CurrMetrics = {
  performance?: number | null;
  fcp?: number | null;
  lcp?: number | null;
  tbt?: number | null;
  si?: number | null;
  ttfb?: number | null;
};

// Fallback: genera "problemas" a partir de las métricas cuando no hay opportunities en el LHR
function buildThresholdOpps(curr: CurrMetrics): Opportunity[] {
  const opps: Opportunity[] = [];
  const ms = (s: number) => Math.max(0, Math.round(s * 1000));
  const push = (id: string, title: string, reco: string, savingMs: number | null = null) => {
    opps.push({
      id,
      title,
      savingsLabel: savingMs != null ? `${(savingMs / 1000).toFixed(1)}s` : null,
      impactScore: savingMs || 0,
      recommendation: reco,
    });
  };

  // Performance bajo
  if (typeof curr.performance === "number" && curr.performance < THRESHOLDS.performance.amber) {
    push(
      "performance",
      "Performance bajo",
      "Ataca primero LCP y TBT. Reduce JS no usado, prioriza recursos críticos (preload) y aplica lazy-load."
    );
  }

  // LCP alto
  if (curr.lcp != null && curr.lcp > THRESHOLDS.lcp.green) {
    push(
      "largest-contentful-paint",
      "LCP alto",
      "Optimiza el recurso LCP (tamaño/formato WebP/AVIF, preload) y aplica lazy-load a lo no crítico.",
      ms(curr.lcp - THRESHOLDS.lcp.green)
    );
  }

  // FCP alto
  if (curr.fcp != null && curr.fcp > THRESHOLDS.fcp.green) {
    push(
      "first-contentful-paint",
      "FCP alto",
      "Evita bloqueos de render: usa defer/async en scripts, CSS crítico inline y font-display: swap.",
      ms(curr.fcp - THRESHOLDS.fcp.green)
    );
  }

  // TBT alto (ya viene en ms)
  if (curr.tbt != null && curr.tbt > THRESHOLDS.tbt.green) {
    push(
      "total-blocking-time",
      "TBT alto",
      "Divide bundles (code-splitting), carga diferida, evita tareas largas en main thread.",
      Math.max(0, (curr.tbt ?? 0) - THRESHOLDS.tbt.green)
    );
  }

  // Speed Index alto
  if (curr.si != null && curr.si > THRESHOLDS.si.green) {
    push(
      "speed-index",
      "Speed Index alto",
      "Mejora pintura temprana: CSS crítico, prioriza contenido above-the-fold y reduce imágenes iniciales.",
      ms(curr.si - THRESHOLDS.si.green)
    );
  }

  // TTFB alto
  if (curr.ttfb != null && curr.ttfb > THRESHOLDS.ttfb.green) {
    push(
      "server-response-time",
      "TTFB alto",
      "Usa CDN/edge, cachea respuestas, optimiza consultas y mantén caliente el backend.",
      ms(curr.ttfb - THRESHOLDS.ttfb.green)
    );
  }

  // ordenar por impacto y deduplicar por id
  opps.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
  const seen = new Set<string>();
  return opps.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
}

// GET /api/diagnostics/:encodedUrl/processed
export async function getProcessedByUrl(req: Request, res: Response) {
  try {
    const url = decodeURIComponent(req.params.encodedUrl as string);

    // Trae últimos por fecha (tu esquema usa "fecha")
    const docs = await Audit.find({ url }).sort({ fecha: -1 }).limit(6).lean();
    if (!docs.length) return res.status(404).json({ error: "No hay reportes para esta URL" });

    // Compara dentro del mismo tipo si es posible (pagespeed/unlighthouse)
    const sameType = docs.filter((d: any) => d.type === docs[0].type);
    const current = sameType[0] || docs[0];
    const previous = sameType[1] || docs[1] || null;

    const currMetrics = readMetrics(current);
    const prevMetrics = previous ? readMetrics(previous) : null;

    // const metrics = packMetrics(currMetrics, prevMetrics);

    // 1) Intenta extraer desde el LHR
    let opportunities = extractOpportunities(current);

    // 2) Si viene vacío, genera fallback por umbrales
    if (!opportunities || opportunities.length === 0) {
      // opportunities = buildThresholdOpps(currMetrics);
    }

    res.json({
      url,
      currentDate: current.fecha || null,
      previousDate: previous?.fecha || null,
      // metrics,
      opportunities,
    });
  } catch (e) {
    console.error("getProcessedByUrl error:", e);
    res.status(500).json({ error: "Error procesando reporte" });
  }
}

// POST /api/diagnostics/full-check
export async function fullCheck(req: Request, res: Response) {
  try {
    const url = String(req.body?.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "Debe enviar una URL válida (http/https)" });
    }
    const userCtx = { userId: (req as any)?.user?._id || null, role: (req as any)?.user?.role || null };
    const urlHash = (() => { try { return hashUrl(url); } catch { return null; } })();

    const wanted: Array<"usability" | "fiability" | "maintainability" | "portability"> =
      Array.isArray(req.body?.types) && req.body.types.length
        ? req.body.types.filter((t: any) => ["usability", "fiability", "maintainability", "portability"].includes(String(t)))
        : ["usability", "fiability", "maintainability", "portability"];

    // Telemetría start
    try { await emitTelemetry('diagnostic.start', { ...userCtx, urlHash, urlSample: url, tipos: wanted, kind: 'diagnostic.start' }); } catch { }

    // Cache: clave por URL normalizada + tipos solicitados
    const typesKey = (Array.isArray(req.body?.types) && req.body.types.length
      ? req.body.types.filter((t: any) => ["usability", "fiability", "maintainability", "portability"].includes(String(t)))
      : ["usability", "fiability", "maintainability", "portability"]).sort().join(',');
    const cacheKey = `${normalizeUrlKey(url)}|${typesKey}`;
    const cached = FULLCHECK_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < ONE_HOUR) {
      return res.json(cached.data);
    }

    // Construye lista de promesas según selección
    const jobs: Array<[key: "usability" | "fiability" | "maintainability" | "portability", p: Promise<any>]> = [];
    if (wanted.includes("usability")) jobs.push(["usability", runAxeAudit(url)]);
    if (wanted.includes("fiability")) jobs.push(["fiability", runUptimeCheck(url)]);
    if (wanted.includes("maintainability")) jobs.push(["maintainability", runStackAnalysis(url)]);
    if (wanted.includes("portability")) jobs.push(["portability", runPortabilityCheck(url)]);
    const settled = await Promise.allSettled(jobs.map(([, p]) => p));

    const saves: any[] = [];
    const out: any = { url, results: {} as Record<string, any> };

    const handle = async (
      key: "usability" | "fiability" | "maintainability" | "portability",
      result: PromiseSettledResult<any>
    ) => {
      if (result.status === "fulfilled") {
        const r = result.value;
        out.results[key] = r;
        // ⚠️ GUARDADO EN HISTÓRICO COMENTADO TEMPORALMENTE
        // TODO: Descomentar cuando se requiera persistencia en histórico
        /*
        saves.push(
          Audit.create({
            url,
            type: key,
            strategy: "desktop",
            metrics: r?.metrics || null,
            summary: r?.summary || null,
            recommendation: r?.recommendation || null,
            actionPlan: r?.actionPlan || null,
            raw: r?.raw || null,
            fecha: new Date(),
          })
        );
        */
      } else {
        out.results[key] = { error: result.reason?.message || String(result.reason) };
      }
    };

    for (let i = 0; i < jobs.length; i++) {
      const [key] = jobs[i];
      await handle(key, settled[i]!);
    }

    // ⚠️ GUARDADO EN HISTÓRICO COMENTADO TEMPORALMENTE
    // No bloquear la respuesta si el guardado tarda; pero aquí esperamos para confirmar
    // TODO: Descomentar cuando se requiera persistencia en histórico
    // await Promise.allSettled(saves);

    // Construir resumen general breve
    const summary = {
      accessibilityScore: out.results.usability?.metrics?.score ?? null,
      uptimeMs: out.results.fiability?.metrics?.avgResponseTime ?? null,
      stackItems: out.results.maintainability?.metrics?.stackItems ?? null,
      compatibleBrowsers: out.results.portability?.metrics?.compatibleBrowsers ?? [],
    };

    const responsePayload = { url, summary, ...out };
    FULLCHECK_CACHE.set(cacheKey, { data: responsePayload, timestamp: Date.now(), typesKey });
    // Telemetría end (una sola entrada con tipos seleccionados)
    try { await emitTelemetry('diagnostic.end', { ...userCtx, urlHash, urlSample: url, tipos: wanted, kind: 'diagnostic.end' }); } catch { }
    res.json(responsePayload);
  } catch (e) {
    console.error("fullCheck error:", e);
    res.status(500).json({ error: "Error ejecutando diagnóstico integral" });
  }
}

// POST /api/diagnostics/dashboard
// Ejecuta TODAS las 6 APIs (performance + security + 4 calidad web) para dashboard general
export async function dashboardCheck(req: Request, res: Response) {
  (req as any).__dashboardStartTs__ = Date.now();
  try {
    const url = String(req.body?.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "Debe enviar una URL válida (http/https)" });
    }

    const noCache = isTruthy(req.body?.nocache) || isTruthy(req.query?.nocache);
    if (!noCache) {
      const cached = getDashboardCache(url);
      if (cached) {
        // Guardar en histórico solo si no es una llamada de relleno (skipLog)
        const skipLog = isTruthy(req.body?.skipLog);
        if (!skipLog) {
          DiagnosticRun.create({
            url,
            fecha: new Date(),
            userId:    (req as any).user?._id    || null,
            userName:  (req as any).user?.name   || null,
            userEmail: (req as any).user?.email  || null,
            overallScore: cached.overallScore,
            scores: {
              performance:    (cached.diagnostics as any).performance?.score    ?? null,
              security:       (cached.diagnostics as any).security?.score       ?? null,
              accessibility:  (cached.diagnostics as any).accessibility?.score  ?? null,
              reliability:    (cached.diagnostics as any).reliability?.score    ?? null,
              maintainability:(cached.diagnostics as any).maintainability?.score ?? null,
              portability:    (cached.diagnostics as any).portability?.score    ?? null,
            },
            durationMs: Date.now() - ((req as any).__dashboardStartTs__ || Date.now()),
            fromCache: true,
          }).catch((e: any) => console.error('[Dashboard] Error guardando histórico (cache):', e?.message));
        }

        return res.json({
          url,
          overallScore: cached.overallScore,
          timestamp: new Date(cached.timestamp),
          diagnostics: cached.diagnostics,
          cache: true,
        });
      }
    }

    console.log(`[Dashboard] Iniciando análisis completo para: ${url}`);

    // Ejecutar 6 APIs en paralelo
    const [
      performanceResult,
      securityResult,
      accessibilityResult,
      reliabilityResult,
      maintainabilityResult,
      portabilityResult,
    ] = await Promise.allSettled([
      // 1. Performance - ejecutar Lighthouse en tiempo real
      (async () => {
        try {
          console.log(`[Dashboard] Ejecutando Performance (Lighthouse)...`);
          const psResult = await runPagespeedViaMicro(url, "mobile");
          console.log(`[Dashboard] Performance resultado completo:`, JSON.stringify(psResult, null, 2).substring(0, 500));

          // Intentar extraer score de múltiples ubicaciones posibles
          let performanceScore = 0;

          // Extraer Performance Score
          if (psResult?.categoryScores?.performance != null) {
            performanceScore = Math.round(psResult.categoryScores.performance);
            console.log(`[Dashboard] Performance score de categoryScores: ${performanceScore}`);
          }
          else if (psResult?.audit?.pagespeed?.categoryScores?.performance != null) {
            performanceScore = Math.round(psResult.audit.pagespeed.categoryScores.performance);
            console.log(`[Dashboard] Performance score de audit.pagespeed.categoryScores: ${performanceScore}`);
          }
          else if (psResult?.metrics?.performance != null) {
            performanceScore = Math.round(psResult.metrics.performance);
            console.log(`[Dashboard] Performance score de metrics: ${performanceScore}`);
          }
          else if (psResult?.performance != null) {
            performanceScore = Math.round(psResult.performance);
            console.log(`[Dashboard] Performance score directo: ${performanceScore}`);
          }
          else if (psResult?.raw?.lighthouseResult?.categories?.performance?.score != null) {
            performanceScore = Math.round(psResult.raw.lighthouseResult.categories.performance.score * 100);
            console.log(`[Dashboard] Performance score de raw.lighthouseResult: ${performanceScore}`);
          }

          console.log(`[Dashboard] Performance ejecutado: ${performanceScore}%`);

          return {
            score: performanceScore,
            metrics: psResult?.metrics || null,
            timestamp: new Date(),
            source: 'realtime',
          };
        } catch (error) {
          console.error(`[Dashboard] Error ejecutando Performance:`, error);
          throw error;
        }
      })(),

      // 2. Security - ejecutar análisis de seguridad en tiempo real
      (async () => {
        try {
          console.log(`[Dashboard] Ejecutando Security...`);
          const secResult = await runSecurityMicro(url);
          const score = secResult?.score ?? secResult?.metrics?.score ?? 0;
          const grade = secResult?.grade ?? secResult?.metrics?.grade ?? "F";
          console.log(`[Dashboard] Security ejecutado: ${score} (${grade})`);

          return {
            score,
            grade,
            timestamp: new Date(),
            source: 'realtime',
          };
        } catch (error) {
          console.error(`[Dashboard] Error ejecutando Security:`, error);
          throw error;
        }
      })(),

      // 3. Accessibility - ejecutar axe-core (igual que vista individual)
      (async () => {
        try {
          console.log(`[Dashboard] Ejecutando Accessibility (axe-core)...`);
          const axeResult = await runAxeAudit(url);
          console.log(`[Dashboard] Accessibility resultado completo:`, JSON.stringify(axeResult, null, 2));
          // axe-core devuelve score en formato 0-1, multiplicar por 100 para porcentaje
          const score = (axeResult?.metrics?.score ?? 0) * 100;
          const violations = axeResult?.metrics?.violations ?? 0;
          console.log(`[Dashboard] Accessibility ejecutado: ${score}% (${violations} violations)`);

          return {
            score,
            violations,
            timestamp: new Date(),
            source: 'realtime',
          };
        } catch (error) {
          console.error(`[Dashboard] Error ejecutando Accessibility:`, error);
          throw error;
        }
      })(),

      // 4. Reliability - ejecutar uptime check
      (async () => {
        try {
          console.log(`[Dashboard] Ejecutando Reliability...`);
          const result = await runUptimeCheck(url);
          const score = result.metrics?.availability ?? 0;
          console.log(`[Dashboard] Reliability ejecutado: ${score}%`);
          return {
            score,
            availability: result.metrics?.availability ?? 0,
            avgResponseTime: result.metrics?.avgResponseTime ?? 0,
            timestamp: new Date(),
          };
        } catch (error) {
          console.error(`[Dashboard] Error ejecutando Reliability:`, error);
          throw error;
        }
      })(),

      // 5. Maintainability - ejecutar wappalyzer
      (async () => {
        try {
          console.log(`[Dashboard] Ejecutando Maintainability...`);
          const result = await runStackAnalysis(url);
          const stackItems = result.metrics?.stackItems ?? 0;
          // UNIFICADO: A más tecnologías detectadas, menor el score (más complejo de mantener)
          // 0 items = 0% (no se detectó nada)
          // 1-4 items = 100% (stack muy simple)
          // 5-9 items = 80% (stack moderado)
          // 10-14 items = 60% (stack complejo)
          // 15+ items = 30% (stack muy complejo)
          const score = stackItems === 0 ? 0 :
            stackItems <= 4 ? 100 :
              stackItems <= 9 ? 80 :
                stackItems <= 14 ? 60 : 30;
          console.log(`[Dashboard] Maintainability ejecutado: ${score}% (${stackItems} items)`);
          return {
            score,
            stackItems,
            timestamp: new Date(),
          };
        } catch (error) {
          console.error(`[Dashboard] Error ejecutando Maintainability:`, error);
          throw error;
        }
      })(),

      // 6. Portability - ejecutar BCD check
      (async () => {
        try {
          console.log(`[Dashboard] Ejecutando Portability...`);
          const result = await runPortabilityCheck(url);
          const compatible = result.metrics?.compatibleBrowsers?.length ?? 0;
          const incomp = result.metrics?.incompatibilities ?? 0;
          const score = Math.round((compatible / 4) * 100);
          console.log(`[Dashboard] Portability ejecutado: ${score}% (${compatible}/4 browsers, ${incomp} incompatibilidades)`);
          console.log(`[Dashboard] Portability navegadores:`, result.metrics?.compatibleBrowsers);
          return {
            score,
            compatibleBrowsers: result.metrics?.compatibleBrowsers ?? [],
            incompatibilities: incomp,
            timestamp: new Date(),
          };
        } catch (error) {
          console.error(`[Dashboard] Error ejecutando Portability:`, error);
          throw error;
        }
      })(),
    ]);

    // Procesar resultados con logging detallado
    const diagnostics: any = {};

    // Performance
    if (performanceResult.status === "fulfilled") {
      if (performanceResult.value) {
        diagnostics.performance = {
          score: Math.round(performanceResult.value.score),
          label: getScoreLabel(performanceResult.value.score),
          color: getScoreColor(performanceResult.value.score),
          metrics: performanceResult.value.metrics,
        };
        console.log(`[Dashboard] Performance procesado: ${diagnostics.performance.score}`);
      } else {
        console.log('[Dashboard] Performance devolvió null - no hay datos disponibles');
      }
    } else {
      console.error('[Dashboard] Performance falló:', performanceResult.reason);
    }

    // Security
    if (securityResult.status === "fulfilled") {
      if (securityResult.value) {
        diagnostics.security = {
          score: Math.round(securityResult.value.score),
          label: getScoreLabel(securityResult.value.score),
          color: getScoreColor(securityResult.value.score),
          grade: securityResult.value.grade,
        };
        console.log(`[Dashboard] Security procesado: ${diagnostics.security.score}`);
      } else {
        console.log('[Dashboard] Security devolvió null - no hay datos disponibles');
      }
    } else {
      console.error('[Dashboard] Security falló:', securityResult.reason);
    }

    // Accessibility (axe-core - igual que vista individual)
    if (accessibilityResult.status === "fulfilled") {
      console.log('[Dashboard] Accessibility result status: fulfilled');
      console.log('[Dashboard] Accessibility result value:', JSON.stringify(accessibilityResult.value, null, 2));
      if (accessibilityResult.value) {
        diagnostics.accessibility = {
          score: Math.round(accessibilityResult.value.score),
          label: getScoreLabel(accessibilityResult.value.score),
          color: getScoreColor(accessibilityResult.value.score),
          violations: accessibilityResult.value.violations,
        };
        console.log(`[Dashboard] Accessibility procesado: ${diagnostics.accessibility.score}`);
      } else {
        console.log('[Dashboard] Accessibility devolvió null');
      }
    } else {
      console.error('[Dashboard] Accessibility status: rejected');
      console.error('[Dashboard] Accessibility falló:', accessibilityResult.reason);
    }

    // Reliability
    if (reliabilityResult.status === "fulfilled") {
      if (reliabilityResult.value) {
        diagnostics.reliability = {
          score: Math.round(reliabilityResult.value.score),
          label: getScoreLabel(reliabilityResult.value.score),
          color: getScoreColor(reliabilityResult.value.score),
          availability: reliabilityResult.value.availability,
          avgResponseTime: reliabilityResult.value.avgResponseTime,
        };
      } else {
        console.log('[Dashboard] Reliability devolvió null');
      }
    } else {
      console.error('[Dashboard] Reliability falló:', reliabilityResult.reason);
    }

    // Maintainability
    if (maintainabilityResult.status === "fulfilled") {
      if (maintainabilityResult.value) {
        diagnostics.maintainability = {
          score: Math.round(maintainabilityResult.value.score),
          label: getScoreLabel(maintainabilityResult.value.score),
          color: getScoreColor(maintainabilityResult.value.score),
          stackItems: maintainabilityResult.value.stackItems,
        };
      } else {
        console.log('[Dashboard] Maintainability devolvió null');
      }
    } else {
      console.error('[Dashboard] Maintainability falló:', maintainabilityResult.reason);
    }

    // Portability
    if (portabilityResult.status === "fulfilled") {
      if (portabilityResult.value) {
        diagnostics.portability = {
          score: Math.round(portabilityResult.value.score),
          label: getScoreLabel(portabilityResult.value.score),
          color: getScoreColor(portabilityResult.value.score),
          compatibleBrowsers: portabilityResult.value.compatibleBrowsers,
          incompatibilities: portabilityResult.value.incompatibilities,
        };
      } else {
        console.log('[Dashboard] Portability devolvió null');
      }
    } else {
      console.error('[Dashboard] Portability falló:', portabilityResult.reason);
    }

    // Calcular score general ponderado
    const weights = {
      performance: 0.25,
      security: 0.20,
      accessibility: 0.20,
      reliability: 0.15,
      maintainability: 0.10,
      portability: 0.10,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(diagnostics).forEach(([key, value]: [string, any]) => {
      if (value && value.score != null) {
        const weight = weights[key as keyof typeof weights] || 0;
        totalScore += value.score * weight;
        totalWeight += weight;
      }
    });

    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    setDashboardCache(url, diagnostics, overallScore);

    // Guardar en histórico general solo si no es una llamada de relleno (skipLog)
    const skipLogFresh = isTruthy(req.body?.skipLog);
    if (!skipLogFresh) {
      const startTs: number = (req as any).__dashboardStartTs__ || Date.now();
      DiagnosticRun.create({
        url,
        fecha: new Date(),
        userId:    (req as any).user?._id    || null,
        userName:  (req as any).user?.name   || null,
        userEmail: (req as any).user?.email  || null,
        overallScore,
        scores: {
          performance:    (diagnostics as any).performance?.score    ?? null,
          security:       (diagnostics as any).security?.score       ?? null,
          accessibility:  (diagnostics as any).accessibility?.score  ?? null,
          reliability:    (diagnostics as any).reliability?.score    ?? null,
          maintainability:(diagnostics as any).maintainability?.score ?? null,
          portability:    (diagnostics as any).portability?.score    ?? null,
        },
        durationMs: Date.now() - startTs,
        fromCache: false,
      }).catch((e: any) => console.error('[Dashboard] Error guardando histórico:', e?.message));
    }

    console.log(`[Dashboard] Análisis completado. Score general: ${overallScore}`);
    console.log(`[Dashboard] Detalle de scores:`, Object.entries(diagnostics).map(([k, v]: [string, any]) => `${k}: ${v?.score ?? 'N/A'}`).join(', '));
    console.log(`[Dashboard] Diagnostics completo:`, JSON.stringify(diagnostics, null, 2));

    res.json({
      url,
      overallScore,
      timestamp: new Date(),
      diagnostics,
      cache: false,
    });
  } catch (e) {
    console.error("dashboardCheck error:", e);
    res.status(500).json({ error: "Error ejecutando dashboard general" });
  }
}

// POST /api/diagnostics/dashboard-stream
// Endpoint con streaming progresivo de resultados (Server-Sent Events)
export async function dashboardCheckStream(req: Request, res: Response) {
  (req as any).__dashboardStartTs__ = Date.now();
  try {
    const url = String(req.body?.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "Debe enviar una URL válida (http/https)" });
    }

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Función helper para enviar eventos
    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Traduce errores técnicos a mensajes legibles en español
    const humanizeError = (raw: string): string => {
      if (!raw) return 'Error desconocido al analizar este ítem.';
      const r = raw.toLowerCase();
      if (r.includes('timeout') || r.includes('etimedout') || r.includes('econnreset') || r.includes('socket hang up'))
        return 'El sitio no respondió a tiempo. Puede ser lento o estar bajo alta carga.';
      if (r.includes('econnrefused'))
        return 'El sitio rechazó la conexión. Puede estar caído o bloquear el acceso externo.';
      if (r.includes('enotfound') || r.includes('getaddrinfo'))
        return 'No se encontró el dominio. Verifica que la URL sea correcta y esté en línea.';
      if (r.includes('403') || r.includes('forbidden'))
        return 'El sitio bloqueó el acceso (Error 403). Puede prohibir análisis automáticos.';
      if (r.includes('401') || r.includes('unauthorized'))
        return 'El sitio requiere autenticación (Error 401). No es posible analizar contenido protegido.';
      if (r.includes('429') || r.includes('too many requests') || r.includes('rate limit'))
        return 'Demasiadas peticiones al servidor (Error 429). Espera unos minutos y vuelve a intentarlo.';
      if (r.includes('robots') || r.includes('disallowed'))
        return 'El sitio prohíbe el acceso a robots o crawlers (robots.txt).';
      if (r.includes('ssl') || r.includes('certificate') || r.includes('cert_') || r.includes('tls'))
        return 'Error de certificado SSL/TLS. El sitio puede tener un certificado inválido o expirado.';
      if (r.includes('cors') || r.includes('cross-origin'))
        return 'El sitio bloquea peticiones externas (CORS). No se puede analizar desde este servidor.';
      if (r.includes('net::') || r.includes('network error'))
        return 'Error de red al intentar acceder al sitio.';
      return `No se pudo completar el análisis: ${raw}`;
    };

    // Genera un resumen explicativo cuando el servicio no provee uno (score < 50)
    const buildFallbackSummary = (api: string, score: number, data: any): string => {
      if (score >= 50) return '';
      switch (api) {
        case 'security': {
          const findings: any[] = data?.findings || [];
          const critical = findings.filter((f: any) => f.severity === 'critical').map((f: any) => f.title);
          if (critical.length > 0)
            return `Faltan encabezados de seguridad críticos: ${critical.slice(0, 3).join(', ')}${critical.length > 3 ? ` y ${critical.length - 3} más` : ''}.`;
          if (findings.length > 0)
            return `Se detectaron ${findings.length} problema${findings.length > 1 ? 's' : ''} de seguridad en las cabeceras HTTP del sitio.`;
          return 'El sitio no implementa las cabeceras de seguridad HTTP recomendadas.';
        }
        case 'accessibility': {
          const violations = data?.metrics?.violationsCount ?? data?.violations?.length ?? 0;
          if (violations > 0)
            return `Se encontraron ${violations} violación${violations > 1 ? 'es' : ''} de accesibilidad WCAG. El contenido puede ser inaccesible para usuarios con discapacidades.`;
          return 'El sitio presenta problemas de accesibilidad que dificultan el uso a personas con discapacidad.';
        }
        case 'reliability': {
          const availability = data?.metrics?.availability ?? 0;
          const responseTime = data?.metrics?.avgResponseTime ?? 0;
          if (availability < 90) return `Disponibilidad del ${availability}%, por debajo del mínimo aceptable (90%). El sitio presenta caídas frecuentes.`;
          if (responseTime > 3000) return `Tiempo de respuesta promedio de ${(responseTime / 1000).toFixed(1)}s, lo que indica un servidor lento.`;
          return 'El sitio presenta baja disponibilidad o tiempos de respuesta elevados.';
        }
        case 'maintainability': {
          const stackItems = data?.metrics?.stackItems ?? 0;
          if (stackItems === 0) return 'No se detectaron tecnologías en el sitio. Puede estar bloqueando el análisis o no tener código detectable.';
          if (stackItems >= 15) return `Se detectaron ${stackItems} tecnologías diferentes, lo que indica un stack muy complejo y difícil de mantener.`;
          return `Stack con ${stackItems} tecnologías detectadas, lo que implica mayor complejidad de mantenimiento.`;
        }
        case 'portability': {
          const compatible = data?.metrics?.compatibleBrowsers?.length ?? 0;
          const incomp = data?.metrics?.incompatibilities ?? 0;
          if (compatible === 0) return 'El sitio no es compatible con ninguno de los navegadores clave analizados (Chrome, Firefox, Safari, Edge).';
          if (incomp > 0) return `Se detectaron ${incomp} incompatibilidad${incomp > 1 ? 'es' : ''} CSS/JS que afectan la experiencia en algunos navegadores.`;
          return 'El sitio presenta problemas de compatibilidad en navegadores clave.';
        }
        default:
          return 'La métrica obtuvo una puntuación baja. Revisa los detalles para más información.';
      }
    };

    console.log(`[Dashboard Stream] Iniciando análisis progresivo para: ${url}`);
    sendEvent('start', { url, timestamp: new Date() });

    const noCache = isTruthy(req.body?.nocache) || isTruthy(req.query?.nocache);
    const cached = !noCache ? getDashboardCache(url) : null;
    if (cached) {
      // Reemitir resultados desde cache y finalizar
      const diagnostics = cached.diagnostics || {};
      const order = ['reliability', 'maintainability', 'portability', 'accessibility', 'security', 'performance'] as const;
      for (const api of order) {
        if ((diagnostics as any)[api]) {
          sendEvent('result', { api, data: (diagnostics as any)[api] });
        }
      }
      sendEvent('complete', { url, overallScore: cached.overallScore, timestamp: new Date(cached.timestamp), diagnostics, cache: true });
      // Guardar en histórico aunque venga del caché (dedup: evita doble guardado por StrictMode)
      if (canSaveRun(url)) {
        DiagnosticRun.create({
          url,
          fecha: new Date(),
          userId:    (req as any).user?._id    || null,
          userName:  (req as any).user?.name   || null,
          userEmail: (req as any).user?.email  || null,
          overallScore: cached.overallScore,
          scores: {
            performance:    (cached.diagnostics as any).performance?.score    ?? null,
            security:       (cached.diagnostics as any).security?.score       ?? null,
            accessibility:  (cached.diagnostics as any).accessibility?.score  ?? null,
            reliability:    (cached.diagnostics as any).reliability?.score    ?? null,
            maintainability:(cached.diagnostics as any).maintainability?.score ?? null,
            portability:    (cached.diagnostics as any).portability?.score    ?? null,
          },
          durationMs: Date.now() - ((req as any).__dashboardStartTs__ || Date.now()),
          fromCache: true,
        }).catch((e: any) => console.error('[Dashboard Stream] Error guardando histórico (cache):', e?.message));
      }
      console.log('[Dashboard Stream] ♻️ Respuesta desde caché');
      return res.end();
    }

    // Definir orden de ejecución (de más rápido a más lento estimado)
    const apiTasks = [
      {
        name: 'reliability',
        label: 'Fiabilidad',
        icon: '✅',
        estimatedTime: '~5-10s',
        execute: async () => {
          try {
            sendEvent('progress', { api: 'reliability', status: 'running', label: 'Fiabilidad' });
            const result = await runUptimeCheck(url);
            if (!result) {
              sendEvent('error', { api: 'reliability', error: 'El servicio de fiabilidad no devolvió datos. El sitio puede estar inaccesible o bloquear las peticiones de monitoreo.' });
              return null;
            }
            const responseTime = result?.metrics?.avgResponseTime ?? 0;
            const availability = result?.metrics?.availability ?? 0;
            const score = availability >= 99 ? 100 : availability >= 95 ? 75 : availability >= 90 ? 50 : 25;

            const diagnostic = {
              score,
              label: getScoreLabel(score),
              color: getScoreColor(score),
              metrics: result?.metrics,
              summary: result?.summary || buildFallbackSummary('reliability', score, result),
              recommendations: generateRecommendations('reliability', result),
            };

            sendEvent('result', { api: 'reliability', data: diagnostic });
            console.log(`[Dashboard Stream] ✅ Reliability completado: ${score}%`);
            return diagnostic;
          } catch (error) {
            console.error(`[Dashboard Stream] ❌ Reliability falló:`, error);
            sendEvent('error', { api: 'reliability', error: humanizeError((error as Error).message) });
            return null;
          }
        }
      },
      {
        name: 'maintainability',
        label: 'Mantenibilidad',
        icon: '🧩',
        estimatedTime: '~10-15s',
        execute: async () => {
          try {
            sendEvent('progress', { api: 'maintainability', status: 'running', label: 'Mantenibilidad' });
            const result = await runStackAnalysis(url);

            if (!result) {
              sendEvent('error', { api: 'maintainability', error: 'El servicio de análisis de tecnologías no devolvió datos. Es posible que el sitio bloquee el rastreo o haya un error interno.' });
              return null;
            }

            // runStackAnalysis catches errors internally and returns raw.error instead of throwing.
            if (result?.raw?.error) {
              const errMsg = typeof result.raw.error === 'string' ? result.raw.error : 'Error interno en análisis de mantenibilidad';
              console.error(`[Dashboard Stream] ❌ Maintainability falló (interno):`, errMsg);
              sendEvent('error', { api: 'maintainability', error: humanizeError(errMsg) });
              return null;
            }

            const stackItems = result?.metrics?.stackItems ?? 0;
            // UNIFICADO: A más tecnologías detectadas, menor el score (más complejo de mantener)
            // 0 items = 0% (no se detectó nada)
            // 1-4 items = 100% (stack muy simple)
            // 5-9 items = 80% (stack moderado)
            // 10-14 items = 60% (stack complejo)
            // 15+ items = 30% (stack muy complejo)
            const score = stackItems === 0 ? 0 :
              stackItems <= 4 ? 100 :
                stackItems <= 9 ? 80 :
                  stackItems <= 14 ? 60 : 30;

            const diagnostic = {
              score,
              label: getScoreLabel(score),
              color: getScoreColor(score),
              metrics: result?.metrics,
              summary: result?.summary || buildFallbackSummary('maintainability', score, result),
              recommendations: generateRecommendations('maintainability', result),
            };

            sendEvent('result', { api: 'maintainability', data: diagnostic });
            console.log(`[Dashboard Stream] ✅ Maintainability completado: ${score}%`);
            return diagnostic;
          } catch (error) {
            console.error(`[Dashboard Stream] ❌ Maintainability falló:`, error);
            sendEvent('error', { api: 'maintainability', error: humanizeError((error as Error).message) });
            return null;
          }
        }
      },
      {
        name: 'portability',
        label: 'Portabilidad',
        icon: '🌐',
        estimatedTime: '~15-20s',
        execute: async () => {
          try {
            sendEvent('progress', { api: 'portability', status: 'running', label: 'Portabilidad' });
            const result = await runPortabilityCheck(url);

            if (!result) {
              sendEvent('error', { api: 'portability', error: 'El servicio de portabilidad no devolvió datos. El sitio puede estar bloqueando el acceso externo.' });
              return null;
            }

            // runPortabilityCheck catches errors internally and returns raw.error instead of throwing.
            // Detect that case and treat it as a service failure.
            if (result?.raw?.error) {
              const errMsg = typeof result.raw.error === 'string' ? result.raw.error : 'Error interno en análisis de portabilidad';
              console.error(`[Dashboard Stream] ❌ Portability falló (interno):`, errMsg);
              sendEvent('error', { api: 'portability', error: humanizeError(errMsg) });
              return null;
            }

            const compatible = result?.metrics?.compatibleBrowsers?.length ?? 0;
            const incomp = result?.metrics?.incompatibilities ?? 0;
            const score = (compatible / 4) * 100;

            const diagnostic = {
              score: Math.round(score),
              label: getScoreLabel(Math.round(score)),
              color: getScoreColor(Math.round(score)),
              metrics: result?.metrics,
              summary: result?.summary || buildFallbackSummary('portability', Math.round(score), result),
              recommendations: generateRecommendations('portability', result),
            };

            sendEvent('result', { api: 'portability', data: diagnostic });
            console.log(`[Dashboard Stream] ✅ Portability completado: ${Math.round(score)}%`);
            return diagnostic;
          } catch (error) {
            console.error(`[Dashboard Stream] ❌ Portability falló:`, error);
            sendEvent('error', { api: 'portability', error: humanizeError((error as Error).message) });
            return null;
          }
        }
      },
      {
        name: 'accessibility',
        label: 'Accesibilidad',
        icon: '♿',
        estimatedTime: '~20-30s',
        execute: async () => {
          try {
            sendEvent('progress', { api: 'accessibility', status: 'running', label: 'Accesibilidad' });
            const axeResult = await runAxeAudit(url);
            if (!axeResult) {
              sendEvent('error', { api: 'accessibility', error: 'El análisis de accesibilidad no pudo ejecutarse. El sitio puede estar bloqueando herramientas de auditoría automática.' });
              return null;
            }
            const score = (axeResult?.metrics?.score ?? 0) * 100;

            const diagnostic = {
              score: Math.round(score),
              label: getScoreLabel(Math.round(score)),
              color: getScoreColor(Math.round(score)),
              metrics: axeResult?.metrics,
              summary: axeResult?.summary || buildFallbackSummary('accessibility', Math.round(score), axeResult),
              recommendations: generateRecommendations('accessibility', axeResult),
            };

            sendEvent('result', { api: 'accessibility', data: diagnostic });
            console.log(`[Dashboard Stream] ✅ Accessibility completado: ${Math.round(score)}%`);
            return diagnostic;
          } catch (error) {
            console.error(`[Dashboard Stream] ❌ Accessibility falló:`, error);
            sendEvent('error', { api: 'accessibility', error: humanizeError((error as Error).message) });
            return null;
          }
        }
      },
      {
        name: 'security',
        label: 'Seguridad',
        icon: '🛡️',
        estimatedTime: '~30-45s',
        execute: async () => {
          try {
            sendEvent('progress', { api: 'security', status: 'running', label: 'Seguridad' });
            const secResult = await runSecurityMicro(url);
            if (!secResult) {
              sendEvent('error', { api: 'security', error: 'El análisis de seguridad no devolvió datos. El sitio puede estar bloqueando las peticiones de inspección de cabeceras HTTP.' });
              return null;
            }
            const score = secResult?.score ?? secResult?.metrics?.score ?? 0;
            const diagnostic = {
              score,
              label: getScoreLabel(score),
              color: getScoreColor(score),
              grade: secResult?.grade,
              findings: secResult?.findings,
              summary: secResult?.summary || buildFallbackSummary('security', score, secResult),
              recommendations: generateRecommendations('security', secResult),
            };

            sendEvent('result', { api: 'security', data: diagnostic });
            console.log(`[Dashboard Stream] ✅ Security completado: ${score}%`);
            return diagnostic;
          } catch (error) {
            console.error(`[Dashboard Stream] ❌ Security falló:`, error);
            sendEvent('error', { api: 'security', error: humanizeError((error as Error).message) });
            return null;
          }
        }
      },
      {
        name: 'performance',
        label: 'Rendimiento',
        icon: '🚀',
        estimatedTime: '~45-55s',
        // El cliente espera 75s; este guard de 65s garantiza que el servidor responda antes.
        timeoutMs: 65_000,
        execute: async () => {
          const PERF_AXIOS_TIMEOUT = 55_000; // 55s → execute() lanza error antes del guard de 65s
          const MAX_ATTEMPTS = 1;

          sendEvent('progress', { api: 'performance', status: 'running', label: 'Rendimiento' });

          let psResult: any = null;
          let lastError: any = null;

          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
              psResult = await runPagespeedViaMicro(url, "mobile", PERF_AXIOS_TIMEOUT);
              break;
            } catch (err: any) {
              lastError = err;
              console.warn(`[Dashboard Stream] ⚠️ Performance intento ${attempt}/${MAX_ATTEMPTS} falló: ${err?.message || err}`);
            }
          }

          if (!psResult) {
            // Sin resultado → enviar event:error para que el frontend muestre el overlay con explicación
            const errMsg = humanizeError(lastError?.message || lastError?.toString() || '');
            console.error(`[Dashboard Stream] ❌ Performance falló:`, lastError);
            sendEvent('error', { api: 'performance', error: errMsg });
            return null;
          }

          // Éxito: extraer score de manera robusta
          const performanceScore = resolvePerformanceFromPagespeed(psResult) ?? 0;
          const diagnostic = {
            score: performanceScore,
            label: getScoreLabel(performanceScore),
            color: getScoreColor(performanceScore),
            metrics: psResult?.metrics,
            recommendations: generateRecommendations('performance', { ...psResult, score: performanceScore }),
          };

          sendEvent('result', { api: 'performance', data: diagnostic });
          console.log(`[Dashboard Stream] ✅ Performance completado: ${performanceScore}%`);
          return diagnostic;
        }
      },
    ];

    // Ejecutar todas las APIs en paralelo, enviando resultados conforme terminan.
    // Cada tarea tiene su propio timeout (performance usa 110s; el resto 55s).
    const DEFAULT_TASK_TIMEOUT_MS = 55_000;
    const withTaskTimeout = (p: Promise<any>, taskName: string, timeoutMs: number): Promise<any> =>
      new Promise<any>((resolve) => {
        const t = setTimeout(() => {
          console.warn(`[Dashboard Stream] ⏱️  Tarea '${taskName}' superó ${timeoutMs / 1000}s, continuando sin ella`);
          sendEvent('error', { api: taskName, error: `El análisis tardó demasiado (más de ${timeoutMs / 1000}s). El sitio puede ser muy lento o estar bloqueando las peticiones.` });
          resolve(null);
        }, timeoutMs);
        p.then((v) => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(null); });
      });

    const results = await Promise.allSettled(
      apiTasks.map(task => withTaskTimeout(task.execute() as Promise<any>, task.name, (task as any).timeoutMs ?? DEFAULT_TASK_TIMEOUT_MS))
    );

    // Construir objeto de diagnósticos
    const diagnostics: any = {};
    apiTasks.forEach((task, index) => {
      const result = results[index];
      if (result.status === 'fulfilled' && result.value) {
        diagnostics[task.name] = result.value;
      }
    });

    // Calcular score general
    const weights = {
      performance: 0.25,
      security: 0.20,
      accessibility: 0.20,
      reliability: 0.15,
      maintainability: 0.10,
      portability: 0.10,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(diagnostics).forEach(([key, value]: [string, any]) => {
      if (value && value.score != null) {
        const weight = weights[key as keyof typeof weights] || 0;
        totalScore += value.score * weight;
        totalWeight += weight;
      }
    });

    const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    // Enviar evento final
    setDashboardCache(url, diagnostics, overallScore);
    sendEvent('complete', {
      url,
      overallScore,
      timestamp: new Date(),
      diagnostics,
      cache: false,
    });

    // Guardar en histórico general (dedup: evita doble guardado por StrictMode)
    const streamStartTs: number = (req as any).__dashboardStartTs__ || Date.now();
    if (canSaveRun(url)) {
      DiagnosticRun.create({
        url,
        fecha: new Date(),
        userId:    (req as any).user?._id    || null,
        userName:  (req as any).user?.name   || null,
        userEmail: (req as any).user?.email  || null,
        overallScore,
        scores: {
          performance:    diagnostics.performance?.score    ?? null,
          security:       diagnostics.security?.score       ?? null,
          accessibility:  diagnostics.accessibility?.score  ?? null,
          reliability:    diagnostics.reliability?.score    ?? null,
          maintainability:diagnostics.maintainability?.score ?? null,
          portability:    diagnostics.portability?.score    ?? null,
        },
        durationMs: Date.now() - streamStartTs,
        fromCache: false,
      }).catch((e: any) => console.error('[Dashboard Stream] Error guardando histórico:', e?.message));
    }

    console.log(`[Dashboard Stream] ✅ Análisis completado. Score general: ${overallScore}`);
    res.end();
  } catch (e) {
    console.error("[Dashboard Stream] Error:", e);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: "Error ejecutando dashboard" })}\n\n`);
    res.end();
  }
}

function isTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function pruneDashboardCache() {
  const now = Date.now();
  for (const [key, entry] of DASHBOARD_CACHE.entries()) {
    if (now - entry.timestamp > DASHBOARD_CACHE_TTL_MS) {
      DASHBOARD_CACHE.delete(key);
    }
  }
}

function getDashboardCache(url: string): DashCacheEntry | null {
  pruneDashboardCache();
  return DASHBOARD_CACHE.get(normalizeUrlKey(url)) || null;
}

function setDashboardCache(url: string, diagnostics: any, overallScore: number) {
  DASHBOARD_CACHE.set(normalizeUrlKey(url), {
    diagnostics,
    overallScore,
    timestamp: Date.now(),
    url,
  });
}
// server/services/reportEmailService.ts

// Constructores de HTML para correos de diagnóstico e histórico.
// Extraído de FormController para mantener el controlador delgado.
import type { readMetrics as ReadMetricsFn } from "../utils/lh.js";

// ===== Tipos de parámetros =====

export interface DiagEmailParams {
  doc: any | null;
  url?: string;
  subject?: string;
  context?: string;
  metrics: ReturnType<typeof import("../utils/lh.js").readMetrics> | Record<string, any>;
  cat: {
    performance: number | null;
    accessibility: number | null;
    "best-practices": number | null;
    seo: number | null;
    [k: string]: number | null;
  };
  securityScore: number | null;
  opps: any[];
  /** req.body completo — para leer dashboard/overallScore si vienen del front */
  inbound: any;
}

export interface HistoryEmailParams {
  url: string;
  docs: any[];
}

// ===== Helpers de formateo =====

function toSec1(ms: number | null | undefined): string {
  return typeof ms === "number" && !Number.isNaN(ms)
    ? `${(Math.round((ms / 1000) * 10) / 10).toFixed(1)}s`
    : "N/A";
}

type MetricKey = "fcp" | "lcp" | "tbt" | "si" | "ttfb";

function readMs(doc: any, key: MetricKey): number | null {
  const p = doc?.audit?.pagespeed || {};
  const u = doc?.audit?.unlighthouse || {};
  if (doc?.metrics && typeof doc.metrics[key] === "number") return doc.metrics[key];
  if (p?.metrics && typeof p.metrics[key] === "number") return p.metrics[key];
  if (u?.metrics && typeof u.metrics[key] === "number") return u.metrics[key];
  if (typeof p[key] === "number") return p[key];
  if (typeof u[key] === "number") return u[key];
  const idMap: Record<MetricKey, string> = {
    fcp: "first-contentful-paint",
    lcp: "largest-contentful-paint",
    tbt: "total-blocking-time",
    si: "speed-index",
    ttfb: "server-response-time",
  };
  const lhr = p?.raw?.lighthouseResult;
  const nv = lhr?.audits?.[idMap[key]]?.numericValue;
  return typeof nv === "number" ? nv : null;
}

function readPerf(doc: any): number | "N/A" {
  if (typeof doc?.performance === "number" && !Number.isNaN(doc.performance))
    return Math.round(doc.performance);
  const p = doc?.audit?.pagespeed || {};
  if (typeof p.performance === "number") return Math.round(p.performance);
  const score = p?.raw?.lighthouseResult?.categories?.performance?.score;
  if (typeof score === "number") return Math.round(score * 100);
  return "N/A";
}

// ===== Exportadas =====

/**
 * Construye el HTML del correo de historial de métricas.
 */
export function buildHistoryEmailHtml({ url, docs }: HistoryEmailParams): string {
  const rowsHtml = docs
    .map((doc: any, i: number) => {
      const fecha = new Date(doc.fecha).toLocaleString();
      const perf  = readPerf(doc);
      const lcp   = toSec1(readMs(doc, "lcp"));
      const fcp   = toSec1(readMs(doc, "fcp"));
      const tbt   = toSec1(readMs(doc, "tbt"));
      const si    = toSec1(readMs(doc, "si"));
      const ttfb  = toSec1(readMs(doc, "ttfb"));
      const bg    = i % 2 === 0 ? "#f9fafb" : "#ffffff";
      return `
        <tr style="background:${bg}">
          <td style="padding:8px;border:1px solid #ddd">${fecha}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${perf}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${lcp}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${fcp}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${tbt}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${si}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${ttfb}</td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#333">
      <h2 style="text-align:center;color:#2563EB">
        Informe Histórico de <a href="${url}" style="color:#2563EB;text-decoration:underline">${url}</a>
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#2563EB;color:#fff">
            <th style="padding:12px;border:1px solid #ddd">Fecha / Hora</th>
            <th style="padding:12px;border:1px solid #ddd">Perf.</th>
            <th style="padding:12px;border:1px solid #ddd">LCP</th>
            <th style="padding:12px;border:1px solid #ddd">FCP</th>
            <th style="padding:12px;border:1px solid #ddd">TBT</th>
            <th style="padding:12px;border:1px solid #ddd">SI</th>
            <th style="padding:12px;border:1px solid #ddd">TTFB</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="text-align:right;font-size:0.85em;margin-top:24px;color:#666">
        Generado el ${new Date().toLocaleString()}
      </p>
    </div>
  `;
}

/**
 * Construye el HTML + título del correo de diagnóstico individual.
 * Devuelve `{ html, title }` para que el controlador sólo gestione el envío.
 */
export function buildDiagnosticEmailHtml(p: DiagEmailParams): { html: string; title: string } {
  const { doc, url, subject, context, metrics, cat, securityScore, opps, inbound } = p;

  const pct   = (v: number | null | undefined) => (v == null ? "N/A" : `${Math.round(v)}%`);
  const fmtS  = (s: number | null | undefined) => (s == null ? "N/A" : `${Number(s).toFixed(2)}s`);
  const fmtMs = (ms: number | null | undefined) => (ms == null ? "N/A" : `${Math.round(ms)}ms`);
  const kpi   = (label: string, val: string) =>
    `<div style="flex:1;min-width:120px;border:1px solid #E5E7EB;border-radius:12px;padding:12px;text-align:center">
       <div style="font-size:12px;color:#6B7280">${label}</div>
       <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px">${val}</div>
     </div>`;

  const fecha  = new Date(doc?.fecha || Date.now()).toLocaleString();
  const title  = subject || `Diagnóstico de ${doc?.url || url || ""}`.trim();
  const ctx    = String(context || "").toLowerCase();
  const includePerfBlocks = ctx === "performance";

  const oppLi = opps
    .map((o) => {
      const s = o.savingsLabel ? ` · Ahorro: ${o.savingsLabel}` : "";
      const r = o.recommendation
        ? `<div style="color:#374151;margin-top:4px">${o.recommendation}</div>`
        : "";
      return `<li style="margin:0 0 10px 0"><div style="font-weight:600;color:#111827">${o.title || o.id}${s}</div>${r}</li>`;
    })
    .join("");

  // Datos del dashboard general (si vienen desde la IU)
  const dash = inbound?.dashboard || inbound?.diagnostics || inbound?.general || null;
  const dashOverall: number | null =
    typeof inbound?.overallScore === "number"
      ? Math.round(inbound.overallScore)
      : typeof dash?.overallScore === "number"
        ? Math.round(dash.overallScore)
        : null;

  type Row = [string, string];
  let generalRowsFromDash: Row[] | null = null;
  if (dash && typeof dash === "object") {
    const diag = dash.diagnostics || dash;
    const pick = (k: string) => {
      const v = diag?.[k];
      const s = typeof v?.score === "number" ? Math.round(v.score) : null;
      return s;
    };
    const cand: Array<[string, number | null]> = [
      ["Performance",     pick("performance")],
      ["Seguridad",       pick("security")],
      ["Accesibilidad",   pick("accessibility")],
      ["Fiabilidad",      pick("reliability")],
      ["Mantenibilidad",  pick("maintainability")],
      ["Portabilidad",    pick("portability")],
    ];
    const ready = cand.filter(([, v]) => v != null).map(([label, v]) => [label, `${Math.round(v as number)}%`] as Row);
    if (ready.length) generalRowsFromDash = ready;
  }

  const scoreOrNA = (v: number | null | undefined) => (v == null ? "N/A" : `${Math.round(v)}%`);
  const genRows: Row[] = generalRowsFromDash || [
    ["Performance",       scoreOrNA(cat.performance)],
    ["Accesibilidad",     scoreOrNA(cat.accessibility)],
    ["Buenas prácticas",  scoreOrNA((cat as any)["best-practices"])],
    ["SEO",               scoreOrNA(cat.seo)],
    ["Seguridad",         scoreOrNA(securityScore)],
  ];

  const availableScores: number[] = [];
  for (const [, val] of genRows) {
    const m = /^(\d+)%$/.exec(String(val));
    if (m) availableScores.push(Number(m[1]));
  }

  let estadoHtml = "";
  if (availableScores.length) {
    const minScore = Math.min(...availableScores);
    let estado = "Regular"; let color = "#F59E0B";
    if (minScore >= 90) { estado = "Bueno";    color = "#16A34A"; }
    else if (minScore < 50) { estado = "Crítico"; color = "#DC2626"; }
    estadoHtml = `<div style="margin-top:8px;font-size:12px;color:#374151">Estado del sitio: <span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${color};color:#fff">${estado}</span></div>`;
  }

  const overallTitle = dashOverall != null
    ? `<div style="font-size:18px;font-weight:800;color:#111827;text-align:center;margin:0 0 10px 0">Score general: ${dashOverall}%</div>`
    : "";

  const generalTableHtml = availableScores.length ? `
    <div style="border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-top:16px">
      <div style="font-weight:700;margin-bottom:4px;color:#111827">Resumen general del sitio</div>
      ${overallTitle}
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#F3F4F6;color:#111827">
            <th style="padding:8px;border:1px solid #E5E7EB;text-align:left">Diagnóstico</th>
            <th style="padding:8px;border:1px solid #E5E7EB;text-align:center">Puntuación</th>
          </tr>
        </thead>
        <tbody>
          ${genRows.map(([label, val], i) => `
            <tr style="background:${i % 2 === 0 ? "#FFFFFF" : "#F9FAFB"}">
              <td style="padding:8px;border:1px solid #E5E7EB">${label}</td>
              <td style="padding:8px;border:1px solid #E5E7EB;text-align:center">${val}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${estadoHtml}
    </div>
  ` : "";

  // Fortalezas / A mejorar
  const fortalezas: string[] = [];
  const amejorar: string[] = [];
  const pushBy = (label: string, val: number | null | undefined) => {
    if (val == null) return;
    if (val >= 90) fortalezas.push(label);
    else amejorar.push(label);
  };
  pushBy("Performance",     cat.performance);
  pushBy("Accesibilidad",   cat.accessibility);
  pushBy("Buenas prácticas", (cat as any)["best-practices"]);
  pushBy("SEO",             cat.seo);
  if (securityScore != null) pushBy("Seguridad", securityScore);

  const fortalezasHtml = (fortalezas.length || amejorar.length) ? `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
      <div style="flex:1;min-width:220px">
        <div style="font-weight:600;margin-bottom:6px;color:#111827">Fortalezas (${fortalezas.length})</div>
        ${fortalezas.length
          ? `<ul style="margin:0;padding-left:18px;list-style:disc;color:#374151">${fortalezas.map(f => `<li>${f}</li>`).join("")}</ul>`
          : `<div style="color:#6B7280">—</div>`}
      </div>
      <div style="flex:1;min-width:220px">
        <div style="font-weight:600;margin-bottom:6px;color:#111827">A mejorar (${amejorar.length})</div>
        ${amejorar.length
          ? `<ul style="margin:0;padding-left:18px;list-style:disc;color:#374151">${amejorar.map(f => `<li>${f}</li>`).join("")}</ul>`
          : `<div style="color:#6B7280">—</div>`}
      </div>
    </div>
  ` : "";

  const headerMetaHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#6B7280;margin:2px 0 6px 0">
      <div>Generado: ${fecha}${doc?.strategy ? ` · Estrategia: ${doc.strategy}` : ""}</div>
      <div style="font-weight:600;color:#374151">Fortalezas: ${fortalezas.length} · A mejorar: ${amejorar.length}</div>
    </div>
  `;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.45">
      <h2 style="text-align:center;color:#2563EB;margin:0 0 4px 0">${title}</h2>
      ${headerMetaHtml}
      ${includePerfBlocks && doc?.audit?.pagespeed?.meta?.source
        ? `<div style="text-align:center;font-size:12px;color:#6B7280;margin-bottom:16px">Fuente: ${doc.audit.pagespeed.meta.source}</div>`
        : ""}
      ${generalTableHtml}
      ${fortalezasHtml}
      ${includePerfBlocks && doc ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">
          ${kpi("Performance", pct((metrics as any).performance))}
          ${kpi("FCP",         fmtS((metrics as any).fcp))}
          ${kpi("LCP",         fmtS((metrics as any).lcp))}
          ${kpi("TBT",         fmtMs((metrics as any).tbt))}
          ${kpi("Speed Index", fmtS((metrics as any).si))}
          ${kpi("TTFB",        fmtS((metrics as any).ttfb))}
        </div>
        <h3 style="margin:20px 0 8px;color:#111827">Plan de acción sugerido</h3>
        <div style="border:1px solid #E5E7EB;border-radius:12px;padding:12px">
          ${opps.length
            ? `<ul style="padding-left:18px;margin:0;list-style:disc;">${oppLi}</ul>`
            : `<p style="color:#374151;margin:0">No se detectaron oportunidades relevantes.</p>`}
        </div>
      ` : ""}
      <p style="text-align:right;font-size:12px;color:#6B7280;margin-top:24px">
        URL: <a href="${doc?.url || url || ""}" style="color:#2563EB">${doc?.url || url || ""}</a>
      </p>
    </div>
  `;

  return { html, title };
}
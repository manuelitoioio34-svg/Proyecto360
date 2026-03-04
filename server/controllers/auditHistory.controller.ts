// server/controllers/auditHistory.controller.ts
// Read-only audit & security history handlers extracted from FormController.ts.
import type { Request, Response } from "express";
import Audit from "../database/esquemaBD.js";
import Security from "../database/securitySchema.js";
import { readMetrics, extractOpportunities } from "../utils/lh.js";
import { runPagespeedViaMicro, resolvePerformanceFromPagespeed } from "../utils/microClients.js";

// ---- Private helpers ----

function detectFormFactorFromDoc(doc: any): "mobile" | "desktop" | undefined {
  try {
    const lhr =
      doc?.audit?.pagespeed?.raw?.lighthouseResult ||
      doc?.audit?.pagespeed?.lighthouseResult ||
      null;
    const cfg = lhr?.configSettings || {};
    const emu = cfg.emulatedFormFactor ?? cfg.formFactor;
    if (emu === "mobile" || emu === "desktop") return emu;
    if (cfg?.screenEmulation && typeof cfg.screenEmulation.mobile === "boolean") {
      return cfg.screenEmulation.mobile ? "mobile" : "desktop";
    }
  } catch { }
  return doc?.strategy === "desktop" ? "desktop" : doc?.strategy === "mobile" ? "mobile" : undefined;
}

function normalizeUrlFromParam(rawParam: string) {
  let decoded = rawParam;
  try { decoded = decodeURIComponent(rawParam); } catch { }
  const stripHash = (u: string) => u.split("#")[0];
  const stripQuery = (u: string) => u.split("?")[0];
  const stripSlash = (u: string) => (u.endsWith("/") ? u.slice(0, -1) : u);
  const base = stripSlash(stripQuery(stripHash(decoded)));
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rxBase = new RegExp("^" + esc(base) + "(?:[/?#]|$)", "i");
  let origin = base;
  try { origin = new URL(base).origin; } catch { }
  const rxOrigin = new RegExp("^" + esc(origin) + "(?:[/?#]|$)", "i");
  return { decoded, base, rxBase, origin, rxOrigin, esc };
}

function buildDiagnosticsFilter(decoded: string, base: string, rxBase: RegExp, rxOrigin: RegExp) {
  return {
    $or: [
      { url: decoded },
      { url: base }, { url: base + "/" },
      { url: { $regex: rxBase } },
      { url: { $regex: rxOrigin } },
      { "audit.pagespeed.meta.finalUrl": decoded },
      { "audit.pagespeed.meta.finalUrl": { $regex: rxBase } },
      { "audit.pagespeed.meta.finalUrl": { $regex: rxOrigin } },
      { "audit.pagespeed.url": decoded },
      { "audit.pagespeed.url": { $regex: rxBase } },
      { "audit.pagespeed.url": { $regex: rxOrigin } },
      { "audit.unlighthouse.url": decoded },
      { "audit.unlighthouse.url": { $regex: rxBase } },
      { "audit.unlighthouse.url": { $regex: rxOrigin } },
    ],
  };
}

// ---- Exported handlers ----

export async function getAuditById(req: Request, res: Response) {
  try {
    const id = (req.params?.id || "").trim();
    if (id.startsWith("temp_")) {
      console.warn("Warning: Se recibio un ID temporal:", id);
      return res.status(400).json({
        error: "ID temporal no valido para consulta",
        detail: "El ID proporcionado es temporal y no esta persistido en la base de datos.",
      });
    }
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return res.status(400).json({ error: "ID invalido" });
    const strategy = (String(req.query?.strategy || "mobile") as "mobile" | "desktop");
    const doc = await Audit.findById(id);
    if (!doc) return res.status(404).json({ error: "No encontrado" });
    if (req.user?.role === "cliente") {
      const owner = (doc as any).userId ? String((doc as any).userId) : null;
      const uid = (req as any)?.user?._id || (req as any)?.user?.id || req.user._id;
      if (!owner || owner !== String(uid)) return res.status(403).json({ error: "Sin permisos" });
    }
    const docObj: any = doc.toObject();
    docObj.ok = true;
    docObj.isLocal = docObj?.audit?.pagespeed?.meta?.source === "local";
    const storedFF = detectFormFactorFromDoc(docObj);
    const same = storedFF ? storedFF === strategy : docObj.strategy === strategy;
    if (!same && docObj.url) {
      try {
        const ps = await runPagespeedViaMicro(docObj.url, strategy);
        const perfResolved = resolvePerformanceFromPagespeed(ps);
        return res.json({
          ok: true, url: docObj.url, name: docObj.name, email: docObj.email, strategy,
          audit: { pagespeed: ps, security: docObj?.audit?.security ?? docObj?.security ?? undefined },
          performance: perfResolved ?? undefined,
          metrics: ps?.metrics ?? undefined,
          fecha: new Date().toISOString(),
          forced: true, note: "Resultado forzado por estrategia solicitada",
        });
      } catch (e: any) {
        console.warn("Warning: Fallback pagespeed by URL fallo:", e?.message);
        return res.json(docObj);
      }
    }
    return res.json(docObj);
  } catch (e: any) {
    console.error("Error en getAuditById:", e);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function getAuditHistory(req: Request, res: Response) {
  try {
    const rawParam = (req.query?.url ?? "").toString().trim();
    if (!rawParam) return res.status(400).json({ error: "Falta el parametro url" });
    let decoded = rawParam;
    try { decoded = decodeURIComponent(rawParam); } catch { }
    const stripHash = (u: string) => u.split("#")[0];
    const stripQuery = (u: string) => u.split("?")[0];
    const stripSlash = (u: string) => (u.endsWith("/") ? u.slice(0, -1) : u);
    const base = stripSlash(stripQuery(stripHash(decoded)));
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rxBase = new RegExp("^" + esc(base) + "/?$", "i");
    const filter: any = {
      $or: [{ url: decoded }, { url: base }, { url: base + "/" }, { url: { $regex: rxBase } }],
    };
    if (req.user?.role === "cliente") filter.userId = req.user._id;
    const docs = await Audit.find(filter).sort({ fecha: 1 }).lean();
    const out = (docs || []).map((o: any) => {
      let perf =
        typeof o.performance === "number" && !Number.isNaN(o.performance) ? Math.round(o.performance) : null;
      if (perf == null && typeof o.audit?.pagespeed?.performance === "number")
        perf = Math.round(o.audit.pagespeed.performance);
      if (perf == null) {
        const score = o.audit?.pagespeed?.raw?.lighthouseResult?.categories?.performance?.score;
        if (typeof score === "number") perf = Math.round(score * 100);
      }
      const pick = (key: string) => {
        const v =
          o.metrics?.[key] ?? o.audit?.pagespeed?.metrics?.[key] ??
          o.audit?.unlighthouse?.metrics?.[key] ?? o.audit?.pagespeed?.[key] ??
          o.audit?.unlighthouse?.[key] ?? null;
        return typeof v === "number" && !Number.isNaN(v) ? v : null;
      };
      return {
        _id: o._id, url: o.url, fecha: o.fecha, performance: perf,
        metrics: { lcp: pick("lcp"), fcp: pick("fcp"), tbt: pick("tbt"), si: pick("si"), ttfb: pick("ttfb") },
        audit: o.audit, email: o.email, strategy: o.strategy, type: o.type, tipos: o.tipos,
      };
    });
    return res.json(out);
  } catch (e: any) {
    console.error("getAuditHistory error:", e);
    return res.status(200).json([]);
  }
}

export async function getAuditByUrl(req: Request, res: Response) {
  try {
    const rawUrl = String(req.query?.url || "").trim();
    if (!rawUrl) return res.status(400).json({ error: "Falta parametro url" });
    const strategy = (String(req.query?.strategy || "mobile") as "mobile" | "desktop");
    const url = (() => { try { return decodeURIComponent(rawUrl); } catch { return rawUrl; } })();
    const ONE_HOUR = 1000 * 60 * 60;
    const cutoff = new Date(Date.now() - ONE_HOUR);
    const q: any = { url, fecha: { $gte: cutoff } };
    if (strategy) q.strategy = strategy;
    if (req.user?.role === "cliente") q.userId = req.user._id;
    let doc = await Audit.findOne(q).sort({ fecha: -1 }).lean();
    if (!doc) {
      const q2: any = { url, fecha: { $gte: cutoff } };
      if (req.user?.role === "cliente") q2.userId = req.user._id;
      doc = await Audit.findOne(q2).sort({ fecha: -1 }).lean();
    }
    if (doc) {
      return res.json({
        ok: true, url: doc.url, strategy: doc.strategy || strategy, audit: doc.audit || {},
        performance: typeof doc.performance === "number" ? Math.round(doc.performance) : undefined,
        metrics: (doc as any).metrics || (doc as any).audit?.pagespeed?.metrics || undefined,
        fecha: doc.fecha, forced: false, note: "Servido desde cache (<=1h) por /api/audit/by-url",
      });
    }
    const ps = await runPagespeedViaMicro(url, strategy);
    const perfResolved = resolvePerformanceFromPagespeed(ps);
    return res.json({
      ok: true, url, strategy, audit: { pagespeed: ps },
      performance: perfResolved ?? undefined, metrics: ps?.metrics ?? undefined,
      fecha: new Date().toISOString(), forced: true, note: "Generado por /api/audit/by-url",
    });
  } catch (e: any) {
    console.error("getAuditByUrl error:", e);
    return res.status(500).json({ error: "Error interno", detail: e?.message });
  }
}

export async function getDiagnosticsAudit(req: Request, res: Response) {
  try {
    const rawUrl = (req.params?.rawUrl || "").trim();
    if (!rawUrl) return res.status(400).json({ error: "Falta parametro :rawUrl" });
    const strategy = (String(req.query?.strategy || "mobile") as "mobile" | "desktop");
    const url = (() => { try { return decodeURIComponent(rawUrl); } catch { return rawUrl; } })();
    const ONE_HOUR = 1000 * 60 * 60;
    const cutoff = new Date(Date.now() - ONE_HOUR);
    const q: any = { url, fecha: { $gte: cutoff } };
    if (strategy) q.strategy = strategy;
    if (req.user?.role === "cliente") q.userId = req.user._id;
    let doc = await Audit.findOne(q).sort({ fecha: -1 }).lean();
    if (!doc) {
      const q2: any = { url, fecha: { $gte: cutoff } };
      if (req.user?.role === "cliente") q2.userId = req.user._id;
      doc = await Audit.findOne(q2).sort({ fecha: -1 }).lean();
    }
    if (doc) {
      return res.json({
        ok: true, url: doc.url, strategy: doc.strategy || strategy, audit: doc.audit || {},
        performance: typeof doc.performance === "number" ? Math.round(doc.performance) : undefined,
        metrics: (doc as any).metrics || (doc as any).audit?.pagespeed?.metrics || undefined,
        fecha: doc.fecha, forced: false, note: "Servido desde cache (<=1h) por /api/diagnostics/:rawUrl/audit",
      });
    }
    const ps = await runPagespeedViaMicro(url, strategy);
    const perfResolved = resolvePerformanceFromPagespeed(ps);
    return res.json({
      ok: true, url, strategy, audit: { pagespeed: ps },
      performance: perfResolved ?? undefined, metrics: ps?.metrics ?? undefined,
      fecha: new Date().toISOString(), forced: true, note: "Generado por /api/diagnostics/:rawUrl/audit",
    });
  } catch (e: any) {
    console.error("getDiagnosticsAudit error:", e);
    return res.status(500).json({ error: "Error interno", detail: e?.message });
  }
}

export async function getSecurityHistory(req: Request, res: Response) {
  try {
    const rawParam = (req.query?.url ?? "").toString().trim();
    if (!rawParam) return res.status(400).json({ error: "Falta el parametro url" });
    let decoded = rawParam;
    try { decoded = decodeURIComponent(rawParam); } catch { }
    const stripHash = (u: string) => u.split("#")[0];
    const stripQuery = (u: string) => u.split("?")[0];
    const stripSlash = (u: string) => (u.endsWith("/") ? u.slice(0, -1) : u);
    const base = stripSlash(stripQuery(stripHash(decoded)));
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rxBase = new RegExp("^" + esc(base) + "/?$", "i");
    const filter = {
      $or: [{ url: decoded }, { url: base }, { url: base + "/" }, { url: { $regex: rxBase } }],
    } as any;
    const rows = await Security.find(filter).sort({ fecha: 1 }).lean();
    const out = (rows || []).map((r: any) => {
      const findings = Array.isArray(r.findings) ? r.findings : [];
      return {
        _id: r._id, url: r.url, fecha: r.fecha,
        score: typeof r.score === "number" ? Math.round(r.score) : null,
        grade: r.grade || null,
        criticals: findings.filter((f: any) => f?.severity === "critical").length,
        warnings: findings.filter((f: any) => f?.severity === "warning").length,
        infos: findings.filter((f: any) => f?.severity === "info").length,
      };
    });
    return res.json(out);
  } catch (e: any) {
    console.error("getSecurityHistory error:", e);
    return res.status(200).json([]);
  }
}

export async function getDiagnosticsRaw(req: Request, res: Response) {
  try {
    const rawUrl = (req.params?.rawUrl || "").trim();
    if (!rawUrl) return res.status(400).json({ error: "Falta parametro :rawUrl" });
    const { decoded, base, rxBase, rxOrigin } = normalizeUrlFromParam(rawUrl);
    const doc = await Audit.findOne(buildDiagnosticsFilter(decoded, base, rxBase, rxOrigin)).sort({ fecha: -1 }).lean();
    if (!doc) return res.status(404).json({ error: "No hay diagnosticos para esa URL" });
    return res.json(doc);
  } catch (e: any) {
    console.error("getDiagnosticsRaw error:", e);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function getDiagnosticsProcessed(req: Request, res: Response) {
  try {
    const rawUrl = (req.params?.rawUrl || "").trim();
    if (!rawUrl) return res.status(400).json({ error: "Falta parametro :rawUrl" });
    const { decoded, base, rxBase, rxOrigin } = normalizeUrlFromParam(rawUrl);
    const doc = await Audit.findOne(buildDiagnosticsFilter(decoded, base, rxBase, rxOrigin)).sort({ fecha: -1 }).lean();
    if (!doc) return res.status(404).json({ error: "No hay diagnosticos para esa URL" });
    return res.json({ metrics: readMetrics(doc), opportunities: extractOpportunities(doc) });
  } catch (e: any) {
    console.error("getDiagnosticsProcessed error:", e);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function getDiagnosticsProcessedById(req: Request, res: Response) {
  try {
    const id = (req.params?.id || "").trim();
    if (!id) return res.status(400).json({ error: "ID no proporcionado" });
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(400).json({ error: "ID invalido" });
    const doc = await Audit.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "No encontrado" });
    return res.json({ metrics: readMetrics(doc), opportunities: extractOpportunities(doc) });
  } catch (e: any) {
    console.error("getDiagnosticsProcessedById error:", e);
    return res.status(500).json({ error: "Error interno" });
  }
}
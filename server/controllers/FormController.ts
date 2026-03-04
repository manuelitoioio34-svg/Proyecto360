// server/controllers/formController.ts
import type { Request, Response } from "express";
import axios from "axios";
import nodemailer from "nodemailer";
import type { SendMailOptions, SentMessageInfo } from "nodemailer";

// import { log } from "../utils/logger.js";
import Audit from "../database/esquemaBD.js";
import Security from "../database/securitySchema.js";
import { readMetrics, extractOpportunities, readCategoryScoresFromApi } from "../utils/lh.js";
import { hrTimer, hashUrl, emitTelemetry, categorizeError } from '../utils/telemetry.js';
import { buildHistoryEmailHtml, buildDiagnosticEmailHtml } from '../services/reportEmailService.js';
import {
  MS_PAGESPEED_URL, MS_SECURITY_URL,
  PAGESPEED_TIMEOUT_MS, SECURITY_TIMEOUT_MS,
  RUN_MICROS_IN_SERIES, SECURITY_RETRIES, SECURITY_RETRY_BACKOFF_MS,
  ALL_CATEGORIES, withAudit,
  callWithRetry,
  resolvePerformanceFromPagespeed,
} from "../utils/microClients.js";

// -------- Ping/Info --------
export async function auditPing(_req: Request, res: Response) {
  return res.json({
    ok: true,
    message: "Audit API ready",
    endpoints: [
      "POST /api/audit",
      "GET  /api/audit/:id",
      "GET  /api/audit/history?url=...",
      "GET  /api/audit/by-url?url=...&strategy=...",
      "GET  /api/diagnostics/:rawUrl/audit?strategy=...",
      "POST /api/audit/send-diagnostic",
      "POST /api/audit/send-report",
    ],
  });
}

// -------- Crear auditoría --------
export async function guardarDatos(req: Request, res: Response) {
  const diagStop = hrTimer();
  const diagId = crypto.randomUUID().slice(0, 8);
  const userCtx = { userId: req.user?._id || null, role: req.user?.role || (req as any)?.user?.role || null };
  let microsRun: string[] = [];
  const fail = (status: number, msg: string, extra: Record<string, unknown> = {}) =>
    res.status(status).json({ ok: false, error: msg, ...extra });

  try {
    const { url, type = "pagespeed", strategy = "mobile", name, email, nocache } = (req.body || {}) as any;
    if (!url || !/^https?:\/\//i.test(url)) return fail(400, "URL inválida");
    const urlHash = hashUrl(url);
    // tipos se define después de validar type, por eso lo reconstruimos luego en start
    // Emitiremos start después de conocer "tipos"

    const MICROSERVICES: Record<"pagespeed" | "security", { endpoint: string }> = {
      pagespeed: { endpoint: withAudit(MS_PAGESPEED_URL) },
      security: { endpoint: MS_SECURITY_URL },
    };

    const tipos = Array.isArray(type)
      ? (type as string[])
      : type === "all"
        ? (Object.keys(MICROSERVICES) as Array<keyof typeof MICROSERVICES>)
        : [type];

    await emitTelemetry('diagnostic.start', { diagId, ...userCtx, urlHash, urlSample: url, domain: (() => { try { return new URL(url).hostname; } catch { return null; } })(), strategy, tipos });

    const invalid = tipos.filter((t) => !(t in MICROSERVICES));
    if (invalid.length) return fail(400, `Tipo(s) inválido(s): ${invalid.join(", ")}`);

    // Cache 1h
    try {
      const CACHE_TTL = 1000 * 60 * 60;
      const cutoff = new Date(Date.now() - CACHE_TTL);
      // Asegurar que para clientes el cache solo devuelva documentos del mismo usuario
      const cachedQuery: any = {
        url,
        tipos,
        strategy,
        fecha: { $gte: cutoff },
      };
      if ((req as any)?.user?.role === 'cliente' && (req as any)?.user?._id) {
        cachedQuery.userId = (req as any).user._id;
      }
      const cached = await Audit.findOne(cachedQuery);
      if (!nocache && cached) {
        const resp: any = cached.toObject();
        // En lugar de devolver el cache directamente, registramos un nuevo documento para histórico
        try {
          const ownerId = (req as any)?.user?._id || (req as any)?.user?.id || undefined;
          const typeVal = Array.isArray(resp?.tipos) && resp.tipos.length ? resp.tipos[0] : (resp?.type || (Array.isArray(tipos) ? (tipos as string[])[0] : String(type)));
          const metricsVal = resp?.metrics ?? resp?.audit?.pagespeed?.metrics ?? undefined;
          const perfVal = typeof resp?.performance === 'number' ? resp.performance : (
            typeof resp?.audit?.pagespeed?.performance === 'number' ? Math.round(resp.audit.pagespeed.performance) : undefined
          );

          // Marca en el metadato que proviene de caché para trazabilidad
          const auditClone = resp?.audit ? JSON.parse(JSON.stringify(resp.audit)) : {};
          try {
            if (auditClone?.pagespeed?.meta) {
              auditClone.pagespeed.meta.cacheClone = true;
              auditClone.pagespeed.meta.clonedAt = new Date().toISOString();
            }
          } catch { }

          const newDoc = await Audit.create({
            url,
            type: typeVal,
            tipos: Array.isArray(resp?.tipos) ? resp.tipos : Array.isArray(tipos) ? tipos as string[] : [String(typeVal)],
            name: (req as any)?.user?.name || resp?.name,
            email: (req as any)?.user?.email || resp?.email,
            userId: ownerId ?? resp?.userId ?? undefined,
            strategy,
            audit: auditClone || resp?.audit || undefined,
            performance: perfVal,
            metrics: metricsVal,
            security: resp?.security ?? undefined,
            fecha: new Date(),
          });

          const out: any = newDoc.toObject();
          out.ok = true;
          out.isLocal = out?.audit?.pagespeed?.meta?.source === 'local';
          return res.status(201).json(out);
        } catch (cloneErr: any) {
          console.warn('⚠️ Cache clone falló, devolviendo cache existente:', cloneErr?.message);
          const respOut: any = { ...resp, ok: true };
          respOut.isLocal = resp?.audit?.pagespeed?.meta?.source === 'local';
          return res.json(respOut);
        }
      }
    } catch (e: any) {
      console.warn("⚠️ Cache lookup falló:", e?.message); // eslint-disable-line no-console
    }

    // Llamadas a microservicios
    const serviceCall = async (t: "pagespeed" | "security") => {
      const stop = hrTimer();
      let success = false; let status: number | null = null; let retriesUsed: number | null = null;
      try {
        if (t === "pagespeed") {
          const r = await axios.post(
            MICROSERVICES.pagespeed.endpoint,
            { url, strategy: strategy as string, categories: [...ALL_CATEGORIES] },
            { timeout: PAGESPEED_TIMEOUT_MS }
          );
          success = true; status = r.status;
          return { [t]: r.data } as Record<string, unknown>;
        }
        const base = String(MICROSERVICES.security.endpoint || "").replace(/\/+$/, "");
        const endpoint = /\/api\//.test(base) ? base : `${base}/api/analyze`;
        console.log(`[security] calling micro → ${endpoint}`);
        const http = await import('http');
        const https = await import('https');
        const httpAgent = new (http as any).Agent({ keepAlive: true });
        const httpsAgent = new (https as any).Agent({ keepAlive: true });
        let attempt = 0;
        const r = await callWithRetry(
          async () => { attempt++; return axios.post(endpoint, { url }, { timeout: SECURITY_TIMEOUT_MS, httpAgent, httpsAgent, proxy: false }); },
          { label: "security analyze", retries: SECURITY_RETRIES, backoffMs: SECURITY_RETRY_BACKOFF_MS }
        );
        success = true; status = (r as any).status; retriesUsed = attempt - 1;
        return { [t]: (r as any).data };
      } catch (err: any) {
        status = err?.response?.status ?? null;
        const cat = categorizeError(err);
        emitTelemetry('diagnostic.micro_call', { diagId, ...userCtx, micro: t, urlHash, status, success: false, durationMs: stop(), retries: retriesUsed, errorCategory: cat });
        return { [t]: { error: err?.message || 'error', status } } as Record<string, unknown>;
      } finally {
        if (success) emitTelemetry('diagnostic.micro_call', { diagId, ...userCtx, micro: t, urlHash, status, success: true, durationMs: stop(), retries: retriesUsed });
        microsRun.push(t);
      }
    };

    // Ejecutar en paralelo o en serie según configuración
    const tiposNormalized = (tipos as Array<"pagespeed" | "security">).filter((t): t is "pagespeed" | "security" => t === "pagespeed" || t === "security");
    const shouldRunInSeries = RUN_MICROS_IN_SERIES && tiposNormalized.length > 1 && tiposNormalized.includes("security");

    let partials: Record<string, any>[] = [];
    if (shouldRunInSeries) {
      console.log("[INFO] Ejecutando microservicios en serie por configuración RUN_MICROS_IN_SERIES=true");
      for (const t of tiposNormalized) {
        const part = await serviceCall(t);
        partials.push(part);
      }
    } else {
      partials = await Promise.all(tiposNormalized.map(serviceCall));
    }

    const audit = partials.reduce<Record<string, any>>((acc, cur) => ({ ...acc, ...cur }), {});

    const allFailed = (tipos as string[]).every((t) => audit[t] && audit[t].error);
    if (allFailed) return fail(502, "Ningún microservicio respondió correctamente", { details: audit });

    const onlyPagespeedOk = tiposNormalized.length === 1 && audit.pagespeed && !audit.pagespeed.error;

    // Resolver performance (top-level)
    const perfResolved = onlyPagespeedOk ? resolvePerformanceFromPagespeed(audit.pagespeed) : undefined;

    // Guardar en DB
    try {
      const doc = await Audit.create({
        url,
        type: (tipos as string[])[0],
        tipos,
        name: req.user?.name || name,
        email: req.user?.email || email,
        userId: req.user?._id ? (req as any).user._id : (req as any)?.user?.id || undefined,
        strategy,
        audit,
        performance: onlyPagespeedOk ? perfResolved : undefined,
        metrics: onlyPagespeedOk ? audit.pagespeed?.metrics : undefined,
        security: tipos.includes("security") ? audit.security : undefined,
        fecha: new Date(),
      });

      // Si hay seguridad, guardarla en su colección dedicada (sin bloquear el flujo)
      if (tipos.includes("security") && audit.security && !audit.security.error) {
        try {
          await Security.create({
            url,
            score: audit.security.score ?? null,
            grade: audit.security.grade ?? null,
            findings: audit.security.findings ?? [],
            checks: audit.security.checks ?? [],
            meta: audit.security.meta ?? {},
            fecha: new Date(),
          });
          console.log("✅ Datos de seguridad guardados en la colección 'security'");
        } catch (e: any) {
          console.error("❌ Error guardando datos de seguridad:", e?.message);
        }
      }

      const docObj: any = doc.toObject();
      docObj.ok = true;
      docObj.isLocal = docObj?.audit?.pagespeed?.meta?.source === "local";
      return res.status(201).json(docObj);
    } catch (e: any) {
      console.error("❌ Error guardando en DB:", e?.message); // eslint-disable-line no-console

      // Intento no-bloqueante de guardar seguridad en su colección incluso si el doc principal falla
      if (tipos.includes("security") && audit.security && !audit.security.error) {
        try {
          await Security.create({
            url,
            score: audit.security.score ?? null,
            grade: audit.security.grade ?? null,
            findings: audit.security.findings ?? [],
            checks: audit.security.checks ?? [],
            meta: audit.security.meta ?? {},
            fecha: new Date(),
          });
          console.log("✅ Datos de seguridad guardados en la colección 'security' (fallback)");
        } catch (se: any) {
          console.error("❌ Error guardando datos de seguridad (fallback):", se?.message);
        }
      }
      return fail(500, "No se pudo guardar el diagnóstico");
    }
  } catch (e: any) {
    console.error("❌ Error inesperado en guardarDatos:", e?.message);
    return fail(500, e?.message || "Error interno");
  } finally {
    // Reunir breakdown de micro_call desde TelemetryEvent podría requerir query; aquí sólo total.
    // Para primera iteración almacenamos total; breakdown se calcula en endpoint summary vía agregación de micro_call.
    emitTelemetry('diagnostic.end', { diagId, ...userCtx, urlHash: (() => { try { return hashUrl((req.body as any)?.url); } catch { return null; } })(), urlSample: (req.body as any)?.url, micros: microsRun, durationMs: diagStop() });
  }
}

// -------- Enviar histórico por email --------
export async function sendReport(req: Request, res: Response) {
  const sendStop = hrTimer();
  const userCtx = { userId: req.user?._id || null, role: req.user?.role || null };
  let urlHash: string | null = null;
  try {
    const { url, email } = (req.body || {}) as { url?: string; email?: string };
    if (!url || !email) return res.status(400).json({ error: "Falta parámetro url o email" });
    urlHash = hashUrl(url);

    const query: any = { url };
    // 🔒 Clientes: solo pueden enviar histórico de sus propios diagnósticos
    if (req.user?.role === 'cliente') {
      query.userId = req.user._id;
    }

    const docs = await Audit.find(query).sort({ fecha: 1 });
    if (!docs.length) return res.status(404).json({ error: "No hay datos previos para esa URL" });

    const html = buildHistoryEmailHtml({ url, docs: docs as any[] });
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER as string, pass: process.env.EMAIL_PASS as string },
    });
    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Informe Histórico de ${url}`,
      html,
    };
    const info: SentMessageInfo = await transporter.sendMail(mailOptions);
    emitTelemetry('email.sent', { ...userCtx, emailType: 'history', durationMs: sendStop(), success: true, urlHash });
    return res.status(200).json({ message: "Informe enviado correctamente", messageId: info.messageId });
  } catch (err: any) {
    emitTelemetry('email.sent', { ...userCtx, emailType: 'history', durationMs: sendStop(), success: false, urlHash, error: err?.message });
    console.error("❌ Error al enviar el informe:", err); // eslint-disable-line no-console
    return res.status(500).json({ error: "Error al enviar el informe", detail: err.message });
  }
}

// -------- Enviar diagnóstico individual --------
export async function sendDiagnostic(req: Request, res: Response) {
  const sendStop = hrTimer();
  const userCtx = { userId: req.user?._id || null, role: req.user?.role || null };
  let pdfSizeKb: number | null = null; let hasPdf = false; let urlHash: string | null = null;
  try {
    const { id, url, email, subject, pdf, context } = (req.body || {}) as {
      id?: string;
      url?: string;
      email?: string;
      subject?: string;
      pdf?: { base64?: string; filename?: string; contentType?: string } | null;
      context?: string;
    };

    if (!id && !url) return res.status(400).json({ error: "Falta id o url" });

    let doc: any = null;
    if (id) {
      doc = await Audit.findById(id).lean();
      if (!doc) doc = null;
      // 🔒 Clientes solo pueden enviar diagnósticos propios
      if (req.user?.role === 'cliente') {
        const owner = doc?.userId ? String(doc.userId) : null;
        if (!owner || owner !== req.user._id) {
          return res.status(403).json({ error: 'Sin permisos' });
        }
      }
    } else {
      const q: any = { url };
      if (req.user?.role === 'cliente') q.userId = req.user._id;
      doc = await Audit.findOne(q).sort({ fecha: -1 }).lean();
    }

    try { urlHash = doc?.url ? hashUrl(doc.url) : (url ? hashUrl(url) : null); } catch { }

    let toEmail = (email || (doc?.email ?? '') || (req as any)?.user?.email || "").trim();
    if (!toEmail) return res.status(400).json({ error: "No hay email disponible" });

    const metrics = doc ? readMetrics(doc) : ({} as any);
    const cat = doc?.audit?.pagespeed ? readCategoryScoresFromApi(doc.audit.pagespeed) : {
      performance: null, accessibility: null, "best-practices": null, seo: null,
    } as const;
    let securityScore: number | null = null;
    try {
      const secAny: any = doc?.security || null;
      if (typeof secAny?.score === 'number') securityScore = Math.round(secAny.score);
      if (securityScore == null && (doc?.url || url)) {
        const lastSec = await Security.findOne({ url: doc?.url || url }).sort({ fecha: -1 }).lean();
        if (typeof lastSec?.score === 'number') securityScore = Math.round(lastSec.score);
      }
    } catch { }
    const opps = doc ? extractOpportunities(doc).slice(0, 10) : [];

    const { html, title } = buildDiagnosticEmailHtml({
      doc, url, subject, context,
      metrics, cat, securityScore, opps,
      inbound: req.body,
    });

    let attachments: any = undefined;
    if (pdf?.base64 && pdf?.filename) {
      try {
        const buf = Buffer.from(pdf.base64, 'base64');
        pdfSizeKb = Math.round(buf.length / 1024);
        hasPdf = true;
        attachments = [{ filename: pdf.filename, content: buf, contentType: pdf.contentType || 'application/pdf' }];
      } catch (e: any) {
        console.warn('⚠️ Error procesando PDF base64:', e?.message);
      }
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER as string, pass: process.env.EMAIL_PASS as string },
    });
    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: title,
      html,
      attachments,
    };
    const info: SentMessageInfo = await transporter.sendMail(mailOptions);
    emitTelemetry('email.sent', { ...userCtx, emailType: 'diagnostic', hasPdf, pdfSizeKb, durationMs: sendStop(), urlHash, success: true });
    if (hasPdf) emitTelemetry('pdf.attached_to_email', { ...userCtx, pdfSizeKb, urlHash });
    return res.status(200).json({ message: "Informe de diagnóstico enviado correctamente", messageId: info.messageId });
  } catch (e: any) {
    emitTelemetry('email.sent', { ...userCtx, emailType: 'diagnostic', success: false, durationMs: sendStop(), urlHash, error: e?.message });
    console.error("❌ Error en sendDiagnostic:", e); // eslint-disable-line no-console
    return res.status(500).json({ error: "Error al enviar el diagnóstico", detail: e.message });
  }
}

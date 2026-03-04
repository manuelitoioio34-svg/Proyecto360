// server/controllers/adminTelemetry.controller.ts
// Telemetry & log handlers: read, track, clear, summarise.
import type { Request, Response } from 'express';
import crypto from 'crypto';
import AdminLog from '../database/adminLog.js';
import AdminVisit from '../database/adminVisit.js';
import TelemetryEvent from '../database/telemetryEvent.js';
import User from '../database/user.js';
import {
  pushLog,
  LOG_BUFFER, VISIT_BUFFER,
  PERSIST_LOGS, PERSIST_VISITS,
  RATE_BUCKET, RATE_WINDOW_MS, RATE_LIMIT,
} from '../utils/adminBuffer.js';

export async function getLogs(req: Request, res: Response) {
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 200));
  if (PERSIST_LOGS) {
    try {
      const items = await AdminLog.find({}, { _id: 0, ts: 1, level: 1, message: 1, context: 1 })
        .sort({ ts: -1 })
        .limit(limit)
        .lean();
      return res.json(items.map(i => ({
        ts: (i.ts as any)?.toISOString?.() ?? String(i.ts),
        level: i.level,
        message: i.message,
        context: (i as any).context,
      })));
    } catch (e: any) {
      pushLog({ level: 'error', message: 'getLogs db failed, falling back to buffer', context: { error: e?.message } });
    }
  }
  return res.json(LOG_BUFFER.slice(-limit));
}

export async function getTelemetry(req: Request, res: Response) {
  const limit = Math.max(1, Math.min(5000, Number(req.query.limit) || 1000));
  const roleFilter = (req.query.role as string | undefined) || 'cliente';
  const eventFilter = (req.query.event as string | undefined) || undefined;
  const q: any = {};
  if (roleFilter) q.role = roleFilter;
  if (eventFilter) q.event = eventFilter;

  if (PERSIST_VISITS) {
    try {
      const items = await AdminVisit.find(q, {
        _id: 0, ts: 1, route: 1, userId: 1, role: 1, event: 1,
        durationMs: 1, sessionId: 1, meta: 1,
      }).sort({ ts: -1 }).limit(limit).lean();
      return res.json(items.map(i => ({
        ts: (i.ts as any)?.toISOString?.() ?? String(i.ts),
        route: i.route,
        userId: i.userId ?? undefined,
        role: i.role ?? undefined,
        event: (i as any).event,
        durationMs: (i as any).durationMs ?? undefined,
        sessionId: (i as any).sessionId ?? undefined,
        meta: (i as any).meta ?? undefined,
      })));
    } catch (e: any) {
      pushLog({ level: 'error', message: 'getTelemetry db failed, falling back to buffer', context: { error: e?.message } });
    }
  }
  return res.json(VISIT_BUFFER.slice(-limit));
}

export async function trackTelemetry(req: Request, res: Response) {
  try {
    const rawRoute = String(req.body?.route || req.query?.route || '').slice(0, 2048);
    let route = rawRoute.trim();
    if (!route.startsWith('/')) route = '/' + route;

    const allowedEvents = new Set(['route_view', 'route_leave', 'client_event']);
    const eventRaw = String(req.body?.event || 'route_view');
    const event = (allowedEvents.has(eventRaw) ? eventRaw : 'client_event') as 'route_view' | 'route_leave' | 'client_event';

    const durationMs =
      typeof req.body?.durationMs === 'number' && isFinite(req.body.durationMs) && req.body.durationMs >= 0
        ? Math.min(req.body.durationMs, 1000 * 60 * 60)
        : undefined;
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.slice(0, 128) : undefined;

    const allowKeys = new Set(['component', 'action', 'label', 'severity', 'extra']);
    let meta: any = undefined;
    if (req.body?.meta && typeof req.body.meta === 'object') {
      try {
        const entries = Object.entries(req.body.meta as Record<string, unknown>)
          .filter(([k]) => allowKeys.has(k))
          .slice(0, 20);
        meta = Object.fromEntries(entries);
      } catch { meta = undefined; }
    }

    if (!route) return res.status(400).json({ error: 'route requerida' });

    const user = req.user || null;
    const ref = String(req.get('referer') || '');
    const refOk = !!(ref && route && ref.includes(route));
    const srcIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const ua = String(req.get('user-agent') || '').slice(0, 200);
    const ipHash = srcIp ? crypto.createHash('sha256').update(String(srcIp)).digest('hex').slice(0, 16) : undefined;

    const key = sessionId || user?._id || ipHash || 'anon';
    const now = Date.now();
    const cur = RATE_BUCKET.get(key);
    let count = 1, resetAt = now + RATE_WINDOW_MS;
    if (cur && now < cur.resetAt) { count = cur.count + 1; resetAt = cur.resetAt; }
    RATE_BUCKET.set(key, { count, resetAt });

    const metaFlags: any = { ...(meta || {}), verified: Boolean(user?._id), refOk, ipHash, ua };
    if (count > RATE_LIMIT) { metaFlags.severity = metaFlags.severity || 'warn'; metaFlags.tooMany = count; }

    const entry = { ts: new Date().toISOString(), route, userId: user?._id, role: user?.role };
    VISIT_BUFFER.push(entry);
    if (VISIT_BUFFER.length > 1000) VISIT_BUFFER.shift();

    if (PERSIST_VISITS) {
      void AdminVisit.create({
        ts: new Date(entry.ts),
        route,
        userId: entry.userId ?? null,
        role: entry.role ?? null,
        event,
        durationMs: durationMs ?? null,
        sessionId: sessionId ?? null,
        meta: metaFlags,
      }).catch(() => { });
    }

    return res.json({ ok: true });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'trackTelemetry failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo registrar telemetría' });
  }
}

export async function clearLogs(req: Request, res: Response) {
  try {
    (LOG_BUFFER as any).length = 0;
    if (PERSIST_LOGS) await AdminLog.deleteMany({});
    pushLog({ level: 'info', message: 'Logs limpiados manualmente', context: { by: req.user?._id } });
    return res.json({ ok: true });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'clearLogs failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudieron limpiar los logs' });
  }
}

export async function clearTelemetry(req: Request, res: Response) {
  try {
    (VISIT_BUFFER as any).length = 0;
    if (PERSIST_VISITS) await AdminVisit.deleteMany({});
    pushLog({ level: 'info', message: 'Telemetry limpiada manualmente', context: { by: req.user?._id } });
    return res.json({ ok: true });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'clearTelemetry failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo limpiar la telemetría' });
  }
}

export async function getTelemetrySummary(req: Request, res: Response) {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const matchSince = { ts: { $gte: since } } as any;

    const [
      diagTotals, microAgg, roleAgg, userAgg, urlAgg, pdfAgg, microFailAgg,
      errorCatAgg, emailTypeAgg, emailFailAgg, logLevels,
      userDiagAgg, urlDiagAgg, visitRoleAgg, microCallsTotalAgg, recentDiagAgg,
      missingUrlAgg, microUserAgg, tipoAgg, tipoUserAgg,
    ] = await Promise.all([
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', durationMs: { $ne: null } } },
        { $group: { _id: null, avgTotalMs: { $avg: '$durationMs' }, total: { $sum: 1 } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.micro_call', micro: { $ne: null }, durationMs: { $ne: null } } },
        { $group: { _id: '$micro', avgMs: { $avg: '$durationMs' }, count: { $sum: 1 }, failCount: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end' } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', userId: { $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', urlHash: { $ne: null } } },
        { $group: { _id: '$urlHash', count: { $sum: 1 }, lastTs: { $max: '$ts' } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'email.sent', emailType: 'diagnostic' } },
        { $group: { _id: null, sent: { $sum: 1 }, withPdf: { $sum: { $cond: [{ $eq: ['$hasPdf', true] }, 1, 0] } }, avgPdfSizeKb: { $avg: '$pdfSizeKb' } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.micro_call', success: false, micro: { $ne: null } } },
        { $group: { _id: '$micro', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.micro_call', success: false, errorCategory: { $ne: null } } },
        { $group: { _id: '$errorCategory', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'email.sent', emailType: { $ne: null } } },
        { $group: { _id: '$emailType', count: { $sum: 1 } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'email.sent', success: false } },
        { $group: { _id: null, failures: { $sum: 1 } } },
      ]),
      AdminLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', userId: { $ne: null } } },
        { $group: { _id: { userId: '$userId' }, total: { $sum: 1 } } },
        { $project: { userId: '$_id.userId', total: 1 } },
        { $limit: 200 },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', urlHash: { $ne: null } } },
        { $group: { _id: '$urlHash', total: { $sum: 1 }, lastTs: { $max: '$ts' } } },
        { $limit: 200 },
      ]),
      AdminVisit.aggregate([
        { $match: { ts: { $gte: since }, role: { $ne: null } } },
        { $group: { _id: '$role', visits: { $sum: 1 } } },
        { $sort: { visits: -1 } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.micro_call' } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end' } },
        { $sort: { ts: -1 } },
        { $limit: 40 },
        { $project: { _id: 0, ts: 1, userId: 1, role: 1, urlHash: 1, urlSample: 1, durationMs: 1 } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', $or: [{ urlHash: null }, { urlHash: { $exists: false } }] } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.micro_call', micro: { $ne: null }, userId: { $ne: null } } },
        { $group: { _id: { micro: '$micro', userId: '$userId' }, count: { $sum: 1 } } },
        { $group: { _id: '$_id.micro', users: { $push: { userId: '$_id.userId', count: '$count' } } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', tipos: { $ne: null } } },
        { $unwind: '$tipos' },
        { $group: { _id: '$tipos', count: { $sum: 1 }, avgMs: { $avg: '$durationMs' } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { ...matchSince, kind: 'diagnostic.end', tipos: { $ne: null }, userId: { $ne: null } } },
        { $unwind: '$tipos' },
        { $group: { _id: { tipo: '$tipos', userId: '$userId' }, count: { $sum: 1 } } },
        { $group: { _id: '$_id.tipo', users: { $push: { userId: '$_id.userId', count: '$count' } } } },
      ]),
    ]);

    // Enrich user names
    const allUserIds = [
      ...userAgg.map((u: any) => u._id),
      ...microUserAgg.flatMap((m: any) => m.users.map((u: any) => u.userId)),
      ...tipoUserAgg.flatMap((t: any) => t.users.map((u: any) => u.userId)),
    ].filter(Boolean);
    const userDocs = allUserIds.length
      ? await User.find({ _id: { $in: allUserIds } }, { name: 1, role: 1 }).lean()
      : [];
    const userNameMap = new Map<string, { name?: string; role?: string }>();
    for (const u of userDocs) userNameMap.set(String((u as any)._id), { name: (u as any).name, role: (u as any).role });

    // Enrich URL samples
    const urlHashes = urlAgg.map((u: any) => u._id).filter(Boolean);
    const urlSamplesDocs = urlHashes.length
      ? await TelemetryEvent.aggregate([
          { $match: { kind: 'diagnostic.end', urlHash: { $in: urlHashes } } },
          { $sort: { ts: -1 } },
          { $group: { _id: '$urlHash', sample: { $first: '$urlSample' } } },
        ])
      : [];
    const urlSampleMap = new Map<string, string | null>();
    for (const d of urlSamplesDocs) urlSampleMap.set(d._id, d.sample || null);

    const diagTotalsObj = diagTotals[0] || { avgTotalMs: null, total: 0 };
    const pdfObj = pdfAgg[0] || { sent: 0, withPdf: 0, avgPdfSizeKb: null };

    const rawRoleTotals: Record<string, number> = {};
    for (const r of roleAgg) rawRoleTotals[r._id || 'unknown'] = r.count;

    const byRoleTypeAgg = await TelemetryEvent.aggregate([
      { $match: { ...matchSince, kind: 'diagnostic.end' } },
      { $project: { role: 1, tipos: 1, micros: 1 } },
      { $unwind: { path: '$tipos', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { role: '$role', tipo: '$tipos' }, count: { $sum: 1 } } },
    ]);

    const roleByApi: Record<string, Record<string, number>> = {};
    const mapTipo: Record<string, string> = {
      pagespeed: 'performance', performance: 'performance',
      security: 'security', usability: 'accessibility',
      fiability: 'reliability', maintainability: 'maintainability', portability: 'portability',
    };
    for (const row of byRoleTypeAgg) {
      const role = row._id?.role || 'unknown';
      const tipo = row._id?.tipo || 'unknown';
      if (!roleByApi[role]) roleByApi[role] = {};
      const key = mapTipo[tipo] || tipo;
      roleByApi[role][key] = (roleByApi[role][key] || 0) + row.count;
    }

    const byRole: Record<string, number> = { ...rawRoleTotals };
    ['admin', 'tecnico', 'operario', 'cliente'].forEach(role => {
      if (!(role in byRole)) byRole[role] = 0;
      if (!roleByApi[role]) roleByApi[role] = {};
    });

    const visitsByRole = visitRoleAgg.map((v: any) => ({ role: v._id || 'unknown', visits: v.visits }));
    const visitsMap: Record<string, number> = {};
    for (const v of visitsByRole) visitsMap[v.role] = v.visits;
    ['admin', 'tecnico', 'operario', 'cliente'].forEach(role => {
      if (!(role in visitsMap)) visitsByRole.push({ role, visits: 0 });
    });

    return res.json({
      range: { from: since.toISOString(), to: new Date().toISOString(), days },
      diagnostics: {
        total: diagTotalsObj.total,
        avgTotalMs: diagTotalsObj.avgTotalMs,
        micros: microAgg.map((m: any) => {
          const microUserData = microUserAgg.find((mu: any) => mu._id === m._id);
          const users = microUserData
            ? microUserData.users.map((u: any) => ({ userId: u.userId, name: userNameMap.get(u.userId)?.name || null, count: u.count }))
            : [];
          return { micro: m._id, avgMs: m.avgMs, count: m.count, failCount: m.failCount, users };
        }),
        byTipo: (() => {
          const mapKey: Record<string, string> = { ...mapTipo };
          const qualitySet = new Set(['accessibility', 'reliability', 'maintainability', 'portability']);
          return tipoAgg
            .map((t: any) => {
              const key = mapKey[t._id] || t._id;
              const usersDoc = tipoUserAgg.find((u: any) => u._id === t._id);
              const users = usersDoc
                ? usersDoc.users.map((u: any) => ({ userId: u.userId, name: userNameMap.get(u.userId)?.name || null, count: u.count }))
                : [];
              return { tipo: key, avgMs: t.avgMs ?? null, count: t.count ?? 0, users };
            })
            .filter((t: any) => qualitySet.has(t.tipo));
        })(),
        microCallsTotal: microCallsTotalAgg?.[0]?.total || 0,
        byRole,
        byRoleDetailed: Object.entries(byRole).map(([role, total]) => ({ role, total, byApi: roleByApi[role] })),
        byUser: userAgg.map((u: any) => ({ userId: u._id, count: u.count, name: userNameMap.get(u._id)?.name, role: userNameMap.get(u._id)?.role })),
        byUrl: urlAgg.map((u: any) => ({ urlHash: u._id, count: u.count, url: urlSampleMap.get(u._id) || null })),
        pdf: { sent: pdfObj.sent, withPdf: pdfObj.withPdf, avgPdfSizeKb: pdfObj.avgPdfSizeKb },
        errors: {
          byCategory: errorCatAgg.map((e: any) => ({ errorCategory: e._id, count: e.count })),
          topMicroFailures: microFailAgg.map((e: any) => ({ micro: e._id, count: e.count })),
        },
        detail: {
          users: userDiagAgg.map((u: any) => ({ userId: u.userId, total: u.total, name: userNameMap.get(u.userId || '')?.name })),
          urls: urlDiagAgg.map((u: any) => ({ urlHash: u._id, total: u.total, url: urlSampleMap.get(u._id) || null })),
        },
        visitsByRole,
        recent: recentDiagAgg.map((d: any) => ({
          ts: d.ts,
          userId: d.userId || null,
          name: d.userId ? (userNameMap.get(String(d.userId))?.name || null) : null,
          role: d.role || userNameMap.get(String(d.userId || ''))?.role || null,
          url: d.urlSample || null,
          durationMs: d.durationMs || null,
        })),
        missingUrlCount: missingUrlAgg?.[0]?.count || 0,
      },
      emails: {
        totalSent: emailTypeAgg.reduce((a: number, c: any) => a + c.count, 0),
        byType: emailTypeAgg.map((e: any) => ({ emailType: e._id, count: e.count })),
        failures: emailFailAgg[0]?.failures || 0,
      },
      logs: { levels: logLevels.map((l: any) => ({ level: l._id, count: l.count })) },
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Error generando resumen', detail: e?.message });
  }
}

export async function getLogSummary(req: Request, res: Response) {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [levels, lastErrors] = await Promise.all([
      AdminLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$level', count: { $sum: 1 } } },
      ]),
      AdminLog.find({ level: 'error', createdAt: { $gte: since } }, { _id: 0, ts: 1, message: 1 })
        .sort({ ts: -1 })
        .limit(20)
        .lean(),
    ]);
    return res.json({
      range: { from: since.toISOString(), to: new Date().toISOString(), days },
      levels: levels.map((l: any) => ({ level: l._id, count: l.count })),
      lastErrors: lastErrors.map(e => ({ ts: (e.ts as any)?.toISOString?.() ?? String(e.ts), message: e.message })),
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Error generando resumen de logs', detail: e?.message });
  }
}

// server/controllers/diagnosticHistory.controller.ts
// Endpoint de historico general de diagnosticos — solo admin + permiso 'view_history'

import type { Request, Response } from 'express';
import { DiagnosticRun } from '../database/diagnosticRun.js';

const PAGE_SIZE = 20;

/** GET /api/admin/history
 *  Query params:
 *    page     (int, default 1)
 *    limit    (int, default 20, max 100)
 *    url      (string, filtro parcial/exacto de URL)
 *    from     (ISO date, fecha inicio)
 *    to       (ISO date, fecha fin)
 *    userId   (string, filtro por usuario)
 */
export async function getDiagnosticHistory(req: Request, res: Response) {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || String(PAGE_SIZE)), 10)));
    const skip  = (page - 1) * limit;

    // Filtros opcionales
    const filter: Record<string, any> = {};

    if (req.query.url) {
      const raw = String(req.query.url).trim();
      // búsqueda parcial case-insensitive
      try { filter.url = { $regex: raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }; }
      catch { filter.url = raw; }
    }

    if (req.query.from || req.query.to) {
      filter.fecha = {};
      if (req.query.from) filter.fecha.$gte = new Date(String(req.query.from));
      if (req.query.to)   filter.fecha.$lte = new Date(String(req.query.to));
    }

    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    const [total, runs] = await Promise.all([
      DiagnosticRun.countDocuments(filter),
      DiagnosticRun.find(filter)
        .sort({ fecha: -1 })  // más reciente primero
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
    ]);

    return res.json({
      ok: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      runs,
    });
  } catch (e: any) {
    console.error('[diagnosticHistory] Error:', e?.message);
    return res.status(500).json({ error: 'Error consultando el histórico' });
  }
}

/** DELETE /api/admin/history/:id — borrar un registro específico */
export async function deleteDiagnosticRun(req: Request, res: Response) {
  try {
    const id = String(req.params.id || '').trim();
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
    const deleted = await DiagnosticRun.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message });
  }
}

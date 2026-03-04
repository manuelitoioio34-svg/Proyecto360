import type { Request, Response } from 'express';
import SiteScan from '../database/siteScan.js';
import PageScan from '../database/pageScan.js';
import { fetchSitemapUrls, normalizeUrl } from '../utils/sitemap.js';

// Crear SiteScan
export async function createSiteScan(req: Request, res: Response) {
    try {
        const { seedUrl, mode = 'sitemap', maxPages = 100, maxDepth = 2, include = [], exclude = [], concurrency = 3 } = req.body || {};
        if (!seedUrl || typeof seedUrl !== 'string') return res.status(400).json({ error: 'seedUrl requerido' });
        const scan = await SiteScan.create({ seedUrl, mode, maxPages, maxDepth, include, exclude, concurrency, status: 'queued' });
        return res.status(201).json({ id: scan._id, status: scan.status });
    } catch (e: any) {
        return res.status(500).json({ error: 'No se pudo crear el SiteScan', detail: e?.message });
    }
}

// Iniciar descubrimiento y encolar páginas (sitemap solo v1)
export async function startSiteScan(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const scan = await SiteScan.findById(id);
        if (!scan) return res.status(404).json({ error: 'SiteScan no encontrado' });
        if (scan.status !== 'queued' && scan.status !== 'paused') return res.status(400).json({ error: 'Estado inválido para iniciar' });
        scan.status = 'running';
        scan.startedAt = scan.startedAt || new Date();
        await scan.save();

        // Descubrimiento básico sitemap
        let discovered: string[] = [];
        if (scan.mode === 'sitemap' || scan.mode === 'hybrid') {
            discovered = await fetchSitemapUrls(scan.seedUrl);
        }
        // fallback: incluir seedUrl
        if (!discovered.length) discovered = [scan.seedUrl];
        const unique = Array.from(new Set(discovered.map(normalizeUrl))).slice(0, scan.maxPages || 100);

        const existing = new Set<string>();
        const bulk: any[] = [];
        for (const u of unique) {
            if (existing.has(u)) continue; existing.add(u);
            bulk.push({
                insertOne: {
                    document: {
                        siteScanId: scan._id,
                        url: u,
                        normalizedUrl: u,
                        status: 'pending',
                        attempts: 0,
                    }
                }
            });
        }
        if (bulk.length) await PageScan.bulkWrite(bulk, { ordered: false }).catch(() => { });
        scan.pagesDiscovered = unique.length;
        scan.pagesQueued = bulk.length;
        await scan.save();

        return res.json({ ok: true, pagesQueued: bulk.length, pagesDiscovered: unique.length });
    } catch (e: any) {
        return res.status(500).json({ error: 'Error iniciando SiteScan', detail: e?.message });
    }
}

// Listar SiteScan
export async function listSiteScans(_req: Request, res: Response) {
    const scans = await SiteScan.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(scans);
}

// Obtener detalle + métricas agregadas rápidas
export async function getSiteScan(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const scan = await SiteScan.findById(id).lean();
        if (!scan) return res.status(404).json({ error: 'No existe' });
        const pages = await PageScan.find({ siteScanId: id }).lean();
        const completed = pages.filter(p => p.status === 'completed');
        const perfScores: number[] = [];
        for (const p of completed) {
            const s = p?.results?.performance?.score ?? p?.results?.performance ?? null;
            if (typeof s === 'number' && s >= 0 && s <= 100) perfScores.push(s);
        }
        const avgPerf = perfScores.length ? (perfScores.reduce((a, c) => a + c, 0) / perfScores.length) : null;
        return res.json({ scan, progress: { completed: completed.length, total: pages.length }, avgPerformance: avgPerf });
    } catch (e: any) {
        return res.status(500).json({ error: 'Error obteniendo SiteScan', detail: e?.message });
    }
}

// Marcar SiteScan como pausado
export async function pauseSiteScan(req: Request, res: Response) {
    const { id } = req.params;
    const scan = await SiteScan.findById(id);
    if (!scan) return res.status(404).json({ error: 'No existe' });
    if (scan.status !== 'running') return res.status(400).json({ error: 'Solo se puede pausar si está en ejecución' });
    scan.status = 'paused';
    await scan.save();
    res.json({ ok: true });
}

// Reanudar SiteScan
export async function resumeSiteScan(req: Request, res: Response) {
    const { id } = req.params;
    const scan = await SiteScan.findById(id);
    if (!scan) return res.status(404).json({ error: 'No existe' });
    if (scan.status !== 'paused') return res.status(400).json({ error: 'Solo se puede reanudar si está en pausa' });
    scan.status = 'running';
    await scan.save();
    res.json({ ok: true });
}

// Cancelar
export async function cancelSiteScan(req: Request, res: Response) {
    const { id } = req.params;
    const scan = await SiteScan.findById(id);
    if (!scan) return res.status(404).json({ error: 'No existe' });
    scan.status = 'canceled';
    scan.finishedAt = new Date();
    await scan.save();
    res.json({ ok: true });
}
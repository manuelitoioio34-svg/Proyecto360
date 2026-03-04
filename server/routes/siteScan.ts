// server/routes/siteScan.ts

// Rutas para gestión de escaneos de sitios: creación, inicio, pausa, reanudación, cancelación y consulta de estado/resultados. Requiere autenticación y autorización basada en roles y permisos efectivos. Incluye endpoints para listar escaneos activos e históricos, obtener detalles de cada escaneo y controlar su ejecución.
import { Router } from 'express';
import { createSiteScan, startSiteScan, listSiteScans, getSiteScan, pauseSiteScan, resumeSiteScan, cancelSiteScan } from '../controllers/siteScan.controller.js';

const router = Router();

router.post('/site-scans', createSiteScan);
router.post('/site-scans/:id/start', startSiteScan);
router.get('/site-scans', listSiteScans);
router.get('/site-scans/:id', getSiteScan);
router.post('/site-scans/:id/pause', pauseSiteScan);
router.post('/site-scans/:id/resume', resumeSiteScan);
router.post('/site-scans/:id/cancel', cancelSiteScan);

export default router;
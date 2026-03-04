// server/routes/diagnostic.routes.ts

// Rutas para diagnóstico: obtener datos procesados por URL, realizar chequeos completos y generar reportes para el dashboard. Incluye endpoints para análisis detallado y streaming de resultados progresivos. Requiere autenticación y autorización basada en roles y permisos efectivos.
import { Router } from "express";
import { getProcessedByUrl, fullCheck, dashboardCheck, dashboardCheckStream } from "../controllers/diagnostic.controller.js"; // NodeNext: .js
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/diagnostics/:encodedUrl/processed
router.get("/:encodedUrl/processed", getProcessedByUrl);

// POST /api/diagnostics/full-check
router.post("/full-check", fullCheck);

// POST /api/diagnostics/dashboard
router.post("/dashboard", dashboardCheck);

// POST /api/diagnostics/dashboard-stream (Server-Sent Events para streaming progresivo)
// optionalAuth: adjunta req.user si hay sesión activa (para guardar usuario en histórico)
router.post("/dashboard-stream", optionalAuth as any, dashboardCheckStream);

export default router;
// server/utils/adminBuffer.ts

// Buffer en memoria para logs y visitas administrativas, con opción de persistencia en MongoDB. Incluye funciones para agregar entradas al buffer y registrar visitas, 
// así como un bucket de rate-limiting para telemetría. Utilizado por middleware de logging y rutas de administración para almacenar temporalmente datos antes de guardarlos en la base de datos, evitando sobrecargarla con cada solicitud. 

import type { AuthUser } from '../middleware/auth.js';
import AdminLog from '../database/adminLog.js';
import AdminVisit from '../database/adminVisit.js';

// Buffers en memoria para logs y visitas, con límite de tamaño para evitar consumo excesivo. Opcionalmente persisten en MongoDB según configuración.
export const LOG_BUFFER: Array<{ ts: string; level: 'info' | 'warn' | 'error'; message: string; context?: any }> = [];
export const VISIT_BUFFER: Array<{ ts: string; route: string; userId?: string; role?: string }> = [];
export const MAX_BUFFER = 1000;

export const PERSIST_LOGS = process.env.PERSIST_LOGS !== 'false';
export const PERSIST_VISITS = process.env.PERSIST_VISITS !== 'false';

// Bucket de rate-limiting para telemetría, con ventana de 1 minuto y límite configurable. Utilizado para controlar la cantidad de eventos de telemetría procesados por minuto, evitando sobrecargar el sistema con datos excesivos.
export const RATE_BUCKET = new Map<string, { count: number; resetAt: number }>();
export const RATE_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT = Number(process.env.TELEMETRY_RATE_LIMIT || 120);

// Función para agregar una entrada al buffer de logs, con manejo de tamaño y persistencia opcional en MongoDB. Cada entrada incluye un timestamp, nivel de log, mensaje y contexto adicional. Si el buffer excede el tamaño máximo, se elimina la entrada más antigua.

export function pushLog(row: { level: 'info' | 'warn' | 'error'; message: string; context?: any }) {
  const entry = { ts: new Date().toISOString(), ...row };
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER) LOG_BUFFER.shift();
  if (PERSIST_LOGS) {
    void AdminLog.create({
      ts: new Date(entry.ts),
      level: entry.level,
      message: entry.message,
      context: entry.context,
    }).catch(() => { });
  }
}

// Función para registrar una visita a una ruta administrativa, con información del usuario autenticado si está disponible. Agrega la visita al buffer de visitas y opcionalmente la persiste en MongoDB. Cada entrada incluye un timestamp, la ruta visitada, el ID del usuario (si hay sesión) y su rol. Si el buffer excede el tamaño máximo, se elimina la entrada más antigua.
export function recordVisit(route: string, user?: AuthUser | null) {
  const now = new Date();
  const entry = { ts: now.toISOString(), route, userId: user?._id, role: user?.role };
  VISIT_BUFFER.push(entry as any);
  if (VISIT_BUFFER.length > MAX_BUFFER) VISIT_BUFFER.shift();
  if (PERSIST_VISITS) {
    const doc: any = {
      ts: now,
      route: entry.route,
      userId: entry.userId ?? null,
      role: entry.role ?? null,
      event: 'server_visit',
    };
    void AdminVisit.create(doc).catch(() => { });
  }
}

// Función para obtener un resumen de compatibilidad de features web basado en el HTML analizado y datos de soporte de navegadores. Evalúa el soporte requerido por las features usadas en el sitio y genera un resumen, recomendación y plan de acción para mejorar la compatibilidad. Utilizada en el análisis de portabilidad del sitio.
export function logRequest(method: string, url: string) {
  pushLog({ level: 'info', message: `${method} ${url}` });
}

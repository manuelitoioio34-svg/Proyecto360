// server/utils/telemetry.ts

// Utilidades para telemetría interna del sistema, incluyendo un temporizador de alta resolución, función de hashing para URLs, categorización de errores y un emisor seguro de eventos de telemetría. Estas funciones son utilizadas en diferentes partes del sistema para medir tiempos de ejecución, generar identificadores estables para URLs, clasificar errores que ocurren durante el diagnóstico y registrar eventos relevantes en la base de datos de telemetría sin afectar el rendimiento general del sistema.
import crypto from 'crypto';
import TelemetryEvent from '../database/telemetryEvent.js';

export function hrTimer() { const start = process.hrtime.bigint(); return () => Number(process.hrtime.bigint() - start) / 1e6; }

// Hashing de URLs para generar identificadores estables sin almacenar la URL completa. Utiliza SHA-256 y devuelve los primeros 16 caracteres hexadecimales del hash. Si la URL no es válida, se hashéa la cadena completa. Esto permite rastrear URLs de forma anónima en la telemetría, evitando almacenar información sensible.
export function hashUrl(u: string): string {
  try {
    const parsed = new URL(u);
    const base = parsed.origin + parsed.pathname.replace(/\\+/g,'/');
    return crypto.createHash('sha256').update(base).digest('hex').slice(0,16);
  } catch {
    return crypto.createHash('sha256').update(String(u)).digest('hex').slice(0,16);
  }
}

// Función para categorizar errores en tipos manejables, basada en el código de error y el status HTTP. Permite clasificar los errores en categorías como 'timeout', 'network', 'external_api', 'validation' o 'unknown', lo que facilita el análisis de fallos y la generación de métricas sobre los tipos de errores más comunes que ocurren durante el diagnóstico.
export function categorizeError(err: any): string {
  const code = err?.code || '';
  const status = err?.response?.status;
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return 'timeout';
  if (code === 'ENOTFOUND' || code === 'ECONNRESET' || code === 'EAI_AGAIN') return 'network';
  if (status && status >= 500) return 'external_api';
  if (status && status >= 400) return 'validation';
  return 'unknown';
}

// Función para emitir un evento de telemetría de forma segura, con manejo de errores interno. Intenta crear un nuevo documento en la colección de TelemetryEvent con la información proporcionada, incluyendo un timestamp y el tipo de evento. Si ocurre un error durante la creación del evento, se captura y se muestra una advertencia en la consola (solo en desarrollo), pero no se lanza el error, evitando que afecte el flujo normal del sistema.
export async function emitTelemetry(kind: string, data: Record<string, any>) {
  try {
    await TelemetryEvent.create({ ts: new Date(), kind, ...data });
  } catch (e: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('emitTelemetry failed', kind, e?.message); // eslint-disable-line no-console
    }
  }
}
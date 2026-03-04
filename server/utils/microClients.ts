// server/utils/microClients.ts

// Utilidades compartidas para llamar a los microservicios de PageSpeed y Seguridad.
// Centraliza config, reintentos y resolución de scores para no duplicar código
// entre FormController y diagnostic.controller.
import axios from "axios";

// ===== Configuración desde variables de entorno =====
export const MS_PAGESPEED_URL = process.env.MS_PAGESPEED_URL || "http://localhost:3001";
export const MS_SECURITY_URL  = process.env.MS_SECURITY_URL  || "http://localhost:3002";

export const PAGESPEED_TIMEOUT_MS     = Number.parseInt(process.env.PAGESPEED_TIMEOUT_MS     || "300000", 10);
export const SECURITY_TIMEOUT_MS      = Number.parseInt(process.env.SECURITY_TIMEOUT_MS      || "120000",  10);
export const RUN_MICROS_IN_SERIES     = /^(1|true|yes)$/i.test(process.env.RUN_MICROS_IN_SERIES || "");
export const SECURITY_RETRIES         = Math.max(0, Number.parseInt(process.env.SECURITY_RETRIES         || "2",    10));
export const SECURITY_RETRY_BACKOFF_MS = Math.max(0, Number.parseInt(process.env.SECURITY_RETRY_BACKOFF_MS || "1000", 10));

export const ALL_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;

// ===== Helpers genéricos =====

/** Añade /audit al endpoint base del micro PageSpeed */
export function withAudit(base?: string): string {
  if (!base) return "/audit";
  const trimmed = String(base).replace(/\/+$/, "");
  return trimmed.endsWith("/audit") ? trimmed : `${trimmed}/audit`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableSecurityError(err: any): boolean {
  const status: number | undefined = err?.response?.status;
  const code = (err?.code || err?.errno || "").toString();
  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || code === "ECONNRESET") return true;
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true;
  if (!err?.response) return true;
  return false;
}

export async function callWithRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; backoffMs?: number; label?: string }
): Promise<T> {
  const retries = Math.max(0, opts?.retries ?? SECURITY_RETRIES);
  const base    = Math.max(0, opts?.backoffMs ?? SECURITY_RETRY_BACKOFF_MS);
  const label   = opts?.label || "call";
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = base * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
        console.warn(`[Retry] ${label} intento ${attempt}/${retries} tras ${delay}ms`);
        await sleep(delay);
      }
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (!isRetryableSecurityError(err) || attempt === retries) throw err;
    }
  }
  throw lastErr;
}

// ===== Llamadas directas a microservicios =====

/** Llama al micro PageSpeed y devuelve su payload completo.
 *  @param timeoutMs  Anula PAGESPEED_TIMEOUT_MS (útil para llamadas del stream con guardia propia). */
export async function runPagespeedViaMicro(url: string, strategy: "mobile" | "desktop", timeoutMs?: number) {
  const endpoint = withAudit(MS_PAGESPEED_URL);
  const payload  = { url, strategy, categories: [...ALL_CATEGORIES] };
  const { data } = await axios.post(endpoint, payload, { timeout: timeoutMs ?? PAGESPEED_TIMEOUT_MS });
  return data;
}

/** Llama al micro de Seguridad y devuelve su payload completo */
export async function runSecurityMicro(url: string) {
  const endpoint = `${MS_SECURITY_URL}/api/analyze`;
  const { data } = await axios.post(endpoint, { url }, { timeout: SECURITY_TIMEOUT_MS });
  return data;
}

/**
 * Extrae el score de performance (0–100) del payload del micro PageSpeed.
 * Prueba múltiples estructuras para mantener compatibilidad con versiones anteriores.
 */
export function resolvePerformanceFromPagespeed(ps: any): number | null {
  // 1) categoryScores.performance directo (micro reciente)
  const catScores = ps?.categoryScores || {};
  if (typeof catScores?.performance === "number" && !Number.isNaN(catScores.performance))
    return Math.round(catScores.performance);

  // 2) Estructura antigua: audit.pagespeed.categoryScores.performance
  const apPerf = ps?.audit?.pagespeed?.categoryScores?.performance;
  if (typeof apPerf === "number" && !Number.isNaN(apPerf))
    return Math.round(apPerf);

  // 3) metrics.performance (0-100)
  const metricPerf = ps?.metrics?.performance;
  if (typeof metricPerf === "number" && !Number.isNaN(metricPerf))
    return Math.round(metricPerf);

  // 4) performance plano (0-100)
  if (typeof ps?.performance === "number" && !Number.isNaN(ps.performance))
    return Math.round(ps.performance);

  // 5) LHR nativo (0-1 → 0-100)
  const rawScore = ps?.raw?.lighthouseResult?.categories?.performance?.score;
  if (typeof rawScore === "number" && !Number.isNaN(rawScore))
    return Math.round(rawScore * 100);

  return null;
}

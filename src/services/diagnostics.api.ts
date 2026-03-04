// src/services/diagnostics.api.ts

export type Trend = "up" | "down" | "flat" | string;
export type Color = "green" | "amber" | "red" | "gray" | string;

export type ProcessedMetric = {
  key: string;
  raw?: number | null;
  display?: string;
  color: Color;
  trend?: Trend;
};

export type ProcessedOpportunity = {
  id: string;
  title: string;
  savingsLabel?: string;
  recommendation?: string;
};

export type ProcessedDiagnostics = {
  url: string;
  currentDate?: string;
  previousDate?: string;
  metrics: ProcessedMetric[];
  opportunities: ProcessedOpportunity[];
  // Campos extra que pudiera devolver el backend:
  [k: string]: unknown;
};

export async function fetchProcessedByUrl(url: string): Promise<ProcessedDiagnostics> {
  const res = await fetch(`/api/diagnostics/${encodeURIComponent(url)}/processed`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "No se pudo obtener el diagnóstico procesado");
  }
  return (await res.json()) as ProcessedDiagnostics;
}

// -------- Full check (nuevas 4 APIs) --------
export type FullCheckTypes = Array<"usability" | "fiability" | "maintainability" | "portability">;

export type AxeViolation = {
  id: string;
  impact: string | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: number;
  tags: string[];
};

export type UptimeProbe = { status: number | null; ms: number; redirected?: boolean };

export type Technology = { name: string; version?: string | null; categories?: string[]; confidence?: number };

export type FeatureMatrix = Record<string, Record<string, boolean>>; // feature -> browser -> support

export type FullCheckResult = {
  url: string;
  summary: {
    accessibilityScore: number | null;
    uptimeMs: number | null;
    stackItems: number | null;
    compatibleBrowsers: string[];
  };
  results: {
    usability?: { metrics?: any; summary?: string; recommendation?: string; actionPlan?: Array<{ id: string; title: string; recommendation: string; severity?: string }>; details?: { violations: AxeViolation[]; statsByImpact: Record<string, number> } };
    fiability?: { metrics?: { availability?: number; avgResponseTime?: number }; summary?: string; recommendation?: string; actionPlan?: Array<{ id: string; title: string; recommendation: string; severity?: string }>; details?: { series: UptimeProbe[]; headers?: Record<string, string | string[] | undefined> } };
    maintainability?: { metrics?: any; summary?: string; recommendation?: string; actionPlan?: Array<{ id: string; title: string; recommendation: string; severity?: string }>; details?: { technologies: Technology[] }; raw?: any };
    portability?: { metrics?: any; summary?: string; recommendation?: string; actionPlan?: Array<{ id: string; title: string; recommendation: string; severity?: string }>; details?: { usedFeatures: string[]; supportMatrix: FeatureMatrix } };
  };
};

export async function runFullCheck(url: string, types?: FullCheckTypes): Promise<FullCheckResult> {
  const res = await fetch(`/api/diagnostics/full-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ url, types }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "No se pudo ejecutar el diagnóstico integral");
  }
  return (await res.json()) as FullCheckResult;
}

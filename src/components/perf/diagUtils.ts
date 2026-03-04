// ——— src/components/perf/diagUtils.ts ———

// Utilidades puras para DiagnosticoView (gauges, colores, parsers, builders)
// Sin dependencias de React ni imports de UI.

import {
  ApiData,
  ProcessedData,
  LighthouseAudit,
  ErrorItem,
  ImprovementItem,
  OpportunityItem,
  ProcessedMetric,
  Trend,
  LighthouseCategory,
  AuditApiResponse,
} from '../../shared/types/api.js';

import {
  tTitle as i18nTitle,
  tRich as i18nRich,
  tSavings as i18nSavings,
} from '../../../microPagespeed/src/lib/lh-i18n-es';

import { safeParseJSON } from '../../shared/lib/utils';

// ======= Types =======
export type MetricId =
  | 'performance'
  | 'fcp'
  | 'lcp'
  | 'tbt'
  | 'si'
  | 'ttfb'
  | 'cls'
  | 'accessibility'
  | 'best-practices'
  | 'seo'
  | string;

export type PlanItem = {
  id: string;
  title: string;
  recommendation?: string;
  savingsLabel?: string;
  type: 'error' | 'improvement';
  severity?: 'critical' | 'info';
  impactScore?: number;
};

export type CatBreakItem = {
  id: string;
  title: string;
  scorePct: number | null;
  displayValue?: string;
  description?: string;
  savingsLabel?: string;
};

// ======= Gauge colors =======
export function gaugeColor(metricId: MetricId, value: number | null | undefined): string {
  const green = '#22c55e', amber = '#f59e0b', red = '#ef4444', gray = '#9ca3af';
  if (value == null) return gray;
  if (['performance', 'accessibility', 'best-practices', 'seo'].includes(metricId)) {
    return value >= 90 ? green : value >= 50 ? amber : red;
  }
  switch (metricId) {
    case 'fcp':   return value < 1.8 ? green : value <= 3.0 ? amber : red;
    case 'lcp':   return value < 2.5 ? green : value <= 4.0 ? amber : red;
    case 'tbt':   return value < 0.2 ? green : value <= 0.6 ? amber : red;
    case 'si':    return value < 3.4 ? green : value <= 5.8 ? amber : red;
    case 'ttfb':  return value < 0.8 ? green : value <= 1.8 ? amber : red;
    case 'cls':   return value < 0.1 ? green : value <= 0.25 ? amber : red;
    default:      return amber;
  }
}

export function softBg(metricId: MetricId, value: number | null | undefined): string {
  const isPct = ['performance', 'accessibility', 'best-practices', 'seo'].includes(metricId);
  if (!isPct || value == null) return '#ffffff';
  if (value >= 90) return 'rgba(34,197,94,0.08)';
  if (value >= 50) return 'rgba(245,158,11,0.08)';
  return 'rgba(239,68,68,0.08)';
}

export function softTint(metricId: MetricId, value: number | null | undefined): string {
  if (value == null) return 'rgba(148,163,184,0.10)';
  if (['performance', 'accessibility', 'best-practices', 'seo'].includes(metricId)) {
    if (value >= 90) return 'rgba(34,197,94,0.12)';
    if (value >= 50) return 'rgba(245,158,11,0.12)';
    return 'rgba(239,68,68,0.12)';
  }
  const col = gaugeColor(metricId, value);
  if (col === '#22c55e') return 'rgba(34,197,94,0.12)';
  if (col === '#f59e0b') return 'rgba(245,158,11,0.12)';
  if (col === '#ef4444') return 'rgba(239,68,68,0.12)';
  return 'rgba(148,163,184,0.10)';
}

export const trendSymbol = (t?: Trend) => (t === 'up' ? '↑' : t === 'down' ? '↓' : '→');
export const trendColor = (t?: Trend) =>
  t === 'up' ? '#16a34a' : t === 'down' ? '#ef4444' : '#6b7280';

export const toSeconds = (ms: number | null | undefined): number | null =>
  typeof ms === 'number' && !Number.isNaN(ms)
    ? Math.round((ms / 1000) * 10) / 10
    : null;

// ======= LHR helpers =======
export function pickAudits(apiData: ApiData): Record<string, LighthouseAudit> {
  return (
    apiData?.raw?.lighthouseResult?.audits ||
    apiData?.raw?.audits ||
    apiData?.lighthouseResult?.audits ||
    apiData?.result?.lhr?.audits ||
    apiData?.result?.lighthouseResult?.audits ||
    apiData?.data?.lhr?.audits ||
    apiData?.data?.lighthouseResult?.audits ||
    apiData?.audits ||
    {}
  );
}

export function readCategoryScoresFromApi(apiData: ApiData): {
  performance: number | null;
  accessibility: number | null;
  'best-practices': number | null;
  seo: number | null;
} {
  const direct = apiData?.categoryScores;
  if (direct && typeof direct === 'object') {
    const v = (x: number | undefined) =>
      typeof x === 'number' && !Number.isNaN(x) ? Math.round(x) : null;
    return {
      performance: v(direct.performance),
      accessibility: v(direct.accessibility),
      'best-practices': v(direct['best-practices']),
      seo: v(direct.seo),
    };
  }
  const cats =
    apiData?.raw?.lighthouseResult?.categories ||
    apiData?.raw?.categories ||
    apiData?.lighthouseResult?.categories ||
    apiData?.categories ||
    apiData?.data?.lighthouseResult?.categories ||
    apiData?.result?.lighthouseResult?.categories ||
    null;

  const toPct = (x?: number) =>
    typeof x === 'number' && !Number.isNaN(x) ? Math.round(x * 100) : null;

  return {
    performance: toPct(cats?.performance?.score),
    accessibility: toPct(cats?.accessibility?.score),
    'best-practices': toPct(cats?.['best-practices']?.score),
    seo: toPct(cats?.seo?.score),
  };
}

export function detectFormFactor(apiData: ApiData): 'mobile' | 'desktop' | undefined {
  const lhr =
    apiData?.raw?.lighthouseResult ||
    apiData?.lighthouseResult ||
    apiData?.result?.lhr ||
    apiData?.data?.lhr ||
    null;

  const cfg = lhr?.configSettings || {};
  const emu = cfg.emulatedFormFactor ?? cfg.formFactor;
  if (emu === 'mobile' || emu === 'desktop') return emu;
  if (cfg?.screenEmulation && typeof cfg.screenEmulation.mobile === 'boolean') {
    return cfg.screenEmulation.mobile ? 'mobile' : 'desktop';
  }
  return undefined;
}

export function getAuditSeconds(apiData: ApiData, id: string): number | null {
  const audits = pickAudits(apiData);
  const a = audits?.[id];
  if (!a) return null;

  const metrics = apiData?.metrics;
  if (metrics && typeof metrics[id] === 'number') {
    if (/cumulative-layout-shift|^cls$/i.test(id)) return Math.round(metrics[id] * 100) / 100;
    return toSeconds(metrics[id]);
  }
  if (typeof a.numericValue === 'number') {
    if (/cumulative-layout-shift|^cls$/i.test(id)) return Math.round(a.numericValue * 100) / 100;
    return toSeconds(a.numericValue);
  }
  const dv: string | undefined = a.displayValue;
  if (dv) {
    const m1 = dv.match(/([\d.,]+)\s*ms/i);
    const m2 = dv.match(/([\d.,]+)\s*s/i);
    if (m1) return Math.round((parseFloat(m1[1].replace(',', '.')) / 1000) * 10) / 10;
    if (m2) return Math.round(parseFloat(m2[1].replace(',', '.')) * 10) / 10;
  }
  return null;
}

// ======= i18n list helper =======
export const translateList = (list: unknown[] | undefined): CatBreakItem[] =>
  Array.isArray(list)
    ? list.map((it: unknown) => {
        const item = it as {
          id?: unknown; title?: unknown; scorePct?: unknown; score?: unknown;
          displayValue?: unknown; description?: unknown; savingsLabel?: unknown;
        };
        return {
          id: String(item?.id ?? ''),
          title: i18nTitle(String(item?.title || item?.id || '')),
          scorePct:
            typeof item?.scorePct === 'number'
              ? item.scorePct
              : typeof item?.score === 'number'
                ? Math.round(item.score * 100)
                : null,
          displayValue: String(item?.displayValue || ''),
          description: i18nRich(String(item?.description || '')),
          savingsLabel: String(item?.savingsLabel || ''),
        };
      })
    : [];

// ======= Builders =======
export function buildFindings(apiData: ApiData, processed: ProcessedData | null) {
  const fromProc = {
    errors: Array.isArray(processed?.errors) ? processed!.errors : [],
    improvements: Array.isArray(processed?.improvements) ? processed!.improvements : [],
  };
  if (fromProc.errors.length || fromProc.improvements.length) return fromProc;

  const auditsObj = pickAudits(apiData);
  const all = Object.entries(auditsObj).map(([auditId, a]) => ({ ...(a as LighthouseAudit), id: auditId }));

  const errors: ErrorItem[] = [], improvements: ImprovementItem[] = [];
  for (const a of all) {
    if ((a as LighthouseAudit).scoreDisplayMode === 'manual' ||
        (a as LighthouseAudit).scoreDisplayMode === 'notApplicable') continue;
    const item: ErrorItem = {
      id: a.id,
      title: i18nTitle((a as unknown as { title?: string }).title || a.id),
      description: i18nRich((a as unknown as { description?: string }).description || ''),
      displayValue: (a as unknown as { displayValue?: string }).displayValue || '',
      details: (a as unknown as { details?: unknown }).details || null,
      score: typeof (a as LighthouseAudit).score === 'number' ? (a as LighthouseAudit).score! : null,
      typeHint: (a as unknown as { details?: { type?: string } }).details?.type || null,
    };
    if (typeof item.score === 'number') {
      if (item.score < 0.5) errors.push(item);
      else if (item.score < 1) improvements.push(item as ImprovementItem);
    } else if (item.typeHint === 'opportunity') {
      improvements.push(item as ImprovementItem);
    }
  }
  errors.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  improvements.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  return { errors, improvements };
}

export function buildOpportunities(apiData: ApiData, processed: ProcessedData | null): OpportunityItem[] {
  if (Array.isArray(processed?.opportunities) && processed!.opportunities!.length) {
    return processed!.opportunities!.map((o: OpportunityItem) => ({
      ...o,
      type: o.type || 'improvement',
      severity: o.severity || 'info',
      impactScore: o.impactScore ?? 100,
      title: i18nTitle(o.title || o.id),
      recommendation: i18nRich(o.recommendation || ''),
    }));
  }

  const auditsObj = pickAudits(apiData);
  const all = Object.entries(auditsObj).map(([id, a]) => ({ ...(a as LighthouseAudit), id }));

  const opps: OpportunityItem[] = [];
  for (const a of all) {
    const d = (a as unknown as { details?: Record<string, unknown> }).details || {};
    const hasOppType = d['type'] === 'opportunity';
    const ms = typeof d['overallSavingsMs'] === 'number' ? d['overallSavingsMs'] as number : null;
    const by = typeof d['overallSavingsBytes'] === 'number' ? d['overallSavingsBytes'] as number : null;

    if (hasOppType || ms != null || by != null) {
      let savingsLabel = i18nSavings(a.displayValue || '');
      if (!savingsLabel) {
        if (ms != null && ms > 0)
          savingsLabel = ms >= 100 ? `${Math.round((ms / 1000) * 10) / 10}s` : `${Math.round(ms)}ms`;
        else if (by != null && by > 0) {
          const kb = by / 1024;
          savingsLabel = kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${Math.round(kb)}KB`;
        }
      }
      opps.push({
        id: a.id,
        title: i18nTitle(a.title || a.id),
        recommendation: i18nRich(a.description || ''),
        savingsLabel,
        impactScore: (ms || 0) + (by ? Math.min(by / 10, 1000) : 0),
        type: 'improvement',
        severity: 'info',
      });
    }
  }
  opps.sort((b, a) => (a.impactScore || 0) - (b.impactScore || 0));
  return opps;
}

export function getCategoryBreakdown(
  catKey: 'accessibility' | 'best-practices' | 'seo',
  apiData: ApiData,
): CatBreakItem[] {
  const categories =
    apiData?.raw?.lighthouseResult?.categories ||
    apiData?.raw?.categories ||
    apiData?.lighthouseResult?.categories ||
    apiData?.categories ||
    null;

  const cat = categories?.[catKey];
  if (!cat || typeof cat === 'number' || !Array.isArray(cat.auditRefs)) return [];

  const auditsObj = pickAudits(apiData);

  const items = (cat.auditRefs
    .map((ref: { id: string; weight: number }) => {
      const a = auditsObj?.[ref.id] || {};
      const sdm: string | undefined = (a as LighthouseAudit).scoreDisplayMode;
      if (sdm === 'notApplicable' || sdm === 'manual') return null;

      const s =
        typeof (a as LighthouseAudit).score === 'number'
          ? Math.round((a as LighthouseAudit).score! * 100)
          : null;

      let savingsLabel = '';
      const d = (a as unknown as { details?: Record<string, unknown> }).details || {};
      const ms = typeof d['overallSavingsMs'] === 'number' ? d['overallSavingsMs'] as number : null;
      const by = typeof d['overallSavingsBytes'] === 'number' ? d['overallSavingsBytes'] as number : null;
      if (ms != null && ms > 0) {
        savingsLabel = ms >= 100 ? `${Math.round((ms / 1000) * 10) / 10}s` : `${Math.round(ms)}ms`;
      } else if (by != null && by > 0) {
        const kb = by / 1024;
        savingsLabel = kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${Math.round(kb)}KB`;
      }

      return {
        id: String(ref.id),
        title: i18nTitle((a as unknown as { title?: string }).title || ref.id),
        scorePct: s,
        displayValue: (a as unknown as { displayValue?: string }).displayValue || '',
        description: i18nRich((a as unknown as { description?: string }).description || ''),
        savingsLabel,
      } as CatBreakItem;
    })
    .filter(Boolean) as CatBreakItem[]);

  items.sort((A, B) => {
    const sA = A.scorePct ?? -1, sB = B.scorePct ?? -1;
    if (sA !== sB) return sA - sB;
    const wA = (cat as LighthouseCategory).auditRefs.find((r: { id: string; weight: number }) => r.id === A.id)?.weight ?? 0;
    const wB = (cat as LighthouseCategory).auditRefs.find((r: { id: string; weight: number }) => r.id === B.id)?.weight ?? 0;
    return wB - wA;
  });

  return items.slice(0, 9);
}

// ======= fetchAuditByUrlWithStrategy =======
export async function fetchAuditByUrlWithStrategy(
  url: string,
  strategy: 'mobile' | 'desktop',
  ts: number,
): Promise<AuditApiResponse | null> {
  const urlSafe = encodeURIComponent(url);
  const headers = { 'Cache-Control': 'no-cache' };
  const candidates = [
    `/api/diagnostics/${urlSafe}/audit?strategy=${strategy}&_=${ts}`,
    `/api/audit/by-url?url=${urlSafe}&strategy=${strategy}&_=${ts}`,
    `/api/form/audit?url=${urlSafe}&strategy=${strategy}&_=${ts}`,
  ];
  for (const endpoint of candidates) {
    try {
      const r = await fetch(endpoint, { headers });
      if (r.ok) return (await safeParseJSON(r)) as AuditApiResponse;
    } catch { /* intentional */ }
  }
  return null;
}

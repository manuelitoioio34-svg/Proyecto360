// ——— src/components/DiagnosticoView.tsx ———
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import SecurityDiagnosticoPanel from './dashboard/SecurityDiagnosticoPanel';
import { API_LABELS } from './perf/diagViewHelpers';
import { PerfDiagContent } from './perf/PerfDiagContent';

// shadcn/ui
import { Card, CardContent } from '../shared/ui/card';
import { Spinner } from '../shared/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '../shared/ui/tabs';
import { useAuth } from './auth/AuthContext';
import { AccessBanner, PermCode } from '../shared/ui/access-banner';
import {
  ApiData,
  ProcessedData,
  ProcessedMetric,
  Trend,
  AuditApiResponse,
} from '../shared/types/api.js';
import { safeParseJSON } from '../shared/lib/utils';

// Utilidades puras (gauge colors, builders, LHR helpers)
import {
  MetricId,
  PlanItem,
  toSeconds,
  pickAudits,
  readCategoryScoresFromApi,
  detectFormFactor,
  getAuditSeconds,
  buildFindings,
  buildOpportunities,
  getCategoryBreakdown,
  fetchAuditByUrlWithStrategy,
} from './perf/diagUtils';

// Componentes extraidos
import type { MetricCardItem } from './perf/MetricCard';

// ── Helper: clasificar errores externos ─────────────────────────────────────
function classifyApiError(msg: string): 'quota' | 'network' | 'timeout' | 'url' | 'generic' {
  const m = msg.toLowerCase();
  if (/quota|rate.?limit|too many|429|limit exceed/.test(m))   return 'quota';
  if (/timeout|timed?.out|etimedout|deadline/.test(m))          return 'timeout';
  if (/dns|enotfound|econnrefused|network|unreachable|fetch failed|failed to fetch/.test(m)) return 'network';
  if (/invalid url|not a valid|url inválida|couldn.*t resolve|no such host/.test(m)) return 'url';
  return 'generic';
}

const API_ERROR_META = {
  quota:   { icon: '⏱️', title: 'Límite de uso de la API alcanzado', color: 'amber',
    desc: 'La API de análisis (Google PageSpeed / Unlighthouse) rechazó la solicitud por exceso de peticiones. Esto es una restricción temporal del proveedor externo, no un fallo del aplicativo.' },
  timeout: { icon: '⌛', title: 'Tiempo de espera agotado', color: 'amber',
    desc: 'El análisis tardó demasiado y la API externa anuló la solicitud. Suele ocurrir con sitios lentos o cuando el proveedor está saturado. Prueba de nuevo en unos minutos.' },
  network: { icon: '🔌', title: 'Error de red o DNS', color: 'red',
    desc: 'No fue posible alcanzar la API externa o la URL analizada no es accesible desde el servidor. Verifica que la URL sea pública y que no haya restricciones de red/firewall.' },
  url:     { icon: '🔗', title: 'URL no accesible para la API', color: 'red',
    desc: 'La API externa no pudo resolver o acceder a la URL solicitada. Confirma que sea una URL pública válida (sin autenticación, sin bloqueos por IP).' },
  generic: { icon: '⚠️', title: 'La API externa devolvió un error', color: 'orange',
    desc: 'Se recibió un error del proveedor externo de análisis. Esto no es un fallo interno del aplicativo; puede deberse a políticas temporales de la API, mantenimiento del proveedor o restricciones del sitio auditado.' },
} as const;

function ApiErrorBanner({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  const [showDetail, setShowDetail] = React.useState(false);
  const type  = classifyApiError(msg);
  const meta  = API_ERROR_META[type];
  const colorMap = {
    amber:  { wrap: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40',  icon: 'bg-amber-100 dark:bg-amber-800/40',  title: 'text-amber-900 dark:text-amber-200',  body: 'text-amber-800 dark:text-amber-300',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300', btn: 'border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/30' },
    red:    { wrap: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700/40',          icon: 'bg-red-100 dark:bg-red-800/40',      title: 'text-red-900 dark:text-red-200',      body: 'text-red-800 dark:text-red-300',      badge: 'bg-red-100 text-red-700 dark:bg-red-800/40 dark:text-red-300',      btn: 'border-red-400 text-red-800 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30' },
    orange: { wrap: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700/40', icon: 'bg-orange-100 dark:bg-orange-800/40', title: 'text-orange-900 dark:text-orange-200', body: 'text-orange-800 dark:text-orange-300', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300', btn: 'border-orange-400 text-orange-800 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/30' },
  };
  const c = colorMap[meta.color];
  return (
    <div className={`rounded-xl border p-5 space-y-3 ${c.wrap}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl ${c.icon}`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className={`text-base font-semibold ${c.title}`}>{meta.title}</h3>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.badge}`}>API externa</span>
          </div>
          <p className={`text-sm leading-relaxed ${c.body}`}>{meta.desc}</p>
        </div>
      </div>

      {/* Causas comunes */}
      <div className={`text-xs rounded-lg p-3 space-y-1 ${c.icon}`}>
        <p className={`font-semibold mb-1.5 ${c.title}`}>Causas habituales:</p>
        <ul className={`space-y-0.5 list-none ${c.body}`}>
          <li>• Cuota de peticiones de la API de Google PageSpeed agotada temporalmente</li>
          <li>• Políticas de rate-limiting del proveedor externo (Unlighthouse / PSI)</li>
          <li>• La URL analizada bloquea bots o peticiones automatizadas</li>
          <li>• El servidor del sitio auditado está caído o inaccesible en ese momento</li>
        </ul>
      </div>

      {/* Detalle técnico colapsable */}
      <button
        onClick={() => setShowDetail(v => !v)}
        className={`text-xs underline underline-offset-2 ${c.body} hover:opacity-80 transition-opacity`}
      >
        {showDetail ? '▲ Ocultar detalle técnico' : '▼ Ver detalle técnico'}
      </button>
      {showDetail && (
        <code className={`block text-[11px] font-mono break-all p-2 rounded ${c.icon} ${c.body}`}>{msg}</code>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className={`mt-1 inline-flex items-center gap-2 text-sm font-medium border rounded-lg px-4 py-2 transition-colors ${c.btn}`}
        >
          🔄 Reintentar análisis
        </button>
      )}
    </div>
  );
}

// AuditEnvelope = alias local de AuditApiResponse para no romper referencias existentes
type AuditEnvelope = AuditApiResponse;

// =================== Componente principal ===================
export default function DiagnosticoView() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const id: string | null =
    (params as Record<string, string>)?.id || new URLSearchParams(location.search).get('id');

  const { user, loading: authLoading } = useAuth();
  const perms = user?.permissions || [];
  const can = (p: string) => user?.role === 'admin' || perms.includes(p);

  const canPerfActionPlan = can('performance.view_action_plan');
  const canPerfBreakdowns = can('performance.view_breakdowns');
  const canChangeStrategy = can('performance.change_strategy');

  const qs = new URLSearchParams(location.search);
  const initialStrategy = (qs.get('strategy') === 'desktop' ? 'desktop' : 'mobile') as 'mobile' | 'desktop';

  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>(initialStrategy);

  const typeParam = (qs.get('type') || '').toLowerCase();
  const isSecurity = typeParam === 'security';

  const [auditData, setAuditData] = useState<AuditEnvelope | null>(null);
  const [err, setErr] = useState<string>('');
  const [activeApi, setActiveApi] = useState<string>('');
  const [processed, setProcessed] = useState<ProcessedData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  const [showPerfDetails, setShowPerfDetails] = useState(canPerfBreakdowns);
  const [showBPDetails, setShowBPDetails] = useState(false);
  const [showSeoDetails, setShowSeoDetails] = useState(false);
  const [cardInfoOpen, setCardInfoOpen] = useState<Record<string, boolean>>({});

  const contenedorReporteRef = useRef<HTMLDivElement | null>(null);

  const emailContext: 'performance' | 'security' = isSecurity ? 'security' : 'performance';

  // =================== Carga principal ===================
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const ts = Date.now();
    const ORDER = ['pagespeed', 'unlighthouse'] as const;

    (async () => {
      try {
        const payload = await safeParseJSON(
          await fetch(`/api/audit/${id}?strategy=${strategy}&_=${ts}`, {
            headers: { 'Cache-Control': 'no-cache' },
          }),
        ) as AuditApiResponse;
        if (payload.error || payload.message) throw new Error(payload.error || payload.message);

        const available = Object.keys(payload.audit || {}).filter((k) => {
          const m = (payload.audit?.[k] || {}).metrics || payload.audit?.[k] || {};
          return Object.keys(m).length > 0;
        });
        const apis = ORDER.filter((k) => available.includes(k));
        if (mounted) {
          setActiveApi(apis[0] || '');
          setAuditData(payload);
        }

        try {
          const currentApiKey = apis[0] || '';
          const currentApiData = (payload.audit as Record<string, ApiData>)[currentApiKey] || {};
          const ff = detectFormFactor(currentApiData);
          if (payload.url && ff && ff !== strategy) {
            const forced = await fetchAuditByUrlWithStrategy(payload.url, strategy, ts);
            if (forced && mounted) {
              const available2 = Object.keys(forced.audit || {}).filter((k: string) => {
                const m = (forced.audit?.[k] || {}).metrics || forced.audit?.[k] || {};
                return Object.keys(m).length > 0;
              });
              const apis2 = ORDER.filter((k) => available2.includes(k));
              setActiveApi(apis2[0] || currentApiKey);
              setAuditData(forced);
            }
          }
        } catch { /* intentional */ }

        if (payload.url || auditData?.url) {
          const urlForProcessed = (payload.url || auditData?.url) as string;
          const urlSafe = encodeURIComponent(urlForProcessed);
          try {
            const r = await fetch(
              `/api/diagnostics/${urlSafe}/processed?strategy=${strategy}&_=${ts}`,
              { headers: { 'Cache-Control': 'no-cache' } },
            );
            if (r.ok) {
              const d = await safeParseJSON(r) as ProcessedData;
              if (mounted) setProcessed(d);
            }
          } catch { /* intentional */ }
        }
      } catch (e: unknown) {
        if (mounted) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setPerfLoading(false);
      }
    })();

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, strategy]);

  useEffect(() => {
    if (!id) return;
    setPerfLoading(true);
  }, [strategy]);

  // =================== Early returns ===================
  if (authLoading) return (
    <div className="p-8 text-center text-slate-500 dark:text-slate-400 dark:bg-[#0d1626] min-h-[200px] flex items-center justify-center">
      <Spinner />
    </div>
  );

  if (!id) {
    return (
      <Card className="dark:bg-[#13203a] dark:border-[#1e2d45]">
        <CardContent className="p-6">
          <p className="text-red-600 dark:text-red-400">No se especificó un ID de diagnóstico.</p>
        </CardContent>
      </Card>
    );
  }

  if (err) {
    return (
      <Card className="dark:bg-[#13203a] dark:border-[#1e2d45]">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No se pudo completar el diagnóstico
          </h2>
          <ApiErrorBanner
            msg={err}
            onRetry={() => { setErr(''); setAuditData(null); navigate(0); }}
          />
        </CardContent>
      </Card>
    );
  }

  if (!auditData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a1220] dark:to-[#0d1626] flex items-center justify-center">
        <Card className="w-full max-w-md dark:bg-[#13203a] dark:border-[#1e2d45]">
          <CardContent className="p-10">
            <div className="flex flex-col items-center gap-5">
              <div className="w-16 h-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Cargando diagnóstico</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">Preparando los datos del análisis...</p>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">Esto puede tomar unos segundos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =================== Datos ===================
  const { url, audit = {} } = (auditData as AuditApiResponse & { audit?: Record<string, ApiData> });
  const apiData: ApiData = (audit as Record<string, ApiData>)[activeApi] || {};
  const metrics = apiData.metrics || apiData;

  if (!isSecurity && (!activeApi || Object.keys(metrics).length === 0)) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="diagnostico-title">
            Diagnostico de: <span className="url">{url}</span>
          </h2>
          <ApiErrorBanner
            msg="No se recibieron métricas de rendimiento desde la API de análisis. La solicitud puede haber sido limitada, expirado o rechazada por políticas de la API externa."
            onRetry={() => { setAuditData(null); navigate(0); }}
          />
        </CardContent>
      </Card>
    );
  }

  const pTrend = (k: string): Trend | undefined => {
    const m = processed?.metrics;
    if (Array.isArray(m)) return m.find((x: ProcessedMetric) => x?.key === k)?.trend;
    if (m && typeof m === 'object') {
      const metric = (m as Record<string, { raw?: number; trend?: Trend } | number>)[k];
      return typeof metric === 'object' && metric !== null ? metric.trend : undefined;
    }
    return undefined;
  };

  let performance: number | null = null;
  if (typeof apiData.performance === 'number') performance = Math.round(apiData.performance);
  else if (typeof metrics.performance === 'number') performance = Math.round(metrics.performance);
  else {
    const catsLocal = readCategoryScoresFromApi(apiData);
    performance = catsLocal.performance;
  }

  const fcpSec  = toSeconds(metrics.fcp)  ?? getAuditSeconds(apiData, 'first-contentful-paint');
  const lcpSec  = toSeconds(metrics.lcp)  ?? getAuditSeconds(apiData, 'largest-contentful-paint');
  const siSec   = toSeconds(metrics.si)   ?? getAuditSeconds(apiData, 'speed-index');
  const tbtSec  = toSeconds(metrics.tbt)  ?? getAuditSeconds(apiData, 'total-blocking-time');
  const ttfbSec = toSeconds(metrics.ttfb) ?? getAuditSeconds(apiData, 'server-response-time') ?? getAuditSeconds(apiData, 'time-to-first-byte');

  let clsVal: number | null = null;
  try {
    const audits = pickAudits(apiData);
    const clsAudit = audits?.['cumulative-layout-shift'] || audits?.['cumulative-layout-shift-element'] || audits?.['cls'];
    const nv = clsAudit?.numericValue;
    if (typeof nv === 'number' && nv >= 0) clsVal = Math.round(nv * 100) / 100;
  } catch { /* intentional */ }

  const trendByKey: Record<string, Trend | undefined> = {
    performance: pTrend('performance'),
    fcp: pTrend('fcp'), lcp: pTrend('lcp'), si: pTrend('si'),
    ttfb: pTrend('ttfb'), tbt: pTrend('tbt'), cls: pTrend('cls'),
  };

  const cats = readCategoryScoresFromApi(apiData);
  const bestPracticesPct = cats['best-practices'];
  const seoPct = cats.seo;

  const perfCard: MetricCardItem = {
    id: 'performance' as MetricId,
    label: 'RENDIMIENTO',
    value: performance,
    desc: `Puntaje de rendimiento segun ${API_LABELS[activeApi]} (${strategy === 'mobile' ? 'Movil' : 'Ordenador'}).`,
  };

  const categoryCards: MetricCardItem[] = [
    { id: 'best-practices' as MetricId, label: 'PRACTICAS RECOMEND.', value: bestPracticesPct, desc: 'Seguridad y practicas modernas de desarrollo' },
    { id: 'seo' as MetricId, label: 'SEO', value: seoPct, desc: 'Buenas practicas basicas de SEO' },
  ];

  const perfBreakItems: Array<{ id: MetricId; label: string; value: number | null }> = [
    { id: 'fcp',  label: 'FCP',  value: fcpSec  },
    { id: 'lcp',  label: 'LCP',  value: lcpSec  },
    { id: 'tbt',  label: 'TBT',  value: tbtSec  },
    { id: 'si',   label: 'SI',   value: siSec   },
    { id: 'ttfb', label: 'TTFB', value: ttfbSec },
    { id: 'cls',  label: 'CLS',  value: clsVal  },
  ];

  const bpBreak  = getCategoryBreakdown('best-practices', apiData);
  const seoBreak = getCategoryBreakdown('seo', apiData);

  const findings = buildFindings(apiData, processed);
  const opportunities = buildOpportunities(apiData, processed);
  const planItems: PlanItem[] = [
    ...findings.errors.map((e) => ({
      id: e.id, title: e.title, recommendation: e.description,
      type: 'error' as const, severity: 'critical' as const, impactScore: 2200,
    })),
    ...findings.improvements.map((e) => ({
      id: e.id, title: e.title, recommendation: e.description,
      type: 'improvement' as const, severity: 'info' as const, impactScore: 900,
    })),
    ...(opportunities as PlanItem[]),
  ];

  // =================== UI ===================
  return (
    <Card data-page="diagnostico-view" className="bg-white dark:bg-[#0d1626] border border-slate-200 dark:border-[#1e2d45] shadow-sm rounded-xl">
      <CardContent>
        <div ref={contenedorReporteRef} className="w-full overflow-x-hidden">

          <div className="flex items-center gap-4 mb-2">
            {!!url && new URLSearchParams(location.search).get('src') === 'dashboard' && (
              <Link to={`/dashboard?url=${encodeURIComponent(url as string)}`} className="back-link">
                Volver a vista general
              </Link>
            )}
          </div>

          {!isSecurity && (canPerfActionPlan || canPerfBreakdowns) && (
            <div className="flex flex-col gap-4">
              {canPerfActionPlan && (
                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 mb-4 px-2">
                  <Tabs value={strategy} onValueChange={(v) => { setPerfLoading(true); setStrategy(v as 'mobile' | 'desktop'); }}>
                    <TabsList className="bg-[#e9eefb] dark:bg-[#162440] rounded-xl p-1 w-full sm:w-auto">
                      <TabsTrigger value="mobile" className="flex-1 sm:w-32 lg:w-40 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm" disabled={perfLoading || !canChangeStrategy}>
                        <span role="img" aria-label="mobile" className="mr-1 sm:mr-2">📱</span>
                        <span className="hidden sm:inline">Movil</span><span className="sm:hidden">Mov</span>
                        {perfLoading && strategy === 'mobile' && <span className="ml-1 sm:ml-2 text-xs opacity-80 hidden sm:inline">Cargando...</span>}
                      </TabsTrigger>
                      <TabsTrigger value="desktop" className="flex-1 sm:w-32 lg:w-40 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm" disabled={perfLoading || !canChangeStrategy}>
                        <span role="img" aria-label="desktop" className="mr-1 sm:mr-2">🖥</span>
                        <span className="hidden sm:inline">Ordenador</span><span className="sm:hidden">PC</span>
                        {perfLoading && strategy === 'desktop' && <span className="ml-1 sm:ml-2 text-xs opacity-80 hidden sm:inline">Cargando...</span>}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
              {!canChangeStrategy && (
                <AccessBanner title="Acceso denegado - Cambio de estrategia" className="mt-2">
                  No tienes permiso para cambiar entre movil y ordenador en este diagnostico.
                </AccessBanner>
              )}
              {canChangeStrategy && !canPerfActionPlan && canPerfBreakdowns && (
                <AccessBanner title="Acceso limitado - Cambio de estrategia" className="mt-2">
                  Necesitas el permiso <PermCode>performance.view_action_plan</PermCode> para ver el plan de accion completo.
                </AccessBanner>
              )}
            </div>
          )}

          <h2 className="diagnostico-title">
            Diagnostico de: <span className="url">{url}</span>
          </h2>

          {isSecurity && url && (
            <SecurityDiagnosticoPanel
              url={url as string}
              initialResult={(audit as Record<string, unknown>)?.security}
              autoRunOnMount={!((audit as Record<string, unknown>)?.security)}
            />
          )}

          {!isSecurity && (
            <PerfDiagContent
              perfLoading={perfLoading}
              strategy={strategy}
              apiLabel={API_LABELS[activeApi]}
              canPerfActionPlan={canPerfActionPlan}
              canPerfBreakdowns={canPerfBreakdowns}
              perfCard={perfCard}
              categoryCards={categoryCards}
              trendByKey={trendByKey}
              performance={performance}
              perfBreakItems={perfBreakItems}
              bpBreak={bpBreak}
              seoBreak={seoBreak}
              apiData={apiData}
              planItems={planItems}
              cardInfoOpen={cardInfoOpen}
              onCardInfoToggle={(key) => setCardInfoOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
              showPerfDetails={showPerfDetails}
              onPerfDetailsToggle={() => setShowPerfDetails((v) => !v)}
              showBPDetails={showBPDetails}
              onBPDetailsToggle={() => setShowBPDetails((v) => !v)}
              showSeoDetails={showSeoDetails}
              onSeoDetailsToggle={() => setShowSeoDetails((v) => !v)}
              contenedorReporteRef={contenedorReporteRef as React.RefObject<HTMLElement>}
              url={url as string}
              email={(auditData as AuditApiResponse & { email?: string })?.email || ''}
              emailContext={emailContext}
            />
          )}

        </div>
      </CardContent>

    </Card>
  );
}

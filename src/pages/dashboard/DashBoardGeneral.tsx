// src/pages/dashboard/DashBoardGeneral.tsx

// Página principal del dashboard — orquestador de estado, stream y navegación
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../shared/ui/card';
import FlipCard from '../../components/dashboard/FlipCard';
import EmailPdfBar from '../../components/common/EmailPdfBar';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { useAuth } from '../../components/auth/AuthContext';
import { motion } from 'framer-motion';
import { logger } from '../../shared/logger.js';

import {
  DashboardData,
  DIAGNOSTIC_CONFIG,
  ORDER,
  DiagnosticScore,
} from './dashboardTypes';
import {
  calculateOverallScore,
  buildInsightsAndPlan,
  normalizeUrlKey,
} from './dashboardUtils';
import {
  DashboardNoUrl,
  DashboardError,
  DashboardSpinner,
  DashboardProgressView,
} from './DashboardLoadingStates';
import { DashboardScoreHero } from './DashboardScoreHero';
import { DashboardInsights, DashboardActionPlan } from './DashboardInsights';

export default function DashboardPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const url = sp.get('url') || '';
  const forceRefresh = sp.get('refresh') === '1' || sp.get('nocache') === '1';
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isClient = user?.role === 'cliente';
  const perms = user?.permissions || [];
  const canNavigateDetails = !isClient || perms.includes('ui.general.view_details');
  const canViewPlanDashboard = !isClient || perms.includes('dashboard.view_action_plan');
  const canViewHistory = !isClient || perms.includes('history.view');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingApis, setLoadingApis] = useState<Set<string>>(
    new Set(['performance', 'security', 'accessibility', 'reliability', 'maintainability', 'portability'])
  );
  const [completedApis, setCompletedApis] = useState<Set<string>>(new Set());
  const [failedApis, setFailedApis] = useState<Set<string>>(new Set());
  const [failedErrors, setFailedErrors] = useState<Record<string, string>>({});
  const [navigating, setNavigating] = useState(false);
  const dataRef = useRef<DashboardData | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // ─── Navegación ────────────────────────────────────────────────────────────
  const createAuditAndGo = async (apiKey: keyof typeof DIAGNOSTIC_CONFIG) => {
    if (!url) return;
    try {
      setNavigating(true);
      const type = apiKey === 'performance' ? 'pagespeed' : apiKey === 'security' ? 'security' : '';
      if (!type) return;
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url, type, strategy: 'mobile' }),
      });
      const d = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok || !(d as any)?._id) throw new Error((d as any)?.error || `No se pudo crear el diagnóstico (${apiKey})`);
      const typeParam = apiKey === 'performance' ? 'performance' : 'security';
      const extra = url ? `&url=${encodeURIComponent(url)}&src=dashboard` : '&src=dashboard';
      navigate(`/diagnostico/${(d as any)._id}?type=${typeParam}${extra}`);
    } catch (e) {
      console.error('Navegación directa falló, redirigiendo por fallback:', e);
      if (apiKey === 'security') navigate(`/diagnostics/full-check?url=${encodeURIComponent(url)}&initType=security`);
      else if (apiKey === 'performance') navigate(`/diagnostics/full-check?url=${encodeURIComponent(url)}&initType=performance`);
    } finally {
      setNavigating(false);
    }
  };

  const getDetailPath = (key: string): string => {
    if (key === 'performance') return `/diagnostics/full-check?url=${encodeURIComponent(url)}&initType=performance`;
    if (key === 'security') return `/diagnostics/full-check?url=${encodeURIComponent(url)}&initType=security`;
    const typeMap: Record<string, string> = {
      accessibility: 'usability',
      reliability: 'fiability',
      maintainability: 'maintainability',
      portability: 'portability',
    };
    return `/diagnostics/full-check?url=${encodeURIComponent(url)}&types=${typeMap[key] || key}`;
  };

  const handleCardNavigate = async (key: keyof typeof DIAGNOSTIC_CONFIG) => {
    if (!canNavigateDetails || navigating) return;
    if (key === 'performance' || key === 'security') await createAuditAndGo(key);
    else navigate(getDetailPath(key));
  };

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchDashboardOnce = async (options?: { signal?: AbortSignal; noCache?: boolean; skipLog?: boolean }) => {
    try {
      const r = await fetch('/api/diagnostics/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: options?.signal,
        body: JSON.stringify({ url, nocache: !!options?.noCache, skipLog: !!options?.skipLog }),
      });
      if (!r.ok) return;
      const j = await r.json();
      if (!j?.diagnostics) return;
      setData((prev) => {
        const base = prev || ({
          url,
          timestamp: new Date(),
          overallScore: 0,
          diagnostics: {},
          criticalIssues: [],
          insights: { strengths: [], improvements: [] },
        } as DashboardData);
        const merged: DashboardData['diagnostics'] = { ...base.diagnostics } as DashboardData['diagnostics'];
        for (const key of Object.keys(j.diagnostics || {})) {
          const v = j.diagnostics[key];
          if (!(merged as any)[key] && v?.score != null) {
            (merged as any)[key] = {
              score: v.score,
              label: v.label,
              color: v.color,
              icon: (DIAGNOSTIC_CONFIG as any)[key]?.icon ?? '',
              trend: 'stable' as const,
              recommendations: v?.recommendations || [],
            };
          }
        }
        return { ...base, diagnostics: merged, overallScore: calculateOverallScore(merged) };
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  };

  useEffect(() => {
    if (!url) {
      setError('URL no proporcionada');
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;
    const diagnosticsKeys = ['performance', 'security', 'accessibility', 'reliability', 'maintainability', 'portability'];

    setLoadingApis(new Set(diagnosticsKeys));
    setCompletedApis(new Set());
    setFailedApis(new Set());
    setFailedErrors({});
    setNavigating(false);
    setError(null);

    // 1) Cache rápido local (<=1h)
    let startedWithCache = false;
    try {
      const cacheKey = `dashboardCache:${normalizeUrlKey(url)}`;
      const cachedRaw = sessionStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { ts?: number; eventData?: any };
        if (!forceRefresh && cached?.ts && Date.now() - cached.ts < 1000 * 60 * 60 && cached.eventData?.diagnostics) {
          startedWithCache = true;
          const eventData = cached.eventData;
          const result = buildInsightsAndPlan(eventData.diagnostics);
          const diagnostics: DashboardData['diagnostics'] = {} as DashboardData['diagnostics'];
          Object.keys(eventData.diagnostics).forEach((k) => {
            const v = eventData.diagnostics[k];
            (diagnostics as any)[k] = {
              score: v?.score ?? 0,
              label: v?.label ?? '',
              color: v?.color ?? '#9ca3af',
              icon: (DIAGNOSTIC_CONFIG as any)[k]?.icon ?? '',
              trend: 'stable',
              recommendations: v?.recommendations || [],
            summary: v?.summary || '',
            } as DiagnosticScore;
          });
          setData({
            url,
            overallScore: eventData.overallScore ?? calculateOverallScore(diagnostics),
            timestamp: new Date(),
            diagnostics,
            ...result,
          });
          setLoading(false);
          setLoadingApis(new Set());

          // Separar servicios completados de los que fallaron:
          // - APIs ausentes del objeto diagnostics: fallaron con event:error (nunca se incluyeron en complete)
          // - APIs presentes con score=0 y color gris: resultado vacío / fallo silencioso
          const ALL_APIS = ['performance', 'security', 'accessibility', 'reliability', 'maintainability', 'portability'];
          const fromCacheCompleted = new Set<string>();
          const fromCacheFailed = new Set<string>();
          const cachedErrors: Record<string, string> = {};
          ALL_APIS.forEach((k) => {
            const v = (eventData.diagnostics as any)?.[k];
            if (v === undefined || v === null) {
              // API no está en diagnostics → falló completamente en la sesión anterior
              fromCacheFailed.add(k);
              cachedErrors[k] = 'Este análisis no pudo completarse en la sesión anterior. Puedes reintentar el diagnóstico.';
            } else if (v?.score === 0 && (v?.color === '#9ca3af' || !v?.color)) {
              // Resultado vacío (fallo silencioso)
              fromCacheFailed.add(k);
              cachedErrors[k] = 'Este análisis obtuvo un resultado vacío. Puedes reintentar el diagnóstico.';
            } else {
              fromCacheCompleted.add(k);
            }
          });
          setCompletedApis(fromCacheCompleted);
          setFailedApis(fromCacheFailed);
          setFailedErrors(cachedErrors);
        }
      }
    } catch { /* ignore */ }

    // Si hay cache válida y no se pidió refresco explícito, no dispares de nuevo los 6 servicios
    if (startedWithCache && !forceRefresh) {
      return () => {
        cancelled = true;
        abortController.abort();
      };
    }

    // 2) Streaming progresivo
    const fetchDashboardDataStream = async () => {
      try {
        if (!startedWithCache) {
          setLoading(true);
          setData({
            url,
            timestamp: new Date(),
            overallScore: 0,
            diagnostics: {},
            criticalIssues: [],
            insights: { strengths: [], improvements: [] },
          });
        }
        setError(null);

        const response = await fetch('/api/diagnostics/dashboard-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({ url, nocache: forceRefresh }),
        });

        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No se pudo obtener el reader del stream');

        let buffer = '';
        while (true) {
          if (cancelled) break;
          const { done, value } = await reader.read();
          if (done) { setLoading(false); break; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            const eventMatch = line.match(/^event: (.+)$/m);
            const dataMatch = line.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const eventType = eventMatch[1];
            const eventData = JSON.parse(dataMatch[1]);
            logger.debug({ eventType, eventData }, '[Dashboard Stream] Evento');
            if (cancelled) return;

            switch (eventType) {
              case 'start':
                logger.info('[Dashboard Stream] Iniciando análisis...');
                break;

              case 'progress':
                setLoadingApis((prev) => new Set([...prev, eventData.api]));
                break;

              case 'result':
                setData((prev) => {
                  if (!prev) return prev;
                  const newDiagnostics = { ...prev.diagnostics } as DashboardData['diagnostics'];
                  (newDiagnostics as any)[eventData.api] = {
                    score: eventData.data.score,
                    label: eventData.data.label,
                    color: eventData.data.color,
                    icon: DIAGNOSTIC_CONFIG[eventData.api as keyof typeof DIAGNOSTIC_CONFIG].icon,
                    trend: 'stable' as const,
                    recommendations: eventData.data.recommendations || [],
                    summary: eventData.data.summary || '',
                  };
                  return {
                    ...prev,
                    diagnostics: newDiagnostics,
                    overallScore: calculateOverallScore(newDiagnostics),
                  };
                });
                setLoadingApis((prev) => { const s = new Set(prev); s.delete(eventData.api); return s; });
                setFailedApis((prev) => { const s = new Set(prev); s.delete(eventData.api); return s; });
                setCompletedApis((prev) => new Set([...prev, eventData.api]));
                break;

              case 'error':
                setFailedApis((prev) => new Set([...prev, eventData.api]));
                setFailedErrors((prev) => ({ ...prev, [eventData.api]: eventData.error || 'Error desconocido al analizar este ítem.' }));
                setLoadingApis((prev) => { const s = new Set(prev); s.delete(eventData.api); return s; });
                break;

              case 'complete':
                setData((prev) => {
                  if (!prev) return prev;
                  const result = buildInsightsAndPlan(eventData.diagnostics);
                  return { ...prev, overallScore: eventData.overallScore, ...result };
                });
                try {
                  const cacheKey = `dashboardCache:${normalizeUrlKey(url)}`;
                  sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), eventData }));
                } catch { /* ignore */ }
                setLoading(false);
                // Rellenar faltantes si no llegaron en streaming
                try {
                  const diags = (eventData?.diagnostics || {}) as any;
                  const allKeys = ['performance', 'security', 'accessibility', 'reliability', 'maintainability', 'portability'];
                  const anyMissing = allKeys.some(k => !diags[k]);
                  if (anyMissing) {
                    void fetchDashboardOnce({ signal: abortController.signal, noCache: forceRefresh, skipLog: true });
                  }
                } catch { /* ignore */ }
                break;
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar el dashboard');
        setLoading(false);
      }
    };

    fetchDashboardDataStream();

    const timeoutId = window.setTimeout(() => {
      try {
        // Cualquier API que siga en loadingApis tras 75s → marcarla como fallida
        // El servidor tiene budget de 65s para performance, garantizando que responde antes.
        // Si llegamos aquí con loadingApis no vacío, algo bloqueó la conexión SSE.
        setLoadingApis((current) => {
          if (current.size === 0) return current;
          const timedOutApis = [...current];
          setFailedApis((prev) => new Set([...prev, ...timedOutApis]));
          setFailedErrors((prev) => {
            const next = { ...prev };
            timedOutApis.forEach(api => {
              if (!next[api]) next[api] = 'El análisis no respondió a tiempo. El sitio puede estar bloqueando las peticiones o ser muy lento.';
            });
            return next;
          });
          setLoading(false);
          return new Set();
        });
      } catch { /* ignore */ }
    }, 75000);

    return () => {
      cancelled = true;
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [url, forceRefresh]);

  // ─── Reintentar métricas fallidas ────────────────────────────────────────
  const retryFailed = () => {
    const failed = [...failedApis];
    if (!failed.length) return;
    // Limpiar caché de sessionStorage para que no se vuelva a servir el dato roto
    try {
      const cacheKey = `dashboardCache:${normalizeUrlKey(url)}`;
      sessionStorage.removeItem(cacheKey);
    } catch { /* ignore */ }
    setFailedApis(new Set());
    setFailedErrors((prev) => {
      const next = { ...prev };
      failed.forEach(api => delete next[api]);
      return next;
    });
    failed.forEach(api => setLoadingApis(prev => new Set([...prev, api])));
    void fetchDashboardOnce({ noCache: true, skipLog: true });
  };

  // ─── Render estados ─────────────────────────────────────────────────────────
  if (!url) return <DashboardNoUrl />;
  if (loading && data) {
    return (
      <DashboardProgressView
        data={data}
        url={url}
        completedApis={completedApis}
        navigating={navigating}
        canNavigateDetails={canNavigateDetails}
        onNavigate={handleCardNavigate}
      />
    );
  }
  if (loading) return <DashboardSpinner />;
  if (error || !data) return <DashboardError error={error} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8" data-page="dashboard-general" ref={dashboardRef}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => navigate('/?form=true')}
            className="nav-back-btn inline-flex items-center gap-2 rounded-lg bg-white text-[#383838] px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition-colors dark:bg-transparent dark:text-white dark:hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            Nuevo análisis
          </button>
          <div className="flex items-center gap-3">
            {canViewHistory && (
              <button
                onClick={() => navigate('/admin/history')}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <BarChart2 size={15} />
                Ver histórico
              </button>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-500">Análisis completado</p>
              <p className="text-xs text-gray-400">{new Date().toLocaleString('es-ES')}</p>
            </div>
          </div>
        </div>

        {/* URL analizada */}
        <Card className="bg-white border-2" data-pdf-avoid>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🌐</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">URL analizada</p>
                <p className="text-base font-semibold text-gray-900 truncate">{data.url}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div data-pdf-stop style={{ height: 1 }} />

        {/* Score hero */}
        <DashboardScoreHero data={data} />
        <div data-pdf-stop style={{ height: 1 }} />

        {/* Grid de diagnósticos */}
        <div data-pdf-section>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">Métricas por Dimensión</h2>
            {failedApis.size > 0 && (
              <button
                onClick={retryFailed}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                data-pdf-avoid
              >
                ↺ Reintentar {failedApis.size === 1 ? '1 métrica' : `${failedApis.size} métricas`} fallidas
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ORDER.map((key) => {
              const diagnostic = data.diagnostics[key];
              const config = DIAGNOSTIC_CONFIG[key];
              const hasFailed = failedApis.has(key);
              // Si no hay dato, no está en progreso y no falló, no mostrar
              if (!diagnostic && !loadingApis.has(key) && !hasFailed) return null;
              // Si sigue cargando pero ya tenemos datos parciales, mostrar como loading
              const isStillLoading = loadingApis.has(key) && !diagnostic;
              // Si falló y no hay datos, usar valores neutros para no crashear FlipCard
              const isFailed = hasFailed && !diagnostic;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: ORDER.indexOf(key) * 0.1 }}
                  className="h-full relative"
                  data-pdf-avoid
                >
                  {hasFailed && !isStillLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-amber-50/90 border-2 border-amber-300 backdrop-blur-sm">
                      <span className="text-2xl">⚠️</span>
                      <p className="text-xs font-semibold text-amber-800 text-center px-3">{config.name}<br/>no pudo cargarse</p>
                      {failedErrors[key] && (
                        <p className="text-xs text-amber-700 text-center px-4 leading-snug max-w-[200px]">{failedErrors[key]}</p>
                      )}
                      <button
                        onClick={retryFailed}
                        className="text-xs px-3 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                      >↺ Reintentar</button>
                    </div>
                  )}
                  <FlipCard
                    icon={config.icon}
                    name={config.name}
                    description={config.description}
                    score={isStillLoading || isFailed ? 0 : diagnostic!.score}
                    color={isStillLoading || isFailed ? '#9ca3af' : diagnostic!.color}
                    label={isStillLoading ? 'Calculando...' : isFailed ? '—' : diagnostic!.label}
                    trend={isStillLoading || isFailed ? undefined : diagnostic!.trend}
                    recommendations={isStillLoading || isFailed ? [] : (diagnostic!.recommendations || [])}
                    summary={isStillLoading || isFailed ? '' : (diagnostic!.summary || '')}
                    loading={isStillLoading}
                    disabled={isStillLoading || isFailed || !canNavigateDetails}
                    disabledMessage={isStillLoading ? 'El análisis está en progreso...' : isFailed ? 'Servicio no disponible' : 'No tienes permiso para abrir el detalle desde la interfaz general.'}
                    onNavigate={() => handleCardNavigate(key)}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
        <div data-pdf-stop style={{ height: 1 }} />

        {/* Insights */}
        <DashboardInsights data={data} />
        <div data-pdf-stop style={{ height: 1 }} />

        {/* Plan de acción */}
        <DashboardActionPlan data={data} canView={canViewPlanDashboard} />

        {/* Exportar */}
        <div className="mt-8 flex justify-end" data-pdf-avoid>
          <EmailPdfBar
            captureRef={dashboardRef}
            url={url}
            subject={`Reporte de Dashboard General - ${url}`}
            includePdf={true}
            context="dashboard"
            extraBody={{ overallScore: data.overallScore, diagnostics: data.diagnostics }}
            captureWidthPx={1312}
          />
        </div>
      </div>
    </div>
  );
}
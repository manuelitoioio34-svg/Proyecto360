// ——— src/components/perf/CombinedSummaryModal.tsx ———

// Modal de resumen combinado Performance + Seguridad
import React from 'react';
import { Button } from '../../shared/ui/button';
import SecurityScoreWidget from '../SecurityScoreWidget';
import { CategoryDial } from './PerfDials';
import { MetricId } from './diagUtils';
import type { SecurityHistoryItem } from '../../shared/types/api.js';

type PerfBreakItem = { id: MetricId; label: string; value: number | null };

type SecurityData = {
  score?: number | null;
  securityScore?: number | null;
  grade?: string;
  https?: boolean;
  httpsEnforced?: boolean;
  checks?: Record<string, { ok?: boolean }>;
  environment?: { kind?: string };
  findings?: Array<{ severity?: string; [key: string]: unknown }>;
};

type CombinedSummaryModalProps = {
  onClose: () => void;
  performance: number | null;
  strategy: 'mobile' | 'desktop';
  perfBreakItems: PerfBreakItem[];
  securityData: SecurityData | null;
  securityHistory: SecurityHistoryItem[];
};

export function CombinedSummaryModal({
  onClose,
  performance,
  strategy,
  perfBreakItems,
  securityData,
  securityHistory,
}: CombinedSummaryModalProps) {
  return (
    <div
      className="fixed inset-0 bg-[rgba(15,23,42,0.55)] z-[1000] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Resumen combinado de Performance y Seguridad"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] max-w-[1200px] w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_40px_-8px_rgba(0,0,0,0.25)] px-8 pt-8 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 m-0">Resumen combinado</h3>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </div>

          {/* Layout: Performance (columna)  +  Seguridad (flex-1) */}
          <div className="flex flex-col lg:flex-row gap-10 items-start">

            {/* Bloque Performance */}
            <div className="w-full lg:max-w-sm border rounded-2xl p-5 flex flex-col gap-4 bg-white/90 backdrop-blur-sm shadow-sm">
              <h4 className="text-base font-semibold text-slate-800 m-0 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                Performance
              </h4>

              {performance != null ? (
                <div className="flex flex-col items-center gap-6">
                  <CategoryDial metricId="performance" value={performance} size={140} strokeWidth={14} />

                  {/* Escala visual */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-wrap justify-center gap-1 text-xs">
                      {[
                        { label: 'Malo (0-49)',   bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    dot: 'bg-red-500',    active: (performance ?? 0) < 50 },
                        { label: 'Medio (50-89)', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500', active: (performance ?? 0) >= 50 && (performance ?? 0) < 90 },
                        { label: 'Bueno (90-100)',bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-500',  active: (performance ?? 0) >= 90 },
                      ].map(({ label, bg, border, text, dot, active }) => (
                        <div
                          key={label}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${
                            active ? `${bg} ${border} ${text} font-medium` : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${dot}`} />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mini grid métricas */}
                  <div className="grid grid-cols-3 gap-3 w-full text-[11px] text-slate-700">
                    {perfBreakItems.map((m) => (
                      <div key={m.id} className="flex flex-col items-center p-2 rounded-lg bg-slate-50 border">
                        <span className="font-semibold tracking-wide">{m.label}</span>
                        <span className="text-slate-900 mt-1 text-xs">
                          {m.value == null
                            ? '—'
                            : m.id === 'cls'
                              ? m.value.toFixed(2)
                              : ['fcp', 'lcp', 'tbt', 'si', 'ttfb'].includes(m.id)
                                ? `${m.value.toFixed(1)}s`
                                : m.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-center text-slate-600 max-w-[260px] m-0">
                    Puntaje y métricas clave ({strategy === 'mobile' ? 'Móvil' : 'Ordenador'}).
                  </p>

                  <img
                    src="/LogoChoucair.png"
                    alt="Choucair"
                    className="mt-4 w-40 opacity-90 hover:opacity-100 transition-opacity select-none"
                    draggable={false}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-500">No hay métricas de performance.</p>
              )}
            </div>

            {/* Bloque Seguridad */}
            <div className="flex-1 w-full border rounded-2xl p-6 bg-white/90 backdrop-blur-sm shadow-sm overflow-visible">
              <h4 className="text-base font-semibold text-slate-800 m-0 flex items-center gap-2 mb-4">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Seguridad
              </h4>

              {securityData ? (
                <div className="flex flex-col gap-6">
                  <div className="w-full">
                    <SecurityScoreWidget
                      score={securityData?.score ?? securityData?.securityScore ?? null}
                      grade={securityData?.grade}
                      history={securityHistory}
                      topFindings={(securityData?.findings || [])
                        .filter((f) => f?.severity === 'critical' || f?.severity === 'warning')
                        .slice(0, 3) as Array<{ id: string; title: string; severity: string }>}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 text-xs text-slate-700">
                    {[
                      { label: `HTTPS: ${securityData?.https ? 'Sí' : 'No'}`, color: securityData?.https ? '#16a34a' : '#ef4444' },
                      { label: `Redir. HTTPS: ${securityData?.httpsEnforced ? 'Sí' : 'No claro'}`, color: securityData?.httpsEnforced ? '#16a34a' : '#f59e0b' },
                      { label: `HSTS: ${securityData?.checks?.['hsts']?.ok ? 'OK' : 'Falta'}`, color: securityData?.checks?.['hsts']?.ok ? '#16a34a' : '#ef4444' },
                      { label: `Entorno: ${securityData?.environment?.kind || '—'}`, color: '#94a3b8' },
                    ].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No hay datos de seguridad disponibles.</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

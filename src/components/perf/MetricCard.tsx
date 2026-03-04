// ——— src/components/perf/MetricCard.tsx ———

// MetricCard: tarjeta individual de métrica (performance / best-practices / seo)
// Incluye CategoryDial, escala visual, info tooltip y trend indicator.
import React from 'react';
import { Info } from 'lucide-react';
import { CategoryDial } from './PerfDials';
import { MetricId, trendSymbol, trendColor } from './diagUtils';
import type { Trend } from '../../shared/types/api.js';

// ======= ScaleBar (escala visual 3 bandas) =======
function ScaleBar({ value }: { value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-3 mb-2">
      <div className="flex flex-wrap justify-center gap-1 text-xs">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${
            (value ?? 0) < 50
              ? 'bg-red-50 border-red-200 text-red-700 font-medium'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Malo (0-49)</span>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${
            (value ?? 0) >= 50 && (value ?? 0) < 90
              ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Medio (50-89)</span>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${
            (value ?? 0) >= 90
              ? 'bg-green-50 border-green-200 text-green-700 font-medium'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Bueno (90-100)</span>
        </div>
      </div>
      <p className="text-xs text-center text-slate-500 max-w-[240px] leading-tight">
        El estado actual se resalta según el puntaje obtenido
      </p>
    </div>
  );
}

// ======= Props =======
export type MetricCardItem = {
  id: MetricId;
  label: string;
  value: number | null;
  desc: string;
};

type MetricCardProps = {
  item: MetricCardItem;
  trend?: Trend;
  infoContent?: React.ReactNode;
  /** estado abierto del info tooltip */
  infoOpen: boolean;
  onInfoToggle: () => void;
  /** click handler para expansión (performance / bp / seo) */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  showExpandLabel?: boolean;
  expandLabel?: string;
};

// ======= MetricCard =======
export function MetricCard({
  item,
  trend,
  infoContent,
  infoOpen,
  onInfoToggle,
  onClick,
  showExpandLabel,
  expandLabel,
}: MetricCardProps) {
  const isPct = ['performance', 'best-practices', 'seo'].includes(item.id);

  return (
    <div
      className="item bg-white"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <h3 className="item-label flex items-center gap-2">
        {item.label}
        {trend && (
          <span style={{ fontSize: 12, color: trendColor(trend) }}>
            {trendSymbol(trend)}
          </span>
        )}
        <button
          type="button"
          className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition"
          onClick={(e) => { e.stopPropagation(); onInfoToggle(); }}
          aria-expanded={infoOpen}
          aria-controls={`card-info-${item.id}`}
          title="¿Qué es esto?"
        >
          <Info size={14} strokeWidth={2.4} />
        </button>
        {showExpandLabel && (
          <span className="ml-auto text-xs text-[#64748b]">{expandLabel}</span>
        )}
      </h3>

      <div className="w-full min-h-[160px] flex items-center justify-center">
        <CategoryDial metricId={item.id} value={item.value} size={110} strokeWidth={10} />
      </div>

      <ScaleBar value={item.value} />

      <p className="item-desc">
        {item.value == null
          ? 'N/A'
          : isPct
            ? `${item.value}`
            : `${(item.value as number).toFixed(1)}s`}{' '}
        — {item.desc}
      </p>

      {infoOpen && (
        <div
          id={`card-info-${item.id}`}
          className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2"
          role="note"
        >
          {infoContent || item.desc}
        </div>
      )}
    </div>
  );
}

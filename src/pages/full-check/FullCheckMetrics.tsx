// src/pages/full-check/FullCheckMetrics.tsx

// MetricsDisplay y MetricCard — grid de métricas específicas por tipo de diagnóstico
import React from 'react';
import { DiagnosticType } from './fullCheckTypes';
import { DisplayMetrics } from '../../shared/types/api';

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
    return (
        <div
            className="p-3 bg-white border-2 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            data-pdf-avoid
        >
            <div className="text-xs text-gray-600 mb-1.5 font-medium truncate" title={label}>
                {label}
            </div>
            <div
                className="text-2xl font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ color }}
                title={String(value)}
            >
                {value}
            </div>
        </div>
    );
}

export function MetricsDisplay({
    type,
    metrics,
}: {
    type: DiagnosticType;
    metrics: DisplayMetrics | undefined;
}) {
    if (!metrics) return null;

    const metricCards: React.ReactNode[] = [];

    if (type === 'usability') {
        metricCards.push(
            <MetricCard key="violations" label="Total Inconformidades" value={metrics.violations ?? 0} color="#ef4444" />,
            <MetricCard key="critical" label="Críticas" value={metrics.critical ?? 0} color="#dc2626" />,
            <MetricCard key="serious" label="Serias" value={metrics.serious ?? 0} color="#ea580c" />,
            <MetricCard key="moderate" label="Moderadas" value={metrics.moderate ?? 0} color="#f59e0b" />
        );
    } else if (type === 'fiability') {
        metricCards.push(
            <MetricCard key="availability" label="Disponibilidad" value={`${metrics.availability ?? 0}%`} color="#22c55e" />,
            <MetricCard key="response" label="Tiempo Respuesta" value={`${metrics.avgResponseTime ?? 0} ms`} color="#3b82f6" />
        );
    } else if (type === 'maintainability') {
        metricCards.push(
            <MetricCard key="stack" label="Tecnologías" value={metrics.stackItems ?? 0} color="#8b5cf6" />
        );
    } else if (type === 'portability') {
        metricCards.push(
            <MetricCard
                key="browsers"
                label="Navegadores OK"
                value={metrics.compatibleBrowsers?.length ?? 0}
                color="#22c55e"
            />,
            <MetricCard
                key="issues"
                label="Incompatibilidades"
                value={metrics.incompatibilities ?? 0}
                color={metrics.incompatibilities === 0 ? '#22c55e' : '#ef4444'}
            />
        );
    }

    if (metricCards.length === 0) return null;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metricCards}</div>
            {/* Good page-break point right after the metric grid */}
            <div data-pdf-stop style={{ height: 1 }} />
        </>
    );
}

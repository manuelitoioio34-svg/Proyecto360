// src/pages/full-check/FullCheckTypeDetails.tsx

// Sub-componentes de detalle específicos por tipo de diagnóstico:
import React, { useState } from 'react';
import { Info, CheckCircle, XCircle, Copy } from 'lucide-react';
import { type AxeViolation, type UptimeProbe, type Technology } from '../../services/diagnostics.api';
import { DiagnosticDetails } from '../../shared/types/api';
import { useAuth } from '../../components/auth/AuthContext';
import { DetailSection } from './FullCheckDetailSection';
import { DiagnosticType } from './fullCheckTypes';

// ─── ViolationsTable ───────────────────────────────────────────────────────────

function ViolationsTable({ violations }: { violations: AxeViolation[] }) {
    const impactColors: Record<string, string> = {
        critical: 'bg-red-100 text-red-900 border-red-300',
        serious: 'bg-orange-100 text-orange-900 border-orange-300',
        moderate: 'bg-amber-100 text-amber-900 border-amber-300',
        minor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-200 border-b-4 border-gray-300">
                    <tr>
                        <th className="py-3 px-4 text-left font-bold text-gray-800">Regla</th>
                        <th className="py-3 px-4 text-left font-bold text-gray-800">Impacto</th>
                        <th className="py-3 px-4 text-center font-bold text-gray-800">Elementos</th>
                        <th className="py-3 px-4 text-left font-bold text-gray-800">Descripción</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {violations.map((v, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-700">{v.id}</td>
                            <td className="py-3 px-4">
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                                        impactColors[v.impact || ''] || 'bg-gray-100 text-gray-700 border-gray-300'
                                    }`}
                                >
                                    {v.impact || 'N/A'}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-gray-900">{v.nodes}</td>
                            <td className="py-3 px-4 text-gray-700">
                                {v.helpUrl ? (
                                    <a
                                        href={v.helpUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                        {v.help}
                                    </a>
                                ) : (
                                    v.help
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── UptimeChart ───────────────────────────────────────────────────────────────

function UptimeChart({ series }: { series: UptimeProbe[] }) {
    const w = 400;
    const h = 100;
    const pad = 10;
    const values = series.map((s) => s.ms || 0);
    const max = Math.max(1, ...values);
    const min = Math.min(0, ...values);
    const points = values
        .map((v, i) => {
            const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
            const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <div>
            <div className="text-sm font-bold text-gray-700 mb-3">
                Latencia de {series.length} sondeos HTTP
            </div>
            <svg width={w} height={h} className="bg-white rounded-lg border-2 shadow mx-auto">
                <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="3" />
                {series.map((s, i) => {
                    const x = pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
                    const y = h - pad - ((s.ms - min) / (max - min || 1)) * (h - pad * 2);
                    const ok = (s.status ?? 0) >= 200 && (s.status ?? 0) < 400;
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r={5}
                            fill={ok ? '#22c55e' : '#ef4444'}
                            stroke="#fff"
                            strokeWidth="2"
                        />
                    );
                })}
            </svg>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
                {series.map((s, i) => (
                    <span key={i} className="flex items-center gap-2 px-3 py-1 bg-white border rounded-lg">
                        <span
                            className={`inline-block w-3 h-3 rounded-full ${
                                (s.status ?? 0) >= 200 && (s.status ?? 0) < 400
                                    ? 'bg-green-500'
                                    : 'bg-red-500'
                            }`}
                        />
                        <span className="font-semibold">{s.status ?? 'ERR'}</span>
                        <span className="text-gray-600">·</span>
                        <span className="font-mono">{s.ms}ms</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

// ─── HeadersDisplay ────────────────────────────────────────────────────────────

function HeadersDisplay({ headers }: { headers: Record<string, unknown> }) {
    const [copied, setCopied] = useState(false);
    const { user } = useAuth();
    const isClient = user?.role === 'cliente';
    const perms = user?.permissions || [];
    const hasUiGeneralDetails = perms.includes('ui.general.view_details');
    const readOnlyClient = isClient && !hasUiGeneralDetails;

    const copyHeaders = async () => {
        if (readOnlyClient) {
            window.alert('Necesitas permisos del administrador para copiar estos datos.');
            return;
        }
        const text = Object.entries(headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n');
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-gray-700">Cabeceras HTTP del servidor</div>
                <button
                    onClick={copyHeaders}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-lg hover:bg-blue-100 font-semibold transition"
                >
                    <Copy size={14} />
                    {copied ? '✓ Copiado' : 'Copiar'}
                </button>
            </div>
            <div className="bg-gray-900 text-gray-100 p-5 rounded-lg font-mono text-xs overflow-x-auto shadow-inner">
                {Object.entries(headers)
                    .slice(0, 15)
                    .map(([key, value]) => (
                        <div key={key} className="mb-2">
                            <span className="text-blue-400 font-semibold">{key}:</span>{' '}
                            <span className="text-gray-300">{String(value)}</span>
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ─── TechnologiesGrid ──────────────────────────────────────────────────────────

function TechnologiesGrid({ technologies }: { technologies: Technology[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {technologies.map((tech, idx) => (
                <div
                    key={idx}
                    className="p-5 bg-white border-2 rounded-xl hover:shadow-md transition-shadow"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="font-bold text-gray-900 text-lg">{tech.name}</div>
                        {tech.version && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-lg font-semibold border border-purple-200">
                                v{tech.version}
                            </span>
                        )}
                    </div>
                    {tech.categories && tech.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tech.categories.slice(0, 3).map((cat, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-md border border-purple-200 font-medium"
                                >
                                    {cat}
                                </span>
                            ))}
                        </div>
                    )}
                    {tech.confidence != null && (
                        <div className="text-xs text-gray-500 mt-2 font-semibold">
                            Confianza: {tech.confidence}%
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── CompatibilityMatrix ───────────────────────────────────────────────────────

function CompatibilityMatrix({
    features,
    matrix,
}: {
    features: string[];
    matrix: Record<string, unknown>;
}) {
    const browsers = ['chrome', 'edge', 'firefox', 'safari'];

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-200 border-b-4 border-gray-300">
                    <tr>
                        <th className="py-3 px-4 text-left font-bold text-gray-800">Feature</th>
                        {browsers.map((br) => (
                            <th key={br} className="py-3 px-4 text-center font-bold text-gray-800 capitalize">
                                {br}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {features.slice(0, 20).map((feature, idx) => {
                        const row = matrix[feature] as Record<string, boolean> | undefined;
                        return (
                            <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-700">
                                    {feature}
                                </td>
                                {browsers.map((br) => (
                                    <td key={br} className="py-3 px-4 text-center">
                                        {row && row[br] ? (
                                            <CheckCircle size={22} className="text-green-600 inline-block" />
                                        ) : (
                                            <XCircle size={22} className="text-red-600 inline-block" />
                                        )}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── TypeSpecificDetails (orquestador de sub-detalles) ─────────────────────────

export function TypeSpecificDetails({
    type,
    details,
    expandedSections,
    toggleSection,
}: {
    type: DiagnosticType;
    details: DiagnosticDetails | undefined;
    expandedSections: Record<string, boolean>;
    toggleSection: (section: string) => void;
}) {
    if (!details) return null;

    if (type === 'usability' && details.violations && details.violations.length > 0) {
        return (
            <DetailSection
                title={`Inconformidades de Accesibilidad (${details.violations.length})`}
                icon={<XCircle size={22} className="text-red-600" />}
                expanded={expandedSections['violations'] ?? false}
                onToggle={() => toggleSection('violations')}
            >
                <ViolationsTable violations={details.violations.slice(0, 20)} />
            </DetailSection>
        );
    }

    if (type === 'fiability' && details.series) {
        return (
            <div className="space-y-4">
                <DetailSection
                    title={`Sondeos de Disponibilidad (${details.series.length})`}
                    icon={<Info size={22} className="text-blue-600" />}
                    expanded={expandedSections['uptime'] ?? false}
                    onToggle={() => toggleSection('uptime')}
                >
                    <UptimeChart series={details.series as UptimeProbe[]} />
                </DetailSection>
                {details.headers && (
                    <DetailSection
                        title="Cabeceras HTTP"
                        icon={<Info size={22} className="text-indigo-600" />}
                        expanded={expandedSections['headers'] ?? false}
                        onToggle={() => toggleSection('headers')}
                    >
                        <HeadersDisplay headers={details.headers as Record<string, unknown>} />
                    </DetailSection>
                )}
            </div>
        );
    }

    if (type === 'maintainability' && details.technologies) {
        return (
            <DetailSection
                title={`Tecnologías Detectadas (${details.technologies.length})`}
                icon={<Info size={22} className="text-purple-600" />}
                expanded={expandedSections['technologies'] ?? false}
                onToggle={() => toggleSection('technologies')}
            >
                <TechnologiesGrid technologies={details.technologies as Technology[]} />
            </DetailSection>
        );
    }

    if (type === 'portability' && details.supportMatrix) {
        return (
            <DetailSection
                title="Matriz de Compatibilidad"
                icon={<Info size={22} className="text-indigo-600" />}
                expanded={expandedSections['compatibility'] ?? false}
                onToggle={() => toggleSection('compatibility')}
            >
                <CompatibilityMatrix
                    features={details.usedFeatures || []}
                    matrix={details.supportMatrix}
                />
            </DetailSection>
        );
    }

    return null;
}

// src/components/perf/PerfDiagContent.tsx
// Panel de contenido de rendimiento (Lighthouse) — extraído de DiagnosticoView

import React from 'react';
import ActionPlanPanel from '../dashboard/ActionPlanPanel';
import EmailSendBar from '../common/EmailPdfBar';
import { Spinner } from '../../shared/ui/spinner';
import { AccessBanner, InfoNote, PermCode } from '../../shared/ui/access-banner';
import { CategoryBreakdown } from './CategoryBreakdownPanel';
import { MetricCard, type MetricCardItem } from './MetricCard';
import { PerfBreakdownGrid, ScreenshotPreview, getFinalScreenshot } from './PerfBreakdownSection';
import { type ApiData, type AuditApiResponse, type Trend } from '../../shared/types/api';
import { type CatBreakItem, type MetricId, type PlanItem, translateList } from './diagUtils';
import { SectionDivider, cardInfoText } from './diagViewHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PerfDiagContentProps {
    perfLoading: boolean;
    strategy: 'mobile' | 'desktop';
    apiLabel: string;
    canPerfActionPlan: boolean;
    canPerfBreakdowns: boolean;
    perfCard: MetricCardItem;
    categoryCards: MetricCardItem[];
    trendByKey: Record<string, Trend | undefined>;
    performance: number | null;
    perfBreakItems: Array<{ id: MetricId; label: string; value: number | null }>;
    bpBreak: CatBreakItem[];
    seoBreak: CatBreakItem[];
    apiData: ApiData;
    planItems: PlanItem[];
    cardInfoOpen: Record<string, boolean>;
    onCardInfoToggle: (key: string) => void;
    showPerfDetails: boolean;
    onPerfDetailsToggle: () => void;
    showBPDetails: boolean;
    onBPDetailsToggle: () => void;
    showSeoDetails: boolean;
    onSeoDetailsToggle: () => void;
    contenedorReporteRef: React.RefObject<HTMLElement>;
    url: string;
    email: string;
    emailContext: 'performance' | 'security';
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PerfDiagContent({
    perfLoading,
    strategy,
    apiLabel,
    canPerfActionPlan,
    canPerfBreakdowns,
    perfCard,
    categoryCards,
    trendByKey,
    performance,
    perfBreakItems,
    bpBreak,
    seoBreak,
    apiData,
    planItems,
    cardInfoOpen,
    onCardInfoToggle,
    showPerfDetails,
    onPerfDetailsToggle,
    showBPDetails,
    onBPDetailsToggle,
    showSeoDetails,
    onSeoDetailsToggle,
    contenedorReporteRef,
    url,
    email,
    emailContext,
}: PerfDiagContentProps) {
    const strategyLabel = strategy === 'mobile' ? 'Movil' : 'Ordenador';

    return (
        <div className="relative">
            {perfLoading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-[#0a1220]/85 backdrop-blur-[2px] flex items-center justify-center z-50">
                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-[#13203a]/90 px-5 py-3 rounded-xl shadow-lg border border-slate-200 dark:border-[#1e2d45]">
                        <Spinner /><span className="font-medium">Actualizando métricas...</span>
                    </div>
                </div>
            )}
            <div className={perfLoading ? 'opacity-60 transition-opacity' : ''}>

                <div className="mb-6">
                    <h3 className="flex items-center gap-3 text-slate-700 text-lg font-medium mb-2">
                        ⚡ Visión web 360°
                    </h3>
                    <p className="text-xs text-slate-500">
                        Analisis completo del rendimiento web mediante {apiLabel} en modo {strategyLabel}.
                    </p>
                </div>

                <SectionDivider
                    label="Acerca del analisis"
                    info={
                        <div className="space-y-3 text-xs leading-relaxed">
                            <p>
                                <strong>Fuente de datos:</strong> Ejecucion de Google Lighthouse (LHR) via
                                microservicio, extrayendo categories, audits y metricas (FCP, LCP, TBT, CLS, TTFB, SI).
                            </p>
                            <p>
                                <strong>Variabilidad:</strong> Carga del servidor origen, latencia/red, recursos de
                                terceros, cache fria/caliente, estrategia (Movil vs Ordenador), throttling de Lighthouse.
                            </p>
                            <p>
                                <strong>Interpretacion rapida:</strong> Performance &gt;=90 Bueno, 50-89 Medio, &lt;50
                                Mejorar. LCP &lt;2.5s, TBT &lt;0.2s, CLS &lt;0.1, TTFB &lt;0.8s.
                            </p>
                        </div>
                    }
                />

                <SectionDivider label="Resumen" info="Vista general del estado de rendimiento (0-100)." />

                <div className="diagnostico-grid w-full">
                    {[perfCard, ...categoryCards].map((item) => (
                        <MetricCard
                            key={item.id}
                            item={item}
                            trend={trendByKey[item.id]}
                            infoContent={cardInfoText[item.id]}
                            infoOpen={!!cardInfoOpen[item.id]}
                            onInfoToggle={() => onCardInfoToggle(item.id as string)}
                            onClick={
                                item.id === 'performance' ? onPerfDetailsToggle
                                    : item.id === 'best-practices' ? onBPDetailsToggle
                                        : item.id === 'seo' ? onSeoDetailsToggle
                                            : undefined
                            }
                            showExpandLabel={['performance', 'best-practices', 'seo'].includes(item.id as string)}
                            expandLabel={
                                item.id === 'performance'
                                    ? (showPerfDetails ? 'Ocultar desgloses' : 'Mostrar desgloses')
                                    : item.id === 'best-practices'
                                        ? (showBPDetails ? 'Ocultar desglose' : 'Mostrar desglose')
                                        : item.id === 'seo'
                                            ? (showSeoDetails ? 'Ocultar desglose' : 'Mostrar desglose')
                                            : undefined
                            }
                        />
                    ))}
                </div>

                {(showPerfDetails || showBPDetails || showSeoDetails) && canPerfBreakdowns && (
                    <SectionDivider
                        label="Desgloses y capturas"
                        info="Metricas clave y captura final de la auditoria."
                    />
                )}

                {showPerfDetails && canPerfBreakdowns && (
                    <>
                        <PerfBreakdownGrid items={perfBreakItems} />
                        <ScreenshotPreview src={getFinalScreenshot(apiData)} />
                    </>
                )}

                {showBPDetails && canPerfBreakdowns && (
                    <CategoryBreakdown
                        label="Practicas recomendadas"
                        items={bpBreak.length ? bpBreak : translateList((apiData as Record<string, unknown>)?.['best-practices'] as unknown[])}
                    />
                )}

                {showSeoDetails && canPerfBreakdowns && (
                    <CategoryBreakdown
                        label="SEO"
                        items={seoBreak.length ? seoBreak : translateList((apiData as Record<string, unknown>)?.['seo'] as unknown[])}
                    />
                )}

                {!canPerfBreakdowns && (
                    <AccessBanner title="Acceso limitado - Desgloses de rendimiento" className="mt-4">
                        Los desgloses detallados se reservan para roles con el permiso performance.view_breakdowns.
                    </AccessBanner>
                )}

                {canPerfBreakdowns && !canPerfActionPlan && (
                    <InfoNote className="-mt-2">
                        <strong>Nota:</strong> Puedes ver desgloses pero no el plan de accion completo. Solicita el
                        permiso performance.view_action_plan.
                    </InfoNote>
                )}

                <SectionDivider
                    label="Plan de accion"
                    info="Recomendaciones priorizadas basadas en oportunidades y fallos detectados por Lighthouse."
                />

                {!canPerfActionPlan && (
                    <AccessBanner title="Acceso limitado - Plan de accion">
                        Necesitas el permiso{' '}
                        <PermCode>performance.view_action_plan</PermCode> para ver las recomendaciones detalladas.
                    </AccessBanner>
                )}

                {canPerfActionPlan && (
                    <ActionPlanPanel opportunities={planItems} performance={performance} />
                )}

                <SectionDivider
                    label="Exportar"
                    info="Descarga el PDF de este diagnóstico."
                />

                <EmailSendBar
                    captureRef={contenedorReporteRef}
                    url={url}
                    subject={`Diagnostico de ${url} (${strategyLabel})`}
                    includePdf={true}
                    context={emailContext}
                    captureWidthPx={1200}
                />
            </div>
        </div>
    );
}

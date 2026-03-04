// src/pages/full-check/DashboardCalidadWeb.tsx

// Orquestador del diagnóstico integral. Sub-piezas 
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import CircularGauge from '../../components/common/CircularGauge';
import {
    runFullCheck,
    type FullCheckTypes,
    type FullCheckResult,
} from '../../services/diagnostics.api';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';
import EmailPdfBar from '../../components/common/EmailPdfBar';
import { motion } from 'framer-motion';
import { useAuth } from '../../components/auth/AuthContext';
import { useDarkMode } from '../../shared/useDarkMode';

import { DiagnosticType, DIAGNOSTIC_INFO } from './fullCheckTypes';
import { getScore, getScoreColor, getSoftBg, getScoreLabel } from './fullCheckUtils';
import { DetailSection, ActionPlanList } from './FullCheckDetailSection';
import { MetricsDisplay } from './FullCheckMetrics';
import { TypeSpecificDetails } from './FullCheckTypeDetails';


// Componente principal
export default function FullCheckPage() {
    const { dark } = useDarkMode();
    const { user } = useAuth();
    const isClient = user?.role === 'cliente';
    const perms = user?.permissions || [];
    const hasUiGeneralDetails = perms.includes('ui.general.view_details');
    // Si el cliente tiene permiso de "ver detalles desde IU General", no está en modo solo lectura
    const readOnlyMode = isClient && !hasUiGeneralDetails;
    // Plan de acción: si NO está en modo solo lectura, siempre visible; si está en modo solo lectura, requiere permiso específico
    const canViewPlanFullCheck = !readOnlyMode || perms.includes('fullcheck.view_action_plan');
    const [sp, setSp] = useSearchParams();
    const url = sp.get('url') || '';
    const typesParam = sp.get('types') || '';
    const auditId = sp.get('auditId') || ''; // ID de auditoría performance/security
    const initType = sp.get('initType') || ''; // 'performance' | 'security' | 'both'

    const types: FullCheckTypes | undefined = useMemo(() => {
        const arr = typesParam.split(',').map((s) => s.trim()).filter(Boolean) as FullCheckTypes;
        return arr.length ? arr : undefined;
    }, [typesParam]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<FullCheckResult | null>(null);
    const captureRef = useRef<HTMLDivElement | null>(null);
    const [activeTab, setActiveTab] = useState<DiagnosticType>('usability');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        actionPlan: true,
    });

    useEffect(() => {
        if (!url) {
            setError('Falta la URL');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        runFullCheck(url, types)
            .then((res) => {
                setData(res);
                setError(null);
                // Primera tab disponible
                if (res.results.usability) setActiveTab('usability');
                else if (res.results.fiability) setActiveTab('fiability');
                else if (res.results.maintainability) setActiveTab('maintainability');
                else if (res.results.portability) setActiveTab('portability');
            })
            .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error ejecutando diagnóstico'))
            .finally(() => setLoading(false));
    }, [url, typesParam]);

    const toggleSection = (section: string) => {
        if (readOnlyMode) {
            window.alert('Necesitas permisos del administrador para acceder a los detalles.');
            return;
        }
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    if (!url) {
        return (
            <div className="p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Diagnóstico integral</CardTitle>
                    </CardHeader>
                    <CardContent>Debe proporcionar una URL válida.</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-12" data-page="full-check">
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="grid grid-cols-3 items-center mb-4">
                        <div className="justify-self-start">
                            <Link
                              to={`/dashboard?url=${encodeURIComponent(url)}`}
                              className="nav-back-btn inline-flex items-center gap-2 rounded-lg bg-white text-[#383838] px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition-colors no-underline dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                            >
                              ← Volver a vista general
                            </Link>
                        </div>
                        <h1 className="justify-self-center text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                            Diagnóstico Integral
                        </h1>
                        <div />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Análisis completo de calidad web</p>
                        <p className="text-xs text-gray-500 mt-1">
                            URL:{' '}
                            <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                {url}
                            </a>
                        </p>
                    </div>
                </div>

                {readOnlyMode && (
                    <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                        Modo solo lectura para clientes: puedes ver las métricas resultantes de cada diagnóstico.
                        Para acceder al detalle y a las acciones avanzadas, solicita permisos al administrador.
                    </div>
                )}

                {loading && (
                    <Card className="shadow-lg">
                        <CardContent className="p-12">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
                                <p className="text-lg font-medium text-gray-700">Ejecutando análisis...</p>
                                <p className="text-sm text-gray-500">Esto puede tomar unos segundos</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {error && (
                    <Card className="mb-6 border-red-200 bg-red-50">
                        <CardHeader>
                            <CardTitle className="text-red-700 flex items-center gap-2">
                                <AlertCircle size={24} />
                                Error en el análisis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-red-600">{error}</CardContent>
                    </Card>
                )}

                {/* Mensaje informativo si hay datos de performance/security */}
                {auditId && initType && !loading && (
                    <Card className="mb-6 border-blue-200 bg-blue-50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="text-blue-600 text-xl">ℹ️</div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">
                                    Diagnóstico de {initType === 'both' ? 'Rendimiento y Seguridad' : initType === 'performance' ? 'Rendimiento' : 'Seguridad'} completado
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Puedes ver los resultados detallados en la{' '}
                                    <a href={`/diagnostico/${auditId}?type=${initType}`} className="underline font-semibold hover:text-blue-900">
                                        vista de diagnóstico →
                                    </a>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {data && (
                    <div ref={captureRef}>
                        <Card className="shadow-xl border-2">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    📊 Resumen de Diagnósticos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DiagnosticType)}>
                                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6 h-auto">
                                        {(Object.keys(DIAGNOSTIC_INFO) as DiagnosticType[]).map((type) => {
                                            const result = data.results[type];
                                            if (!result) return null;
                                            const score = getScore(type, result);
                                            return (
                                                <TabsTrigger
                                                    key={type}
                                                    value={type}
                                                    className="flex flex-col gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-md"
                                                >
                                                    <span className="text-2xl">{DIAGNOSTIC_INFO[type].icon}</span>
                                                    <span className="text-xs font-semibold">{DIAGNOSTIC_INFO[type].title}</span>
                                                    <span
                                                        className="text-xs font-bold"
                                                        style={{ color: getScoreColor(score) }}
                                                    >
                                                        {score != null ? `${score}%` : 'N/A'}
                                                    </span>
                                                </TabsTrigger>
                                            );
                                        })}
                                    </TabsList>

                                    {/* Contenido de cada tab */}
                                    {(Object.keys(DIAGNOSTIC_INFO) as DiagnosticType[]).map((type) => {
                                        const result = data.results[type];
                                        if (!result || activeTab !== type) return null;

                                        const score = getScore(type, result);
                                        const color = getScoreColor(score);
                                        const bgColor = getSoftBg(score);
                                        const label = getScoreLabel(score);

                                        return (
                                            <motion.div
                                                key={type}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.15 }}
                                                className="space-y-6"
                                            >
                                                {/* Gauge principal y resumen */}
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                    {/* Gauge */}
                                                    <div
                                                        className="lg:col-span-1 flex flex-col items-center justify-center p-6 rounded-xl border-2 shadow-sm"
                                                        style={{ backgroundColor: bgColor }}
                                                    >
                                                        <div className="mb-3">
                                                            <h3 className="text-lg font-bold text-center text-gray-800">
                                                                {DIAGNOSTIC_INFO[type].title}
                                                            </h3>
                                                        </div>
                                                        <CircularGauge
                                                            value={score ?? 0}
                                                            max={100}
                                                            color={color}
                                                            size={140}
                                                            suffix="%"
                                                            centerFill={bgColor}
                                                            strokeWidth={12}
                                                            textColor={dark ? '#ffffff' : '#111111'}
                                                        />
                                                        <div className="mt-3 text-center">
                                                            <div
                                                                className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                                                                style={{
                                                                    backgroundColor: bgColor,
                                                                    color,
                                                                    border: `1px solid ${color}`,
                                                                }}
                                                            >
                                                                {label}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Información y métricas */}
                                                    <div className="lg:col-span-2 space-y-4">
                                                        {/* Descripción */}
                                                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                                            <div className="flex items-start gap-3">
                                                                <Info size={20} className="text-blue-600 mt-0.5 shrink-0" />
                                                                <div>
                                                                    <h3 className="font-bold text-blue-900 mb-2 text-base">
                                                                        ¿Qué mide este análisis?
                                                                    </h3>
                                                                    <p className="text-sm text-blue-800 leading-relaxed">
                                                                        {DIAGNOSTIC_INFO[type].description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Resumen */}
                                                        {result.summary && (
                                                            <div className="p-4 bg-gray-50 border-2 rounded-xl">
                                                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                                                                    <Info size={16} />
                                                                    Resumen
                                                                </h4>
                                                                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                                                            </div>
                                                        )}

                                                        {/* Recomendación */}
                                                        {result.recommendation && (
                                                            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                                                <div className="flex items-start gap-3">
                                                                    <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
                                                                    <div>
                                                                        <h4 className="font-bold text-green-900 mb-2 text-sm">Recomendación</h4>
                                                                        <p className="text-sm text-green-800 leading-relaxed">
                                                                            {result.recommendation}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Métricas específicas por tipo */}
                                                        <MetricsDisplay type={type} metrics={result.metrics} />
                                                    </div>
                                                </div>

                                                {/* Divisor */}
                                                <div className="flex items-center gap-4 my-8">
                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                                                    <span className="text-sm uppercase tracking-wider text-slate-600 font-semibold px-3">
                                                        Detalles del análisis
                                                    </span>
                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                                                </div>

                                                {/* Detalles específicos por tipo (primero: p.ej., Inconformidades de Accesibilidad) */}
                                                <TypeSpecificDetails
                                                    type={type}
                                                    details={result.details}
                                                    expandedSections={expandedSections}
                                                    toggleSection={toggleSection}
                                                />

                                                {/* Plan de acción: oculto para clientes, mostrar aviso en su lugar (después de detalles) */}
                                                {result.actionPlan && result.actionPlan.length > 0 && (
                                                    <DetailSection
                                                        title={`Plan de Acción (${result.actionPlan.length} items)`}
                                                        icon={<CheckCircle size={22} className="text-green-600" />}
                                                        expanded={expandedSections['actionPlan']}
                                                        onToggle={() => toggleSection('actionPlan')}
                                                        count={result.actionPlan.length}
                                                    >
                                                        {!canViewPlanFullCheck ? (
                                                            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                                                                Esta sección está disponible solo para roles con permisos. Solicita acceso al administrador para ver el plan de acción.
                                                            </div>
                                                        ) : (
                                                            <ActionPlanList items={result.actionPlan.slice(0, 15)} />
                                                        )}
                                                    </DetailSection>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Barra de exportación PDF: visible para todos los roles */}
                        <div className="mt-8 flex justify-end">
                            <EmailPdfBar
                                captureRef={captureRef as React.RefObject<HTMLElement>}
                                url={url}
                                subject={`Diagnóstico integral: ${url}`}
                                includePdf={true}
                                captureWidthPx={1400}
                                context="full-check"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

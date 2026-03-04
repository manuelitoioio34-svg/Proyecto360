// src/components/dashboard/FlipCard.tsx

// Componente de tarjeta interactiva para el dashboard, mostrando una métrica clave (Performance, Seguridad, etc) con su puntuación, tendencia y acceso a detalles
import React from 'react';
import { Card, CardContent, CardFooter } from '../../shared/ui/card';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useDarkMode } from '../../shared/useDarkMode';
import CircularGauge from '../common/CircularGauge';

interface Recommendation {
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact?: string;
}

interface FlipCardProps {
    // Métrica
    icon: string;
    name: string;
    description: string;
    score: number;
    color: string;
    label: string;
    trend?: 'up' | 'down' | 'stable';

    // Recomendaciones
    recommendations: Recommendation[];
    // Resumen del análisis (explicación del score)
    summary?: string;

    // Estado de carga (API aún ejecutándose)
    loading?: boolean;

    // Navegación
    onNavigate?: () => void;
    disabled?: boolean;
    disabledMessage?: string;
}

// Función helper para obtener color del badge según el score
function getBadgeStyle(score: number): { bg: string; text: string; border: string } {
    if (score >= 90) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (score >= 70) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    if (score >= 50) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
}

export default function FlipCard({
    icon,
    name,
    description,
    score,
    color,
    label,
    trend,
    recommendations,
    summary,
    loading = false,
    onNavigate,
    disabled,
    disabledMessage,
}: FlipCardProps) {
    const handleNavigate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (onNavigate) {
            onNavigate();
        }
    };

    const { dark } = useDarkMode();
    const badgeStyle = getBadgeStyle(score);

    // Colores de acento por categoría en dark mode (más vibrantes que solo gris)
    const darkCardBg   = dark ? '#161d2e' : 'white';
    const darkBorder   = dark ? (loading ? '#2e3f60' : `${color}99`) : '#e5e7eb';
    const darkIconBg   = dark ? `${color}22` : '#f9fafb';
    const darkSepColor = dark ? '#2a3a58' : '#e5e7eb';

    return (
        <Card
            data-pdf-avoid
            data-metric-card="true"
            style={{
                background: darkCardBg,
                border: `1.5px solid ${darkBorder}`,
                boxShadow: dark && !loading
                  ? `0 0 0 1px ${color}44, 0 4px 24px rgba(0,0,0,0.45)`
                  : dark
                  ? '0 0 0 1px #2e3f6066, 0 4px 16px rgba(0,0,0,0.3)'
                  : undefined,
            }}
            className="hover:shadow-xl transition-all duration-200 h-full rounded-xl overflow-hidden"
        >
            {/* Barra de acento superior con el color de la métrica */}
            <div style={{ height: 4, background: loading ? 'transparent' : color, opacity: dark ? 0.85 : 0.7 }} />

            <CardContent className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                            style={{ background: loading ? (dark ? '#1e2a3a' : '#f3f4f6') : darkIconBg }}
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" style={{ color: dark ? '#6b9fdc' : '#3b82f6' }} />
                            ) : icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm leading-tight" style={{ color: dark ? '#e8eaf0' : '#1a1a2e' }}>
                                {name}
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: dark ? '#7a8aaa' : '#6b7280' }}>
                                {description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contenido: gauge o esqueleto de carga */}
                <div className="flex-1 flex items-center justify-center py-4">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 w-full">
                            {/* Círculo animado de progreso */}
                            <div
                                className="relative w-36 h-36 rounded-full flex items-center justify-center"
                                style={{ background: dark ? '#1b2438' : '#f0f4ff' }}
                            >
                                <svg className="absolute w-full h-full -rotate-90 animate-spin" style={{ animationDuration: '3s' }}>
                                    <circle cx="72" cy="72" r="62" fill="none" stroke={dark ? '#2a3f6a' : '#dbeafe'} strokeWidth="8" />
                                    <circle
                                        cx="72" cy="72" r="62"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="8"
                                        strokeDasharray="390"
                                        strokeDashoffset="293"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="text-center z-10">
                                    <div className="text-2xl mb-1">⏳</div>
                                    <p className="text-xs font-medium" style={{ color: dark ? '#6b9fdc' : '#3b82f6' }}>Calculando</p>
                                </div>
                            </div>
                            {/* Barras skeleton */}
                            <div className="w-full space-y-2 px-2">
                                <div className="h-2 rounded-full animate-pulse" style={{ background: dark ? '#1e2c44' : '#e0e8ff', width: '70%', margin: '0 auto' }} />
                                <div className="h-2 rounded-full animate-pulse" style={{ background: dark ? '#1a2538' : '#eff3ff', width: '50%', margin: '0 auto', animationDelay: '150ms' }} />
                            </div>
                        </div>
                    ) : (
                        <CircularGauge
                            value={score}
                            max={100}
                            color={color}
                            size={160}
                            strokeWidth={10}
                            suffix="/100"
                            textColor={dark ? '#e8eaf0' : '#111111'}
                            trackColor={dark ? `${color}20` : '#f3f4f6'}
                        />
                    )}
                </div>

                {/* Resumen / razón del score bajo — visible solo cuando score < 50 y hay texto */}
                {!loading && summary && score < 50 && (
                    <div
                        className="mt-3 px-3 py-2 rounded-lg text-xs leading-snug"
                        style={{
                            background: dark ? '#1e1a10' : '#fffbeb',
                            border: `1px solid ${dark ? '#78350f55' : '#fde68a'}`,
                            color: dark ? '#fcd34d' : '#92400e',
                        }}
                    >
                        <span className="font-semibold">⚠ Por qué este resultado: </span>
                        {summary}
                    </div>
                )}

                {/* Footer */}
                <CardFooter className="mt-5 pt-5 flex flex-col gap-3" style={{ borderTop: `1px solid ${darkSepColor}` }}>
                    {loading ? (
                        <>
                            {/* Badge pulsando */}
                            <div className="w-full flex items-center justify-center">
                                <span
                                    className="text-xs font-medium px-4 py-1.5 rounded-md border animate-pulse flex items-center gap-2"
                                    style={{
                                        background: dark ? '#1a2948' : '#eff6ff',
                                        color: dark ? '#6b9fdc' : '#2563eb',
                                        borderColor: dark ? '#2a3f6a' : '#bfdbfe',
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />
                                    Analizando...
                                </span>
                            </div>
                            {/* Botón deshabilitado */}
                            <button
                                disabled
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed"
                                style={{ background: dark ? '#1a2132' : '#f1f5f9', color: dark ? '#3d5070' : '#94a3b8' }}
                            >
                                <Loader2 size={14} className="animate-spin" />
                                <span>Espera un momento...</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Badge */}
                            <div className="w-full flex items-center justify-center">
                                <span
                                    className={`text-xs font-medium px-3 py-1.5 rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                                >
                                    {label}
                                </span>
                            </div>
                            {/* Botón */}
                            <button
                                onClick={handleNavigate}
                                aria-disabled={!!disabled}
                                title={disabled ? (disabledMessage || 'Permiso requerido') : `Ver análisis completo de ${name}`}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium group 
                                           ${disabled
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-900 dark:bg-[#0075C9] hover:bg-gray-700 dark:hover:bg-[#005fa3] active:bg-gray-700 text-white cursor-pointer focus:outline-none'}`}
                            >
                                <span>Ver detalles</span>
                                <ArrowRight size={16} className={`${disabled ? 'text-gray-500' : 'text-white group-hover:translate-x-1'} transition-transform`} />
                            </button>
                        </>
                    )}
                </CardFooter>
            </CardContent>
        </Card>
    );
}

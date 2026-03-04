// src/pages/full-check/fullCheckUtils.ts

// Funciones utilitarias puras para el diagnóstico integral
import { DiagnosticType } from './fullCheckTypes';
import {
    UsabilityMetrics,
    FiabilityMetrics,
    MaintainabilityMetrics,
    PortabilityMetrics,
} from '../../shared/types/api';

export function getScore(
    type: DiagnosticType,
    result: { metrics?: UsabilityMetrics | FiabilityMetrics | MaintainabilityMetrics | PortabilityMetrics }
): number | null {
    if (!result || !result.metrics) return null;

    switch (type) {
        case 'usability': {
            const m = result.metrics as UsabilityMetrics;
            return m.score != null ? Math.round(m.score * 100) : null;
        }
        case 'fiability': {
            const m = result.metrics as FiabilityMetrics;
            return m.availability != null ? m.availability : null;
        }
        case 'maintainability': {
            const m = result.metrics as MaintainabilityMetrics;
            const items = m.stackItems || 0;
            if (items === 0) return 0;
            if (items <= 4) return 100;
            if (items <= 9) return 80;
            if (items <= 14) return 60;
            return 30;
        }
        case 'portability': {
            const m = result.metrics as PortabilityMetrics;
            const browsers = m.compatibleBrowsers || [];
            return browsers.length > 0 ? Math.round((browsers.length / 4) * 100) : 0;
        }
        default:
            return null;
    }
}

export function getScoreColor(score: number | null): string {
    if (score == null) return '#9ca3af';
    if (score >= 90) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
}

export function getSoftBg(score: number | null): string {
    if (score == null) return '#ffffff';
    if (score >= 90) return 'rgba(34,197,94,0.08)';
    if (score >= 50) return 'rgba(245,158,11,0.08)';
    return 'rgba(239,68,68,0.08)';
}

export function getScoreLabel(score: number | null): string {
    if (score == null) return 'Sin datos';
    if (score >= 90) return 'Excelente';
    if (score >= 50) return 'Necesita mejoras';
    return 'Crítico';
}

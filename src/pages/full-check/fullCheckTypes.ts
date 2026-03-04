// src/pages/full-check/fullCheckTypes.ts

// Tipos y constantes compartidas del diagnóstico integral
export type DiagnosticType = 'usability' | 'fiability' | 'maintainability' | 'portability';

export const DIAGNOSTIC_INFO: Record<
    DiagnosticType,
    { title: string; icon: string; description: string; color: string }
> = {
    usability: {
        title: 'Accesibilidad',
        icon: '♿',
        description: 'Análisis WCAG 2.1 con axe-core: contraste, etiquetas alt, roles ARIA.',
        color: '#10b981',
    },
    fiability: {
        title: 'Fiabilidad',
        icon: '✅',
        description: 'Disponibilidad y tiempo de respuesta mediante sondeos HTTP.',
        color: '#3b82f6',
    },
    maintainability: {
        title: 'Mantenibilidad',
        icon: '🧩',
        description: 'Tecnologías detectadas, versiones y dependencias.',
        color: '#8b5cf6',
    },
    portability: {
        title: 'Portabilidad',
        icon: '🌐',
        description: 'Compatibilidad con navegadores modernos (Chrome, Edge, Firefox, Safari).',
        color: '#6366f1',
    },
};

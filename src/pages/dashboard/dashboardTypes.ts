// src/pages/dashboard/dashboardTypes.ts

// Tipos y configuración compartida del Dashboard General
export type Recommendation = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact?: string;
};

export type DiagnosticScore = {
  score: number;
  label: string;
  color: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
  recommendations?: Recommendation[];
  summary?: string;
};

export type DashboardData = {
  url: string;
  overallScore: number;
  timestamp: Date;
  diagnostics: {
    performance?: DiagnosticScore;
    security?: DiagnosticScore;
    accessibility?: DiagnosticScore;
    reliability?: DiagnosticScore;
    maintainability?: DiagnosticScore;
    portability?: DiagnosticScore;
  };
  criticalIssues: Array<{
    id: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
  insights: {
    strengths: string[];
    improvements: string[];
  };
  aggregatedRecommendations?: Array<{
    type: keyof typeof DIAGNOSTIC_CONFIG;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact?: string;
  }>;
  actionPlan?: Array<{
    type: keyof typeof DIAGNOSTIC_CONFIG;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact?: string;
  }>;
};

export const DIAGNOSTIC_CONFIG = {
  performance: {
    name: 'Rendimiento',
    icon: '🚀',
    description: 'Core Web Vitals y SEO',
    detailPath: '/diagnostico',
  },
  security: {
    name: 'Seguridad',
    icon: '🛡️',
    description: 'Headers HTTP y configuración',
    detailPath: '/diagnostico',
  },
  accessibility: {
    name: 'Accesibilidad',
    icon: '♿',
    description: 'Cumplimiento WCAG 2.1',
    detailPath: '/diagnostics/full-check',
  },
  reliability: {
    name: 'Fiabilidad',
    icon: '✅',
    description: 'Disponibilidad y tiempo de respuesta',
    detailPath: '/diagnostics/full-check',
  },
  maintainability: {
    name: 'Mantenibilidad',
    icon: '🧩',
    description: 'Tecnologías detectadas y complejidad',
    detailPath: '/diagnostics/full-check',
  },
  portability: {
    name: 'Portabilidad',
    icon: '🌐',
    description: 'Compatibilidad en navegadores clave',
    detailPath: '/diagnostics/full-check',
  },
} as const;

export const ORDER: Array<keyof typeof DIAGNOSTIC_CONFIG> = [
  'performance',
  'security',
  'accessibility',
  'reliability',
  'maintainability',
  'portability',
];

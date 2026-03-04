// Definición de tipos para la API de Lighthouse
export interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  numericValue?: number;
  details?: any; // Puede ser complejo, mantener any por ahora
}

export interface LighthouseCategory {
  id: string;
  title: string;
  score: number | null;
  auditRefs: Array<{
    id: string;
    weight: number;
  }>;
}

export interface ApiData {
  performance?: number;
  categories?: Record<string, LighthouseCategory>;
  categoryScores?: {
    performance?: number;
    accessibility?: number;
    "best-practices"?: number;
    seo?: number;
  };
  raw?: {
    lighthouseResult?: {
      audits?: Record<string, LighthouseAudit>;
      categories?: Record<string, LighthouseCategory>;
    };
    audits?: Record<string, LighthouseAudit>;
    categories?: Record<string, LighthouseCategory>;
  };
  lighthouseResult?: {
    audits?: Record<string, LighthouseAudit>;
    categories?: Record<string, LighthouseCategory>;
  };
  audits?: Record<string, LighthouseAudit>;
  metrics?: Record<string, any>; // Mantener any por complejidad
  [key: string]: any; // Para otros campos dinámicos
}

export interface ErrorItem {
  id: string;
  title: string;
  description: string;
  displayValue: string;
  details: any;
  score: number | null;
  typeHint: string | null;
}

export interface ImprovementItem {
  id: string;
  title: string;
  description: string;
  displayValue: string;
  details: any;
  score: number | null;
  typeHint: string | null;
}

export interface OpportunityItem {
  type: string;
  severity: string;
  impactScore: number;
  id: string;
  title: string;
  recommendation: string;
  [key: string]: any;
}

export interface ProcessedData {
  opportunities?: OpportunityItem[];
  errors?: ErrorItem[];
  improvements?: ImprovementItem[];
  metrics?: ProcessedMetric[] | Record<string, { raw?: number; trend?: Trend } | number>;
  [key: string]: any;
}

export interface ProcessedMetric {
  key: string;
  raw: number | null;
  trend?: Trend;
}

export type Trend = 'up' | 'down' | 'stable';

// ======= Envelope de respuesta del audit GET /api/audit/:id =======
export interface AuditApiResponse {
  url?: string;
  fecha?: string;
  email?: string;
  strategy?: 'mobile' | 'desktop' | string;
  audit?: Record<string, any>;
  // campos de error devueltos por la API
  error?: string;
  message?: string;
}

// ======= Seguridad =======
export interface SecurityFinding {
  id?: string;
  rule?: string;
  title?: string;
  description?: string;
  message?: string;
  severity?: string;
  passed?: boolean;
}

export interface SecurityResult {
  score?: number;
  securityScore?: number;
  grade?: string;
  findings?: SecurityFinding[];
  headers?: Record<string, any>;
  cookies?: any;
  passCount?: number;
  warningCount?: number;
  failCount?: number;
  summary?: {
    passed?: number;
    warnings?: number;
    failed?: number;
  };
  [key: string]: any;
}

export interface SecurityHistoryItem {
  fecha: string;
  score: number | null;
}

/** Respuesta de POST /api/security-analyze */
export interface SecurityAnalyzeResponse extends SecurityResult {
  error?: string;
}

/** Respuesta de POST /api/audit con type="security" */
export interface SecurityAuditResponse {
  error?: string;
  audit?: { security?: SecurityResult };
  security?: SecurityResult;
}

// Interfaces para resultados de diagnóstico
export interface UsabilityMetrics {
  score?: number;
}

export interface FiabilityMetrics {
  availability?: number;
  avgResponseTime?: number;
}

export interface MaintainabilityMetrics {
  stackItems?: number;
}

export interface PortabilityMetrics {
  compatibleBrowsers?: string[];
}

export type DiagnosticResult = {
  usability?: { metrics?: UsabilityMetrics };
  fiability?: { metrics?: FiabilityMetrics };
  maintainability?: { metrics?: MaintainabilityMetrics };
  portability?: { metrics?: PortabilityMetrics };
};

// Métricas para display en UI
export interface DisplayMetrics {
  // Usability
  violations?: number;
  critical?: number;
  serious?: number;
  moderate?: number;
  // Fiability
  availability?: number;
  avgResponseTime?: number;
  // Maintainability
  stackItems?: number;
  // Portability
  compatibleBrowsers?: string[];
  incompatibilities?: number;
}

export interface ActionPlanItem {
  id?: string;
  title: string;
  recommendation: string;
  severity?: string;
}

export interface DiagnosticDetails {
  // Usability
  violations?: any[]; // AxeViolation[];
  statsByImpact?: Record<string, number>;
  // Fiability
  series?: any[]; // UptimeProbe[];
  headers?: Record<string, string | string[] | undefined>;
  // Maintainability
  technologies?: any[]; // Technology[];
  // Portability
  usedFeatures?: string[];
  supportMatrix?: Record<string, Record<string, boolean>>;
}
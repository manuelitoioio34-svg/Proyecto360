// server/database/esquemaBD.ts

// Esquema principal de auditoría (misma estructura/campos)
import mongoose from "mongoose";

// Métricas: permitir estructura flexible para distintos tipos de diagnósticos
// (mantiene compatibilidad con métricas LH pero acepta campos arbitrarios)
const MetricSchema = new mongoose.Schema(
  {},
  { _id: false, strict: false }
);

// Tipos mínimos del documento
export interface Metric {
  // Lighthouse/PageSpeed (si aplica)
  fcp?: number | null;
  lcp?: number | null;
  cls?: number | null;
  tbt?: number | null;
  si?: number | null;
  ttfb?: number | null;
  // Campos arbitrarios para otros diagnósticos (usabilidad, fiabilidad, etc.)
  [key: string]: any;
}

export interface AuditDoc extends mongoose.Document {
  url: string;
  type:
    | "pagespeed"
    | "unlighthouse"
    | "security"
    | "usability"
    | "fiability"
    | "maintainability"
    | "portability"
    | (string & {});
  strategy: "mobile" | "desktop" | (string & {});
  name?: string;
  email?: string;
  userId?: mongoose.Types.ObjectId | null;
  performance?: number;
  metrics?: Metric | null;
  raw?: unknown;
  audit?: unknown;
  tipos?: string[];
  security?: unknown;
  summary?: string;
  recommendation?: string;
  actionPlan?: Array<Record<string, any>> | null;
  fecha: Date;
}

// Esquema principal de Auditoría (misma estructura/campos)
const AuditSchema = new mongoose.Schema<AuditDoc>(
  {
    url: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "pagespeed",
        "unlighthouse",
        "security",
        "usability",
        "fiability",
        "maintainability",
        "portability",
      ],
      required: true,
    },
    strategy: { type: String, enum: ["mobile", "desktop"], default: "mobile" },
    name: { type: String },
    email: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    performance: Number,
    metrics: { type: mongoose.Schema.Types.Mixed },
    raw: Object,
    audit: Object,
    tipos: { type: [String], default: [] },
    security: Object,
    summary: { type: String },
    recommendation: { type: String },
  actionPlan: { type: [Object], default: undefined },
    fecha: { type: Date, default: Date.now },
  },
  { collection: "audits" }
);

// Export default (igual que en JS)
const Audit = mongoose.model<AuditDoc>("Audit", AuditSchema);
export default Audit;
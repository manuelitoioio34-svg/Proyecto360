// server/database/diagnosticRun.ts
// Registro de cada ejecución completa del Dashboard (histórico general).
// Se guarda automáticamente al finalizar un dashboardCheck exitoso.

import mongoose, { Schema, type Document, type Model, Types } from 'mongoose';

export interface IDiagnosticRun extends Document {
  url:        string;
  fecha:      Date;
  /** Usuario que disparó el análisis */
  userId?:    Types.ObjectId | string | null;
  userName?:  string | null;
  userEmail?: string | null;
  /** Score ponderado global 0-100 */
  overallScore: number;
  /** Scores individuales de cada API */
  scores: {
    performance?:    number | null;
    security?:       number | null;
    accessibility?:  number | null;
    reliability?:    number | null;
    maintainability?: number | null;
    portability?:    number | null;
  };
  /** Tiempo total del análisis en ms */
  durationMs?: number | null;
  /** true si el resultado vino del caché RAM */
  fromCache?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DiagnosticRunSchema = new Schema<IDiagnosticRun>(
  {
    url:        { type: String, required: true, index: true },
    fecha:      { type: Date,   required: true, default: Date.now, index: true },
    userId:     { type: Schema.Types.Mixed, default: null, index: true },
    userName:   { type: String, default: null },
    userEmail:  { type: String, default: null },
    overallScore: { type: Number, required: true },
    scores: {
      performance:    { type: Number, default: null },
      security:       { type: Number, default: null },
      accessibility:  { type: Number, default: null },
      reliability:    { type: Number, default: null },
      maintainability:{ type: Number, default: null },
      portability:    { type: Number, default: null },
    },
    durationMs: { type: Number, default: null },
    fromCache:  { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'diagnostic_runs' }
);

export const DiagnosticRun: Model<IDiagnosticRun> =
  mongoose.models.DiagnosticRun ||
  mongoose.model<IDiagnosticRun>('DiagnosticRun', DiagnosticRunSchema);

export default DiagnosticRun;

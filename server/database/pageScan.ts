// src/server/database/pageScan.ts

// Mongoose model para cada página escaneada dentro de un SiteScan
import mongoose, { Schema, type Document, type Model, Types } from 'mongoose';

export interface IPageScan extends Document {
    siteScanId: Types.ObjectId | string;
    url: string;
    normalizedUrl: string;
    status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'canceled';
    attempts: number;
    durationMs?: number | null;
    success?: boolean | null;
    // resultados (flexible):
    results?: any;
    errorMessage?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const PageScanSchema = new Schema<IPageScan>({
    siteScanId: { type: Schema.Types.ObjectId as any, ref: 'SiteScan', required: true },
    url: { type: String, required: true },
    normalizedUrl: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'queued', 'running', 'completed', 'failed', 'skipped', 'canceled'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    durationMs: { type: Number, default: null },
    success: { type: Boolean, default: null },
    results: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },
}, { timestamps: true });

PageScanSchema.index({ siteScanId: 1, normalizedUrl: 1 }, { unique: true });

export const PageScan: Model<IPageScan> = mongoose.models.PageScan || mongoose.model<IPageScan>('PageScan', PageScanSchema);

export default PageScan;

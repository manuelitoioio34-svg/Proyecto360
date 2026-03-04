// src/server/database/siteScan.ts

// Mongoose model para cada escaneo de sitio (SiteScan) con su configuración y estado
import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type SiteScanMode = 'sitemap' | 'crawl' | 'list' | 'hybrid';

export interface ISiteScan extends Document {
    seedUrl: string;
    mode: SiteScanMode;
    include?: string[];
    exclude?: string[];
    maxPages?: number;
    maxDepth?: number;
    concurrency?: number;
    status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled';
    pagesDiscovered: number;
    pagesQueued: number;
    pagesCompleted: number;
    errorCount: number;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const SiteScanSchema = new Schema<ISiteScan>({
    seedUrl: { type: String, required: true },
    mode: { type: String, enum: ['sitemap', 'crawl', 'list', 'hybrid'], required: true },
    include: { type: [String], default: [] },
    exclude: { type: [String], default: [] },
    maxPages: { type: Number, default: 100 },
    maxDepth: { type: Number, default: 2 },
    concurrency: { type: Number, default: 3 },
    status: { type: String, enum: ['queued', 'running', 'paused', 'completed', 'failed', 'canceled'], default: 'queued' },
    pagesDiscovered: { type: Number, default: 0 },
    pagesQueued: { type: Number, default: 0 },
    pagesCompleted: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
}, { timestamps: true });

export const SiteScan: Model<ISiteScan> = mongoose.models.SiteScan || mongoose.model<ISiteScan>('SiteScan', SiteScanSchema);

export default SiteScan;

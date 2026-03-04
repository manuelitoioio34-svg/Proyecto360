// src/components/perf/diagViewHelpers.tsx
// Helpers locales del DiagnosticoView: constantes UI, SectionDivider y HistoricoDisabledBtn

import React, { useState } from 'react';
import { Info, Ban } from 'lucide-react';

// ─── Etiquetas de API ─────────────────────────────────────────────────────────

export const API_LABELS: Record<string, string> = {
    pagespeed: 'Lighthouse',
    unlighthouse: 'Unlighthouse',
};

// ─── Separador de sección (estilo compacto para vista de rendimiento) ─────────

export function SectionDivider({ label, info }: { label: string; info?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="w-full my-6" role="region" aria-label={label}>
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-slate-50 border border-slate-200">
                    <div className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-600 select-none">
                        {label}
                    </div>
                    {info && (
                        <button
                            type="button"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            title="Que es esto?"
                        >
                            <Info size={14} strokeWidth={2.4} />
                        </button>
                    )}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            </div>
            {info && open && (
                <div className="mt-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3">
                    {info}
                </div>
            )}
        </div>
    );
}

// ─── Botón historico deshabilitado ────────────────────────────────────────────

export const HistoricoDisabledBtn = ({ className = '' }: { className?: string }) => (
    <button
        type="button"
        className={`back-link cursor-not-allowed opacity-60 inline-flex items-center gap-1 ${className}`}
        title="Historico no disponible para este rol"
        aria-disabled
    >
        <Ban size={16} /> Historico no disponible
    </button>
);

// ─── Textos informativos de las tarjetas de categoría ─────────────────────────

export const cardInfoText: Record<string, React.ReactNode> = {
    performance: (
        <>
            Indice global (0-100) de Lighthouse que resume el estado de carga percibida de la pagina. Se compone
            principalmente de FCP, LCP, TBT, SI y estabilidad visual (CLS). El puntaje varia segun el modo de prueba
            (Movil/Ordenador).
        </>
    ),
    'best-practices': (
        <>
            Conjunto de verificaciones sobre seguridad del front-end y uso de APIs modernas (HTTPS, uso seguro de JS,
            imagenes con dimensiones, etc.).
        </>
    ),
    seo: (
        <>
            Senales tecnicas basicas para descubrimiento en buscadores: metadatos HTML, enlaces, etiquetas canonicas,
            accesibilidad tecnica y contenido indexable.
        </>
    ),
};

// src/components/common/emailPdfUtils.ts
// Utilidades DOM puras para captura y generación de PDF (sin React, sin estado)

// ─── Respuesta HTTP ────────────────────────────────────────────────────────────

export async function safeParse(res: Response): Promise<unknown> {
    const txt = await res.text();
    try { return JSON.parse(txt || '{}'); } catch { return { _raw: txt }; }
}

// ─── CSS ───────────────────────────────────────────────────────────────────────

/** Elimina funciones de color modernas que html2canvas no puede parsear */
export const sanitizeCss = (cssText: string): string =>
    cssText.replace(/\b(color|oklab|oklch|lab|lch|color-mix)\([^)]*\)/gi, 'transparent');

/** Copia y sanea bloques <style> del documento principal al iframe doc */
export function copyStylesTo(doc: Document, pdfClassName: string): void {
    const head = doc.head;

    document.querySelectorAll('style').forEach((st) => {
        try {
            const el = doc.createElement('style');
            el.textContent = sanitizeCss(st.textContent || '');
            head.appendChild(el);
        } catch { /* ignorar bloques problemáticos */ }
    });

    try {
        const tweak = doc.createElement('style');
        tweak.textContent = `
        .${pdfClassName}, .${pdfClassName} * {
          background-image: none !important;
          box-shadow: none !important;
          filter: none !important;
          backdrop-filter: none !important;
          animation: none !important;
          transition: none !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background-clip: padding-box !important;
          overflow: visible !important;
          max-height: none !important;
          min-height: auto !important;
        }
        .${pdfClassName} {
          background: #ffffff !important;
          padding-bottom: 60px !important;
        }
        .${pdfClassName} .rounded,
        .${pdfClassName} .rounded-md,
        .${pdfClassName} .rounded-lg,
        .${pdfClassName} .rounded-xl { overflow: visible !important; }
        .${pdfClassName} .card,
        .${pdfClassName} .Card,
        .${pdfClassName} .border,
        .${pdfClassName} .border-2,
        .${pdfClassName} .border-4 {
          overflow: visible !important;
          background-clip: padding-box !important;
          margin-bottom: 20px !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .${pdfClassName} [data-pdf-avoid] {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }
        .${pdfClassName} [data-pdf-stop] {
          break-after: page !important;
          page-break-after: always !important;
        }`;
        head.appendChild(tweak);
    } catch { /* ignorar */ }
}

// ─── Espera de recursos ────────────────────────────────────────────────────────

/** Espera 2× rAF + fuentes + imágenes cargadas antes de capturar */
export async function waitForReady(doc: Document, root: HTMLElement, msExtra = 0): Promise<void> {
    await new Promise<void>((r) =>
        doc.defaultView?.requestAnimationFrame(() =>
            doc.defaultView?.requestAnimationFrame(() => r())
        )
    );
    const fonts = (doc as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) { try { await fonts.ready; } catch { } }
    const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(imgs.map((img) => new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth) return resolve();
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
    })));
    if (msExtra > 0) await new Promise<void>((r) => setTimeout(r, msExtra));
}

// ─── Inline styles ─────────────────────────────────────────────────────────────

/** Copia estilos computados del árbol fuente al clon para fidelidad visual */
export function inlineComputedStyles(srcEl: HTMLElement, dstEl: HTMLElement, doSanitize: boolean): void {
    try {
        const cs = window.getComputedStyle(srcEl);
        const cssTextRaw = (cs as unknown as { cssText?: string }).cssText;
        if (cssTextRaw) {
            dstEl.style.cssText = doSanitize ? sanitizeCss(cssTextRaw) : cssTextRaw;
        } else {
            let text = '';
            for (let i = 0; i < cs.length; i++) {
                const prop = cs[i];
                try {
                    const val = cs.getPropertyValue(prop);
                    if (val) text += `${prop}: ${val}; `;
                } catch { /* ignorar */ }
            }
            dstEl.style.cssText = doSanitize ? sanitizeCss(text) : text;
        }
    } catch { /* ignorar */ }

    const srcChildren = Array.from(srcEl.children) as HTMLElement[];
    const dstChildren = Array.from(dstEl.children) as HTMLElement[];
    const n = Math.min(srcChildren.length, dstChildren.length);
    for (let i = 0; i < n; i++) {
        inlineComputedStyles(srcChildren[i], dstChildren[i], doSanitize);
    }
}

// ─── Layout helpers ────────────────────────────────────────────────────────────

/** Expande contenedores con scroll y quita position sticky/fixed para el export */
export function expandForExport(rootEl: HTMLElement): void {
    const all = Array.from(rootEl.querySelectorAll<HTMLElement>('*')).concat([rootEl]);
    all.forEach((el) => {
        try {
            const cs = (el.ownerDocument?.defaultView || window).getComputedStyle(el);
            if (cs.position === 'sticky' || cs.position === 'fixed') {
                el.style.position = 'static';
                el.style.top = 'auto';
            }
            if (cs.overflowY && cs.overflowY !== 'visible') el.style.overflowY = 'visible';
            if (cs.overflowX && cs.overflowX !== 'visible') el.style.overflowX = 'visible';
            if (cs.maxHeight && cs.maxHeight !== 'none') el.style.maxHeight = 'none';
            const ch = (el as HTMLElement & { clientHeight?: number }).clientHeight ?? 0;
            const sh = (el as HTMLElement & { scrollHeight?: number }).scrollHeight ?? 0;
            if (sh > ch) {
                const tag = el.tagName.toLowerCase();
                if (tag !== 'img' && tag !== 'video' && tag !== 'canvas') {
                    el.style.height = 'auto';
                    el.style.minHeight = 'auto';
                }
            }
        } catch { /* ignorar */ }
    });
}

/** Reemplaza <canvas> del clon con imágenes PNG del canvas original (cloneNode vacía el bitmap) */
export function replaceSourceCanvasesWithImages(
    srcRoot: HTMLElement,
    dstRoot: HTMLElement,
    idoc: Document
): void {
    try {
        const srcCanvases = Array.from(srcRoot.querySelectorAll('canvas')) as HTMLCanvasElement[];
        const dstCanvases = Array.from(dstRoot.querySelectorAll('canvas')) as HTMLCanvasElement[];
        const n = Math.min(srcCanvases.length, dstCanvases.length);
        for (let i = 0; i < n; i++) {
            const s = srcCanvases[i];
            const d = dstCanvases[i];
            try {
                const dataUrl = s.toDataURL('image/png');
                if (!dataUrl) continue;
                const img = idoc.createElement('img');
                img.src = dataUrl;
                const w = s.width || (d as HTMLElement).getBoundingClientRect().width || 1;
                const h = s.height || (d as HTMLElement).getBoundingClientRect().height || 1;
                img.width = Math.max(1, w);
                img.height = Math.max(1, h);
                if (!d.style.width) img.style.width = `${img.width}px`;
                if (!d.style.height) img.style.height = `${img.height}px`;
                d.parentNode?.replaceChild(img, d);
            } catch { /* canvas tainted o fallido */ }
        }
    } catch { /* noop */ }
}

// ─── Paginación inteligente ────────────────────────────────────────────────────

/** Zonas a no cortar (tarjetas, SVGs, etc.) */
export function computeAvoidRects(
    root: HTMLElement,
    avoidSelectors: string[] = []
): Array<[number, number]> {
    const defaults = ['.card', '.Card', '[data-pdf-avoid]', '.CircularProgressbarWithChildren', '.CircularProgressbar', 'canvas', 'svg'];
    const sel = [...defaults, ...avoidSelectors].join(',');
    const rootTop = root.getBoundingClientRect().top;
    const rects: Array<[number, number]> = [];
    Array.from(root.querySelectorAll(sel)).forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const top = Math.max(0, r.top - rootTop);
        const bottom = top + r.height;
        if (bottom - top > 20) rects.push([top, bottom]);
    });
    rects.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const [t, b] of rects) {
        if (!merged.length || t > merged[merged.length - 1][1] + 12) merged.push([t, b]);
        else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b);
    }
    return merged;
}

/** Puntos seguros donde el PDF puede cortar entre páginas */
export function computeSafeStops(
    root: HTMLElement,
    safeStopSelectors: string[] = []
): number[] {
    const rootTop = root.getBoundingClientRect().top;
    const defaults = ['li', "[role='listitem']", '.card', '.Card', 'p', 'h2', 'h3', 'h4', '[data-pdf-stop]', '.mb-4', '.mb-6', '.mb-8'];
    const sel = [...defaults, ...safeStopSelectors].join(',');
    const stops: number[] = [];
    Array.from(root.querySelectorAll(sel)).forEach((el) => {
        const bottom = Math.max(0, (el as HTMLElement).getBoundingClientRect().bottom - rootTop);
        if (bottom > 0 && Number.isFinite(bottom)) stops.push(Math.round(bottom));
    });
    return Array.from(new Set(stops)).sort((a, b) => a - b);
}

/** Inicios de secciones grandes (para no empezarlas con poco espacio restante) */
export function computeSectionStarts(root: HTMLElement): number[] {
    const rootTop = root.getBoundingClientRect().top;
    const sel = ['[data-pdf-section]', '.metric-section'].join(',');
    const starts: number[] = [];
    Array.from(root.querySelectorAll(sel)).forEach((el) => {
        const top = Math.max(0, (el as HTMLElement).getBoundingClientRect().top - rootTop);
        if (top > 0 && Number.isFinite(top)) starts.push(Math.round(top));
    });
    return Array.from(new Set(starts)).sort((a, b) => a - b);
}

/** Paradas al final de cada fila de grilla (evita partir tarjetas) */
export function computeGridRowStops(root: HTMLElement): number[] {
    try {
        const rootTop = root.getBoundingClientRect().top;
        const items = Array.from(root.querySelectorAll('[data-pdf-avoid]')) as HTMLElement[];
        if (!items.length) return [];
        type Row = { top: number; bottoms: number[] };
        const rows: Row[] = [];
        const TOL = 16;
        for (const el of items) {
            const r = el.getBoundingClientRect();
            const top = Math.max(0, Math.round(r.top - rootTop));
            const bottom = Math.max(0, Math.round(r.bottom - rootTop));
            let row = rows.find((rr) => Math.abs(rr.top - top) <= TOL);
            if (!row) { row = { top, bottoms: [] }; rows.push(row); }
            row.bottoms.push(bottom);
        }
        return rows.map((rr) => Math.max(...rr.bottoms)).sort((a, b) => a - b);
    } catch { return []; }
}

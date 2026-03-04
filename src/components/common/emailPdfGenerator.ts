// src/components/common/emailPdfGenerator.ts
// Motor de generación de PDF: captura el DOM en un iframe invisible,
// pagina con cortes inteligentes y devuelve el PDF como base64.

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { RefObject } from 'react';
import {
    waitForReady,
    copyStylesTo,
    sanitizeCss,
    inlineComputedStyles,
    expandForExport,
    replaceSourceCanvasesWithImages,
    computeAvoidRects,
    computeSafeStops,
    computeSectionStarts,
    computeGridRowStops,
} from './emailPdfUtils';

export type PdfAttachment = {
    filename: string;
    base64: string;
    contentType: 'application/pdf';
} | null;

export interface PdfGeneratorConfig {
    captureRef: RefObject<HTMLElement | null>;
    url?: string;
    filenameBase?: string;
    context?: string;
    marginPt?: number;
    captureWidthPx?: number;
    extraWaitMs?: number;
    applyPdfClass?: boolean;
    pdfClassName?: string;
    exactVisual?: boolean;
    avoidSelectors?: string[];
    safeStopSelectors?: string[];
}

export async function makePdfFromRef({
    captureRef,
    url = '',
    filenameBase,
    context,
    marginPt = 24,
    captureWidthPx,
    extraWaitMs = 300,
    applyPdfClass = true,
    pdfClassName = 'pdf-root',
    exactVisual = true,
    avoidSelectors = [],
    safeStopSelectors = [],
}: PdfGeneratorConfig): Promise<PdfAttachment> {
    const src = captureRef?.current;
    if (!src) return null;

    // 1) iframe invisible de dimensiones reales
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
        position: 'fixed',
        left: '-99999px',
        top: '0',
        width: '1200px',
        height: '100vh',
        border: '0',
        opacity: '0',
        pointerEvents: 'none',
        visibility: 'hidden',
    } as CSSStyleDeclaration);
    document.body.appendChild(iframe);

    const idoc = iframe.contentDocument!;
    idoc.open();
    idoc.write('<!doctype html><html><head></head><body></body></html>');
    idoc.close();

    if (!exactVisual) {
        copyStylesTo(idoc, pdfClassName);
        try {
            const vw = Math.max(1200, window.innerWidth || 1200);
            const meta = idoc.createElement('meta');
            meta.name = 'viewport';
            meta.content = `width=${vw}`;
            idoc.head.appendChild(meta);
            if (idoc.documentElement) idoc.documentElement.style.width = `${vw}px`;
            if (idoc.body) idoc.body.style.width = `${vw}px`;
            iframe.style.width = `${vw}px`;
        } catch { /* ignorar */ }
    }

    // 2) clonar elemento fuente
    const clone = src.cloneNode(true) as HTMLElement;
    if (!exactVisual && applyPdfClass && !clone.classList.contains(pdfClassName)) {
        clone.classList.add(pdfClassName);
    }
    clone.setAttribute('data-pdf', 'true');
    clone.style.background = '#ffffff';
    clone.style.boxSizing = 'border-box';

    const wrapper = idoc.createElement('div');
    Object.assign(wrapper.style, {
        position: 'relative',
        margin: '0',
        padding: '0',
        background: '#ffffff',
    } as CSSStyleDeclaration);
    wrapper.appendChild(clone);

    if (!exactVisual) {
        const spacer = idoc.createElement('div');
        spacer.setAttribute('data-pdf-spacer', 'true');
        spacer.style.height = '120px';
        spacer.style.width = '100%';
        spacer.style.background = 'transparent';
        wrapper.appendChild(spacer);
    }
    idoc.body.appendChild(wrapper);

    // 3) Inline estilos computados (exactVisual: sin sanitizar; mejorado: sanitizado)
    try {
        inlineComputedStyles(src, clone, !exactVisual);
    } catch { /* noop */ }

    if (!exactVisual) { try { expandForExport(clone); } catch { } }

    try {
        const rect = src.getBoundingClientRect();
        const viewportPrefer = exactVisual
            ? Math.max(rect.width || 0, (src as HTMLElement & { clientWidth?: number }).clientWidth || 0, 960)
            : Math.max(window.innerWidth || 1280, src.scrollWidth || 0, rect.width || 0, 1280);
        const targetW = Math.ceil(captureWidthPx ?? viewportPrefer);

        clone.style.width = `${targetW}px`;
        clone.style.maxWidth = `${targetW}px`;
        clone.style.overflow = 'visible';

        // Always sync the iframe container width to match the capture width.
        // Without this, html2canvas clips content that overflows the default 1200px iframe.
        try {
            iframe.style.width = `${targetW}px`;
            iframe.style.minWidth = `${targetW}px`;
        } catch { /* best-effort */ }

        if (!exactVisual) {
            try {
                iframe.style.width = `${targetW}px`;
                iframe.style.minWidth = `${targetW}px`;
                let meta = idoc.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
                if (!meta) {
                    meta = idoc.createElement('meta');
                    meta.name = 'viewport';
                    idoc.head.appendChild(meta);
                }
                meta.content = `width=${targetW}, initial-scale=1`;
                idoc.documentElement.style.width = `${targetW}px`;
                idoc.documentElement.style.maxWidth = `${targetW}px`;
                idoc.body.style.width = `${targetW}px`;
                idoc.body.style.maxWidth = `${targetW}px`;
            } catch { /* best-effort */ }
        }

        await waitForReady(idoc, clone, extraWaitMs);
        const targetH = clone.scrollHeight;

        replaceSourceCanvasesWithImages(src, clone, idoc);

        // 4) Captura con html2canvas
        const preferCanvasRendering =
            exactVisual || ['performance', 'full-check'].includes((context || '').toLowerCase());
        const rasterScale = Math.min(2, Math.max(1.5, window.devicePixelRatio || 2));
        const MAX_CANVAS_HEIGHT_SAFE = 22000;

        const renderSlice = (yDom: number, hDom: number) =>
            html2canvas(clone, {
                foreignObjectRendering: exactVisual ? true : !preferCanvasRendering,
                ignoreElements: (el: Element) => el.tagName.toLowerCase() === 'canvas',
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scale: rasterScale,
                logging: false,
                width: targetW,
                height: hDom,
                windowWidth: targetW,
                windowHeight: targetH,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: yDom,
            } as Parameters<typeof html2canvas>[1]);

        const singlePass = targetH <= MAX_CANVAS_HEIGHT_SAFE;
        let bigCanvas: HTMLCanvasElement | null = null;
        if (singlePass) {
            bigCanvas = await html2canvas(clone, {
                foreignObjectRendering: exactVisual ? true : !preferCanvasRendering,
                ignoreElements: (el: Element) => el.tagName.toLowerCase() === 'canvas',
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                scale: rasterScale,
                logging: false,
                width: targetW,
                height: targetH,
                windowWidth: targetW,
                windowHeight: targetH,
                scrollX: 0,
                scrollY: 0,
            } as Parameters<typeof html2canvas>[1]);
        }

        // 5) PDF con paginación inteligente
        const isLandscape = (context || '').toLowerCase() === 'dashboard';
        const pdf = new jsPDF({ orientation: isLandscape ? 'l' : 'p', unit: 'pt', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        const cw = singlePass ? bigCanvas!.width : Math.round(targetW * rasterScale);
        const ch = singlePass ? bigCanvas!.height : Math.round(targetH * rasterScale);
        const domToCanvas = cw / (clone.getBoundingClientRect().width || targetW);
        const imgW = pageW - marginPt * 2;
        const canvasPxToPt = imgW / cw;
        const visiblePerPagePt = pageH - marginPt * 2;
        const visiblePerPageCanvasPx = Math.floor(visiblePerPagePt / canvasPxToPt);

        const avoidSpansDom = computeAvoidRects(clone, avoidSelectors);
        const avoidSpans = avoidSpansDom.map(([t, b]) => [t * domToCanvas, b * domToCanvas] as [number, number]);
        const safeStopsDom = computeSafeStops(clone, safeStopSelectors);
        const gridStopsDom = computeGridRowStops(clone);
        const sectionStartsDom = computeSectionStarts(clone);
        const safeStops = [...gridStopsDom, ...safeStopsDom].sort((a, b) => a - b).map((y) => y * domToCanvas);
        const sectionStarts = sectionStartsDom.map((y) => y * domToCanvas);

        const pad = Math.round(16 * domToCanvas);
        const minSlice = Math.round(280 * domToCanvas);
        const lookAhead = Math.round(240 * domToCanvas);
        const keepWithNextMin = Math.round(600 * domToCanvas);
        const sectionStartEpsilon = Math.round(50 * domToCanvas);
        const insideSpan = (y: number) => avoidSpans.some(([t, b]) => y > t && y < b);

        let yPx = 0;
        let first = true;
        while (yPx < ch) {
            let boundary = Math.min(yPx + visiblePerPageCanvasPx, ch);
            const desired = boundary;

            const candidates = safeStops.filter((s) => s >= yPx + minSlice && s <= desired + lookAhead);
            boundary = candidates.length ? Math.max(...candidates) : desired;
            let forcedBySection = false;

            if (insideSpan(boundary)) {
                for (const [t, b] of avoidSpans) {
                    if (boundary > t && boundary < b) {
                        boundary = Math.min(b + pad, ch);
                    }
                }
            }

            const nextSection = sectionStarts.find((s) => s > yPx + sectionStartEpsilon);
            if (nextSection && nextSection < desired + lookAhead) {
                const remainingAfterStart = desired - nextSection;
                if (remainingAfterStart < keepWithNextMin) {
                    const beforeSection = safeStops.filter(
                        (s) => s >= yPx + minSlice && s <= nextSection - pad && !insideSpan(s)
                    );
                    if (beforeSection.length) {
                        boundary = Math.max(...beforeSection);
                        forcedBySection = true;
                    } else {
                        boundary = Math.max(yPx + Math.round(120 * domToCanvas), Math.min(nextSection - pad, desired));
                        forcedBySection = true;
                    }
                }
            }

            if (boundary - yPx > visiblePerPageCanvasPx) {
                const maxBoundary = Math.min(yPx + visiblePerPageCanvasPx, ch);
                const candidates2 = safeStops.filter((s) => s >= yPx + minSlice && s <= maxBoundary && !insideSpan(s));
                boundary = candidates2.length ? Math.max(...candidates2) : maxBoundary;
            }

            if (!forcedBySection && boundary - yPx < minSlice && yPx + minSlice < ch) {
                boundary = Math.min(yPx + minSlice, ch);
            }

            for (const [t, b] of avoidSpans) {
                if (boundary > b - 30 * domToCanvas && boundary < b) {
                    boundary = Math.min(b + pad, ch);
                    break;
                }
            }

            const sliceH = boundary - yPx;
            let slice: HTMLCanvasElement;
            if (singlePass && bigCanvas) {
                slice = idoc.createElement('canvas');
                slice.width = cw;
                slice.height = sliceH;
                const sctx = slice.getContext('2d')!;
                sctx.drawImage(bigCanvas, 0, yPx, cw, sliceH, 0, 0, cw, sliceH);
            } else {
                slice = await renderSlice(Math.round(yPx / domToCanvas), Math.round(sliceH / domToCanvas));
            }

            // Convertir a JPEG sobre blanco para evitar artefactos PNG
            const jpegCanvas = idoc.createElement('canvas');
            jpegCanvas.width = cw;
            jpegCanvas.height = sliceH;
            const jctx = jpegCanvas.getContext('2d');
            if (jctx) {
                jctx.fillStyle = '#ffffff';
                jctx.fillRect(0, 0, cw, sliceH);
                jctx.drawImage(slice, 0, 0);
            }
            const img = (jpegCanvas as HTMLCanvasElement & { toDataURL?: (t: string, q: number) => string })
                .toDataURL?.('image/jpeg', 0.92) ?? slice.toDataURL('image/png');
            const hPt = sliceH * canvasPxToPt;

            if (!first) pdf.addPage();
            first = false;
            pdf.addImage(img, 'JPEG', marginPt, marginPt, imgW, hPt);

            yPx = boundary;
        }

        const base64 = pdf.output('datauristring').split(',')[1]!;
        const safeBase =
            (filenameBase || (url || 'sitio')
                .replace(/[^a-z0-9]+/gi, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 60)) || 'diagnostico';

        return { filename: `diagnostico_${safeBase}.pdf`, base64, contentType: 'application/pdf' };
    } finally {
        try { document.body.removeChild(iframe); } catch { /* ignorar */ }
    }
}

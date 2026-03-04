//Portabilidad Descargar y analizar código
import axios from "axios"; //Descargar y analizar código

import { JSDOM } from "jsdom";
// @ts-ignore - types not strictly needed for runtime
import bcd from "@mdn/browser-compat-data";

export type FeatureMatrix = Record<string, Record<string, boolean>>; // feature -> browser -> support

export type PortabilityResult = {
    metrics: { compatibleBrowsers: string[]; incompatibilities: number };
    summary: string;
    recommendation: string;
    actionPlan?: Array<{ id: string; title: string; recommendation: string; severity?: 'high' | 'medium' | 'low' }>;
    details: {
        usedFeatures: string[];
        supportMatrix: FeatureMatrix;
    };
    raw?: any;
};

/**
 * Analiza de forma aproximada la compatibilidad del sitio con navegadores modernos.
 * Heurística: detecta uso de features clave y contrasta con BCD para Chrome/Edge/Firefox/Safari.
 */
export async function runPortabilityCheck(url: string): Promise<PortabilityResult> {
    try {
        console.log('[Portability] Iniciando análisis para:', url);
        const res = await axios.get(url, {
            timeout: 25000, // 25 s – enough for slow sites without blocking dashboard
            headers: { Accept: 'text/html', 'User-Agent': 'PulseDiagnosticsBot/1.0' },
            maxRedirects: 5,
        });
        console.log('[Portability] HTML descargado, analizando features...');
        const html = String(res.data || "");
        const dom = new JSDOM(html, { url });
        const doc = dom.window.document;

        const usesModule = Array.from(doc.querySelectorAll('script[type="module"]')).length > 0;
        const usesGrid = /display\s*:\s*grid/i.test(html) || /grid-template-/.test(html);
        const usesFlex = /display\s*:\s*flex/i.test(html);

        // Seleccion de features a consultar en BCD
        const featureKeys = {
            esmodules: "javascript.modules", // módulos ES6
            cssGrid: "css.properties.grid-template-columns", // indicador de grid
            cssFlex: "css.properties.flex", // indicador de flex
            backdropFilter: "css.properties.backdrop-filter",
            positionSticky: "css.properties.position_sticky",
            containerQueries: "css.at-rules.container",
            subgrid: "css.properties.grid-template-columns.subgrid",
        } as const;

        const supportFor = (pathStr: string): Record<string, boolean> => {
            // Navegar por el objeto bcd con path "a.b.c"
            const parts = pathStr.split(".");
            let node: any = bcd as any;
            for (const p of parts) node = node?.[p];
            const support = node?.__compat?.support || {};
            const browsers = ["chrome", "edge", "firefox", "safari"] as const;
            const out: Record<string, boolean> = {};
            for (const br of browsers) {
                const s = support[br];
                // Si existe alguna entrada con version_added no false
                const arr = Array.isArray(s) ? s : s ? [s] : [];
                out[br] = arr.some((it: any) => it && it.version_added && it.version_added !== false);
            }
            return out;
        };

        const sup = {
            esmodules: supportFor(featureKeys.esmodules),
            cssGrid: supportFor(featureKeys.cssGrid),
            cssFlex: supportFor(featureKeys.cssFlex),
            backdropFilter: supportFor(featureKeys.backdropFilter),
            positionSticky: supportFor(featureKeys.positionSticky),
            containerQueries: supportFor(featureKeys.containerQueries),
            subgrid: supportFor(featureKeys.subgrid),
        };

        // Determinar compatibilidad requerida por features realmente usadas
        const required = {
            esmodules: usesModule,
            cssGrid: usesGrid,
            cssFlex: usesFlex,
            backdropFilter: /backdrop-filter\s*:/i.test(html),
            positionSticky: /position\s*:\s*sticky/i.test(html),
            containerQueries: /@container\s+/i.test(html),
            subgrid: /subgrid/i.test(html),
        };

        const compatibleBrowsers: string[] = [];
        const browsers = ["chrome", "edge", "firefox", "safari"] as const;
        let incompatibilities = 0;
        for (const br of browsers) {
            const ok = Object.entries(required)
                .filter(([, needed]) => !!needed)
                .every(([k]) => (sup as any)[k][br]);
            if (ok) compatibleBrowsers.push(br);
        }
        // contar incompatibilidades como cantidad de features no soportadas en al menos un navegador cuando son usadas
        for (const [k, needed] of Object.entries(required)) {
            if (!needed) continue;
            const s = (sup as any)[k] as Record<string, boolean>;
            const notOk = browsers.filter((b) => !s[b]).length;
            if (notOk > 0) incompatibilities += 1;
        }

        const summary = compatibleBrowsers.length >= 3
            ? "El sitio es ampliamente compatible con navegadores modernos"
            : "Compatibilidad limitada en algunos navegadores";

        const recommendation = incompatibilities
            ? "Revisar soporte en Safari y aplicar polyfills/babel donde sea necesario"
            : "Sin incompatibilidades relevantes detectadas";

        // Plan de acción en base a features usadas y compatibilidad
        const plan: Array<{ id: string; title: string; recommendation: string; severity?: 'high' | 'medium' | 'low' }> = [];
        const push = (id: string, title: string, rec: string, sev: 'high' | 'medium' | 'low' = 'medium') => { if (!plan.find(p => p.id === id)) plan.push({ id, title, recommendation: rec, severity: sev }); };
        if (required.containerQueries) push('port:container', 'Fallback para Container Queries', 'Provee estilos alternativos o detecta soporte antes de aplicar @container. Considera progressive enhancement.', 'high');
        if (required.subgrid) push('port:subgrid', 'Fallback para CSS Subgrid', 'Evalúa degradar a grid clásico en navegadores sin soporte.', 'medium');
        if (required.backdropFilter) push('port:backdrop', 'Degradado para backdrop-filter', 'Usa fondos semitransparentes alternativos cuando no haya soporte.', 'low');
        push('port:babel', 'Asegurar transpile y polyfills', 'Configura targets en Babel y polyfills (core-js) según navegadores objetivo.', 'high');
        push('port:autoprefix', 'Autoprefixer y PostCSS', 'Habilita autoprefixer para añadir prefijos CSS automáticamente.', 'medium');

        // Build support matrix only for used features
        const usedFeatures = Object.entries(required).filter(([, needed]) => !!needed).map(([k]) => k);
        const supportMatrix: FeatureMatrix = {};
        for (const f of usedFeatures) supportMatrix[f] = (sup as any)[f];

        console.log('[Portability] Análisis completado:', {
            compatibleBrowsers,
            incompatibilities,
            usedFeatures: usedFeatures.length
        });

        return {
            metrics: { compatibleBrowsers, incompatibilities },
            summary,
            recommendation,
            actionPlan: plan.slice(0, 8),
            details: { usedFeatures, supportMatrix },
            raw: { used: required, support: sup },
        };
    } catch (e: any) {
        console.error('[Portability] Error en análisis:', e?.message);
        return {
            metrics: { compatibleBrowsers: [], incompatibilities: 0 },
            summary: "No fue posible analizar compatibilidad",
            recommendation: "Verificar accesibilidad pública o cabeceras que bloquean el análisis",
            actionPlan: [{ id: 'port:retry', title: 'Reintentar análisis', recommendation: 'Comprueba que el HTML sea accesible para detectar features.', severity: 'low' }],
            details: { usedFeatures: [], supportMatrix: {} },
            raw: { error: e?.message || String(e) },
        };
    }
}
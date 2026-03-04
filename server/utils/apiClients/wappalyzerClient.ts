// Compatibilidad
import axios from "axios";
import { JSDOM } from "jsdom";

export type Technology = { name: string; version?: string | null; categories?: string[]; confidence?: number };

export type WappalyzerResult = {
    metrics: { stackItems: number };
    summary: string;
    recommendation: string;
    actionPlan?: Array<{ id: string; title: string; recommendation: string; severity?: 'high' | 'medium' | 'low' }>;
    details: { technologies: Technology[] };
    raw?: any;
};

/**
 * Integra con Wappalyzer API si hay API key; si no, usa una heurística básica
 * sobre el HTML para detectar tecnologías comunes.
 */
export async function runStackAnalysis(url: string): Promise<WappalyzerResult> {
    const apiKey = process.env.WAPPALYZER_API_KEY || process.env.WAPPALYZER_TOKEN;

    if (apiKey) {
        try {
            const { data } = await axios.get(
                `https://api.wappalyzer.com/v2/analyze?url=${encodeURIComponent(url)}`,
                { headers: { "x-api-key": apiKey }, timeout: 20000 }
            );
            // La API suele devolver categorías/tecnologías detectadas
            const technologies: any[] = data?.technologies || data?.applications || [];
            const mapped: Technology[] = Array.isArray(technologies)
                ? technologies.map((t: any) => ({
                    name: t?.name,
                    version: t?.version || null,
                    categories: (t?.categories || t?.cats || []).map((c: any) => (c?.name || c)).filter(Boolean),
                    confidence: t?.confidence ? Number(t.confidence) : undefined,
                })).filter((t) => !!t.name)
                : [];
            const names = mapped.map(t => t.name);

            // Construir plan de acción simple con base en tecnologías detectadas
            const plan: Array<{ id: string; title: string; recommendation: string; severity?: 'high' | 'medium' | 'low' }> = [];
            const push = (id: string, title: string, rec: string, sev: 'high' | 'medium' | 'low' = 'medium') => { if (!plan.find(p => p.id === id)) plan.push({ id, title, recommendation: rec, severity: sev }); };
            const has = (name: string) => names.some(n => n.toLowerCase().includes(name.toLowerCase()));
            if (has('jquery')) push('stack:jquery', 'Reducir dependencia de jQuery', 'Reemplaza con APIs nativas o framework actual si es posible.', 'low');
            if (has('wordpress')) push('stack:wordpress', 'Actualizar CMS y plugins', 'Mantén WordPress core y plugins a la última versión; elimina plugins obsoletos.', 'high');
            push('stack:vuln', 'Auditar vulnerabilidades', 'Ejecuta npm audit/Snyk y actualiza dependencias con CVEs.', 'high');

            return {
                metrics: { stackItems: names.length },
                summary: names.length
                    ? `Stack detectado: ${names.slice(0, 5).join(", ")}${names.length > 5 ? "…" : ""}`
                    : "No se detectó stack relevante",
                recommendation: "Mantener dependencias actualizadas y revisar vulnerabilidades conocidas",
                actionPlan: plan.slice(0, 8),
                details: { technologies: mapped },
                raw: data,
            };
        } catch (e: any) {
            // cae a heurística
        }
    }

    // Heurística mínima sin API
    try {
        const res = await axios.get(url, { timeout: 20000, headers: { Accept: "text/html" } });
        const html = String(res.data || "");
        const dom = new JSDOM(html, { url });
        const doc = dom.window.document;
        const tech: Set<string> = new Set();
        const techList: Technology[] = [];

        const metaGen = doc.querySelector('meta[name="generator"]')?.getAttribute("content");
        if (metaGen) { tech.add(metaGen); techList.push({ name: metaGen, categories: ["Generator"], confidence: 80 }); }

        const scripts = Array.from(doc.querySelectorAll("script[src]")) as HTMLScriptElement[];
        for (const s of scripts) {
            const src = s.getAttribute("src") || "";
            if (/react/i.test(src)) { tech.add("React"); techList.push({ name: "React", categories: ["JavaScript"], confidence: 60 }); }
            if (/angular/i.test(src)) { tech.add("Angular"); techList.push({ name: "Angular", categories: ["JavaScript"], confidence: 60 }); }
            if (/vue/i.test(src)) { tech.add("Vue.js"); techList.push({ name: "Vue.js", categories: ["JavaScript"], confidence: 60 }); }
            if (/jquery/i.test(src)) { tech.add("jQuery"); techList.push({ name: "jQuery", categories: ["JavaScript"], confidence: 80 }); }
            if (/wp-/i.test(src) || /wordpress/i.test(src)) { tech.add("WordPress"); techList.push({ name: "WordPress", categories: ["CMS"], confidence: 60 }); }
            if (/next\.js|next\//i.test(src)) { tech.add("Next.js"); techList.push({ name: "Next.js", categories: ["Framework"], confidence: 60 }); }
            if (/nuxt/i.test(src)) { tech.add("Nuxt"); techList.push({ name: "Nuxt", categories: ["Framework"], confidence: 60 }); }
        }

        const serverHints = res.headers["server"] as string | undefined;
        if (serverHints) { const srv = serverHints.split(" ")[0]; tech.add(srv); techList.push({ name: srv, categories: ["Server"], confidence: 50 }); }

        const names = Array.from(tech);
        const plan: Array<{ id: string; title: string; recommendation: string; severity?: 'high' | 'medium' | 'low' }> = [];
        const push = (id: string, title: string, rec: string, sev: 'high' | 'medium' | 'low' = 'medium') => { if (!plan.find(p => p.id === id)) plan.push({ id, title, recommendation: rec, severity: sev }); };
        const has = (name: string) => names.some(n => n.toLowerCase().includes(name.toLowerCase()));
        if (has('jQuery')) push('stack:jquery', 'Reducir dependencia de jQuery', 'Reemplaza con APIs nativas o framework actual si es posible.', 'low');
        if (has('WordPress')) push('stack:wordpress', 'Actualizar CMS y plugins', 'Mantén WordPress core y plugins a la última versión; elimina plugins obsoletos.', 'high');
        push('stack:vuln', 'Auditar vulnerabilidades', 'Ejecuta npm audit/Snyk y actualiza dependencias con CVEs.', 'high');

        return {
            metrics: { stackItems: names.length },
            summary: names.length
                ? `Stack aproximado: ${names.slice(0, 5).join(", ")}${names.length > 5 ? "…" : ""}`
                : "Stack no detectado",
            recommendation: "Estandarizar versiones y retirar librerías obsoletas",
            actionPlan: plan.slice(0, 8),
            details: { technologies: techList },
            raw: { names },
        };
    } catch (e: any) {
        return {
            metrics: { stackItems: 0 },
            summary: "No fue posible analizar el stack",
            recommendation: "Verificar accesibilidad pública del sitio o cabeceras de seguridad",
            actionPlan: [{ id: 'stack:retry', title: 'Reintentar análisis', recommendation: 'Comprueba que el sitio sea accesible y responde HTML.', severity: 'low' }],
            details: { technologies: [] },
            raw: { error: e?.message || String(e) },
        };
    }
}

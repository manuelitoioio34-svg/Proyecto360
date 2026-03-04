// server/utils/sitemap.ts

// Utilidad para obtener URLs desde el sitemap.xml de un sitio, con manejo de errores y normalización de URLs. Incluye una función fetchSitemapUrls que toma una URL semilla, construye la URL del sitemap, la descarga y extrae las URLs listadas en el sitemap. También incluye una función normalizeUrl para limpiar y estandarizar las URLs obtenidas, eliminando hashes, parámetros de tracking comunes y normalizando el formato. Utilizada para alimentar el proceso de diagnóstico con las URLs relevantes del sitio.
import axios from 'axios';

export async function fetchSitemapUrls(seedUrl: string): Promise<string[]> {
    try {
        const base = new URL(seedUrl);
        const sitemapUrl = new URL('/sitemap.xml', base.origin).toString();
        const { data } = await axios.get<string>(sitemapUrl, { timeout: 30000, responseType: 'text' });
        const xml = String(data || '');
        // extracción simple de <loc>…</loc> compatible con namespaces
        const urls: string[] = [];
        const locRegex = /<loc\s*[^>]*>([^<]+)<\/loc>/gi;
        let m: RegExpExecArray | null;
        while ((m = locRegex.exec(xml)) !== null) {
            const u = m[1].trim();
            if (u) urls.push(u);
        }
        return Array.from(new Set(urls));
    } catch (e) {
        return [];
    }
}

export function normalizeUrl(u: string): string {
    try {
        const url = new URL(u);
        url.hash = '';
        // Eliminar trackers típicos
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', '_ga'].forEach(p => url.searchParams.delete(p));
        let s = url.toString();
        if (s.endsWith('/')) s = s.slice(0, -1);
        return s.toLowerCase();
    } catch {
        return u.trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
    }
}

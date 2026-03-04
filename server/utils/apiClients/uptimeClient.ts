// Mantenibilidad
import axios from "axios"; // Medir latencia HTTP/ping 

export type UptimeProbe = { status: number | null; ms: number; redirected?: boolean };

export type UptimeResult = {
    metrics: { availability: number | null; avgResponseTime: number | null };
    summary: string;
    recommendation: string;
    actionPlan?: Array<{ id: string; title: string; recommendation: string; severity?: 'high' | 'medium' | 'low' }>;
    details: {
        series: UptimeProbe[];
        headers?: Record<string, string | string[] | undefined>;
    };
    raw?: any;
};

/**
 * Verifica disponibilidad y tiempo de respuesta con una solicitud HTTP simple.
 * Si se configura BETTER_UPTIME_API_TOKEN, aquí podría integrarse la API de Better Uptime.
 */
export async function runUptimeCheck(url: string): Promise<UptimeResult> {
    const attempts = 2; // 2 probes × 12 s timeout = max 24 s (was 3 × 20 s = 60 s)
    const series: UptimeProbe[] = [];
    let headers: Record<string, any> | undefined;

    for (let i = 0; i < attempts; i++) {
        const started = Date.now();
        try {
            const resp = await axios.get(url, {
                timeout: 12000,
                headers: { "User-Agent": "PulseDiagnosticsBot/1.0" },
                validateStatus: () => true,
                maxRedirects: 5,
            });
            const ms = Date.now() - started;
            if (!headers) headers = resp.headers as any;
            series.push({ status: resp.status, ms, redirected: resp.request?._redirectable?._redirectCount > 0 });
        } catch (e) {
            const ms = Date.now() - started;
            series.push({ status: null, ms, redirected: false });
        }
    }

    const oks = series.filter(s => (s.status ?? 0) >= 200 && (s.status ?? 0) < 400).length;
    const availability = Math.round((oks / attempts) * 100);
    const avgResponseTime = Math.round(series.reduce((a, b) => a + (b.ms || 0), 0) / attempts);
    const ok = availability > 0;

    // Plan de acción basado en disponibilidad/latencia/redirecciones
    const plan: Array<{ id: string; title: string; recommendation: string; severity?: 'high' | 'medium' | 'low' }> = [];
    const push = (id: string, title: string, rec: string, sev: 'high' | 'medium' | 'low' = 'medium') => {
        if (!plan.find(p => p.id === id)) plan.push({ id, title, recommendation: rec, severity: sev });
    };
    if (!ok) {
        push('uptime:noreach', 'Sitio no alcanzable', 'Verifica DNS, expiración de SSL, reglas de firewall y estado del hosting.', 'high');
    }
    if ((avgResponseTime || 0) > 800) {
        push('uptime:slow', 'Tiempo de respuesta alto', 'Habilita CDN, cachea contenido, comprime respuestas (Gzip/Brotli) y optimiza queries.', 'medium');
    }
    if (series.some(s => s.redirected)) {
        push('uptime:redirs', 'Redirecciones detectadas', 'Reduce saltos 301/302 innecesarios (redirige directo a destino final).', 'low');
    }
    if (headers) {
        const cc = String((headers as any)['cache-control'] || '');
        if (!/max-age|s-maxage/i.test(cc)) {
            push('uptime:cache', 'Falta política de caché', 'Configura Cache-Control con max-age apropiado para recursos públicos.', 'low');
        }
    }

    return {
        metrics: { availability, avgResponseTime },
        summary: ok ? "El sitio responde correctamente" : "No se pudo alcanzar la URL",
        recommendation: ok ? "Monitorear caídas en horarios pico" : "Revisar DNS/SSL/servidor y reglas de firewall",
        actionPlan: plan.slice(0, 8),
        details: { series, headers },
        raw: undefined,
    };
}

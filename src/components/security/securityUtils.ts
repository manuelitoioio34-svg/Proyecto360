// src/components/security/securityUtils.ts
// Tipos, constantes y utilidades puras para el panel de seguridad

import { SecurityFinding } from '../../shared/types/api';

export type HeaderMeta = {
  title?: string;
  description?: string;
  recommendation?: string;
  learnMore?: string;
  why?: string;
  scoreImpact?: number;
  nginx?: string;
  apache?: string;
  express?: string;
  expected?: string;
};

export const HEADER_INFO: Record<string, HeaderMeta> = {
  "content-security-policy": {
    title: "Content-Security-Policy (CSP)",
    description: "Controla qué recursos puede cargar la página para mitigar XSS.",
    recommendation: "Defina una política CSP restrictiva (evite 'unsafe-inline').",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
    why: "Sin CSP, aplicaciones son más vulnerables a inyección de scripts.",
    expected: "Content-Security-Policy: default-src 'self'; object-src 'none'; frame-ancestors 'none'",
    nginx: "add_header Content-Security-Policy \"default-src 'self'; object-src 'none'; frame-ancestors 'none'\" always;",
    apache: "Header set Content-Security-Policy \"default-src 'self'; object-src 'none'; frame-ancestors 'none'\"",
    express: "res.set('Content-Security-Policy', \"default-src 'self'; object-src 'none'; frame-ancestors 'none'\");",
  },
  "strict-transport-security": {
    title: "Strict-Transport-Security (HSTS)",
    description: "Forza el uso de HTTPS para evitar ataques de downgrade.",
    recommendation: "Habilite HSTS con un max-age elevado e includeSubDomains si aplica.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
    why: "Sin HSTS, usuarios pueden ser forzados a usar HTTP en ciertos ataques.",
    expected: "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    nginx: "add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;",
    apache: "Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"",
    express: "res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');",
  },
  "x-frame-options": {
    title: "X-Frame-Options",
    description: "Evita que la página sea embebida en iframes (clickjacking).",
    recommendation: "Use DENY o SAMEORIGIN según el caso.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options",
    why: "Protege contra ataques de clickjacking que pueden engañar a usuarios para hacer clic en elementos ocultos.",
    expected: "X-Frame-Options: DENY",
    nginx: "add_header X-Frame-Options \"DENY\" always;",
    apache: "Header always set X-Frame-Options \"DENY\"",
    express: "res.set('X-Frame-Options', 'DENY');",
  },
  "x-content-type-options": {
    title: "X-Content-Type-Options",
    description: "Evita que el navegador haga MIME sniffing.",
    recommendation: "Use X-Content-Type-Options: nosniff.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options",
    why: "Previene ataques basados en MIME confusion donde el navegador interpreta archivos de forma diferente a la especificada.",
    expected: "X-Content-Type-Options: nosniff",
    nginx: "add_header X-Content-Type-Options \"nosniff\" always;",
    apache: "Header always set X-Content-Type-Options \"nosniff\"",
    express: "res.set('X-Content-Type-Options', 'nosniff');",
  },
  "referrer-policy": {
    title: "Referrer-Policy",
    description: "Controla cuánta información de referencia se envía.",
    recommendation: "Use 'strict-origin-when-cross-origin' o más restrictivo.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy",
    why: "Protege la privacidad limitando qué información se envía en el encabezado Referer a otros sitios.",
    expected: "Referrer-Policy: strict-origin-when-cross-origin",
    nginx: "add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;",
    apache: "Header always set Referrer-Policy \"strict-origin-when-cross-origin\"",
    express: "res.set('Referrer-Policy', 'strict-origin-when-cross-origin');",
  },
  "permissions-policy": {
    title: "Permissions-Policy",
    description: "Restringe funcionalidades del navegador (geolocación, cámara, etc.).",
    recommendation: "Defina políticas por defecto lo más restrictivas posible.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy",
    why: "Mejora la seguridad y privacidad limitando qué funcionalidades del navegador pueden usar scripts o iframes embebidos.",
    expected: "Permissions-Policy: geolocation=(), camera=(), microphone=()",
    nginx: "add_header Permissions-Policy \"geolocation=(), camera=(), microphone=()\" always;",
    apache: "Header always set Permissions-Policy \"geolocation=(), camera=(), microphone=()\"",
    express: "res.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');",
  },
  "cross-origin-opener-policy": {
    title: "Cross-Origin-Opener-Policy",
    description: "Aísla el contexto del documento para mayor seguridad.",
    recommendation: "Use same-origin si es posible.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy",
    why: "Protege contra ataques de cross-origin que podrían acceder a tu ventana a través de window.opener.",
    expected: "Cross-Origin-Opener-Policy: same-origin",
    nginx: "add_header Cross-Origin-Opener-Policy \"same-origin\" always;",
    apache: "Header always set Cross-Origin-Opener-Policy \"same-origin\"",
    express: "res.set('Cross-Origin-Opener-Policy', 'same-origin');",
  },
  "cross-origin-embedder-policy": {
    title: "Cross-Origin-Embedder-Policy",
    description: "Requerido para aislar recursos y habilitar ciertas capacidades avanzadas.",
    recommendation: "Use require-corp si es posible.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy",
    why: "Habilita características avanzadas del navegador como SharedArrayBuffer y mejora el aislamiento de recursos.",
    expected: "Cross-Origin-Embedder-Policy: require-corp",
    nginx: "add_header Cross-Origin-Embedder-Policy \"require-corp\" always;",
    apache: "Header always set Cross-Origin-Embedder-Policy \"require-corp\"",
    express: "res.set('Cross-Origin-Embedder-Policy', 'require-corp');",
  },
  "cache-control": {
    title: "Cache-Control",
    description: "Controla el cacheo del contenido (útil para información sensible).",
    recommendation: "Para contenido sensible: no-store, no-cache, must-revalidate.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control",
    why: "Previene que información sensible se almacene en cachés de navegadores o proxies intermedios.",
    expected: "Cache-Control: no-store, no-cache, must-revalidate",
    nginx: "add_header Cache-Control \"no-store, no-cache, must-revalidate\" always;",
    apache: "Header always set Cache-Control \"no-store, no-cache, must-revalidate\"",
    express: "res.set('Cache-Control', 'no-store, no-cache, must-revalidate');",
  },
  server: {
    title: "Server",
    description: "Exponer la tecnología del servidor puede ayudar a fingerprinting.",
    recommendation: "Oculte o generalice el valor del header Server.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server",
    why: "Evita revelar información sobre la tecnología del servidor que podrían usar atacantes para identificar vulnerabilidades específicas.",
    expected: "Server: (oculto o genérico)",
    nginx: "server_tokens off;",
    apache: "ServerTokens Prod\nServerSignature Off",
    express: "app.disable('x-powered-by'); // Para ocultar Express",
  },
  "x-powered-by": {
    title: "X-Powered-By",
    description: "Divulga la tecnología usada (Express, PHP, etc.).",
    recommendation: "Elimínelo para evitar fuga de información.",
    learnMore: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Powered-By",
    why: "Oculta información sobre el framework o tecnología utilizada, reduciendo la superficie de ataque.",
    expected: "(sin encabezado)",
    nginx: "# No se envía por defecto en nginx",
    apache: "# Remover con mod_headers si se agrega",
    express: "app.disable('x-powered-by');",
  },
};

export const CRITICAL_HEADERS: string[] = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

export type PlanItem = {
  id: string;
  title: string;
  recommendation: string;
  severity?: string;
};

export function getHeaderPresence(info: unknown): boolean {
  if (!info || typeof info !== 'object') return false;
  const h = info as Record<string, unknown>;
  return Boolean(h.present || h.ok || h.passed || h.value != null);
}

export function deriveSecurityPlan(sr: unknown): {
  errors: PlanItem[];
  improvements: PlanItem[];
  plan: PlanItem[];
} {
  const out = {
    errors: [] as PlanItem[],
    improvements: [] as PlanItem[],
    plan: [] as PlanItem[],
  };
  if (!sr || typeof sr !== 'object') return out;
  const result = sr as Record<string, unknown>;

  if (Array.isArray(result.findings) && result.findings.length) {
    const errors = result.findings.filter(
      (f: SecurityFinding) =>
        f?.passed === false ||
        String(f?.severity || '').toLowerCase().includes('high')
    );
    const improvements = result.findings.filter(
      (f: SecurityFinding) =>
        f?.passed !== false &&
        !String(f?.severity || '').toLowerCase().includes('high')
    );
    out.errors = errors.map((f: Record<string, unknown>, i: number) => ({
      id: String(f.id || f.rule || `error-${i}`),
      title: String(f.title || f.id || f.rule || 'Fallo'),
      recommendation: String(f.recommendation || f.message || f.description || ''),
      severity: String(f.severity || 'high'),
    }));
    out.improvements = improvements.map((f: Record<string, unknown>, i: number) => ({
      id: String(f.id || f.rule || `imp-${i}`),
      title: String(f.title || f.id || f.rule || 'Mejora'),
      recommendation: String(f.recommendation || f.message || f.description || ''),
      severity: String(f.severity || 'info'),
    }));
  } else if (result.headers && typeof result.headers === 'object') {
    const getPresent = (k: string) => {
      const info = (result.headers as Record<string, unknown>)[k];
      return getHeaderPresence(info);
    };

    for (const h of CRITICAL_HEADERS) {
      if (!getPresent(h)) {
        const meta = HEADER_INFO[h] || ({} as HeaderMeta);
        out.errors.push({
          id: `missing-${h}`,
          title: `${meta.title || h} ausente`,
          recommendation:
            meta.recommendation ||
            'Agregar y configurar este encabezado siguiendo buenas prácticas.',
          severity: 'high',
        });
      }
    }

    const recommended = [
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'cache-control',
      'server',
      'x-powered-by',
    ];

    for (const h of recommended) {
      if (!getPresent(h)) {
        const meta = HEADER_INFO[h] || ({} as HeaderMeta);
        out.improvements.push({
          id: `missing-${h}`,
          title: `${meta.title || h} no configurado`,
          recommendation:
            meta.recommendation ||
            'Valorar su implementación para endurecer seguridad.',
          severity: 'info',
        });
      }
    }
  }

  out.plan = [...out.errors, ...out.improvements];
  return out;
}

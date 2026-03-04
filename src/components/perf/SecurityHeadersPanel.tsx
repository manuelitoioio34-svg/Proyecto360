// ——— src/components/perf/SecurityHeadersPanel.tsx ———

// SecurityImpactDial + HeadersPanel para encabezados de seguridad
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';

// ======= HEADER_INFO catalog =======
type HeaderMeta = {
  title?: string;
  description?: string;
  recommendation?: string;
  learnMore?: string;
  why?: string;
  scoreImpact?: number;
};

export const HEADER_INFO: Record<string, HeaderMeta> = {
  'content-security-policy': {
    title: 'Content-Security-Policy (CSP)',
    description: 'Controla qué recursos puede cargar la página para mitigar XSS.',
    recommendation: "Defina una política CSP restrictiva (evite 'unsafe-inline').",
    learnMore: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
    why: 'Sin CSP, aplicaciones son más vulnerables a inyección de scripts.',
  },
  'strict-transport-security': {
    title: 'Strict-Transport-Security (HSTS)',
    description: 'Forza el uso de HTTPS para evitar ataques de downgrade.',
    recommendation: 'Habilite HSTS con un max-age elevado y includeSubDomains si aplica.',
    learnMore: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
    why: 'Sin HSTS, usuarios pueden ser forzados a usar HTTP en ciertos ataques.',
  },
  'x-frame-options': {
    title: 'X-Frame-Options',
    description: 'Evita que la página sea embebida en iframes (clickjacking).',
    recommendation: 'Use DENY o SAMEORIGIN según el caso.',
    learnMore: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
    why: 'Protege contra ataques de clickjacking.',
  },
  date: {
    title: 'Date',
    description: 'Encabezado de fecha del servidor.',
    recommendation: 'Asegúrese que el reloj del servidor esté sincronizado (NTP).',
    learnMore: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Date',
    why: 'Diferencias de tiempo pueden afectar caches y firmas.',
  },
};

// ======= SecurityImpactDial =======
export function SecurityImpactDial({ scoreImpact }: { scoreImpact: number }) {
  const size = 120;
  const strokeWidth = 12;
  const safeScore = Math.max(0, Math.min(100, scoreImpact));
  const color = safeScore >= 80 ? '#22c55e' : safeScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${safeScore} ${100 - safeScore}`}
        strokeDashoffset="25"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="18" fill="#111827">
        {safeScore}%
      </text>
    </svg>
  );
}

// ======= HeadersPanel =======
export function HeadersPanel({ headers }: { headers: Record<string, string> }) {
  return (
    <Card className="mt-4 w-full">
      <CardHeader>
        <CardTitle>Encabezados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(headers).map(([key, value]) => {
            const info = HEADER_INFO[key.toLowerCase()] || {};
            return (
              <div key={key} className="flex flex-col p-2 border rounded-md">
                <span className="font-bold text-gray-700">{info.title || key}</span>
                <span className="text-gray-500">{info.description || 'Sin descripción.'}</span>
                {info.scoreImpact != null && (
                  <SecurityImpactDial scoreImpact={info.scoreImpact} />
                )}
                {info.recommendation && (
                  <span className="text-blue-600">{info.recommendation}</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

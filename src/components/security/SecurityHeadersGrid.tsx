// src/components/security/SecurityHeadersGrid.tsx
// Grid de tarjetas para encabezados HTTP de seguridad
import { HEADER_INFO, CRITICAL_HEADERS, getHeaderPresence } from './securityUtils';
import { CopyIcon } from './SecurityCharts';

interface Props {
  headers: Record<string, unknown>;
  expandedHeaders: Record<string, boolean>;
  onToggleHeader: (key: string) => void;
  showOnlyMissing: boolean;
}

export function SecurityHeadersGrid({
  headers,
  expandedHeaders,
  onToggleHeader,
  showOnlyMissing,
}: Props) {
  const entries = Object.entries(headers);
  const sorted = [...entries].sort(([aKey, aInfo], [bKey, bInfo]) => {
    const aPres = getHeaderPresence(aInfo);
    const bPres = getHeaderPresence(bInfo);
    const aCrit = CRITICAL_HEADERS.includes(String(aKey).toLowerCase());
    const bCrit = CRITICAL_HEADERS.includes(String(bKey).toLowerCase());
    if (aPres !== bPres) return aPres ? 1 : -1;
    if (aCrit !== bCrit) return aCrit ? -1 : 1;
    return String(aKey).localeCompare(String(bKey));
  });

  const filtered = showOnlyMissing
    ? sorted.filter(([, info]) => !getHeaderPresence(info))
    : sorted;

  const copyText = async (text?: string) => {
    if (!text) return;
    try { await navigator.clipboard?.writeText?.(text); } catch { /* ignore */ }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {filtered.map(([key, info]) => {
        const normKey = String(key).toLowerCase();
        const infoObj = info as Record<string, unknown>;
        const present = getHeaderPresence(info);
        const statusColor = present ? '#16a34a' : '#ef4444';
        const statusText = present ? 'Presente' : 'Falta';
        const value = String(infoObj?.value ?? infoObj?.expected ?? '').trim() || undefined;
        const detail = String(infoObj?.message || infoObj?.note || infoObj?.expected || '').trim() || undefined;
        const meta = HEADER_INFO[normKey];
        const isExpanded = !!expandedHeaders[normKey];

        return (
          <div key={normKey} className="rounded-lg border p-3 transition-colors hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium break-words">
                {meta?.title || normKey}
                <div className="text-xs text-slate-500">{normKey}</div>
              </div>
              <div className="flex items-center gap-2">
                {CRITICAL_HEADERS.includes(normKey) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                    Crítico
                  </span>
                )}
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: present ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
                    color: statusColor,
                  }}
                  title={present ? 'El encabezado está presente' : 'El encabezado falta'}
                >
                  {statusText}
                </span>
                <button
                  className="text-xs text-slate-600 underline cursor-pointer hover:text-slate-900"
                  onClick={() => onToggleHeader(normKey)}
                  aria-expanded={isExpanded}
                >
                  Detalles
                </button>
              </div>
            </div>

            {value && (
              <div className="mt-2 flex items-center gap-2">
                <code className="text-xs bg-slate-100 px-2 py-1 rounded whitespace-pre-wrap break-all">
                  {value}
                </code>
                <button
                  className="p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                  onClick={() => copyText(value)}
                  title="Copiar valor"
                  aria-label="Copiar valor"
                >
                  <CopyIcon />
                </button>
              </div>
            )}

            {detail && (
              <div className="text-xs text-slate-600 mt-1 break-words">{detail}</div>
            )}

            <div
              className={`mt-2 text-xs bg-slate-50 border rounded p-2 transition-all ${
                isExpanded ? 'opacity-100' : 'opacity-0 hidden'
              }`}
            >
              <div>
                <strong>¿Por qué importa?</strong>{' '}
                {meta?.why ??
                  meta?.description ??
                  'Este encabezado de seguridad ayuda a proteger la aplicación contra vulnerabilidades comunes.'}
              </div>
              <div className="mt-1">
                <strong>Recomendación:</strong>{' '}
                {meta?.recommendation ??
                  'Configure este encabezado siguiendo las mejores prácticas de seguridad.'}
              </div>
              {meta?.expected && (
                <div className="mt-1">
                  <strong>Valor recomendado:</strong>
                  <div>
                    <code className="text-[11px] bg-white border rounded px-2 py-1 inline-block mt-1">
                      {meta.expected}
                    </code>
                  </div>
                </div>
              )}
              {meta?.learnMore && (
                <div className="mt-1">
                  <a
                    href={meta.learnMore}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                    title="Abrir documentación"
                  >
                    Más info
                  </a>
                </div>
              )}
              {meta?.nginx && (
                <div className="mt-2">
                  <div className="text-[11px] font-medium">nginx</div>
                  <pre className="text-xs bg-black text-white p-2 rounded mt-1 overflow-auto">
                    {meta.nginx}
                  </pre>
                </div>
              )}
              {meta?.apache && (
                <div className="mt-2">
                  <div className="text-[11px] font-medium">Apache</div>
                  <pre className="text-xs bg-black text-white p-2 rounded mt-1 overflow-auto">
                    {meta.apache}
                  </pre>
                </div>
              )}
              {meta?.express && (
                <div className="mt-2">
                  <div className="text-[11px] font-medium">Node / Express</div>
                  <pre className="text-xs bg-black text-white p-2 rounded mt-1 overflow-auto">
                    {meta.express}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

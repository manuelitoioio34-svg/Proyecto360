// src/components/security/SecurityCharts.tsx
// SeverityChart + HeaderStatusBars + CopyIcon

export const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const SeverityChart = ({ findings }: { findings: unknown[] }) => {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of findings || []) {
    const ff = f as Record<string, unknown>;
    const s = String(ff?.severity || '').toLowerCase();
    if (s.includes('high') || s.includes('critical')) counts.high += 1;
    else if (s.includes('medium')) counts.medium += 1;
    else counts.low += 1;
  }
  const total = counts.high + counts.medium + counts.low || 1;
  const items = [
    { label: 'Crítica', value: Math.round((counts.high / total) * 100), color: '#dc2626', icon: '🔴' },
    { label: 'Media', value: Math.round((counts.medium / total) * 100), color: '#f59e0b', icon: '🟡' },
    { label: 'Baja', value: Math.round((counts.low / total) * 100), color: '#059669', icon: '🟢' },
  ];

  return (
    <div className="bg-white dark:bg-[#13203a] rounded-xl border border-slate-200 dark:border-[#1e2d45] p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
        📊 Distribución por Severidad
      </h4>
      <div className="flex flex-wrap gap-4 mb-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-sm">{item.icon}</span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {item.label}: {item.value}%
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-4 bg-slate-100 dark:bg-[#162440] rounded-full overflow-hidden shadow-inner">
        <div className="flex h-full">
          {items.map((item, index) => (
            <div
              key={item.label}
              className="transition-all duration-500 ease-out"
              style={{
                width: `${item.value}%`,
                background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
                borderRadius:
                  index === 0
                    ? '9999px 0 0 9999px'
                    : index === items.length - 1
                    ? '0 9999px 9999px 0'
                    : '0',
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse opacity-60" />
      </div>
    </div>
  );
};

export const HeaderStatusBars = ({
  headers,
}: {
  headers?: Record<string, unknown>;
}) => {
  const total = Object.keys(headers || {}).length;
  const present = Object.values(headers || {}).filter((h) => {
    if (!h || typeof h !== 'object') return false;
    const hh = h as Record<string, unknown>;
    return Boolean(hh.present || hh.ok || hh.passed || hh.value != null);
  }).length;
  const missing = total - present;
  const pct = total === 0 ? 0 : Math.round((present / total) * 100);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Presentes</span>
          <span className="font-bold text-green-600 text-lg">{present}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Faltantes</span>
          <span className="font-bold text-red-600 text-lg">{missing}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Cobertura</span>
          <span className="font-bold text-blue-600 text-lg">{pct}%</span>
        </div>
      </div>
      <div className="relative">
        <div className="h-3 bg-gradient-to-r from-red-100 dark:from-red-900/30 to-green-100 dark:to-green-900/30 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 text-center">
          {present} de {total} encabezados
        </div>
      </div>
    </div>
  );
};

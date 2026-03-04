import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useAuth } from '../../components/auth/AuthContext';
import { ChevronRight, RefreshCw } from 'lucide-react';

interface UserOverrides { allow?: string[]; deny?: string[] }
interface UserInfo { _id: string; name: string; email: string; role: string; userOverrides?: UserOverrides }

// -- Permission catalogue --------------------------------------------------
const PERM_GROUPS: Array<{
  title: string;
  icon: string;
  description?: string;
  keys: Array<{ key: string; label?: string; description?: string }>;
}> = [
  {
    title: 'Seguridad — Desgloses',
    icon: '🛡️',
    description: 'Controla qué secciones del diagnóstico de seguridad son visibles.',
    keys: [
      { key: 'security.view_headers',     label: 'Cabeceras HTTP',    description: 'Ver detalle de cabeceras de seguridad.' },
      { key: 'security.view_cookies',     label: 'Cookies',           description: 'Ver análisis de atributos de cookies.' },
      { key: 'security.view_findings',    label: 'Findings',          description: 'Ver hallazgos de vulnerabilidades.' },
      { key: 'security.view_action_plan', label: 'Plan de acción',    description: 'Ver el plan de acción de seguridad.' },
    ],
  },
  {
    title: 'Performance',
    icon: '⚡',
    description: 'Acceso a secciones de rendimiento y estrategia de análisis.',
    keys: [
      { key: 'performance.view_breakdowns',  label: 'Desgloses',             description: 'Ver métricas detalladas (LCP, TBT, FCP…).' },
      { key: 'performance.view_action_plan', label: 'Plan de acción',         description: 'Ver el plan de acción de performance.' },
      { key: 'performance.change_strategy',  label: 'Cambio de estrategia',   description: 'Cambiar entre móvil y escritorio en el análisis.' },
    ],
  },
  {
    title: 'IU General — Navegar a detalles',
    icon: '🧭',
    description: 'Acceso a vistas de mayor detalle desde el Dashboard General.',
    keys: [
      { key: 'ui.general.view_details', label: 'Ver detalles', description: 'Habilita el botón "Saber más" en cada métrica del Dashboard General.' },
    ],
  },
  {
    title: 'Dashboard General — Plan de acción',
    icon: '🗂️',
    description: 'Permite acceder al plan de mejora consolidado del Dashboard General.',
    keys: [
      { key: 'dashboard.view_action_plan', label: 'Plan de acción', description: 'Muestra la sección de plan de acción en el Dashboard General.' },
    ],
  },
  {
    title: 'Diagnóstico Integral — Plan de acción',
    icon: '📋',
    description: 'Permite acceder al plan de mejora del Diagnóstico Integral (Full Check).',
    keys: [
      { key: 'fullcheck.view_action_plan', label: 'Plan de acción', description: 'Muestra la sección de plan de acción en el Diagnóstico Integral.' },
    ],
  },
];

// -- Role badge -------------------------------------------------------------
function RoleBadge({ role, isAdminTarget, isOperarioOrTecnico }: { role: string; isAdminTarget: boolean; isOperarioOrTecnico: boolean }) {
  if (isAdminTarget)
    return <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold tracking-wide">Solo lectura (admin)</span>;
  if (isOperarioOrTecnico)
    return <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold tracking-wide">Acceso total por defecto</span>;
  if (role === 'cliente')
    return <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold tracking-wide">Solo lectura (cliente)</span>;
  return null;
}

// -- Accordion -------------------------------------------------------------
function PermGroupAccordion({ title, icon, badge, description, children, defaultOpen = false }: {
  title: string; icon: string; badge?: React.ReactNode; description?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-2xl overflow-hidden mb-3 transition-all ${open ? 'shadow-md ring-1 ring-blue-200 dark:ring-blue-900 border-slate-200 dark:border-slate-600' : 'shadow-sm border-slate-200 dark:border-slate-700'}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:from-blue-50/40 dark:hover:from-slate-700/60 transition-colors focus:outline-none"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
          <div className="text-left min-w-0">
            <div className="flex flex-wrap items-center gap-1 font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {title}{badge}
            </div>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
          </div>
        </div>
        <ChevronRight size={16} className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform ml-4 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  );
}

// -- Individual permission row ----------------------------------------------
function PermItem({ permKey, label, description, state, saving, isAdminTarget, isOperarioOrTecnico, isCliente, onToggle }: {
  permKey: string; label?: string; description?: string;
  state: 'allow' | 'deny' | 'default';
  saving: boolean; isAdminTarget: boolean; isOperarioOrTecnico: boolean; isCliente: boolean;
  onToggle: (mode: 'allow' | 'deny' | 'clear') => void;
}) {
  const stateColor = state === 'allow'
    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20'
    : state === 'deny'
    ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20'
    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50';
  const dot = state === 'allow'
    ? <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1" title="Permitido" />
    : state === 'deny'
    ? <span className="inline-block w-2 h-2 rounded-full bg-red-400 shrink-0 mt-1" title="Denegado" />
    : <span className="inline-block w-2 h-2 rounded-full bg-slate-300 shrink-0 mt-1" title="Default" />;

  const stateLabel = isAdminTarget ? (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-600">ALWAYS ALLOW (admin)</span>
  ) : isOperarioOrTecnico ? (
    <span className={`text-[10px] font-semibold uppercase tracking-wide ${state === 'deny' ? 'text-red-600' : 'text-emerald-600'}`}>
      {state === 'deny' ? 'DENEGADO (override)' : 'PERMITIDO (por defecto)'}
    </span>
  ) : isCliente && state !== 'allow' ? (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">RESTRINGIDO</span>
  ) : (
    <span className={`text-[10px] font-semibold uppercase tracking-wide ${state === 'allow' ? 'text-emerald-600' : state === 'deny' ? 'text-red-600' : 'text-slate-400'}`}>
      {state === 'allow' ? 'PERMITIDO' : state === 'deny' ? 'DENEGADO' : 'DEFAULT'}
    </span>
  );

  return (
    <div className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 transition-all ${stateColor}`}>
      <div className="flex items-start gap-2 min-w-0 flex-1">
        {dot}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label || permKey}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono break-all leading-tight">{permKey}</div>
          {description && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
          <div className="mt-1">{stateLabel}</div>
        </div>
      </div>
      {!isAdminTarget && (
        <div className="flex shrink-0 gap-1.5">
          <button
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
              ${state === 'allow' || isOperarioOrTecnico
                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-600 text-slate-400'
                : 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 active:bg-emerald-100'}`}
            disabled={saving || state === 'allow' || isOperarioOrTecnico}
            onClick={() => onToggle('allow')}
          >Permitir</button>
          <button
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
              ${state === 'deny'
                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-600 text-slate-400'
                : 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100'}`}
            disabled={saving || state === 'deny'}
            onClick={() => onToggle('deny')}
          >Denegar</button>
          <button
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
              ${state === 'default'
                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-600 text-slate-400'
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 active:bg-slate-100'}`}
            disabled={saving || state === 'default'}
            onClick={() => onToggle('clear')}
          >Reset</button>
        </div>
      )}
    </div>
  );
}

// -- Page ------------------------------------------------------------------
export default function UserDetailOverridesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser]     = useState<UserInfo | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const { refreshPermissions }    = useAuth();
  const [refreshingOverrides, setRefreshingOverrides] = useState(false);
  const [refreshingPerms,    setRefreshingPerms]     = useState(false);

  const load = async () => {
    if (!id) return;
    setRefreshingOverrides(true); setError('');
    try {
      const r = await fetch('/api/admin/users', { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Error');
      const found = Array.isArray(j) ? j.find((u: any) => u._id === id) : null;
      if (!found) throw new Error('Usuario no encontrado');
      setUser(found);
    } catch (e: any) { setError(e?.message || 'Error cargando'); }
    finally { setRefreshingOverrides(false); }
  };

  useEffect(() => { void load(); }, [id]);

  const isAllowed = (perm: string) => !!user?.userOverrides?.allow?.includes(perm);
  const isDenied  = (perm: string) => !!user?.userOverrides?.deny?.includes(perm);
  const effective = (perm: string): 'allow' | 'deny' | 'default' => {
    if (user?.role === 'cliente' && !isAllowed(perm)) return 'deny';
    return isAllowed(perm) ? 'allow' : isDenied(perm) ? 'deny' : 'default';
  };

  const isAdminTarget      = user?.role === 'admin';
  const isOperarioOrTecnico = user?.role === 'operario' || user?.role === 'técnico';
  const isCliente          = user?.role === 'cliente';

  const toggle = async (perm: string, mode: 'allow' | 'deny' | 'clear') => {
    if (!user || !id) return;
    setSaving(true); setError('');
    try {
      const res  = await fetch(`/api/admin/users/${id}/overrides`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permission: perm, action: mode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setUser(u => u ? { ...u, userOverrides: data.overrides } : u);
    } catch (e: any) { setError(e?.message || 'Error actualizando'); }
    finally { setSaving(false); }
  };

  return (
    <div className="pt-16 px-4 max-w-3xl mx-auto pb-10" data-page="admin-panel">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-bold">Overrides de Usuario</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="nav-back-btn text-sm">← Volver</Button>
            <Button variant="outline" disabled={refreshingOverrides} onClick={() => { void load(); }} className="text-sm gap-1.5">
              <RefreshCw size={13} className={refreshingOverrides ? 'animate-spin' : ''} />
              {refreshingOverrides ? 'Actualizando…' : 'Refrescar overrides'}
            </Button>
            <Button variant="outline" disabled={refreshingPerms} onClick={async () => { setRefreshingPerms(true); try { await refreshPermissions(); } finally { setRefreshingPerms(false); } }} className="text-sm gap-1.5">
              <RefreshCw size={13} className={refreshingPerms ? 'animate-spin' : ''} />
              {refreshingPerms ? 'Refrescando…' : 'Refrescar mis permisos'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading && <p className="text-sm text-slate-500 py-4">Cargando…</p>}
          {error   && <p className="text-sm text-red-500 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {user && (
            <div className="space-y-5">
              {/* User summary */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900 text-white shadow-sm">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-base font-bold shrink-0 mt-0.5">
                  {(user.name?.[0] || '?').toUpperCase()}
                </div>
                <div className="text-sm space-y-0.5">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-slate-300 text-xs">{user.email}</div>
                  <div className="text-slate-400 text-xs capitalize">{user.role}</div>
                </div>
              </div>

              {/* Role banner */}
              {isAdminTarget && (
                <div className="rounded-xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-xs text-purple-900 flex items-start gap-2">
                  <span className="text-base mt-0.5">👑</span>
                  <span>El rol <strong>admin</strong> tiene acceso completo por diseño. Los overrides individuales no se aplican.</span>
                </div>
              )}
              {isOperarioOrTecnico && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-start gap-2">
                <span className="text-base mt-0.5">🛠️</span>
                  <span><strong>Operario / técnico</strong> tienen todos los permisos habilitados por defecto. Solo puedes <strong>denegar</strong> permisos individualmente.</span>
                </div>
              )}
              {isCliente && !isAdminTarget && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 flex items-start gap-2">
                  <span className="text-base mt-0.5">👤</span>
                  <span>El rol <strong>cliente</strong> tiene acceso restringido por defecto. Usa <strong>Permitir</strong> para conceder acceso a funciones específicas.</span>
                </div>
              )}

              {/* Permission groups � driven from PERM_GROUPS array */}
              {PERM_GROUPS.map((group, gi) => {
                const badge = <RoleBadge role={user.role} isAdminTarget={isAdminTarget} isOperarioOrTecnico={isOperarioOrTecnico} />;
                const activeCount = group.keys.filter(({ key }) => effective(key) !== 'default').length;
                const countBadge = activeCount > 0
                  ? <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{activeCount}</span>
                  : null;

                return (
                  <PermGroupAccordion
                    key={gi}
                    title={group.title}
                    icon={group.icon}
                    description={group.description}
                    badge={<>{badge}{countBadge}</>}
                    defaultOpen={gi === 0}
                  >
                    <div className="flex flex-col gap-2 mt-1">
                      {group.keys.map(({ key, label, description }) => (
                        <PermItem
                          key={key}
                          permKey={key}
                          label={label}
                          description={description}
                          state={effective(key)}
                          saving={saving}
                          isAdminTarget={isAdminTarget}
                          isOperarioOrTecnico={isOperarioOrTecnico}
                          isCliente={isCliente}
                          onToggle={(mode) => toggle(key, mode)}
                        />
                      ))}
                    </div>
                  </PermGroupAccordion>
                );
              })}

              <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                {isAdminTarget
                  ? 'Los overrides se desactivan para usuarios con rol admin.'
                  : isOperarioOrTecnico
                  ? 'Operario y técnico tienen todos los permisos por defecto; solo puedes denegar.'
                  : 'Los overrides se aplican de inmediato. Usa "Refrescar overrides" para ver cambios externos y "Refrescar mis permisos" si editaste tus propios overrides.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

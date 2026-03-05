import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, Lock, Mail, Shield, Globe, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';

// ── helpers ──────────────────────────────────────────────────────────────────
const AUTH_ROUTES = ['/login', '/login/public', '/login/sso', '/register', '/forgot-password', '/reset-password'];
function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/')) return null;
    if (AUTH_ROUTES.some((p) => decoded.startsWith(p))) return null;
    if (decoded.startsWith('//')) return null;
    return decoded;
  } catch { return null; }
}

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, ms = 10000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(input, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
};

type Tab = 'sso' | 'public';

// ── component ─────────────────────────────────────────────────────────────────
export default function LoginSelector() {
  const { login, refresh } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const [tab, setTab] = useState<Tab>('sso');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Public form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const submittingRef = useRef(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  // SSO form
  const [ssoUser, setSsoUser] = useState('');
  const [ssoPwd, setSsoPwd] = useState('');
  const [ssoShowPwd, setSsoShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isSSOBlocked, setIsSSOBlocked] = useState(false);

  const verifySession = async () => {
    for (let i = 0; i < 5; i++) {
      try { const u = await refresh(); if (u) return; } catch {}
      await new Promise((r) => setTimeout(r, 120));
    }
  };

  const goNext = () => {
    const safe = sanitizeNext(params.get('next'));
    navigate(safe || '/', { replace: true });
  };

  // ── Public submit ───────────────────────────────────────────────────────────
  const onPublicSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true); setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const em = String(fd.get('email') || '').trim();
      const pw = String(fd.get('password') || '');
      if (em && em !== email) setEmail(em);
      await login(em || email, pw || password);
      try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
      await verifySession();
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas');
    } finally { submittingRef.current = false; setLoading(false); }
  };

  // ── SSO submit ──────────────────────────────────────────────────────────────
  const onSSOSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError(null); setIsSSOBlocked(false);
    try {
      // Llamada al proxy del backend (evita CORS con Datalake)
      const res = await fetchWithTimeout('/api/auth/sso-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strUser: ssoUser.trim(), strPass: ssoPwd, bitRecordar: remember }),
        credentials: 'include',
      }, 15000);
      if (!res.ok) {
        let msg = 'Credenciales incorrectas';
        try { const d = await res.json(); msg = d?.error || d?.msg || msg; } catch {}
        throw new Error(msg);
      }
      await verifySession();
      goNext();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error en SSO';
      const friendly = /AbortError|Failed to fetch|NetworkError|ERR_CONNECTION/.test(msg)
        ? 'No se pudo conectar al servicio SSO. Verifica tu red o VPN.'
        : msg;
      setError(friendly);
      if (/bloqueado|locked|blocked|demasiados intentos/i.test(friendly)) {
        setIsSSOBlocked(true);
      }
    } finally { setLoading(false); }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } }),
  };
  const dir = tab === 'public' ? 1 : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#f5f6fa] to-[#e8f0fe] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* ── Card (logo + title + tabs + form, todo unificado) ──────────── */}
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200/70 overflow-hidden">

          {/* ── Brand header dentro del card ─────────────────────────────── */}
          <div className="text-center pt-8 pb-5 px-7 border-b border-neutral-100 bg-gradient-to-b from-blue-50/60 to-white">
            <motion.img
              src="/LogoChoucair.png"
              alt="Choucair"
              className="h-12 w-auto mx-auto mb-3 drop-shadow"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            />
            <h1 className="text-2xl font-bold text-[#181818] tracking-tight">Visión web 360°</h1>
            <p className="text-xs text-[#888] mt-1 tracking-wide">Diagnóstico integral de sitios web</p>
          </div>

          {/* ── Tab switcher ─────────────────────────────────────────────── */}
          <div className="flex border-b border-neutral-200">
            {(['sso', 'public'] as Tab[]).map((t) => {
              const active = tab === t;
              const Icon = t === 'sso' ? Shield : Globe;
              const label = t === 'sso' ? 'Corporativo' : 'Público';
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all duration-200
                    ${active
                      ? 'text-[#0075C9] border-b-2 border-[#0075C9] bg-blue-50/50'
                      : 'text-[#888] hover:text-[#444] hover:bg-neutral-50'}`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#0075C9]' : 'text-[#aaa]'}`} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Form area ────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={tab}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="p-7"
              >
                {/* SSO Form */}
                {tab === 'sso' && (
                  <form onSubmit={onSSOSubmit} className="space-y-5">
                    <div className="mb-2">
                      <p className="text-[13px] text-[#666] leading-relaxed">
                        Acceso con cuenta corporativa Choucair a través del servidor de identidad interno.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1.5">Usuario corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-[#aaa]" />
                        <Input
                          name="username"
                          type="text"
                          value={ssoUser}
                          onChange={(e) => setSsoUser(e.target.value)}
                          className="pl-9 h-12 text-sm"
                          placeholder="soporteti"
                          required
                          autoComplete="username"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1.5">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-4 h-4 text-[#aaa]" />
                        <Input
                          name="password"
                          type={ssoShowPwd ? 'text' : 'password'}
                          value={ssoPwd}
                          onChange={(e) => setSsoPwd(e.target.value)}
                          className="pl-9 pr-10 h-12 text-sm"
                          placeholder="••••••••"
                          required
                          autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setSsoShowPwd(!ssoShowPwd)}
                          className="absolute right-3 top-3.5 text-[#aaa] hover:text-[#555]">
                          {ssoShowPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-[#555] cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-[#0075C9]" />
                      Recordar usuario
                    </label>

                    {error && (
                      <div className={`p-3 rounded-lg text-sm border ${isSSOBlocked ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                        {isSSOBlocked && (
                          <a
                            href="https://passwordreset.microsoftonline.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Desbloquear cuenta
                          </a>
                        )}
                      </div>
                    )}

                    <Button type="submit" disabled={loading || !ssoUser || !ssoPwd}
                      className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#0075C9] to-[#005fa3] hover:from-[#005fa3] hover:to-[#004d84] text-white shadow transition-all">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />Conectando...
                        </span>
                      ) : 'Iniciar sesión corporativa'}
                    </Button>
                  </form>
                )}

                {/* Public Form */}
                {tab === 'public' && (
                  <form onSubmit={onPublicSubmit} className="space-y-5">
                    <div className="mb-2">
                      <p className="text-[13px] text-[#666] leading-relaxed">
                        Acceso con correo electrónico y contraseña. Para clientes, consultores y usuarios externos.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1.5">Correo electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-[#aaa]" />
                        <Input
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 h-12 text-sm"
                          placeholder="tu@correo.com"
                          required
                          autoComplete="email"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#333] mb-1.5">Contraseña</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-4 h-4 text-[#aaa]" />
                        <Input
                          name="password"
                          type={showPwd ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-9 pr-10 h-12 text-sm"
                          placeholder="••••••••"
                          required
                          autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-3 top-3.5 text-[#aaa] hover:text-[#555]">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button type="submit" disabled={loading || !emailValid || !passwordValid}
                      className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#0075C9] to-[#005fa3] hover:from-[#005fa3] hover:to-[#004d84] text-white shadow transition-all">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />Iniciando sesión...
                        </span>
                      ) : 'Iniciar sesión'}
                    </Button>

                    <div className="text-center text-sm text-[#888] space-y-1 pt-1">
                      <div>
                        <Link to="/register" className="text-[#0075C9] hover:underline font-medium">
                          ¿No tienes cuenta? Regístrate
                        </Link>
                      </div>
                    </div>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-[#aaa] mt-6 tracking-widest uppercase">
          Digital Assets Reliability
        </p>
      </motion.div>
    </div>
  );
}

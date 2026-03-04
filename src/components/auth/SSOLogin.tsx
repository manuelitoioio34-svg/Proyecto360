import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Shield, Mail, Lock, ArrowLeft, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';

const AUTH_ROUTES = ['/login', '/login/public', '/login/sso', '/register', '/forgot-password', '/reset-password'];
function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/')) return null;
    if (AUTH_ROUTES.some((p) => decoded.startsWith(p))) return null;
    if (decoded.startsWith('//')) return null;
    return decoded;
  } catch {
    return null;
  }
}

export default function SSOLoginPage() {
  const { loginWithSSO } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setIsBlocked(false);
    setLoading(true);
    try {
      // Proxy del backend — evita el bloqueo CORS del navegador
      const res = await fetchWithTimeout('/api/auth/sso-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strUser: username.trim(), strPass: password, bitRecordar: remember }),
        credentials: 'include',
      }, 15000);

      if (!res.ok) {
        let msg = 'Credenciales incorrectas';
        try {
          const data = await res.json();
          msg = data?.error || data?.msg || msg;
        } catch {}
        throw new Error(msg);
      }

      // El backend ya estableció la cookie de sesión local
      await loginWithSSO();

      const safeNext = sanitizeNext(params.get('next'));
      navigate(safeNext || '/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error en SSO';
      const friendly = /AbortError|Failed to fetch|NetworkError|ERR_CONNECTION/.test(msg)
        ? 'No se pudo conectar al servicio SSO (revisa tu red/VPN).'
        : msg;
      setError(friendly);
      if (/bloqueado|locked|blocked|demasiados intentos/i.test(friendly)) {
        setIsBlocked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full"
        >
          <Card className="relative bg-white border border-neutral-200 shadow-md rounded-xl overflow-hidden">
            <button
              type="button"
              className="absolute top-4 left-4 h-10 w-10 p-0 inline-flex items-center justify-center rounded-md border border-neutral-200 hover:bg-neutral-100 transition"
              onClick={() => navigate('/login')}
              aria-label="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <CardHeader className="text-center py-8">
              <div className="mx-auto mb-3 flex flex-col items-center gap-1">
                <Shield className="w-10 h-10 text-[#0075C9]" />
                <img src="/LogoChoucair.png" alt="Choucair" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-3xl font-semibold text-[#222]">Acceso corporativo</CardTitle>
              <p className="text-base text-[#222]/80 mt-2">Ingresa con usuario y contraseña corporativa</p>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-[#222] mb-2">Usuario corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-4 w-5 h-5 text-[#222]/60" />
                    <Input
                      name="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 pr-3 h-14 text-base"
                      placeholder="soporteti"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-base font-medium text-[#222] mb-2">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-4 w-5 h-5 text-[#222]/60" />
                    <Input
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-3 h-14 text-base"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-[#222]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Recordar usuario
                </label>

                {error && (
                  <div className={`p-3 rounded-lg text-sm border ${isBlocked ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    {isBlocked && (
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

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={loading || !username || !password}
                    className="w-full h-14 text-base font-semibold rounded-lg"
                  >
                    {loading ? 'Conectando...' : 'Iniciar sesión'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

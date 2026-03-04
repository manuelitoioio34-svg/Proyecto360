import React, { useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

const AUTH_ROUTES = ['/login', '/login/public', '/register', '/forgot-password', '/reset-password'];
function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    // Decodificar y validar que es una ruta interna segura (evita redirecciones abiertas)
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/')) return null;
    // Evitar rutas de autenticación para no caer en bucles o confusión
    if (AUTH_ROUTES.some((p) => decoded.startsWith(p))) return null;
    // Protección adicional contra rutas sospechosas (ej: //malicioso.com)
    if (decoded.startsWith('//')) return null;
    return decoded;
  } catch {
    return null;
  }
}

// Página de login con validaciones, manejo de estado y redirección segura
export default function LoginPage() {
  const { login, initialized, refresh } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);

  const submittingRef = React.useRef(false);

  // Validaciones simples
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  // Verifica que la sesión está efectiva (cookie aplicada o Bearer activo) antes de navegar
  const verifySession = async (retries = 5, delayMs = 120) => {
    for (let i = 0; i < retries; i++) {
      try {
        const u = await refresh();
        if (u) return true;
      } catch {}
      await new Promise((res) => setTimeout(res, delayMs));
    }
    return false;
  };

  // Maneja el submit del formulario de login
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.trace('[Login] onSubmit trace - invoked by:');

      // Leer valores desde el DOM (soporta autofill del navegador)
      const fd = new FormData(e.currentTarget);
      const emailDom = String(fd.get('email') || '').trim();
      const passwordDom = String(fd.get('password') || '');

      // Sincroniza estado si difiere (solo para UI/validaciones visuales)
      if (emailDom && emailDom !== email) setEmail(emailDom);
      if (passwordDom && passwordDom !== password) setPassword(passwordDom);

      const user = await login(emailDom || email, passwordDom || password);

      // Si el login es exitoso, verificar que la sesión está activa antes de redirigir
      try { (document.activeElement as HTMLElement | null)?.blur(); } catch (err) {}

      // Confirmar sesión antes de navegar (evita rebote si la cookie tarda en aplicarse)
      await verifySession();

      const safeNext = sanitizeNext(params.get('next'));
      if (safeNext) {
        navigate(safeNext, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciales incorrectas';
      setError(msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  // Simplified, flatter public login UI for clarity and brand consistency
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
                <img src="/LogoChoucair.png" alt="Choucair" className="h-12 w-auto" />
              </div>
              <CardTitle className="text-3xl font-semibold text-[#222]">Iniciar sesión</CardTitle>
              <p className="text-base text-[#222]/80 mt-2">Accede con tu cuenta</p>
            </CardHeader>
            <CardContent className="p-6">
              <form
                onSubmit={onSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (loading || submittingRef.current)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-base font-medium text-[#222] mb-2">Correo electrónico</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-4 w-5 h-5 text-[#222]/60`} />
                    <Input
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => { setFocusedField(null); }}
                      onFocus={() => setFocusedField('email')}
                      className="pl-10 pr-3 h-14 text-base"
                      placeholder="tu@email.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-base font-medium text-[#222] mb-2">Contraseña</label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-4 w-5 h-5 text-[#222]/60`} />
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="pl-10 pr-10 h-14 text-base"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-4 text-[#222]/60 hover:text-[#222]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-2 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={loading || !emailValid || !passwordValid}
                    className="w-full h-14 text-base font-semibold rounded-lg"
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Button>
                </div>
              </form>

              <div className="mt-4 flex flex-col items-center text-sm text-[#646464] gap-2">
                <Link to="/register" className="text-[#0075C9] hover:underline">¿No tienes cuenta? Regístrate</Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
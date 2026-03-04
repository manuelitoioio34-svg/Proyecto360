// src/App.tsx
import React, { useEffect, useLayoutEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar"; // Restaurado
import ScrollToTop from "./components/common/ScrollToTop";

// Wrappers FSD
import RunAuditPage from "./pages/run-audit";
import DiagnosticsPage from "./pages/diagnostics";
import FullCheckPage from "./pages/full-check/DashboardCalidadWeb";
import DashboardPage from "./pages/dashboard/DashBoardGeneral";
import DiagnosticHistoryPage from './pages/admin/DiagnosticHistory';
import SettingsPage from "./pages/settings";import ProfilePage from './pages/profile';import LoginPage from "./components/auth/Login";
import LoginSelector from "./components/auth/LoginSelector";
import SSOLoginPage from "./components/auth/SSOLogin";
import RegisterPage from "./components/auth/Register";
import { useAuth } from './components/auth/AuthContext';
import ForgotPasswordPage from './components/auth/ForgotPassword';
import ResetPasswordPage from './components/auth/ResetPassword';
import AdminDashboardPage from './pages/admin';
import AdminUsersPage from './pages/admin/Users';
import AdminLogsPage from './pages/admin/Logs';
import AdminTelemetryPage from './pages/admin/Telemetry';
import TraceabilityPage from './pages/admin/Traceability';
import PermissionsManagerPage from './pages/admin/PermissionsManager';
import UserDetailOverridesPage from './pages/admin/UserDetailOverrides';
import { trackRouteVisit } from './shared/telemetry';

// Helper to build a safe login redirection, avoiding next=/login and other auth routes
const AUTH_ROUTES = ['/login', '/login/public', '/login/sso', '/register', '/forgot-password', '/reset-password'];
function getLoginRedirectElement() {
  try {
    const url = new URL(window.location.href);
    const currentPath = url.pathname;
    // If we're on an auth route, do not carry any next param
    if (AUTH_ROUTES.some((p) => currentPath.startsWith(p))) {
      return <Navigate to="/login" replace />;
    }
    // Strip any existing next from query
    const search = new URLSearchParams(url.search);
    search.delete('next');
    const qs = search.toString();
    const nextPath = currentPath + (qs ? `?${qs}` : '');
    // If next would be root, you may omit it; requirement is to avoid next=/login specifically
    const to = nextPath && nextPath !== '/' ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
    return <Navigate to={to} replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();
  if (!initialized || loading) return null;
  if (!user) return getLoginRedirectElement();
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();
  if (!initialized || loading) return null;
  if (!user) return getLoginRedirectElement();
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Permite acceso a admin O a cualquier usuario que tenga el permiso indicado */
function RequirePermission({ perm, children }: { perm: string; children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();
  if (!initialized || loading) return null;
  if (!user) return getLoginRedirectElement();
  if (user.role === 'admin' || user.permissions?.includes(perm)) return <>{children}</>;
  return <Navigate to="/" replace />;
}

function TecnicoOnly({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();
  if (!initialized || loading) return null;
  if (!user) return getLoginRedirectElement();
  if (user.role !== 'tecnico' && user.role !== 'otro_tecnico') return <Navigate to="/" replace />; // Solo los técnicos pueden acceder
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  // Disable browser scroll restoration (so SPA controls it)
  useEffect(() => {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch { }
  }, []);

  // Scroll to top BEFORE paint on route change (prevents initial mid-page position)
  useLayoutEffect(() => {
    try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; } catch { }
    try { window.scrollTo(0, 0); } catch { }
    try { (document.scrollingElement || document.documentElement).scrollTop = 0; } catch { }
    try { document.body.scrollTop = 0; } catch { }
  }, [location.pathname, location.search, location.hash]);

  // Client-side telemetry to complement server middleware (SPA dev/prod)
  useEffect(() => {
    // Telemetría SOLO para clientes y con pequeño retraso para asegurar cookie/estado estable
    if (user?.role === 'cliente') {
      const id = setTimeout(() => {
        trackRouteVisit(location.pathname).catch(() => { });
      }, 80); // antes 0ms, ahora 80ms
      return () => clearTimeout(id);
    }
    // Si no es cliente, no hacemos nada (evitamos eventos no requeridos)
    return; // eslint-disable-line consistent-return
  }, [location.pathname, user?.role]);

  return (
    <Routes>
      {/* Auth routes without layout */}
      <Route path="/login" element={<LoginSelector />} />
      <Route path="/login/public" element={<LoginPage />} />
      <Route path="/login/sso" element={<SSOLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Main app routes with navbar */}
      <Route path="/*" element={
        <div className="flex flex-col min-h-screen w-full bg-[#f5f6fa]">
          <Navbar />
          <ScrollToTop />
          <main className="flex-1 flex flex-col w-full">
            <div className="w-full">
              <Routes>
                <Route path="/admin" element={<AdminOnly><AdminDashboardPage /></AdminOnly>} />
                <Route path="/admin/users" element={<AdminOnly><AdminUsersPage /></AdminOnly>} />
                <Route path="/admin/logs" element={<AdminOnly><TraceabilityPage /></AdminOnly>} />
                <Route path="/admin/telemetry" element={<AdminOnly><AdminTelemetryPage /></AdminOnly>} />
                <Route path="/admin/permissions" element={<AdminOnly><PermissionsManagerPage /></AdminOnly>} />
                <Route path="/admin/users/:id/overrides" element={<AdminOnly><UserDetailOverridesPage /></AdminOnly>} />
                <Route path="/" element={<Protected><RunAuditPage /></Protected>} />
                <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
                <Route path="/diagnostico/:id" element={<Protected><DiagnosticsPage /></Protected>} />
                <Route path="/diagnostics/full-check" element={<Protected><FullCheckPage /></Protected>} />
                <Route path="/admin/history" element={<RequirePermission perm="history.view"><DiagnosticHistoryPage /></RequirePermission>} />
                <Route path="/settings" element={<AdminOnly><SettingsPage /></AdminOnly>} />
                <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
                <Route path="/otros" element={<TecnicoOnly><div className="p-8"><h1 className="text-2xl font-bold">Sección Técnicos</h1><p>Contenido exclusivo para técnicos.</p></div></TecnicoOnly>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      } />
    </Routes>
  );
}
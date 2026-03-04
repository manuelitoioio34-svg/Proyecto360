import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '../../shared/logger.js';

export type UserRole = 'admin' | 'operario' | 'tecnico' | 'otro_tecnico' | 'cliente';
export interface SsoProfile {
  usuario?:             string;
  cargo?:               string;
  area?:                string;
  rolApp?:              string;
  ccosto?:              string;
  ccostoResponsable?:   string;
  uen?:                 string;
  paisNomina?:          string;
  ciudadNomina?:        string;
}
export type User = { _id: string; name: string; email: string; role: UserRole; title?: string | null; permissions?: string[]; authMethod?: 'local' | 'sso'; ssoProfile?: SsoProfile; };

type AuthContextValue = {
  user: User | null;
  loading: boolean; // true mientras se verifica la sesión actual
  initialized: boolean; // primera actualización completada
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: (opts?: { force?: boolean; origin?: 'ui' | 'auto' }) => Promise<void>;
  refresh: () => Promise<User | null>;
  refreshPermissions: () => Promise<string[]>; // ayudante para obtener permisos actualizados
  loginWithSSO: () => Promise<User>; // SSO (Single Sign-On) de Choucair - a implementar después
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provedor que envuelve la app y provee el contexto de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Refs para estado mutable que no dispara
  const userRef = useRef<User | null>(null);
  const lastLoginAtRef = useRef<number | null>(null);
  const refreshCounterRef = useRef(0);
  const suppressLogoutUntilRef = useRef<number | null>(null);
  const inFlightLoginRef = useRef<Promise<User> | null>(null);
  const lastLoginTsRef = useRef(0);
  // Token JWT en memoria (respaldo mientras la cookie aparece)
  const tokenRef = useRef<string | null>(null);

  const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  useEffect(() => { userRef.current = user; }, [user]);

  // Función para refrescar el usuario actual (verificar sesión)
  const refresh = async () => {
    const myId = ++refreshCounterRef.current;
    logger.debug({ id: myId }, '[Auth][refresh] start');
    try {
      const headers: Record<string, string> = {};
      if (tokenRef.current) headers['Authorization'] = `Bearer ${tokenRef.current}`;
      const res = await fetchWithTimeout('/api/auth/me', { credentials: 'include', headers }, 8000);
      logger.debug({ status: res.status, id: myId }, '[Auth][refresh] status');

      if (!res.ok) {
        const lastLogin = lastLoginAtRef.current;
        const now = Date.now();
        const recentLoginWindow = 2000;
        if (!userRef.current && (!lastLogin || now - lastLogin > recentLoginWindow)) {
          logger.info({ id: myId }, '[Auth][refresh] no auth -> clearing user');
          setUser(null);
        } else {
          logger.debug({ id: myId }, '[Auth][refresh] no auth but ignored due to recent login or existing user');
        }
        return null;
      }

      // si la respuesta incluye un nuevo token, actualízalo (ej: refresh automático)
      const data = await res.json();
      const u = data?.user as User | undefined;
      if (u) {
        if (myId === refreshCounterRef.current) {
          logger.info({ email: u.email, id: myId }, '[Auth][refresh] got user');
          setUser(u);
          userRef.current = u;
        } else {
          logger.debug({ id: myId, current: refreshCounterRef.current }, '[Auth][refresh] stale response ignored');
        }
        return u;
      } else {
        const lastLogin = lastLoginAtRef.current;
        const now = Date.now();
        const recentLoginWindow = 2000;
        if (!userRef.current && (!lastLogin || now - lastLogin > recentLoginWindow)) {
          logger.info({ id: myId }, '[Auth][refresh] empty payload -> clearing user');
          setUser(null);
        } else {
          logger.debug({ id: myId }, '[Auth][refresh] empty payload but ignoring due to recent login or existing user');
        }
        return null;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.warn({ id: myId }, '[Auth][refresh] timeout waiting /api/auth/me');
      }
      logger.error({ err, id: myId }, '[Auth][refresh] catch');
      const lastLogin = lastLoginAtRef.current;
      const now = Date.now();
      const recentLoginWindow = 2000;
      if (!userRef.current && (!lastLogin || now - lastLogin > recentLoginWindow)) {
        setUser(null);
      } else {
        logger.debug({ id: myId }, '[Auth][refresh] error ignored due to recent login or existing user');
      }
      return null;
    } finally {
      setLoading(false);
      setInitialized(true);
      logger.debug({ id: myId }, '[Auth][refresh] done');
    }
  };

  // Al montar, intenta refrescar la sesión para verificar si el usuario ya está autenticado
  useEffect(() => {
    void refresh();
  }, []);

  // LOGIN: protege contra llamadas concurrentes reutilizando la promesa en vuelo
  const login = async (email: string, password: string) => {
    // evitar envíos muy rápidos (protección extra)
    const nowTs = Date.now();
    if (nowTs - lastLoginTsRef.current < 200) {
      logger.warn('[Auth] login suppressed - too fast after previous attempt (<200ms)');
      // si hay in-flight reuse, devuélvela, si no, rechaza
      if (inFlightLoginRef.current) return inFlightLoginRef.current;
      throw new Error('Login suppressed - too fast');
    }
    lastLoginTsRef.current = nowTs;

    // si ya hay un login en curso, reutiliza la promesa para evitar dobles requests
    if (inFlightLoginRef.current) {
      logger.debug('[Auth] login: reuse in-flight promise');
      return inFlightLoginRef.current;
    }

    logger.info({ email }, '[Auth] login start');
    const p = (async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        logger.debug({ status: res.status }, '[Auth] login status');
        const data = await res.json();
        if (!res.ok) {
          logger.warn({ data }, '[Auth] login fail');
          throw new Error(data?.error || 'Error al iniciar sesión');
        }

        const now = Date.now();
        lastLoginAtRef.current = now;
        // ampliar la ventana a 5s para evitar logouts espurios en dev
        suppressLogoutUntilRef.current = now + 5000; // 5s

        // Guarda token de respaldo si viene
        tokenRef.current = (data as any)?.token || null;

        setUser(data.user);
        userRef.current = data.user;
        setInitialized(true);

        logger.info({ email: data.user?.email }, '[Auth] login success, set user');
        return data.user as User;
      } finally {
        inFlightLoginRef.current = null;
      }
    })();

    inFlightLoginRef.current = p;
    return p;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Error al registrar');
    const now = Date.now();
    lastLoginAtRef.current = now;
    suppressLogoutUntilRef.current = now + 5000;
    // token respaldo
    tokenRef.current = (data as any)?.token || null;
    setUser(data.user);
    userRef.current = data.user;
    return data.user as User;
  };

  // SSO: verifica sesión existente via proxy del backend (no llama a Datalake directamente)
  const loginWithSSO = async (): Promise<User> => {
    logger.info('[Auth] loginWithSSO - checking local session');
    // Después de ssoLogin el backend ya estableció la cookie local.
    // Solo necesitamos refrescar el contexto.
    const u = await refresh();
    if (u) return u;
    throw new Error('Sesión SSO no encontrada tras login');
  };

  // LOGOUT: opcionalmente forzable desde UI (opts.force === true)
  const logout = async (opts?: { force?: boolean; origin?: 'ui' | 'auto' }) => {
    // always log trace for debugging
    logger.info({ opts: opts ?? {} }, '[Auth] manual logout called');
    const origin = opts?.origin ?? 'auto';

    // estado interno para depuración
    const now = Date.now();
    logger.debug({
      now,
      lastLoginAt: lastLoginAtRef.current,
      suppressUntil: suppressLogoutUntilRef.current,
      userPresent: !!userRef.current,
      origin,
    });

    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    // Nunca ejecutar logout automático en rutas de auth
    if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot') || path.startsWith('/reset')) {
      if (origin !== 'ui') {
        console.log('[Auth] logout ignored on auth route (non-UI origin)');
        return;
      }
    }

    // Ignorar logouts no forzados cuando no hay usuario
    if (!opts?.force && !userRef.current) {
      console.log('[Auth] logout ignored (no user + not forced)');
      return;
    }

    const suppressUntil = suppressLogoutUntilRef.current ?? 0;
    if (now < suppressUntil && origin !== 'ui') {
      console.log('[Auth] logout suppressed (within window, non-UI origin)', { now, suppressUntil });
      console.trace('[Auth] suppressed logout trace');
      return;
    }

    try {
      console.log('[Auth] performing logout fetch...');
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('[Auth] logout fetch error', e);
    } finally {
      setUser(null);
      userRef.current = null;
      tokenRef.current = null;
      lastLoginAtRef.current = null;
      suppressLogoutUntilRef.current = null;
      console.log('[Auth] logout completed (state cleared)');
      console.trace('[Auth] logout completed trace');
    }
  };

  const refreshPermissions = async () => {
    if(!userRef.current) return [] as string[];
    try {
      const res = await fetch('/api/auth/permissions', { credentials: 'include' });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error||'Error');
      const perms: string[] = data.permissions || [];
      setUser(u => u ? { ...u, permissions: perms } : u);
      return perms;
    } catch { return [] as string[]; }
  };

  const value = useMemo(
    () => ({ user, loading, initialized, login, register, logout, refresh, refreshPermissions, loginWithSSO }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, initialized]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
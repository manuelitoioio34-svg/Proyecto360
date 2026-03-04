// server/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import User, { type UserRole } from '../database/user.js';
import { signToken, JWT_SECRET } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import TelemetryEvent from '../database/telemetryEvent.js';
import { recordVisit } from './admin.controller.js';
import RolePermissions from '../database/rolePermissions.js';
import { PERMISSION_KEYS, defaultsForRole } from '../utils/permissionsCatalog.js';
import { type AuthUser, } from '../middleware/auth.js';

const COOKIE_NAME = process.env.COOKIE_NAME || 'perf_token';
const IN_PROD = process.env.NODE_ENV === 'production';
const REQUIRE_EMAIL_VERIFICATION = false; // Deshabilitado (eliminada verificación por ahora)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/; // validación básica

function sanitizeBaseUrl(raw: string | undefined): string {
  let b = raw?.trim() || '';
  if (!b) return 'http://localhost:5173';
  // Si viene solo puerto (ej: 5173) o empieza con ':')
  if (/^:?\d{2,5}$/.test(b)) {
    b = `http://localhost:${b.replace(':','')}`;
  }
  // Si no tiene protocolo, asumir http
  if (!/^https?:\/\//i.test(b)) {
    b = 'http://' + b.replace(/^\/*/, '');
  }
  // Quitar trailing slash extra
  b = b.replace(/\/$/, '');
  return b;
}

function hrTimer() { const s = process.hrtime.bigint(); return () => Number(process.hrtime.bigint() - s)/1e6; }
const METRICS_ENABLED = process.env.METRICS_ENABLED !== 'false';
const METRICS_SAMPLE_RATE = Math.min(1, Math.max(0, Number(process.env.METRICS_SAMPLE_RATE || '1')));
async function emitTelemetry(kind: string, base: Record<string, any>) {
  try { if (!METRICS_ENABLED) return; if (METRICS_SAMPLE_RATE<1 && Math.random()>METRICS_SAMPLE_RATE) return; TelemetryEvent.create({ kind, ts:new Date(), ...base }).catch(()=>{}); } catch {}
}
function hashEmailPart(e?: string|null) { if(!e) return null; try { return crypto.createHash('sha256').update(e).digest('hex').slice(0,10);} catch { return null; } }

async function effectivePermissionsForRole(role: string): Promise<string[]> {
  try {
    if (role === 'admin') return Array.from(PERMISSION_KEYS);
    let RolePermissionsMod: any;
    try {
      RolePermissionsMod = RolePermissions; // prefer static import
    } catch {
      try { RolePermissionsMod = (await import('../database/rolePermissions.js')).default; } catch(err) {
        console.error('[perms] dynamic import failed', err);
      }
    }
    if (RolePermissionsMod) {
      try {
        const doc = await RolePermissionsMod.findOne({ role }).lean();
        if (doc && Array.isArray((doc as any).permissions)) return (doc as any).permissions as string[];
      } catch (e) {
        console.error('[perms] query failed role=%s err=%s', role, (e as any)?.message);
      }
    }
    return defaultsForRole(role);
  } catch (e) {
    console.error('[perms] fallback error role=%s err=%s', role, (e as any)?.message);
    return defaultsForRole(role);
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role, title } = (req.body || {}) as {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      title?: string;
    };

    if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos' });

    const normEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normEmail)) return res.status(400).json({ error: 'Email inválido' });

    const exists = await User.findOne({ email: normEmail });
    if (exists) return res.status(409).json({ error: 'El correo ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);

    // Por ahora aceptamos el rol enviado en registro (si es válido). Luego podrás restringir según políticas.
    let finalRole: UserRole = 'cliente';
    const allowed: UserRole[] = ['admin','operario','tecnico','cliente'];
    if (role && allowed.includes(role)) finalRole = role;
    const creatorPrivileged = false;

    const user = await User.create({ name, email: normEmail, passwordHash, role: finalRole, title });

    // Mongoose tipa _id como unknown en TS 5 + Mongoose 8; usar .id (string) o forzar a string
    const userId: string = (user as any).id ?? String((user as any)._id);

    // If public self-registration, start session as the new user. If an authenticated privileged user created this, do not swap their session.
    if (!creatorPrivileged) {
      const token = signToken({ _id: userId, name: user.name, email: user.email, role: user.role });
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: IN_PROD,
        sameSite: IN_PROD ? 'lax' : 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });
      // También devolvemos el token para clientes SPA como respaldo (dev/proxy)
      return res.status(201).json({ ok: true, token, user: { _id: userId, name: user.name, email: user.email, role: user.role, title: user.title } });
    }

    return res.status(201).json({ ok: true, user: { _id: userId, name: user.name, email: user.email, role: user.role, title: user.title } });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Error al registrar' });
  }
}

export async function login(req: Request, res: Response) {
  const stop = hrTimer();
  try {
    const { email, password } = (req.body || {}) as { email?: string; password?: string };
    console.log('[auth/login] attempt', email);
    if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });

    const normEmail = email.trim().toLowerCase();
    // RELAX: no rechazamos por regex aquí para permitir cuentas históricas mal formadas
    // if (!EMAIL_REGEX.test(normEmail)) return res.status(401).json({ error: 'Credenciales inválidas' });

    let user = await User.findOne({ email: normEmail });
    if (!user) {
      // fallback legacy: buscar exactamente lo que ingresó (trim), por si el email viejo quedó con TLD raro
      const rawTrim = email.trim();
      if (rawTrim !== normEmail) {
        user = await User.findOne({ email: rawTrim });
      }
    }
    if (!user || !user.isActive) { await emitTelemetry('auth_login_fail', { emailHash: hashEmailPart(email), reason:'not_found_or_inactive', durationMs: stop() }); return res.status(401).json({ error: 'Credenciales inválidas' }); }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) { await emitTelemetry('auth_login_fail', { emailHash: hashEmailPart(email), reason:'bad_password', durationMs: stop() }); return res.status(401).json({ error: 'Credenciales inválidas' }); }

    user.lastLogin = new Date();
    await user.save();

    // Derivar string id seguro para JWT y respuesta
    const userId: string = (user as any).id ?? String((user as any)._id);

    const token = signToken({ _id: userId, name: user.name, email: user.email, role: user.role });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: IN_PROD,
      sameSite: IN_PROD ? 'lax' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    console.log('[auth/login] success set cookie for', user.email, 'normEmail=', normEmail);

    await emitTelemetry('auth_login_ok', { userId: userId, role: user.role, durationMs: stop() });
    // Registrar visita de perfil tras login (una vez por día)
    try {
      const profileRoute = user.role === 'admin' ? '/admin' : '/';
      recordVisit(profileRoute, { _id: userId, name: user.name, email: user.email, role: user.role } as any);
    } catch {}
    // Obtener permisos efectivos INCLUYENDO overrides de usuario
    let perms: string[] = [];
    try {
      const { getUserEffectivePermissions } = await import('../middleware/auth.js');
      perms = await getUserEffectivePermissions({ _id: userId, role: user.role, name: user.name, email: user.email } as any);
    } catch {
      perms = await effectivePermissionsForRole(user.role); // fallback solo por rol
    }
    return res.json({ ok: true, token, user: { _id: userId, name: user.name, email: user.email, role: user.role, title: user.title, permissions: perms } });
  } catch (e: any) {
    await emitTelemetry('auth_login_fail', { emailHash: hashEmailPart((req.body as any)?.email), reason:'exception', durationMs: stop(), error: e?.message });
    console.error('[auth/login] error', e);
    return res.status(500).json({ error: e?.message || 'Error al iniciar sesión' });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const u = req.user;
    if (!u) {
      console.log('[auth/me] no user (401)');
      return res.status(401).json({ error: 'No autenticado' });
    }
    console.log('[auth/me] ok user', u.email);
    let perms: string[] = [];
    try {
      const { getUserEffectivePermissions } = await import('../middleware/auth.js');
      perms = await getUserEffectivePermissions(u as any); // usa overrides + rol
    } catch {
      try { perms = await effectivePermissionsForRole(u.role); } catch {}
    }
    // Incluir authMethod, title y ssoProfile desde BD (no están en el JWT)
    let authMethod: string = 'local';
    let title: string | undefined;
    let ssoProfile: any = undefined;
    try {
      const dbUser = await User.findById(u._id).select('authMethod title ssoProfile').lean();
      authMethod  = (dbUser as any)?.authMethod  || 'local';
      title       = (dbUser as any)?.title       || undefined;
      ssoProfile  = (dbUser as any)?.ssoProfile  || undefined;
    } catch { /* no fatal */ }
    return res.json({ ok: true, user: { ...u, permissions: perms, authMethod, title, ssoProfile } });
  } catch (e) {
    console.error('[auth/me] unexpected error', e);
    return res.status(500).json({ error: 'Error' });
  }
}

export async function logout(_req: Request, res: Response) {
  const cookieName = COOKIE_NAME;
  res.clearCookie(cookieName, { path: '/' });
  return res.json({ ok: true });
}

// ---------- Password recovery ----------
export async function requestPasswordReset(req: Request, res: Response) {
  const stop = hrTimer();
  try {
    const { email } = (req.body || {}) as { email?: string };
    if (!email) return res.status(400).json({ error: 'Falta email' });

    const normEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normEmail });
    if (!user) { await emitTelemetry('email.sent', { emailType:'password_reset', success:true, durationMs: stop() }); return res.json({ ok: true }); } // do not reveal

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30m
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    const baseUrl = sanitizeBaseUrl(process.env.APP_BASE_URL);
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normEmail)}`;

    console.log('[auth/requestPasswordReset] Link generado =>', link);

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER as string, pass: process.env.EMAIL_PASS as string },
      });

      const logoDiskPath = path.join(process.cwd(), 'public', 'LogoChoucair.png');
      const hasLogo = fs.existsSync(logoDiskPath);
      const logoTag = hasLogo
        ? '<img src="cid:logoChoucair" alt="Choucair" style="max-height:64px;display:block;margin:0 auto 10px;" />'
        : '<div style="font-size:26px;font-weight:600;color:#ffffff;margin:0 0 6px 0;">Choucair</div>';

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normEmail,
        subject: 'Solicitud de restablecimiento de contraseña',
        html: `<!DOCTYPE html>
<html lang="es">
<head><meta charSet="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Restablecer contraseña</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f7fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <tr>
          <td style="background:linear-gradient(90deg,#0f5132,#000);padding:28px 30px;text-align:center;">
            ${logoTag}
            <div style="font-size:11px;letter-spacing:3px;color:#d1d5db;font-weight:500;">BUSINESS CENTRIC TESTING</div>
          </td>
        </tr>
        <tr><td style="padding:34px 40px 10px 40px;">
          <h1 style="margin:0 0 18px 0;font-size:22px;line-height:1.25;color:#111827;font-weight:600;">Restablecimiento de contraseña</h1>
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.5;color:#374151;">Hola,<br/>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta asociada al correo <strong style="color:#111827;">${normEmail}</strong>.</p>
          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.5;color:#374151;">Si realizaste esta solicitud, haz clic en el botón a continuación para crear una nueva contraseña. Este enlace es válido durante <strong>30 minutos</strong>.</p>
          <div style="text-align:center;margin:34px 0;">
            <a href="${link}" style="display:inline-block;background:linear-gradient(90deg,#0f5132,#000);color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:30px;letter-spacing:.5px;">Restablecer contraseña</a>
          </div>
          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;color:#6b7280;">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña actual seguirá funcionando.</p>
          <p style="margin:0 0 6px 0;font-size:12px;line-height:1.4;color:#9ca3af;">Por motivos de seguridad: no compartas este correo ni reenvíes el enlace.</p>
        </td></tr>
        <tr><td style="padding:24px 40px 36px 40px;">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 22px 0;"/>
          <p style="margin:0;font-size:11px;line-height:1.5;color:#9ca3af;text-align:center;">© ${new Date().getFullYear()} Choucair. Todos los derechos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        attachments: hasLogo ? [{ filename: 'LogoChoucair.png', path: logoDiskPath, cid: 'logoChoucair' }] : []
      });
      await emitTelemetry('email.sent', { emailType:'password_reset', success:true, durationMs: stop() });
    } else {
      await emitTelemetry('email.sent', { emailType:'password_reset', success:false, durationMs: stop(), error:'smtp_not_configured' });
    }
    return res.json({ ok: true });
  } catch (e: any) {
    await emitTelemetry('email.sent', { emailType:'password_reset', success:false, durationMs: stop(), error: e?.message });
    return res.status(500).json({ error: e?.message || 'Error al solicitar recuperación' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    let { email, token, password } = (req.body || {}) as { email?: string; token?: string; password?: string };
    if (!token || !password) return res.status(400).json({ error: 'Faltan parámetros' });
    const normEmail = email?.trim().toLowerCase();

    let user = normEmail
      ? await User.findOne({ email: normEmail, resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } })
      : null;

    if (!user) {
      // Fallback: buscar solo por token válido (permite reset aunque el email param falte o esté mal)
      user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
    }

    if (!user) return res.status(400).json({ error: 'Token inválido o expirado' });

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Error al restablecer contraseña' });
  }
}

// ---------- Email verification (ELIMINADO) ----------
// Se ha eliminado la funcionalidad de verificación de correo por ahora.
// Mantener campos en el esquema permite una futura reactivación sin migración.
// export async function requestEmailVerification() { /* removed */ }
// export async function verifyEmail() { /* removed */ }

export async function myPermissions(req: Request, res: Response) {
  try {
    const u = req.user as AuthUser | undefined;
    if(!u) return res.status(401).json({ error: 'No autenticado' });
    // Cargar permisos efectivos incluyendo overrides de usuario reutilizando lógica del middleware
    let getUserEffective: any;
    try {
      // dynamic import to avoid circular
      ({ getUserEffectivePermissions: getUserEffective } = await import('../middleware/auth.js'));
    } catch {
      getUserEffective = null;
    }
    let perms: string[] = [];
    if (getUserEffective) {
      try { perms = await getUserEffective(u); } catch { perms = []; }
    } else {
      // fallback previo (solo por rol)
      perms = await effectivePermissionsForRole(u.role);
    }
    return res.json({ ok: true, role: u.role, permissions: perms });
  } catch(e:any){
    return res.status(500).json({ error: 'No se pudieron obtener permisos', detail: e?.message });
  }
}

/** PATCH /api/auth/me/password
 *  Permite al usuario autenticado cambiar su propia contraseña.
 *  No disponible para usuarios SSO (su contraseña se gestiona en Datalake). */
export async function changePassword(req: Request, res: Response) {
  const stop = hrTimer();
  try {
    const u = req.user;
    if (!u) return res.status(401).json({ error: 'No autenticado' });

    const { currentPassword, newPassword } = (req.body || {}) as {
      currentPassword?: string; newPassword?: string;
    };
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Faltan campos (currentPassword, newPassword)' });
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });

    const dbUser = await User.findById(u._id);
    if (!dbUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    if ((dbUser as any).authMethod === 'sso') {
      return res.status(403).json({
        error: 'Los usuarios SSO no pueden cambiar su contraseña desde aquí. Usar la plataforma corporativa Datalake.',
      });
    }

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    dbUser.passwordHash = await bcrypt.hash(newPassword, 10);
    await dbUser.save();

    await emitTelemetry('auth_password_changed', { userId: String(dbUser._id), durationMs: stop() });
    return res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Error al cambiar contraseña' });
  }
}

// ─── SSO Proxy ────────────────────────────────────────────────────────────────
// Estas funciones pasan las peticiones al servidor corporativo Datalake desde el
// backend (server-to-server), evitando el bloqueo CORS del navegador.

const SSO_BASE = () => (process.env.SSO_BASE_URL || 'http://172.17.46.159:9080').replace(/\/$/, '');
const SSO_LOGIN_PATH = () => process.env.SSO_LOGIN_PATH || '/datalake/login';
const SSO_AUTHORIZE_PATH = () => process.env.SSO_AUTHORIZE_PATH || '/datalake/api/authorize';const SSO_ALLOWED_DOMAIN = () => (process.env.SSO_ALLOWED_DOMAIN || 'choucairtesting.com').toLowerCase();
/** POST /api/auth/sso-login
 *  Recibe {strUser, strPass, bitRecordar} desde el front, llama a Datalake
 *  internamente y crea sesión local (cookie JWT) si tiene éxito. */
export async function ssoLogin(req: Request, res: Response) {
  const stop = hrTimer();
  try {
    const { strUser, strPass, bitRecordar } = (req.body || {}) as {
      strUser?: string; strPass?: string; bitRecordar?: boolean;
    };
    if (!strUser || !strPass)
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

    // Validar dominio: solo se permite acceso con correo empresarial
    const SSO_DOMAIN = SSO_ALLOWED_DOMAIN();
    if (strUser.includes('@') && !strUser.toLowerCase().endsWith(`@${SSO_DOMAIN}`)) {
      return res.status(403).json({ error: `Solo se permite el acceso con correo empresarial (@${SSO_DOMAIN})` });
    }

    const loginUrl = `${SSO_BASE()}${SSO_LOGIN_PATH()}`;

    // 1) Login en Datalake (server-to-server, sin CORS)
    // Datalake responde: { error: false, data: "<JWT>" }
    // El JWT contiene: strNombre, strApellidos, strEmail — toda la info del usuario.
    let datalakeJwt = '';
    try {
      const loginRes = await axios.post(
        loginUrl,
        { strUser: strUser.trim(), strPass, bitRecordar: !!bitRecordar, strApp: 'MAXTIME' },
        {
          timeout: 12000,
          maxRedirects: 5,
          validateStatus: (s) => s < 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (loginRes.status >= 400) {
        const msg = loginRes.data?.msg || loginRes.data?.message || 'Credenciales incorrectas';
        return res.status(401).json({ error: msg });
      }
      // Datalake devuelve HTTP 200 con { error: true } cuando las credenciales son incorrectas
      if (loginRes.data?.error === true) {
        const msg = loginRes.data?.msg || loginRes.data?.message || 'Credenciales incorrectas';
        return res.status(401).json({ error: msg });
      }
      // El JWT viene en data.data
      datalakeJwt = loginRes.data?.data || '';
      if (!datalakeJwt) {
        console.error('[sso-login] Respuesta inesperada de Datalake:', JSON.stringify(loginRes.data)?.slice(0, 300));
        return res.status(502).json({ error: 'Respuesta inesperada del servidor SSO' });
      }
    } catch (loginErr: any) {
      console.error('[sso-login] Error llamando al SSO:', loginErr?.message);
      const status = loginErr?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }
      return res.status(502).json({ error: 'No se pudo conectar al servidor SSO. Verifica la VPN.' });
    }

    // 2) Extraer datos del usuario desde el JWT de Datalake
    // El JWT ya es la prueba de autenticación — Datalake lo firma solo si las credenciales son válidas.
    let jwtPayload: any = {};
    try {
      const payloadBase64 = datalakeJwt.split('.')[1];
      if (payloadBase64) {
        const decoded = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        jwtPayload = JSON.parse(decoded);
        console.log('[sso-login] JWT payload keys:', Object.keys(jwtPayload));
      }
    } catch (jwtErr) {
      console.warn('[sso-login] No se pudo decodificar el JWT — usando strUser como fallback');
    }

    // 3) Construir perfil a partir del payload del JWT
    // Campos conocidos de Datalake: strEmail, strNombre, strApellidos
    const strUserNorm = strUser.trim().toLowerCase();
    const rawEmail: string = jwtPayload?.strEmail || jwtPayload?.email || jwtPayload?.correo || '';
    let email: string;
    if (rawEmail.includes('@')) {
      email = rawEmail.toLowerCase();
    } else if (strUserNorm.includes('@')) {
      email = strUserNorm;
    } else {
      email = `${strUserNorm}@${SSO_DOMAIN}`;
    }

    // Nombre completo: strNombre + strApellidos (campos de Datalake)
    const firstName: string  = jwtPayload?.strNombre    || jwtPayload?.name        || '';
    const lastName: string   = jwtPayload?.strApellidos || jwtPayload?.lastName    || '';
    const emailUsername = email.split('@')[0];
    const defaultName = emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
    const name: string = firstName
      ? `${firstName}${lastName ? ' ' + lastName : ''}`.trim()
      : (jwtPayload?.fullName || jwtPayload?.displayName || defaultName);

    console.log('[sso-login] email:', email, '| name:', name);

    // Validar dominio del email resuelto
    if (!email.endsWith(`@${SSO_DOMAIN}`)) {
      console.warn('[sso-login] dominio inválido:', email);
      return res.status(403).json({ error: `Solo se permite acceso con cuentas de @${SSO_DOMAIN}` });
    }

    // Construir el perfil SSO con todos los campos disponibles del JWT de Datalake
    // strRolApp se guarda para futura asignación automática de permisos por cargo
    const ssoProfile = {
      usuario:           jwtPayload?.strUsuario           || undefined,
      cargo:             jwtPayload?.strCargo             || undefined,
      area:              jwtPayload?.strArea              || undefined,
      rolApp:            jwtPayload?.strRolApp            || undefined,
      ccosto:            jwtPayload?.strCcosto            || undefined,
      ccostoResponsable: jwtPayload?.strCcostoResponsable || undefined,
      uen:               jwtPayload?.strUEN               || undefined,
      paisNomina:        jwtPayload?.strPaisNomina        || undefined,
      ciudadNomina:      jwtPayload?.strCiudadNomina      || undefined,
    };

    // El cargo del Datalake se guarda también en title para mostrarlo en el perfil
    const titleFromDatalake: string | undefined = jwtPayload?.strCargo || undefined;

    // 4) Buscar o auto-crear usuario local
    let localUser = await User.findOne({ email });
    if (!localUser) {
      localUser = new User({
        name,
        email,
        // Contraseña aleatoria: este usuario solo puede autenticar por SSO
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        role: 'cliente' as UserRole,  // Los usuarios SSO ingresan como clientes por defecto
        authMethod: 'sso',
        title: titleFromDatalake,
        ssoProfile,
        isActive: true,
      });
      await localUser.save();
      console.log('[sso-login] auto-created local user:', email, 'role=cliente, cargo=', ssoProfile.cargo);
    } else {
      // Sincronizar datos en cada login SSO (el JWT de Datalake siempre tiene la info más reciente)
      const GENERIC_NAMES = /^(admin|user|usuario|test|demo|guest|invitado)$/i;
      if (firstName) {
        localUser.name = name;
      } else if (!localUser.name || GENERIC_NAMES.test(localUser.name.trim())) {
        localUser.name = name;
      }
      // Siempre actualizar el perfil SSO y el título desde Datalake
      (localUser as any).ssoProfile = ssoProfile;
      if (titleFromDatalake) localUser.title = titleFromDatalake;
      if ((localUser as any).authMethod !== 'sso') (localUser as any).authMethod = 'sso';
      await localUser.save();
      console.log('[sso-login] synced ssoProfile for', email, '| cargo=', ssoProfile.cargo, '| rolApp=', ssoProfile.rolApp);
    }

    const userId: string = (localUser as any).id ?? String((localUser as any)._id);
    const token = signToken({ _id: userId, name: localUser.name, email: localUser.email, role: localUser.role });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: IN_PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    let perms: string[] = [];
    try {
      const { getUserEffectivePermissions } = await import('../middleware/auth.js');
      perms = await getUserEffectivePermissions({ _id: userId, role: localUser.role, name: localUser.name, email: localUser.email } as any);
    } catch { perms = []; }

    await emitTelemetry('auth_sso_login_ok', { userId, role: localUser.role, durationMs: stop() });
    console.log('[sso-login] success for', email, 'role=', localUser.role);
    return res.json({ ok: true, user: { _id: userId, name: localUser.name, email: localUser.email, role: localUser.role, permissions: perms } });
  } catch (e: any) {
    await emitTelemetry('auth_sso_login_fail', { durationMs: stop(), error: e?.message });
    console.error('[sso-login] unexpected error:', e);
    return res.status(500).json({ error: e?.message || 'Error en SSO' });
  }
}

/** GET /api/auth/sso-authorize
 *  Verifica si el usuario ya tiene una sesión activa en Datalake.
 *  El frontend envía la cookie de Datalake (si existe) en la cabecera Cookie
 *  a través de un parámetro; esto no requiere credentials para ser útil. */
export async function ssoAuthorize(req: Request, res: Response) {
  try {
    const authorizeUrl = `${SSO_BASE()}${SSO_AUTHORIZE_PATH()}`;
    const cookieFwd = req.headers['x-sso-cookie'] as string | undefined;
    try {
      const authRes = await axios.get(authorizeUrl, {
        timeout: 8000,
        validateStatus: (s) => s < 500,
        headers: cookieFwd ? { Cookie: cookieFwd } : {},
      });
      if (authRes.status === 200)
        return res.json({ ok: true, data: authRes.data });
      return res.status(authRes.status).json({ ok: false });
    } catch (e: any) {
      return res.status(502).json({ ok: false, error: e?.message });
    }
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message });
  }
}
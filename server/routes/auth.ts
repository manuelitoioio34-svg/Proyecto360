// server/routes/auth.ts

// Rutas de autenticación: registro, login, logout, recuperación de contraseña y consulta de permisos del usuario autenticado. Utiliza JWT para manejo de sesiones y cookies para almacenamiento del token. Requiere validación de datos de entrada y protección de rutas sensibles.
import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { register, login, me, logout, requestPasswordReset, resetPassword, myPermissions, ssoLogin, ssoAuthorize, changePassword } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Asegura cookies disponibles
router.use(cookieParser());

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);
router.post('/auth/logout', logout);
router.get('/auth/permissions', requireAuth, myPermissions);
router.patch('/auth/me/password', requireAuth, changePassword);

// SSO proxy (no requiere auth previa — es el método de autenticación)
router.post('/auth/sso-login', ssoLogin);
router.get('/auth/sso-authorize', ssoAuthorize);

// Recovery
router.post('/auth/request-password-reset', requestPasswordReset);
router.post('/auth/reset-password', resetPassword);

export default router;
// server/controllers/adminUsers.controller.ts
// User management: list, update, delete.
import type { Request, Response } from 'express';
import User, { type UserRole } from '../database/user.js';
import RoleAudit from '../database/roleAudit.js';
import crypto from 'crypto';
import { invalidateUserPermissionsCache } from '../middleware/auth.js';
import { pushLog } from '../utils/adminBuffer.js';

export async function listUsers(_req: Request, res: Response) {
  try {
    const docs = await User.find(
      {},
      { name: 1, email: 1, role: 1, isActive: 1, createdAt: 1, updatedAt: 1, userOverrides: 1 }
    ).sort({ createdAt: -1 }).lean();
    return res.json(docs);
  } catch (e: any) {
    pushLog({ level: 'error', message: 'listUsers failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'Error listando usuarios' });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, role, isActive, resetPassword } = req.body || {};
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const prevRole = user.role || null;
    if (typeof name === 'string' && name.trim()) user.name = name.trim().slice(0, 120);
    let roleChanged = false;
    if (typeof role === 'string' && role !== user.role) {
      const allowedRoles: UserRole[] = ['admin', 'tecnico', 'operario', 'cliente'];
      if (!allowedRoles.includes(role as UserRole)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      user.role = role as UserRole;
      roleChanged = true;
    }
    let statusChanged = false;
    let previousStatus: string | null = null;
    let newStatus: string | null = null;
    if (typeof isActive === 'boolean' && user.isActive !== isActive) {
      previousStatus = user.isActive ? 'cliente' : 'desactivado';
      user.isActive = isActive;
      newStatus = isActive ? 'cliente' : 'desactivado';
      statusChanged = true;
    }
    let tempPassword: string | undefined;
    if (resetPassword === true) {
      tempPassword = crypto.randomBytes(5).toString('hex');
      (user as any).password = tempPassword;
    }
    await user.save();
    if (roleChanged) {
      void RoleAudit.create({
        ts: new Date(),
        targetUserId: user._id,
        targetUserName: user.name || null,
        previousRole: prevRole,
        newRole: user.role,
        changedById: (req.user as any)?._id,
        changedByName: (req.user as any)?.name || null,
      }).catch(() => { });
      pushLog({ level: 'info', message: 'role_changed', context: { target: user._id, previousRole: prevRole, newRole: user.role, by: req.user?._id } });
    }
    if (statusChanged) {
      void RoleAudit.create({
        ts: new Date(),
        targetUserId: user._id,
        targetUserName: user.name || null,
        previousRole: previousStatus,
        newRole: newStatus,
        changedById: (req.user as any)?._id,
        changedByName: (req.user as any)?.name || null,
        note: isActive ? 'activado' : 'desactivado',
      }).catch(() => { });
      pushLog({ level: 'info', message: 'status_changed', context: { target: user._id, isActive, by: req.user?._id } });
    }
    // Invalidate cache when role or active status changes
    if (roleChanged || statusChanged) {
      invalidateUserPermissionsCache(String(user._id));
    }
    return res.json({ ok: true, roleChanged, tempPassword });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'updateUser failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo actualizar usuario' });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = (req.body || {}) as { reason?: string };
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const allowedReasons = ['baja_voluntaria', 'inactividad', 'duplicado', 'fraude', 'otro'];
    const reasonSafe = reason && allowedReasons.includes(reason) ? reason : 'otro';
    const prevRole = user.role || null;
    const name = user.name || null;
    await User.deleteOne({ _id: user._id });
    pushLog({ level: 'warn', message: 'user_deleted', context: { target: user._id, by: req.user?._id, reason: reasonSafe } });
    try {
      await RoleAudit.create({
        ts: new Date(),
        targetUserId: user._id,
        targetUserName: name,
        previousRole: prevRole,
        newRole: prevRole,
        changedById: (req.user as any)?._id,
        changedByName: (req.user as any)?.name || null,
        note: `delete:${reasonSafe}`,
      });
    } catch { }
    return res.json({ ok: true, deleted: true, reason: reasonSafe });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'deleteUser failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo eliminar usuario' });
  }
}

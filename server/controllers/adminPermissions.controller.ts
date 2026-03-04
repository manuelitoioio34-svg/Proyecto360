// server/controllers/adminPermissions.controller.ts
// Role-level and per-user permission management.
import type { Request, Response } from 'express';
import RoleAudit from '../database/roleAudit.js';
import RolePermissions from '../database/rolePermissions.js';
import User from '../database/user.js';
import { PERMISSION_KEYS, defaultsForRole } from '../utils/permissionsCatalog.js';
import { invalidateRolePermissionsCache, invalidateUserPermissionsCache } from '../middleware/auth.js';
import { pushLog } from '../utils/adminBuffer.js';

// ---- Role audit ----

export async function getRoleAudit(req: Request, res: Response) {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const rows = await RoleAudit.find({ ts: { $gte: since } })
      .sort({ ts: -1 })
      .limit(limit)
      .lean();
    return res.json({
      range: { from: since.toISOString(), to: new Date().toISOString(), days },
      total: rows.length,
      items: rows.map(r => ({
        ts: (r.ts as any).toISOString?.() || String(r.ts),
        targetUserId: r.targetUserId,
        targetUserName: (r as any).targetUserName || null,
        previousRole: r.previousRole,
        newRole: r.newRole,
        changedById: r.changedById,
        changedByName: (r as any).changedByName || null,
        note: (r as any).note || null,
      })),
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudo obtener auditoría', detail: e?.message });
  }
}

export async function createRoleAudit(req: Request, res: Response) {
  try {
    const { targetUserId, targetUserName, previousRole, newRole, note, changedById, changedByName } = req.body || {};
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId requerido' });
    await RoleAudit.create({
      ts: new Date(),
      targetUserId,
      targetUserName: targetUserName || null,
      previousRole: previousRole || null,
      newRole: newRole || null,
      changedById: changedById || (req.user as any)?._id || null,
      changedByName: changedByName || (req.user as any)?.name || null,
      note: note || null,
    });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudo registrar auditoría', detail: e?.message });
  }
}

// ---- Permissions catalog ----

export async function getPermissionsCatalog(_req: Request, res: Response) {
  try {
    const { PERMISSIONS_CATALOG } = require('../utils/permissionsCatalog.js');
    return res.json({ items: PERMISSIONS_CATALOG });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudo cargar catálogo', detail: e?.message });
  }
}

// ---- Role permissions ----

export async function getRolePermissions(req: Request, res: Response) {
  try {
    const role = String(req.params.role || '').trim();
    if (!role) return res.status(400).json({ error: 'role requerido' });
    const doc = await RolePermissions.findOne({ role }).lean();
    if (doc) return res.json({ role, permissions: doc.permissions, persisted: true });
    return res.json({ role, permissions: defaultsForRole(role), persisted: false });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudieron obtener permisos', detail: e?.message });
  }
}

export async function upsertRolePermissions(req: Request, res: Response) {
  try {
    const role = String(req.params.role || '').trim();
    console.log('[perms][upsert] start role=%s body=%o', role, req.body);
    if (!role) return res.status(400).json({ error: 'role requerido' });
    if (role === 'admin') return res.status(400).json({ error: 'Rol admin no editable' });
    const input: unknown = req.body?.permissions;
    if (!Array.isArray(input)) return res.status(400).json({ error: 'permissions debe ser array' });
    const unique = Array.from(new Set(input.map(p => String(p))));
    for (const k of unique) {
      if (!PERMISSION_KEYS.has(k)) {
        console.warn('[perms][upsert] invalid key=%s role=%s', k, role);
        return res.status(400).json({ error: 'Permiso inválido', permission: k });
      }
    }
    const essential = ['security.view_basic'];
    if (['tecnico', 'operario', 'cliente'].includes(role) && !essential.every(e => unique.includes(e))) {
      console.warn('[perms][upsert] missing essential %o for role=%s', essential.filter(e => !unique.includes(e)), role);
      return res.status(400).json({
        error: 'Faltan permisos esenciales',
        essentialMissing: essential.filter(e => !unique.includes(e)),
      });
    }
    const now = new Date();
    const prev = await RolePermissions.findOne({ role });
    let added: string[] = [], removed: string[] = [], saved: any;
    if (prev) {
      added = unique.filter(p => !prev.permissions.includes(p));
      removed = prev.permissions.filter(p => !unique.includes(p));
      prev.permissions = unique;
      prev.updatedAt = now;
      prev.updatedBy = (req.user as any)?._id || null;
      prev.version = (prev.version || 1) + 1;
      saved = await prev.save();
    } else {
      added = unique;
      saved = await RolePermissions.create({
        role, permissions: unique, updatedAt: now,
        updatedBy: (req.user as any)?._id || null, version: 1,
      });
    }
    console.log('[perms][upsert] persisted role=%s added=%d removed=%d version=%s', role, added.length, removed.length, saved.version);
    if (added.length || removed.length) {
      try {
        await RoleAudit.create({
          ts: now,
          targetUserId: (req.user as any)?._id,
          targetUserName: (req.user as any)?.name || null,
          previousRole: role, newRole: role,
          changedById: (req.user as any)?._id,
          changedByName: (req.user as any)?.name || null,
          note: `perm_update: +${added.length} -${removed.length}`,
        });
      } catch { }
      invalidateRolePermissionsCache(role);
    }
    return res.json({ ok: true, role, permissions: saved.permissions, added, removed, version: saved.version });
  } catch (e: any) {
    console.error('[perms][upsert] error role=%s err=%s stack=%s', req.params.role, e?.message, e?.stack);
    return res.status(500).json({ error: 'No se pudo actualizar permisos', detail: e?.message });
  }
}

export async function resetRolePermissions(req: Request, res: Response) {
  try {
    const role = String(req.params.role || '').trim();
    if (!role) return res.status(400).json({ error: 'role requerido' });
    if (role === 'admin') return res.status(400).json({ error: 'Rol admin no editable' });
    const defaults = defaultsForRole(role);
    const now = new Date();
    const doc = await RolePermissions.findOneAndUpdate(
      { role },
      { $set: { permissions: defaults, updatedAt: now, updatedBy: (req.user as any)?._id || null }, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    try {
      await RoleAudit.create({
        ts: now,
        targetUserId: (req.user as any)?._id, targetUserName: (req.user as any)?.name || null,
        previousRole: role, newRole: role,
        changedById: (req.user as any)?._id, changedByName: (req.user as any)?.name || null,
        note: 'perm_reset',
      });
    } catch { }
    invalidateRolePermissionsCache(role);
    return res.json({ ok: true, role, permissions: doc.permissions, version: doc.version, reset: true });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudo resetear permisos', detail: e?.message });
  }
}

export async function listAllRolePermissions(_req: Request, res: Response) {
  try {
    const roles = ['admin', 'tecnico', 'operario', 'cliente'];
    const docs = await RolePermissions.find({ role: { $in: roles } }).lean();
    const map = new Map<string, string[]>();
    for (const d of docs) map.set(d.role, d.permissions as string[]);
    const out = roles.map(r => ({
      role: r,
      permissions: r === 'admin' ? Array.from(PERMISSION_KEYS) : (map.get(r) || defaultsForRole(r)),
      persisted: map.has(r),
    }));
    return res.json({ items: out });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudieron listar permisos', detail: e?.message });
  }
}

export async function listRawRolePermissions(_req: Request, res: Response) {
  try {
    const docs = await RolePermissions.find({}).lean();
    return res.json({ total: docs.length, items: docs });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudo listar role_permissions', detail: e?.message });
  }
}

// ---- Per-user permission overrides ----

const HISTORY_PERMS = ['security.view_history', 'performance.view_history'];

function ensureArrays(obj: any) {
  if (!obj.userOverrides) obj.userOverrides = { allow: [], deny: [] };
  if (!Array.isArray(obj.userOverrides.allow)) obj.userOverrides.allow = [];
  if (!Array.isArray(obj.userOverrides.deny)) obj.userOverrides.deny = [];
}

export async function grantUserHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    ensureArrays(user as any);
    let changed = false;
    for (const p of HISTORY_PERMS) {
      if (!(user as any).userOverrides.allow.includes(p)) { (user as any).userOverrides.allow.push(p); changed = true; }
      const denyIdx = (user as any).userOverrides.deny.indexOf(p);
      if (denyIdx >= 0) { (user as any).userOverrides.deny.splice(denyIdx, 1); changed = true; }
    }
    if (changed) await user.save();
    invalidateUserPermissionsCache(String(user._id));
    pushLog({ level: 'info', message: 'user_history_granted', context: { target: user._id, by: req.user?._id } });
    try {
      await RoleAudit.create({
        ts: new Date(), targetUserId: user._id, targetUserName: user.name || null,
        previousRole: user.role, newRole: user.role,
        changedById: (req.user as any)?._id, changedByName: (req.user as any)?.name || null,
        note: 'user_override:+history',
      });
    } catch { }
    return res.json({ ok: true, overrides: (user as any).userOverrides });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'grantUserHistory failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo conceder histórico' });
  }
}

export async function revokeUserHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    ensureArrays(user as any);
    let changed = false;
    for (const p of HISTORY_PERMS) {
      const allowIdx = (user as any).userOverrides.allow.indexOf(p);
      if (allowIdx >= 0) { (user as any).userOverrides.allow.splice(allowIdx, 1); changed = true; }
      if (!(user as any).userOverrides.deny.includes(p)) { (user as any).userOverrides.deny.push(p); changed = true; }
    }
    if (changed) await user.save();
    invalidateUserPermissionsCache(String(user._id));
    pushLog({ level: 'info', message: 'user_history_revoked', context: { target: user._id, by: req.user?._id } });
    try {
      await RoleAudit.create({
        ts: new Date(), targetUserId: user._id, targetUserName: user.name || null,
        previousRole: user.role, newRole: user.role,
        changedById: (req.user as any)?._id, changedByName: (req.user as any)?.name || null,
        note: 'user_override:-history',
      });
    } catch { }
    return res.json({ ok: true, overrides: (user as any).userOverrides });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'revokeUserHistory failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo revocar histórico' });
  }
}

export async function updateUserOverrides(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { permission, action } = req.body || {};
    if (typeof permission !== 'string' || !permission.trim()) return res.status(400).json({ error: 'permission requerido' });
    if (!['allow', 'deny', 'clear'].includes(action)) return res.status(400).json({ error: 'action inválida' });
    if (!PERMISSION_KEYS.has(permission)) return res.status(400).json({ error: 'Permiso desconocido', permission });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.role === 'admin') return res.status(400).json({ error: 'No se gestionan overrides para admin' });

    if (!(user as any).userOverrides) (user as any).userOverrides = { allow: [], deny: [] };
    if (!Array.isArray((user as any).userOverrides.allow)) (user as any).userOverrides.allow = [];
    if (!Array.isArray((user as any).userOverrides.deny)) (user as any).userOverrides.deny = [];

    const allow: string[] = (user as any).userOverrides.allow;
    const deny: string[] = (user as any).userOverrides.deny;
    let changed = false;

    const rem = (arr: string[], p: string) => { const i = arr.indexOf(p); if (i >= 0) { arr.splice(i, 1); return true; } return false; };
    const addUnique = (arr: string[], p: string) => { if (!arr.includes(p)) { arr.push(p); return true; } return false; };

    if (action === 'allow') { changed = addUnique(allow, permission) || changed; changed = rem(deny, permission) || changed; }
    else if (action === 'deny') { changed = addUnique(deny, permission) || changed; changed = rem(allow, permission) || changed; }
    else if (action === 'clear') { changed = rem(allow, permission) || changed; changed = rem(deny, permission) || changed; }

    if (changed) await user.save();
    invalidateUserPermissionsCache(String(user._id));
    pushLog({ level: 'info', message: 'user_override_changed', context: { target: user._id, perm: permission, action, by: req.user?._id } });
    try {
      await RoleAudit.create({
        ts: new Date(), targetUserId: user._id, targetUserName: user.name || null,
        previousRole: user.role, newRole: user.role,
        changedById: (req.user as any)?._id, changedByName: (req.user as any)?.name || null,
        note: `override:${action}:${permission}`,
      });
    } catch { }
    return res.json({ ok: true, changed, overrides: (user as any).userOverrides });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'updateUserOverrides failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo actualizar override' });
  }
}

export async function getUserEffectivePermissionsAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await User.findById(id, { role: 1, userOverrides: 1, email: 1, name: 1 }).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    let helper: any;
    try { ({ getUserEffectivePermissions: helper } = await import('../middleware/auth.js')); } catch { helper = null; }
    let perms: string[] = [];
    if (helper) {
      perms = await helper({ _id: String(user._id), role: user.role, name: user.name || '', email: user.email || '' } as any);
    } else {
      perms = defaultsForRole(user.role);
      if (user.userOverrides) {
        const allow = Array.isArray((user as any).userOverrides.allow) ? (user as any).userOverrides.allow : [];
        const deny = Array.isArray((user as any).userOverrides.deny) ? (user as any).userOverrides.deny : [];
        perms = Array.from(new Set([...perms, ...allow])).filter(p => !deny.includes(p));
      }
    }
    return res.json({
      ok: true,
      user: { _id: user._id, role: user.role, name: user.name, email: user.email },
      overrides: user.userOverrides || { allow: [], deny: [] },
      effective: perms,
    });
  } catch (e: any) {
    pushLog({ level: 'error', message: 'getUserEffectivePermissionsAdmin failed', context: { error: e?.message } });
    return res.status(500).json({ error: 'No se pudo calcular permisos efectivos' });
  }
}

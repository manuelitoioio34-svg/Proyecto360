// server/controllers/admin.controller.ts
// Barrel re-export — keeps existing imports in routes/admin.ts and server/index.ts working.
export { recordVisit, logRequest } from '../utils/adminBuffer.js';
export { listUsers, updateUser, deleteUser } from './adminUsers.controller.js';
export {
  getLogs, getTelemetry, trackTelemetry,
  clearLogs, clearTelemetry, getTelemetrySummary, getLogSummary,
} from './adminTelemetry.controller.js';
export {
  getRoleAudit, createRoleAudit, getPermissionsCatalog,
  getRolePermissions, upsertRolePermissions, resetRolePermissions,
  listAllRolePermissions, listRawRolePermissions,
  grantUserHistory, revokeUserHistory, updateUserOverrides,
  getUserEffectivePermissionsAdmin,
} from './adminPermissions.controller.js';
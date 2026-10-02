import { cookies } from 'next/headers';
import type { AdminPermission } from '@/lib/types';
import { allAdminPermissions, hasPermission } from './adminPermissions';
import { readSession } from './security';
import { ensureStoreReady, store } from './store';

export async function getAdminSession() {
  const token = (await cookies()).get('lot_admin_session')?.value;
  const session = readSession(token);
  if (session?.role !== 'admin') return undefined;
  await ensureStoreReady();
  const envEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const databaseUser = store.adminUsers.find(item => item.email.toLowerCase() === session.sub && item.active);
  if (session.sub === envEmail) {
    return {
      id: databaseUser?.id,
      email: session.sub,
      name: session.name || 'Super admin',
      roleId: 'role_super_admin',
      roleName: 'Super admin',
      permissions: allAdminPermissions,
      superAdmin: true,
    };
  }
  const user = databaseUser;
  const role = user ? store.adminRoles.find(item => item.id === user.roleId) : undefined;
  if (!user || !role) return undefined;
  return {
    id: user.id,
    email: user.email,
    name: user.fullName,
    roleId: role.id,
    roleName: role.name,
    permissions: role.permissions,
    superAdmin: role.permissions.length === allAdminPermissions.length && allAdminPermissions.every(permission => role.permissions.includes(permission)),
  };
}

export async function isAdmin() {
  return Boolean(await getAdminSession());
}

export async function canAdmin(permission: AdminPermission) {
  const admin = await getAdminSession();
  return Boolean(admin && hasPermission(admin.permissions, permission));
}

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await getAdminSession();
  if (!admin) return { ok: false as const, status: 401, error: 'Authentication required.' };
  if (!hasPermission(admin.permissions, permission)) return { ok: false as const, status: 403, error: 'This admin role does not have permission for this action.' };
  return { ok: true as const, admin };
}

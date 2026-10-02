import type { AdminPermission, AdminRoleRecord } from '@/lib/types';

export const allAdminPermissions: AdminPermission[] = [
  'dashboard.view',
  'events.view',
  'events.manage',
  'content.manage',
  'applications.view',
  'applications.manage',
  'finance.view',
  'donations.view',
  'donations.manage',
  'registrations.view',
  'registrations.manage',
  'tickets.view',
  'tickets.download',
  'tickets.scan',
  'scan_logs.view',
  'scan_logs.export',
  'ticket_security.view',
  'members.view',
  'members.manage',
  'attendance.view',
  'invitations.manage',
  'audit.view',
  'roles.manage',
  'sponsorship.view',
  'sponsorship.manage',
  'sponsorship.finance',
];

export const defaultAdminRoles: AdminRoleRecord[] = [
  {
    id: 'role_super_admin',
    name: 'Super admin',
    description: 'Full control over the platform, permissions, roles, users, content, finance, and scanning.',
    permissions: allAdminPermissions,
    system: true,
    createdAt: '2026-07-23T00:00:00+01:00',
  },
  {
    id: 'role_scanner',
    name: 'Scanner',
    description: 'Door access only. Can scan tickets and mark valid tickets as used.',
    permissions: ['events.view', 'tickets.view', 'tickets.scan'],
    system: true,
    createdAt: '2026-07-23T00:00:00+01:00',
  },
  {
    id: 'role_finance_respo',
    name: 'Finance respo',
    description: 'Can review applications and contribution totals without changing member records.',
    permissions: ['dashboard.view', 'applications.view', 'finance.view'],
    system: true,
    createdAt: '2026-07-23T00:00:00+01:00',
  },
  {
    id: 'role_rh_respo',
    name: 'RH respo',
    description: 'Can manage member roles, member state, attendance, and event invitations.',
    permissions: ['dashboard.view', 'members.view', 'members.manage', 'attendance.view', 'registrations.view', 'invitations.manage'],
    system: true,
    createdAt: '2026-07-23T00:00:00+01:00',
  },
];

export function hasPermission(permissions: readonly AdminPermission[], permission: AdminPermission) {
  return permissions.includes(permission);
}

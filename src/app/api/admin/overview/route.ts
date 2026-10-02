import { NextResponse } from 'next/server';
import { hasPermission } from '@/server/adminPermissions';
import { getAdminSession } from '@/server/adminAuth';
import { ensureStoreReady, store } from '@/server/store';
import { hasCurrentMembership } from '@/features/membership/access';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  await ensureStoreReady();
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(admin.permissions, permission);
  const canSeeApplications = can('applications.view') || can('applications.manage');
  const canSeeRegistrations = can('registrations.view') || can('registrations.manage') || can('tickets.scan') || can('attendance.view');
  const canSeeMembers = can('members.view') || can('members.manage');
  const canSeeEvents = can('events.view') || can('events.manage') || can('tickets.scan') || can('scan_logs.view') || canSeeRegistrations;
  const safeAdminUsers = can('roles.manage') ? store.adminUsers.map(user => { const safe = { ...user } as Partial<typeof user>; Reflect.deleteProperty(safe, 'passwordHash'); return safe; }) : [];
  return NextResponse.json({
    admin,
    permissions: admin.permissions,
    metrics: {
      members: canSeeMembers ? store.members.filter(member => hasCurrentMembership(member)).length : 0,
      pending: canSeeApplications ? store.applications.filter(application => application.status === 'PENDING').length : 0,
      events: canSeeEvents ? store.events.length : 0,
      publishedEvents: canSeeEvents ? store.events.filter(event => event.status === 'PUBLISHED').length : 0,
      contributions: can('finance.view') ? store.members.reduce((sum, member) => sum + member.totalContributions, 0) : 0,
      applicationContributions: can('finance.view') ? store.applications.reduce((sum, application) => sum + application.contribution, 0) : 0,
      registrations: canSeeRegistrations ? store.registrations.length : 0,
      ticketsUsed: canSeeRegistrations ? store.registrations.filter(item => item.ticketStatus === 'USED').length : 0,
      waitlist: canSeeRegistrations ? store.registrations.filter(item => item.ticketStatus === 'WAITLIST').length : 0,
      posts: can('content.manage') ? store.posts.length : 0,
      gallery: can('content.manage') ? store.gallery.length : 0,
      sponsors: can('content.manage') ? store.sponsors.filter(sponsor => sponsor.active).length : 0,
    },
    applications: canSeeApplications ? store.applications : [],
    members: canSeeMembers ? store.members.map(member => { const safe = { ...member } as Partial<typeof member>; Reflect.deleteProperty(safe, 'passwordHash'); return safe; }) : [],
    invitations: can('invitations.manage') ? store.invitations : [],
    audit: can('audit.view') ? store.audit.slice(0, 100) : [],
    events: canSeeEvents ? store.events : [],
    ticketTypes: canSeeEvents ? store.ticketTypes : [],
    posts: can('content.manage') ? store.posts : [],
    gallery: can('content.manage') ? store.gallery : [],
    sponsors: can('content.manage') ? [...store.sponsors].sort((a, b) => a.sortOrder - b.sortOrder) : [],
    registrations: canSeeRegistrations ? store.registrations : [],
    adminRoles: can('roles.manage') ? store.adminRoles : [],
    adminUsers: safeAdminUsers,
  });
}

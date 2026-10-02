import type { AdminPermission, AdminRoleRecord, AdminUser, AuditEntry, EventInvitation, EventRecord, EventRegistration, GalleryItem, Member, MemberApplication, PostRecord, SponsorRecord, TicketTypeRecord } from '@/lib/types';

export type AdminMetrics = {
  members: number;
  pending: number;
  events: number;
  publishedEvents: number;
  contributions: number;
  registrations: number;
  ticketsUsed: number;
  waitlist: number;
  applicationContributions: number;
  posts: number;
  gallery: number;
  sponsors: number;
};

export type AdminOverview = {
  admin: { id?: string; email: string; name: string; roleId: string; roleName: string; permissions: AdminPermission[]; superAdmin: boolean };
  permissions: AdminPermission[];
  metrics: AdminMetrics;
  applications: MemberApplication[];
  members: Array<Omit<Member, 'passwordHash'>>;
  invitations: EventInvitation[];
  audit: AuditEntry[];
  events: EventRecord[];
  ticketTypes: TicketTypeRecord[];
  posts: PostRecord[];
  gallery: GalleryItem[];
  sponsors: SponsorRecord[];
  registrations: EventRegistration[];
  adminRoles: AdminRoleRecord[];
  adminUsers: Array<Omit<AdminUser, 'passwordHash'>>;
};

export type AdminSection = 'Dashboard' | 'Assistant' | 'Scanner' | 'Scan logs' | 'Scanner access' | 'Ticket security' | 'Events' | 'Ticket types' | 'Posts' | 'Gallery' | 'Sponsors' | 'Applications' | 'Finance' | 'Donations' | 'Registrations' | 'Attendance' | 'Members' | 'Invitations' | 'Roles' | 'Audit log';

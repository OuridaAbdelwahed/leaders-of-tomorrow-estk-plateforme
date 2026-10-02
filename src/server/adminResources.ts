import { z } from 'zod';
import type { AdminPermission, AdminRoleRecord, AdminUser, EventRecord, GalleryItem, PostRecord, SponsorRecord, TicketTypeRecord } from '@/lib/types';
import { createToken, hashPassword, safeId } from './security';
import { allAdminPermissions } from './adminPermissions';
import { logAdminAction, store } from './store';
import { validateMembershipPeriod } from '@/features/membership/access';

export const adminResourceNames = ['events', 'ticket-types', 'posts', 'gallery', 'sponsors', 'applications', 'registrations', 'members', 'admin-roles', 'admin-users'] as const;
export type AdminResourceName = (typeof adminResourceNames)[number];

const localized = z.object({ en: z.string().trim().min(1).max(5000), ar: z.string().trim().min(1).max(5000) });
const imageReference = z.string().trim().max(6_000_000);
const eventSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: localized, summary: localized, location: localized,
  startsAt: z.string().min(1), endsAt: z.string().min(1), deadlineAt: z.string().optional(),
  capacity: z.number().int().min(0).max(100000), registered: z.number().int().min(0).max(100000),
  status: z.enum(['PUBLISHED', 'DRAFT', 'CLOSED']), category: z.string().trim().min(2).max(80),
  coverPath: imageReference.optional(),
});
const ticketTypeSchema = z.object({
  eventId: z.string().trim().min(2).max(64), name: localized,
  description: localized.optional(), price: z.number().min(0).max(1_000_000), quantity: z.number().int().min(1).max(1_000_000).optional(),
  saleStartsAt: z.string().optional(), saleEndsAt: z.string().optional(), validFrom: z.string().optional(), validUntil: z.string().optional(),
  status: z.enum(['ACTIVE', 'HIDDEN', 'SOLD_OUT', 'CANCELLED']),
});
const postSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), category: z.string().trim().min(2).max(80),
  title: localized, excerpt: localized, content: localized, coverPath: imageReference.optional(),
});
const gallerySchema = z.object({ mediaType: z.enum(['PHOTO', 'VIDEO']), filePath: z.string().trim().min(1).max(14_000_000), title: localized });
const sponsorSchema = z.object({
  name: z.string().trim().min(1).max(120), level: z.enum(['GOLD', 'SILVER', 'BRONZE', 'PARTNER']),
  logoPath: imageReference.min(1), websiteUrl: z.string().trim().url().or(z.literal('')).optional(),
  sortOrder: z.number().int().min(0).max(10000), active: z.boolean(),
});
const applicationSchema = z.object({ status: z.enum(['PENDING', 'REJECTED']) });
const permissionSchema = z.enum(allAdminPermissions as [AdminPermission, ...AdminPermission[]]);
const adminRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(240),
  permissions: z.array(permissionSchema).min(1),
});
const adminUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  roleId: z.string().trim().min(2).max(80),
  active: z.boolean(),
});
const memberSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(), email: z.string().trim().email().max(180).or(z.literal('')).optional(),
  phone: z.string().trim().max(40).optional(), city: z.string().trim().max(120).optional(),
  institution: z.string().trim().max(180).optional(), program: z.string().trim().max(180).optional(),
  role: z.enum(['MEMBER', 'TEAM_LEAD', 'BUREAU', 'PRESIDENT']).optional(), badge: z.string().trim().min(2).max(80).optional(),
  membershipStatus: z.enum(['SIMPLE', 'SPECIAL']).optional(),
  membershipStartsAt: z.iso.datetime().nullable().optional(), membershipEndsAt: z.iso.datetime().nullable().optional(),
  badgeImageDataUrl: imageReference.or(z.literal('')).optional(), photoDataUrl: imageReference.or(z.literal('')).optional(),
  quote: z.string().trim().max(220).optional(), bio: z.string().trim().max(1200).optional(),
  website: z.string().trim().url().or(z.literal('')).optional(), skills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  eventsAttended: z.number().int().min(0).max(10000).optional(),
  totalContributions: z.number().min(0).max(1_000_000).optional(), active: z.boolean().optional(),
});

export function isAdminResource(value: string): value is AdminResourceName {
  return (adminResourceNames as readonly string[]).includes(value);
}

function uniqueSlug(resource: 'events' | 'posts', slug: string, exceptId?: string) {
  const list = resource === 'events' ? store.events : store.posts;
  if (list.some(item => item.slug === slug && item.id !== exceptId)) throw new Error('This slug is already in use.');
}

export function createAdminResource(resource: AdminResourceName, input: unknown) {
  const createdAt = new Date().toISOString();
  if (resource === 'events') {
    const value = eventSchema.parse(input); uniqueSlug('events', value.slug);
    const item: EventRecord = { id: safeId('evt'), ...value }; store.events.unshift(item);
    logAdminAction('event.created', item.id, item.title.en); return item;
  }
  if (resource === 'ticket-types') {
    const value = ticketTypeSchema.parse(input);
    if (!store.events.some(event => event.id === value.eventId)) throw new Error('Event not found.');
    const item: TicketTypeRecord = { id: safeId('type'), ...value, createdAt, updatedAt: createdAt };
    store.ticketTypes.push(item); logAdminAction('ticket_type.created', item.id, `${item.name.en} · ${item.eventId}`); return item;
  }
  if (resource === 'posts') {
    const value = postSchema.parse(input); uniqueSlug('posts', value.slug);
    const item: PostRecord = { id: safeId('post'), ...value, createdAt, updatedAt: createdAt }; store.posts.unshift(item);
    logAdminAction('post.created', item.id, item.title.en); return item;
  }
  if (resource === 'gallery') {
    const value = gallerySchema.parse(input); const item: GalleryItem = { id: safeId('media'), ...value, createdAt }; store.gallery.unshift(item);
    logAdminAction('gallery.created', item.id, item.title.en); return item;
  }
  if (resource === 'sponsors') {
    const value = sponsorSchema.parse(input); const item: SponsorRecord = { id: safeId('sponsor'), ...value, websiteUrl: value.websiteUrl || undefined }; store.sponsors.push(item);
    logAdminAction('sponsor.created', item.id, item.name); return item;
  }
  if (resource === 'admin-roles') {
    const value = adminRoleSchema.parse(input);
    const item: AdminRoleRecord = { id: safeId('role'), ...value, createdAt };
    store.adminRoles.push(item);
    logAdminAction('admin_role.created', item.id, item.name); return item;
  }
  if (resource === 'admin-users') {
    const value = adminUserSchema.parse(input);
    if (!store.adminRoles.some(role => role.id === value.roleId)) throw new Error('Admin role not found.');
    if (store.adminUsers.some(user => user.email.toLowerCase() === value.email.toLowerCase())) throw new Error('An admin user already exists for this email.');
    const temporaryPassword = `Lot-Admin-${createToken().slice(0, 10)}!`;
    const item: AdminUser = { id: safeId('admin'), ...value, passwordHash: hashPassword(temporaryPassword), createdAt };
    store.adminUsers.push(item);
    logAdminAction('admin_user.created', item.id, `${item.fullName} · ${item.roleId}`);
    const safe = { ...item, temporaryPassword } as Partial<AdminUser> & { temporaryPassword: string };
    Reflect.deleteProperty(safe, 'passwordHash');
    return safe;
  }
  throw new Error(`Creating ${resource} is not supported from this endpoint.`);
}

export function updateAdminResource(resource: AdminResourceName, id: string, input: unknown) {
  if (resource === 'events') {
    const item = store.events.find(value => value.id === id); if (!item) throw new Error('Event not found.');
    const value = eventSchema.partial().parse(input); if (value.slug) uniqueSlug('events', value.slug, id); Object.assign(item, value);
    logAdminAction('event.updated', id, item.title.en); return item;
  }
  if (resource === 'ticket-types') {
    const item = store.ticketTypes.find(value => value.id === id); if (!item) throw new Error('Ticket type not found.');
    const value = ticketTypeSchema.partial().parse(input); if (value.eventId && !store.events.some(event => event.id === value.eventId)) throw new Error('Event not found.');
    Object.assign(item, value, { updatedAt: new Date().toISOString() }); logAdminAction('ticket_type.updated', id, item.name.en); return item;
  }
  if (resource === 'posts') {
    const item = store.posts.find(value => value.id === id); if (!item) throw new Error('Post not found.');
    const value = postSchema.partial().parse(input); if (value.slug) uniqueSlug('posts', value.slug, id); Object.assign(item, value, { updatedAt: new Date().toISOString() });
    logAdminAction('post.updated', id, item.title.en); return item;
  }
  if (resource === 'gallery') {
    const item = store.gallery.find(value => value.id === id); if (!item) throw new Error('Media item not found.'); Object.assign(item, gallerySchema.partial().parse(input));
    logAdminAction('gallery.updated', id, item.title.en); return item;
  }
  if (resource === 'sponsors') {
    const item = store.sponsors.find(value => value.id === id); if (!item) throw new Error('Sponsor not found.'); const value = sponsorSchema.partial().parse(input); Object.assign(item, value); if ('websiteUrl' in value) item.websiteUrl = value.websiteUrl || undefined;
    logAdminAction('sponsor.updated', id, item.name); return item;
  }
  if (resource === 'applications') {
    const item = store.applications.find(value => value.id === id); if (!item) throw new Error('Application not found.'); const value = applicationSchema.parse(input); item.status = value.status;
    logAdminAction('application.status_changed', id, value.status); return item;
  }
  if (resource === 'members') {
    const item = store.members.find(value => value.id === id); if (!item) throw new Error('Member not found.'); const value = memberSchema.parse(input);
    const nextStartsAt = 'membershipStartsAt' in value ? value.membershipStartsAt ?? undefined : item.membershipStartsAt;
    const nextEndsAt = 'membershipEndsAt' in value ? value.membershipEndsAt ?? undefined : item.membershipEndsAt;
    const periodError = validateMembershipPeriod(nextStartsAt, nextEndsAt); if (periodError) throw new Error(periodError);
    Object.assign(item, value, { membershipStartsAt: nextStartsAt, membershipEndsAt: nextEndsAt }); if ('badgeImageDataUrl' in value) item.badgeImageDataUrl = value.badgeImageDataUrl || undefined; if ('photoDataUrl' in value) item.photoDataUrl = value.photoDataUrl || undefined; if ('website' in value) item.website = value.website || undefined;
    logAdminAction('member.updated', id, `${item.role} · ${item.badge}`); const safe = { ...item } as Partial<typeof item>; Reflect.deleteProperty(safe, 'passwordHash'); return safe;
  }
  if (resource === 'admin-roles') {
    const item = store.adminRoles.find(value => value.id === id); if (!item) throw new Error('Admin role not found.');
    if (item.system) throw new Error('Built-in roles cannot be edited.');
    Object.assign(item, adminRoleSchema.partial().parse(input));
    logAdminAction('admin_role.updated', id, item.name); return item;
  }
  if (resource === 'admin-users') {
    const item = store.adminUsers.find(value => value.id === id); if (!item) throw new Error('Admin user not found.');
    const value = adminUserSchema.partial().parse(input);
    if (value.roleId && !store.adminRoles.some(role => role.id === value.roleId)) throw new Error('Admin role not found.');
    Object.assign(item, value);
    logAdminAction('admin_user.updated', id, `${item.fullName} · ${item.roleId}`);
    const safe = { ...item } as Partial<typeof item>; Reflect.deleteProperty(safe, 'passwordHash'); return safe;
  }
  throw new Error(`Updating ${resource} is not supported.`);
}

export function deleteAdminResource(resource: AdminResourceName, id: string) {
  const remove = <T extends { id: string }>(list: T[], label: string) => {
    const index = list.findIndex(item => item.id === id); if (index < 0) throw new Error(`${label} not found.`); return list.splice(index, 1)[0];
  };
  if (resource === 'events') {
    if (store.registrations.some(value => value.eventId === id)) {
      throw new Error('Events with issued tickets cannot be deleted. Close the event instead.');
    }
    const item = remove(store.events, 'Event');
    store.ticketTypes = store.ticketTypes.filter(value => value.eventId !== id);
    store.invitations = store.invitations.filter(value => value.eventId !== id);
    logAdminAction('event.deleted', id, item.title.en); return item;
  }
  if (resource === 'ticket-types') {
    if (store.registrations.some(ticket => ticket.ticketTypeId === id)) throw new Error('Ticket types with issued tickets cannot be deleted. Mark the type as cancelled instead.');
    const item = remove(store.ticketTypes, 'Ticket type'); logAdminAction('ticket_type.deleted', id, item.name.en); return item;
  }
  if (resource === 'posts') { const item = remove(store.posts, 'Post'); logAdminAction('post.deleted', id, item.title.en); return item; }
  if (resource === 'gallery') { const item = remove(store.gallery, 'Media item'); logAdminAction('gallery.deleted', id, item.title.en); return item; }
  if (resource === 'sponsors') { const item = remove(store.sponsors, 'Sponsor'); logAdminAction('sponsor.deleted', id, item.name); return item; }
  if (resource === 'registrations') {
    const item = store.registrations.find(value => value.id === id); if (!item) throw new Error('Registration not found.');
    item.ticketStatus = 'DELETED';
    logAdminAction('registration.deleted', id, item.fullName); return item;
  }
  if (resource === 'members') {
    const item = remove(store.members, 'Member'); store.invitations = store.invitations.filter(value => value.memberId !== id); logAdminAction('member.deleted', id, item.fullName); return item;
  }
  if (resource === 'admin-roles') {
    const item = store.adminRoles.find(value => value.id === id); if (!item) throw new Error('Admin role not found.');
    if (item.system) throw new Error('Built-in roles cannot be deleted.');
    if (store.adminUsers.some(user => user.roleId === id)) throw new Error('Move admin users to another role before deleting this role.');
    store.adminRoles = store.adminRoles.filter(value => value.id !== id);
    logAdminAction('admin_role.deleted', id, item.name); return item;
  }
  if (resource === 'admin-users') {
    const item = remove(store.adminUsers, 'Admin user');
    logAdminAction('admin_user.deleted', id, item.fullName); const safe = { ...item } as Partial<typeof item>; Reflect.deleteProperty(safe, 'passwordHash'); return safe;
  }
  throw new Error(`Deleting ${resource} is not supported.`);
}

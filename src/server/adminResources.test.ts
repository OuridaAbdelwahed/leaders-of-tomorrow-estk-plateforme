import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAdminResource, deleteAdminResource, updateAdminResource } from './adminResources';
import { store } from './store';
import type { EventRecord, Member, SponsorRecord } from '@/lib/types';

let snapshot: Pick<typeof store, 'events' | 'posts' | 'gallery' | 'sponsors' | 'registrations' | 'invitations' | 'members' | 'audit'>;

beforeEach(() => {
  snapshot = structuredClone({ events: store.events, posts: store.posts, gallery: store.gallery, sponsors: store.sponsors, registrations: store.registrations, invitations: store.invitations, members: store.members, audit: store.audit });
  if (!store.members.length) store.members.push({
    id: 'mem_test', fullName: 'Test Member', email: 'member.test@example.org', phone: '0600000000', institution: 'Test institution',
    program: 'Test program', role: 'MEMBER', membershipStatus: 'SIMPLE', badge: 'Member', totalContributions: 0, city: 'Khenifra',
    quote: 'Test quote', bio: 'Test biography', skills: [], eventsAttended: 0, active: true, passwordHash: 'test:test', joinedAt: new Date().toISOString(),
  });
});

afterEach(() => {
  store.events = snapshot.events; store.posts = snapshot.posts; store.gallery = snapshot.gallery; store.sponsors = snapshot.sponsors;
  store.registrations = snapshot.registrations; store.invitations = snapshot.invitations; store.members = snapshot.members; store.audit = snapshot.audit;
});

const eventInput = {
  slug: 'admin-test-event', title: { en: 'Admin Test Event', ar: 'فعالية اختبار الإدارة' },
  summary: { en: 'A valid event created by the CRUD test.', ar: 'فعالية صالحة أنشأها اختبار الإدارة.' },
  location: { en: 'EST Khenifra', ar: 'المدرسة العليا للتكنولوجيا بخنيفرة' },
  startsAt: '2026-10-10T09:00:00.000Z', endsAt: '2026-10-10T17:00:00.000Z',
  capacity: 80, registered: 0, status: 'DRAFT' as const, category: 'Workshop',
};

describe('admin resource CRUD', () => {
  it('creates and publishes an event', () => {
    const created = createAdminResource('events', eventInput) as EventRecord;
    expect(created.slug).toBe('admin-test-event');
    const updated = updateAdminResource('events', created.id, { status: 'PUBLISHED' }) as EventRecord;
    expect(updated.status).toBe('PUBLISHED');
  });

  it('rejects duplicate event slugs', () => {
    createAdminResource('events', eventInput);
    expect(() => createAdminResource('events', eventInput)).toThrow(/slug/i);
  });

  it('protects an event when it has issued tickets', () => {
    const created = createAdminResource('events', eventInput) as EventRecord;
    store.registrations.push({ id: 'reg_test', eventId: created.id, fullName: 'Test Student', email: 'test.student@example.org', phone: '0600000000', studentId: 'TEST-1', programCode: 'IDIA', amountMad: 0, ticketTypeId: 'type_test', ticketTypeName: 'General', ticketCode: 'LOT-TEST-000001', ticketToken: 'test-token', ticketQrDataUrl: '', ticketStatus: 'ACTIVE', createdAt: new Date().toISOString() });
    store.invitations.push({ id: 'inv_test', eventId: created.id, memberId: store.members[0].id, status: 'PENDING', createdAt: new Date().toISOString() });
    expect(() => deleteAdminResource('events', created.id)).toThrow(/issued tickets/i);
    expect(store.events.some(item => item.id === created.id)).toBe(true);
    expect(store.registrations.some(item => item.eventId === created.id)).toBe(true);
    expect(store.invitations.some(item => item.eventId === created.id)).toBe(true);
  });

  it('soft-deletes a ticket so later scans can be rejected and logged', () => {
    const created = createAdminResource('events', eventInput) as EventRecord;
    store.registrations.push({ id: 'reg_delete_test', eventId: created.id, fullName: 'Test Student', email: 'delete.test@example.org', phone: '0600000000', studentId: 'TEST-2', programCode: 'IDIA', amountMad: 0, ticketTypeId: 'type_test', ticketTypeName: 'General', ticketCode: 'LOT-TEST-000002', ticketToken: 'test-token', ticketQrDataUrl: '', ticketStatus: 'ACTIVE', createdAt: new Date().toISOString() });
    deleteAdminResource('registrations', 'reg_delete_test');
    expect(store.registrations.find(item => item.id === 'reg_delete_test')?.ticketStatus).toBe('DELETED');
  });

  it('stores uploaded badge artwork on a member record', () => {
    const badgeImageDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const updated = updateAdminResource('members', store.members[0].id, { badge: 'Design Head', badgeImageDataUrl }) as Omit<Member, 'passwordHash'>;
    expect(updated.badge).toBe('Design Head');
    expect(updated.badgeImageDataUrl).toBe(badgeImageDataUrl);
  });

  it('saves imported member profiles with blank optional fields', () => {
    const updated = updateAdminResource('members', store.members[0].id, {
      fullName: 'Updated Member', email: '', phone: '', city: '', institution: '', program: '',
      badge: 'Member', quote: '', bio: '', website: '', skills: [], eventsAttended: 0,
      totalContributions: 0, active: true,
    }) as Omit<Member, 'passwordHash'>;
    expect(updated.fullName).toBe('Updated Member');
    expect(updated.email).toBe('');
    expect(updated.bio).toBe('');
  });

  it('stores, validates, and clears a membership validity period', () => {
    const memberId = store.members[0].id;
    const updated = updateAdminResource('members', memberId, {
      membershipStartsAt: '2026-09-01T00:00:00.000Z',
      membershipEndsAt: '2027-09-01T00:00:00.000Z',
    }) as Omit<Member, 'passwordHash'>;
    expect(updated.membershipEndsAt).toBe('2027-09-01T00:00:00.000Z');
    expect(() => updateAdminResource('members', memberId, {
      membershipStartsAt: '2027-10-01T00:00:00.000Z',
      membershipEndsAt: '2027-09-01T00:00:00.000Z',
    })).toThrow(/after the start date/i);
    const openEnded = updateAdminResource('members', memberId, { membershipEndsAt: null }) as Omit<Member, 'passwordHash'>;
    expect(openEnded.membershipEndsAt).toBeUndefined();
  });

  it('accepts an uploaded sponsor logo data URL', () => {
    const logoPath = `data:image/png;base64,${'a'.repeat(1_000)}`;
    const created = createAdminResource('sponsors', { name: 'Upload Test Partner', level: 'PARTNER', logoPath, sortOrder: 99, active: true }) as SponsorRecord;
    expect(created.logoPath).toBe(logoPath);
    expect(store.sponsors.some(item => item.id === created.id)).toBe(true);
  });
});

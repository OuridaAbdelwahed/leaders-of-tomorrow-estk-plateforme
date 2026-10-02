import type {
  AdminRoleRecord, AdminUser, AuditEntry, EventInvitation, EventRecord, EventRegistration, GalleryItem,
  Member, MemberApplication, MemberRole, PostRecord, SponsorRecord, TicketTypeRecord,
} from '@/lib/types';
import { hasCurrentMembership, validateMembershipPeriod } from '@/features/membership/access';
import { createToken, hashPassword, reference, safeId } from './security';
import { sendMail } from './mail';
import { applicationReceivedMail, invitationMail, memberAccountMail } from './mailTemplates';
import { loadDatabaseSnapshot, saveDatabaseSnapshot } from './storePersistence';
import { assertRecruitmentOpen } from './membershipRecruitmentRepository';

export type Store = {
  applications: MemberApplication[];
  members: Member[];
  events: EventRecord[];
  ticketTypes: TicketTypeRecord[];
  posts: PostRecord[];
  gallery: GalleryItem[];
  sponsors: SponsorRecord[];
  registrations: EventRegistration[];
  invitations: EventInvitation[];
  adminRoles: AdminRoleRecord[];
  adminUsers: AdminUser[];
  audit: AuditEntry[];
};

declare global {
  var lotStore: Store | undefined;
  var lotStoreReady: Promise<void> | undefined;
  var lotStoreSaveQueue: Promise<void> | undefined;
}

const emptyStore = (): Store => ({
  applications: [], members: [], events: [], ticketTypes: [], posts: [], gallery: [], sponsors: [], registrations: [],
  invitations: [], adminRoles: [], adminUsers: [], audit: [],
});

export const store: Store = globalThis.lotStore ?? emptyStore();
globalThis.lotStore = store;

export function resetStoreCache() {
  globalThis.lotStoreReady = undefined;
}

export function ensureStoreReady() {
  globalThis.lotStoreReady ??= (async () => {
    const saved = await loadDatabaseSnapshot<Store>();
    Object.assign(store, saved);
  })();
  return globalThis.lotStoreReady;
}

export function persistStore() {
  const save = async () => {
    await ensureStoreReady();
    await saveDatabaseSnapshot(store);
    void import('./chatbotKnowledgeRepository').then(module=>module.queuePlatformKnowledgeSync()).catch(()=>undefined);
  };
  globalThis.lotStoreSaveQueue = (globalThis.lotStoreSaveQueue ?? Promise.resolve()).then(save, save);
  return globalThis.lotStoreSaveQueue;
}

const log = (actor: string, action: string, resource: string, detail: string) => store.audit.unshift({
  id: safeId('audit'), actor, action, resource, detail, success: true, createdAt: new Date().toISOString(),
});

export const logAdminAction = (action: string, resource: string, detail: string) => log('admin', action, resource, detail);
export const logStoreAction = (actor: string, action: string, resource: string, detail: string) => log(actor, action, resource, detail);

export async function submitApplication(input: Omit<MemberApplication, 'id' | 'reference' | 'status' | 'createdAt'>) {
  const recruitmentPeriod = await assertRecruitmentOpen();
  await ensureStoreReady();
  const duplicate = store.applications.find(item => item.email.toLowerCase() === input.email.toLowerCase() && item.status !== 'REJECTED');
  if (duplicate) throw new Error('An active application already exists for this email.');
  const application: MemberApplication = { ...input, recruitmentPeriodId: recruitmentPeriod.id, id: safeId('app'), reference: reference(), status: 'PENDING', createdAt: new Date().toISOString() };
  store.applications.unshift(application);
  log('public', 'application.created', application.id, application.reference);
  await persistStore();
  void sendMail({ to: application.email, ...applicationReceivedMail(application) });
  return application;
}

export async function approveApplication(id: string, badge: string, badgeImageDataUrl: string, role: MemberRole, additionalContribution = 0, membershipStartsAt?: string, membershipEndsAt?: string) {
  await ensureStoreReady();
  const periodError = validateMembershipPeriod(membershipStartsAt, membershipEndsAt);
  if (periodError) throw new Error(periodError);
  const application = store.applications.find(item => item.id === id);
  if (!application) throw new Error('Application not found.');
  if (application.status === 'ACCEPTED' || store.members.some(item => item.email.toLowerCase() === application.email.toLowerCase())) throw new Error('A member account already exists for this application.');
  const temporaryPassword = `Lot-${createToken().slice(0, 10)}!`;
  const member: Member = {
    id: safeId('mem'), fullName: application.fullName, email: application.email, phone: application.phone,
    institution: application.institution, program: application.program, photoDataUrl: application.photoDataUrl, role,
    membershipStatus: role === 'MEMBER' ? 'SIMPLE' : 'SPECIAL', membershipStartsAt, membershipEndsAt, badge, badgeImageDataUrl,
    totalContributions: application.contribution + additionalContribution, city: application.city,
    quote: 'Learning together, leading tomorrow.', bio: '', website: undefined, skills: [], eventsAttended: 0,
    active: true, passwordHash: hashPassword(temporaryPassword), joinedAt: new Date().toISOString(),
  };
  application.status = 'ACCEPTED';
  store.members.push(member);
  log('admin', 'application.approved', application.id, `Member ${member.id} created with ${role} role`);
  await persistStore();
  void sendMail({ to: member.email, ...memberAccountMail(member.fullName, temporaryPassword) });
  return { member, temporaryPassword };
}

export async function respondToInvitation(id: string, memberId: string, accepted: boolean, reason?: string) {
  await ensureStoreReady();
  const invitation = store.invitations.find(item => item.id === id && item.memberId === memberId && item.status === 'PENDING');
  if (!invitation) throw new Error('Invitation is no longer available.');
  invitation.status = accepted ? 'ACCEPTED' : 'REJECTED';
  invitation.reason = reason;
  invitation.respondedAt = new Date().toISOString();
  log(memberId, accepted ? 'invitation.accepted' : 'invitation.rejected', id, reason || 'No reason supplied');
  if (!accepted) {
    const next = store.members.find(member => hasCurrentMembership(member) && member.id !== memberId && !store.invitations.some(other => other.eventId === invitation.eventId && other.memberId === member.id));
    if (next) {
      invitation.status = 'REASSIGNED';
      const replacement: EventInvitation = { id: safeId('inv'), eventId: invitation.eventId, memberId: next.id, status: 'PENDING', createdAt: new Date().toISOString() };
      store.invitations.push(replacement);
      const event = store.events.find(item => item.id === invitation.eventId);
      if (event) void sendMail({ to: next.email, ...invitationMail(next.fullName, event) });
      await persistStore();
      return { invitation, reassignedTo: next.fullName };
    }
  }
  await persistStore();
  return { invitation };
}

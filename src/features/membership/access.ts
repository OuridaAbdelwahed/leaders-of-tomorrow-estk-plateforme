import type { Member } from '@/lib/types';

export type MembershipAccessState = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'SUSPENDED';

const timestamp = (value?: string) => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function getMembershipAccessState(member: Pick<Member, 'active' | 'membershipStartsAt' | 'membershipEndsAt'>, now = Date.now()): MembershipAccessState {
  if (!member.active) return 'SUSPENDED';
  const startsAt = timestamp(member.membershipStartsAt);
  const endsAt = timestamp(member.membershipEndsAt);
  if (startsAt !== undefined && startsAt > now) return 'SCHEDULED';
  if (endsAt !== undefined && endsAt <= now) return 'EXPIRED';
  return 'ACTIVE';
}

export const hasCurrentMembership = (member: Pick<Member, 'active' | 'membershipStartsAt' | 'membershipEndsAt'>, now = Date.now()) =>
  getMembershipAccessState(member, now) === 'ACTIVE';

export function validateMembershipPeriod(startsAt?: string, endsAt?: string) {
  const start = timestamp(startsAt);
  const end = timestamp(endsAt);
  if (startsAt && start === undefined) return 'Membership start date is invalid.';
  if (endsAt && end === undefined) return 'Membership end date is invalid.';
  if (start !== undefined && end !== undefined && end <= start) return 'Membership end date must be after the start date.';
  return undefined;
}


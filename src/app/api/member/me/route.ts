import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSession } from '@/server/security';
import { ensureStoreReady, store } from '@/server/store';
import { getMembershipAccessState } from '@/features/membership/access';

export async function GET() {
  await ensureStoreReady();
  const token = (await cookies()).get('lot_member_session')?.value; const session = readSession(token); const member = store.members.find((item) => item.id === session?.sub && session.role === 'member');
  if (!member) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const access = getMembershipAccessState(member);
  if (access !== 'ACTIVE') {
    const code = access === 'EXPIRED' ? 'MEMBERSHIP_EXPIRED' : access === 'SCHEDULED' ? 'MEMBERSHIP_NOT_STARTED' : 'MEMBERSHIP_SUSPENDED';
    return NextResponse.json({ error: access === 'EXPIRED' ? 'Your membership period has ended.' : access === 'SCHEDULED' ? 'Your membership period has not started.' : 'Your membership account is suspended.', code, membershipStartsAt: member.membershipStartsAt, membershipEndsAt: member.membershipEndsAt }, { status: 403, headers: { 'cache-control': 'private, no-store' } });
  }
  const safeMember = Object.fromEntries(Object.entries(member).filter(([key]) => key !== 'passwordHash'));
  const invitations = store.invitations.filter((item) => item.memberId === member.id).map((invitation) => ({ ...invitation, event: store.events.find((event) => event.id === invitation.eventId) }));
  return NextResponse.json({ member: safeMember, invitations }, { headers: { 'cache-control': 'private, no-store' } });
}

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signSession, verifyPassword } from '@/server/security';
import { ensureStoreReady, store } from '@/server/store';
import { getMembershipAccessState } from '@/features/membership/access';

const schema = z.object({ email: z.email(), password: z.string().min(8).max(200) });
export async function POST(request: Request) {
  try {
    await ensureStoreReady();
    const input = schema.parse(await request.json());
    const member = store.members.find((item) => item.email.toLowerCase() === input.email.toLowerCase());
    if (!member || !verifyPassword(input.password, member.passwordHash)) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    const access = getMembershipAccessState(member);
    if (access !== 'ACTIVE') {
      const code = access === 'EXPIRED' ? 'MEMBERSHIP_EXPIRED' : access === 'SCHEDULED' ? 'MEMBERSHIP_NOT_STARTED' : 'MEMBERSHIP_SUSPENDED';
      const error = access === 'EXPIRED' ? 'Your membership period has ended. Contact the club to renew your membership.' : access === 'SCHEDULED' ? 'Your membership period has not started yet.' : 'Your membership account is suspended. Contact the club for assistance.';
      return NextResponse.json({ error, code, membershipStartsAt: member.membershipStartsAt, membershipEndsAt: member.membershipEndsAt }, { status: 403 });
    }
    const token = signSession({ sub: member.id, role: 'member', exp: Date.now() + 8 * 60 * 60_000 });
    (await cookies()).set('lot_member_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false', path: '/', maxAge: 60 * 60 * 8, priority: 'high' });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 }); }
}

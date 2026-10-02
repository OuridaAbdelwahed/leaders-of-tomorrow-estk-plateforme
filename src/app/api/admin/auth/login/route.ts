import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signSession, verifyPassword } from '@/server/security';
import { ensureStoreReady, store } from '@/server/store';

const schema = z.object({ portal: z.string().length(64), email: z.email(), password: z.string().min(8).max(200) });
const attempts = new Map<string, { count: number; reset: number }>();
const equal = (a: string, b: string) => { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); };

export async function POST(request: Request) {
  const key = request.headers.get('x-forwarded-for') || 'local'; const now = Date.now(); const attempt = attempts.get(key);
  if (attempt && attempt.reset > now && attempt.count >= 5) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  try {
    const input = schema.parse(await request.json());
    const email = input.email.toLowerCase();
    const envValid = equal(input.portal, process.env.ADMIN_PORTAL_SLUG || '') && equal(email, (process.env.ADMIN_EMAIL || '').toLowerCase()) && equal(input.password, process.env.ADMIN_PASSWORD || '');
    await ensureStoreReady();
    const storedUser = envValid ? undefined : store.adminUsers.find(item => item.email.toLowerCase() === email && item.active);
    const storedValid = Boolean(storedUser && equal(input.portal, process.env.ADMIN_PORTAL_SLUG || '') && verifyPassword(input.password, storedUser.passwordHash));
    if (!envValid && !storedValid) { attempts.set(key, { count: (attempt?.count || 0) + 1, reset: now + 15 * 60_000 }); return NextResponse.json({ error: 'Credentials are not valid.' }, { status: 401 }); }
    attempts.delete(key); const token = signSession({ sub: email, role: 'admin', adminRoleId: storedUser?.roleId ?? 'role_super_admin', name: storedUser?.fullName ?? 'Super admin', exp: Date.now() + 4 * 60 * 60_000 }); (await cookies()).set('lot_admin_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false', path: '/', maxAge: 60 * 60 * 4, priority: 'high' });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Enter valid credentials.' }, { status: 400 }); }
}

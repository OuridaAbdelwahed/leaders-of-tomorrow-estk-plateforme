import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('lot_admin_session', '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false', path: '/', maxAge: 0, priority: 'high' });
  return response;
}

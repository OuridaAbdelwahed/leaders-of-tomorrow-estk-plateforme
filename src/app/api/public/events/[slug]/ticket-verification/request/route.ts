import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestTicketVerification } from '@/server/ticketVerificationRepository';
import { createDeviceToken, getVisitorDeviceCookieName } from '@/server/visitorSecurity';

const schema = z.object({
  email: z.string().trim().email().max(180),
  fingerprint: z.string().trim().max(4000).optional(),
  turnstileToken: z.string().trim().max(4000).optional(),
  locale: z.enum(['en', 'ar']).optional(),
});

function readOrCreateDeviceToken(request: NextRequest) {
  const name = getVisitorDeviceCookieName();
  const existing = request.cookies.get(name)?.value;
  return existing && existing.length >= 32 ? { token: existing, created: false } : { token: createDeviceToken(), created: true };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const device = readOrCreateDeviceToken(request);
  try {
    const input = schema.parse(await request.json());
    const { slug } = await params;
    const result = await requestTicketVerification(slug, input, request, device.token);
    const response = NextResponse.json(result);
    if (device.created) response.cookies.set(getVisitorDeviceCookieName(), device.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to request verification.' }, { status: 400 });
    if (device.created) response.cookies.set(getVisitorDeviceCookieName(), device.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }
}

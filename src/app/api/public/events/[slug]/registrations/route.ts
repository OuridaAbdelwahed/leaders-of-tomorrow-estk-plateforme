import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRegistration } from '@/server/ticketingRepository';
import { resetStoreCache } from '@/server/store';
import { createDeviceToken, getVisitorDeviceCookieName } from '@/server/visitorSecurity';

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(5).max(40),
  studentId: z.string().trim().min(2).max(80),
  programCode: z.string().trim().min(1).max(240),
  ticketTypeId: z.string().trim().min(2).max(64).optional(),
  verificationToken: z.string().trim().min(20).max(300),
  fingerprint: z.string().trim().max(4000).optional(),
  locale: z.enum(['en', 'ar']).optional(),
  acceptedPolicies: z.literal(true),
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
    const result = await createRegistration(slug, input, input.locale ?? 'en', { request, deviceToken: device.token });
    resetStoreCache();
    const response = NextResponse.json(result, { status: 201 });
    if (device.created) response.cookies.set(getVisitorDeviceCookieName(), device.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to register.' }, { status: 400 });
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

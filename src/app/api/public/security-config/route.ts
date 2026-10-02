import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || '',
  });
}

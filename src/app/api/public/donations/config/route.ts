import { NextResponse } from 'next/server';
import { getDonationSettings } from '@/server/donationRepository';

export async function GET() {
  const settings = await getDonationSettings();
  return NextResponse.json({
    settings,
    paypalClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '',
  });
}

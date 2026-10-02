import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cancelDonationOrder } from '@/server/donationRepository';

const schema = z.object({ donationPublicId: z.string().trim().min(6).max(64) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    await cancelDonationOrder(input.donationPublicId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

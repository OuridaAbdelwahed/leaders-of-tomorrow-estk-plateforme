import { NextResponse } from 'next/server';
import { z } from 'zod';
import { captureDonationOrder } from '@/server/donationRepository';

const schema = z.object({
  donationPublicId: z.string().trim().min(4).max(80),
  orderId: z.string().trim().min(4).max(180),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await captureDonationOrder(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The payment could not be confirmed.' }, { status: 400 });
  }
}

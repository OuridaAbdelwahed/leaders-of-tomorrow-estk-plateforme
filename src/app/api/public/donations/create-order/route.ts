import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDonationOrder } from '@/server/donationRepository';

const schema = z.object({
  context: z.enum(['membership_completed','page_bottom','manual']),
  sourcePage: z.string().trim().max(240).optional(),
  membershipRequestId: z.string().trim().max(64).optional(),
  eventId: z.string().trim().max(64).optional(),
  donorName: z.string().trim().max(160).optional(),
  donorEmail: z.string().trim().email().max(190).optional().or(z.literal('')),
  amount: z.union([z.string(), z.number(), z.null()]),
  isAnonymous: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await createDonationOrder({ ...input, donorEmail: input.donorEmail || undefined });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Le service de paiement est temporairement indisponible.' }, { status: 400 });
  }
}

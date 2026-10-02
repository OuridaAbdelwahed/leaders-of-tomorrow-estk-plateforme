import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordDonationEvent } from '@/server/donationRepository';

const schema = z.object({
  eventName: z.enum(['donation_popup_shown','donation_popup_closed','donation_popup_later','donation_popup_declined','donation_amount_selected','donation_payment_started','donation_payment_completed','donation_payment_failed']),
  context: z.string().max(80).optional(),
  sourcePage: z.string().max(240).optional(),
  eventId: z.string().max(64).optional(),
  membershipRequestId: z.string().max(64).optional(),
  selectedAmountCategory: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    await recordDonationEvent({
      eventName: input.eventName,
      context: input.context,
      sourcePage: input.sourcePage,
      eventId: input.eventId,
      membershipRequestId: input.membershipRequestId,
      selectedAmountCategory: input.selectedAmountCategory,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record donation event.' }, { status: 400 });
  }
}

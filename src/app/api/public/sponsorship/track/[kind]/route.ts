import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateMutationRequest } from '@/server/requestSecurity';
import { readSession } from '@/server/security';
import { trackCampaignEvent } from '@/server/sponsorshipRepository';
import { checkRateLimit, requestRateLimitKey } from '@/server/rateLimit';

const schema = z.object({ campaignId: z.string().max(64), page: z.string().max(500), placement: z.string().max(80), deviceId: z.string().max(200).optional(), country: z.string().max(120).optional(), city: z.string().max(120).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try { const trust = validateMutationRequest(request); if (!trust.ok) return NextResponse.json({ error: trust.reason }, { status: 403 }); const { kind } = await params; if (!['impression','click'].includes(kind)) return NextResponse.json({ error: 'Unknown tracking event.' }, { status: 400 }); const rate = checkRateLimit(requestRateLimitKey(request, `sponsor-${kind}`), kind === 'impression' ? 240 : 80, 60_000); if (!rate.allowed) return NextResponse.json({ error: 'Tracking rate limit reached.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }); const body = schema.parse(await request.json()); const session = readSession((await cookies()).get('lot_member_session')?.value); return NextResponse.json(await trackCampaignEvent({ ...body, memberId: session?.role === 'member' ? session.sub : undefined }, request, kind as 'impression'|'click')); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record event.' }, { status: 400 }); }
}

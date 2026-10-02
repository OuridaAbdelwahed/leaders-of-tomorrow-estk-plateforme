import { NextResponse } from 'next/server';
import { CAMPAIGN_PLACEMENTS } from '@/features/sponsorship/types';
import { getEligibleCampaigns, selectWeightedCampaign } from '@/server/sponsorshipRepository';

export async function GET(request: Request, { params }: { params: Promise<{ placement: string }> }) {
  try { const { placement } = await params; if (!CAMPAIGN_PLACEMENTS.includes(placement as never)) return NextResponse.json({ error: 'Unknown placement.' }, { status: 400 }); const url = new URL(request.url); const campaigns = await getEligibleCampaigns(placement as never, url.searchParams.get('eventId') || undefined); const exclude = (url.searchParams.get('exclude') || '').split(',').filter(Boolean).slice(0, 20); const campaign = selectWeightedCampaign(campaigns, exclude); return NextResponse.json({ campaign: campaign ?? null }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to select a campaign.' }, { status: 500 }); }
}

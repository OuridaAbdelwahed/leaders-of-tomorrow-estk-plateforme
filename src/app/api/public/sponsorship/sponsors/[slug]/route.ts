import { NextResponse } from 'next/server';
import { getPublicSponsor } from '@/server/sponsorshipRepository';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try { const { slug } = await params; const result = await getPublicSponsor(slug); return result ? NextResponse.json(result, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }) : NextResponse.json({ error: 'Sponsor not found.' }, { status: 404 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load sponsor.' }, { status: 500 }); }
}

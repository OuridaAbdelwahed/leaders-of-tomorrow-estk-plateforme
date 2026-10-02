import { NextResponse } from 'next/server';
import { getPublicSponsors } from '@/server/sponsorshipRepository';

export async function GET(request: Request) {
  try { const url = new URL(request.url); return NextResponse.json({ items: await getPublicSponsors({ featured: url.searchParams.get('featured') === 'true', category: url.searchParams.get('category') || undefined, limit: Number(url.searchParams.get('limit') || 100) }) }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load sponsors.' }, { status: 500 }); }
}

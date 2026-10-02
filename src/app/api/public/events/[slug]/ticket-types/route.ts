import { NextResponse } from 'next/server';
import { listPublicTicketTypesBySlug } from '@/server/ticketingRepository';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    return NextResponse.json({ ticketTypes: await listPublicTicketTypesBySlug(slug) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load ticket types.' }, { status: 404 });
  }
}

import { NextResponse } from 'next/server';
import { createTicketPng, ticketFilename } from '@/server/ticketDocument';
import { getTicketByIdOrCodeAndToken } from '@/server/ticketingRepository';

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const locale = url.searchParams.get('locale') === 'ar' ? 'ar' : 'en';
  const preview = url.searchParams.get('preview') === '1';
  if (!token) return NextResponse.json({ error: 'Ticket token is required.' }, { status: 401 });
  const ticket = await getTicketByIdOrCodeAndToken(ticketId, token);
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  const png = await createTicketPng(ticket, token, locale);
  const filename = ticketFilename(ticket);
  return new NextResponse(new Uint8Array(png), { headers: {
    'content-type': 'image/png',
    'content-disposition': `${preview ? 'inline' : 'attachment'}; filename="${filename}"`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  } });
}

import { NextResponse } from 'next/server';
import { getTicketByIdOrCodeAndToken } from '@/server/ticketingRepository';

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ error: 'Ticket token is required.' }, { status: 401 });
  const ticket = await getTicketByIdOrCodeAndToken(ticketId, token);
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  return NextResponse.json({ ticket }, { headers: { 'cache-control': 'private, no-store' } });
}

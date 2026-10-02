import { NextResponse } from 'next/server';
import { hasPermission } from '@/server/adminPermissions';
import { getAdminSession } from '@/server/adminAuth';
import { listTicketSecurityEvents } from '@/server/ticketSecurityRepository';

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!hasPermission(admin.permissions, 'ticket_security.view')) return NextResponse.json({ error: 'You are not allowed to view ticket security events.' }, { status: 403 });
  try {
    const url = new URL(request.url);
    const events = await listTicketSecurityEvents({
      eventId: url.searchParams.get('eventId') || undefined,
      action: url.searchParams.get('action') || undefined,
      blocked: url.searchParams.get('blocked') || undefined,
      limit: Number(url.searchParams.get('limit') || 100),
    });
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load ticket security events.' }, { status: 500 });
  }
}

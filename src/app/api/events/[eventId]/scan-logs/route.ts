import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { canUserAccessEvent, listScanLogs } from '@/server/scanRepository';

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireAdminPermission('scan_logs.view');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { eventId } = await params;
  if (!await canUserAccessEvent(auth.admin.id, eventId, auth.admin.superAdmin)) return NextResponse.json({ error: 'This scanner is not authorized for the selected event.' }, { status: 403 });
  const search = new URL(request.url).searchParams;
  return NextResponse.json(await listScanLogs(eventId, {
    result: search.get('result') || undefined, scannerUserId: search.get('scannerUserId') || undefined,
    ticketTypeId: search.get('ticketTypeId') || undefined, from: search.get('from') || undefined, to: search.get('to') || undefined,
    ticketCode: search.get('ticketCode') || undefined, participantName: search.get('participantName') || undefined,
    page: Number(search.get('page') || 1), pageSize: Number(search.get('pageSize') || 25),
  }));
}

import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { canUserAccessEvent, listScanLogs } from '@/server/scanRepository';

const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireAdminPermission('scan_logs.export');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { eventId } = await params;
  if (!await canUserAccessEvent(auth.admin.id, eventId, auth.admin.superAdmin)) return NextResponse.json({ error: 'This scanner is not authorized for the selected event.' }, { status: 403 });
  const search = new URL(request.url).searchParams;
  const result = await listScanLogs(eventId, { result: search.get('result') || undefined, page: 1, pageSize: 10_000 });
  const rows = result.items.map(item => [item.id, item.eventId, item.ticketId, item.ticketCode, item.participantName, item.ticketType, item.scannerName, item.scanResult, item.rejectionReason, item.scannedAt, item.deviceInfo, item.ipAddress, item.createdAt, item.updatedAt]);
  const csv = [['Scan log ID','Event ID','Ticket ID','Ticket code','Participant','Ticket type','Scanner','Result','Reason','Scanned at','Device','IP address','Created','Updated'], ...rows].map(row => row.map(cell).join(',')).join('\r\n');
  return new NextResponse(`\uFEFF${csv}`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="scan-logs-${eventId}-${new Date().toISOString().slice(0,10)}.csv"` } });
}

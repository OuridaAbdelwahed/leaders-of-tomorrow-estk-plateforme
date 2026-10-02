import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { canUserAccessEvent, getScanSummary } from '@/server/scanRepository';

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireAdminPermission('scan_logs.view');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { eventId } = await params;
  if (!await canUserAccessEvent(auth.admin.id, eventId, auth.admin.superAdmin)) return NextResponse.json({ error: 'This scanner is not authorized for the selected event.' }, { status: 403 });
  return NextResponse.json({ summary: await getScanSummary(eventId) });
}

import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { ensureStoreReady, store } from '@/server/store';

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csv = (headers: string[], rows: unknown[][]) => [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  await ensureStoreReady();
  const { resource } = await params;
  const permission = resource === 'applications' ? 'applications.view' : 'registrations.view';
  const auth = await requireAdminPermission(permission); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const eventId = new URL(request.url).searchParams.get('eventId');
  let content = '';
  if (resource === 'applications') {
    content = csv(
      ['Reference', 'Recruitment period ID', 'Name', 'Email', 'Phone', 'City', 'Institution', 'Program', 'Contribution MAD', 'Status', 'Created'],
      store.applications.map(item => [item.reference, item.recruitmentPeriodId ?? '', item.fullName, item.email, item.phone, item.city, item.institution, item.program, item.contribution, item.status, item.createdAt]),
    );
  } else if (resource === 'registrations') {
    const rows = eventId ? store.registrations.filter(item => item.eventId === eventId) : store.registrations;
    content = csv(
      ['Event', 'Name', 'Email', 'Phone', 'Student ID', 'Program', 'Ticket', 'Status', 'Waitlist', 'Checked in', 'Amount MAD', 'Created'],
      rows.map(item => [store.events.find(event => event.id === item.eventId)?.title.en ?? item.eventId, item.fullName, item.email, item.phone, item.studentId, item.programCode, item.ticketCode, item.ticketStatus, item.waitlistPosition ?? '', item.checkedInAt ?? '', item.amountMad, item.createdAt]),
    );
  } else return NextResponse.json({ error: 'Unknown export.' }, { status: 404 });
  return new NextResponse(content, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${resource}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}

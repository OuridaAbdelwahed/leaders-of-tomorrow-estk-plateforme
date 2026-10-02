import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { listAuthorizedScannerEvents } from '@/server/scanRepository';

export async function GET() {
  const auth = await requireAdminPermission('tickets.scan');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.admin.id) return NextResponse.json({ error: 'Create this administrator in MariaDB before using the scanner.' }, { status: 403 });
  return NextResponse.json({ events: await listAuthorizedScannerEvents(auth.admin.id, auth.admin.superAdmin) });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/server/adminAuth';
import { validateTicketScan } from '@/server/scanRepository';
import { resetStoreCache } from '@/server/store';

const schema = z.object({ payload: z.string().trim().min(1).max(1000) });
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireAdminPermission('tickets.scan');
  if (!auth.ok) return NextResponse.json({ success: false, result: 'unauthorized', message: auth.error }, { status: auth.status });
  if (!auth.admin.id) return NextResponse.json({ success: false, result: 'unauthorized', message: 'Create this administrator in MariaDB before using the scanner.' }, { status: 403 });
  const { eventId } = await params;
  try {
    const input = schema.parse(await request.json());
    const result = await validateTicketScan(eventId, input.payload, {
      scannerUserId: auth.admin.id, scannerName: auth.admin.name, superAdmin: auth.admin.superAdmin,
      deviceInfo: request.headers.get('user-agent') ?? undefined,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
    });
    resetStoreCache();
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    return NextResponse.json({ success: false, result: 'error', message: error instanceof Error ? error.message : 'Erreur du serveur ou du réseau.' }, { status: 500 });
  }
}

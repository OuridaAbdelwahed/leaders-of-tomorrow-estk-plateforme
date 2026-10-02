import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { requireAdminPermission } from '@/server/adminAuth';
import { execute, queryRows } from '@/server/database';

type DbRow = RowDataPacket & Record<string, unknown>;
const schema = z.object({ userId: z.string().min(2).max(64), eventId: z.string().min(2).max(64) });

export async function GET() {
  const auth = await requireAdminPermission('roles.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const rows = await queryRows<DbRow>(`SELECT sea.user_id,sea.event_id,u.full_name,e.title_en FROM scanner_event_access sea
    JOIN users u ON u.id=sea.user_id JOIN events e ON e.id=sea.event_id ORDER BY e.starts_at DESC,u.full_name`);
  return NextResponse.json({ access: rows.map(row => ({ userId: String(row.user_id), eventId: String(row.event_id), userName: String(row.full_name), eventName: String(row.title_en) })) });
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission('roles.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const input = schema.parse(await request.json());
    const permissions = await queryRows<DbRow>(`SELECT p.name FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.id=? AND p.name='tickets.scan'`, [input.userId]);
    if (!permissions.length) return NextResponse.json({ error: 'The selected user does not have tickets.scan permission.' }, { status: 400 });
    await execute('INSERT IGNORE INTO scanner_event_access (user_id,event_id) VALUES (?,?)', [input.userId, input.eventId]);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to assign scanner access.' }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminPermission('roles.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const input = schema.parse(await request.json());
    await execute('DELETE FROM scanner_event_access WHERE user_id=? AND event_id=?', [input.userId, input.eventId]);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to remove scanner access.' }, { status: 400 }); }
}

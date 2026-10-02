import { NextResponse } from 'next/server';
import type { AdminPermission } from '@/lib/types';
import { requireAdminPermission } from '@/server/adminAuth';
import { createAdminResource, isAdminResource } from '@/server/adminResources';
import { ensureStoreReady, persistStore } from '@/server/store';

const createPermission = (resource: string): AdminPermission => {
  if (resource === 'events' || resource === 'ticket-types') return 'events.manage';
  if (['posts', 'gallery', 'sponsors'].includes(resource)) return 'content.manage';
  if (['admin-roles', 'admin-users'].includes(resource)) return 'roles.manage';
  return 'dashboard.view';
};

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    await ensureStoreReady(); const { resource } = await params; if (!isAdminResource(resource)) throw new Error('Unknown admin resource.');
    const auth = await requireAdminPermission(createPermission(resource)); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const result = createAdminResource(resource, await request.json()); await persistStore();
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create resource.' }, { status: 400 }); }
}

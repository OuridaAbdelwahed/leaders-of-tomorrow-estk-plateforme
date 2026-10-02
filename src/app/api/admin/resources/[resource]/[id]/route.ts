import { NextResponse } from 'next/server';
import type { AdminPermission } from '@/lib/types';
import { requireAdminPermission } from '@/server/adminAuth';
import { deleteAdminResource, isAdminResource, updateAdminResource } from '@/server/adminResources';
import { ensureStoreReady, persistStore } from '@/server/store';

const mutationPermission = (resource: string): AdminPermission => {
  if (resource === 'events' || resource === 'ticket-types') return 'events.manage';
  if (['posts', 'gallery', 'sponsors'].includes(resource)) return 'content.manage';
  if (resource === 'applications') return 'applications.manage';
  if (resource === 'registrations') return 'registrations.manage';
  if (resource === 'members') return 'members.manage';
  if (['admin-roles', 'admin-users'].includes(resource)) return 'roles.manage';
  return 'dashboard.view';
};

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    await ensureStoreReady(); const { resource, id } = await params; if (!isAdminResource(resource)) throw new Error('Unknown admin resource.');
    const auth = await requireAdminPermission(mutationPermission(resource)); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const result = updateAdminResource(resource, id, await request.json()); await persistStore();
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update resource.' }, { status: 400 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    await ensureStoreReady(); const { resource, id } = await params; if (!isAdminResource(resource)) throw new Error('Unknown admin resource.');
    const auth = await requireAdminPermission(mutationPermission(resource)); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const result = deleteAdminResource(resource, id); await persistStore();
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete resource.' }, { status: 400 }); }
}

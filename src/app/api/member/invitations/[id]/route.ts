import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession } from '@/server/security';
import { ensureStoreReady, respondToInvitation, store } from '@/server/store';
import { hasCurrentMembership } from '@/features/membership/access';

const schema = z.object({ accepted: z.boolean(), reason: z.string().max(300).optional() }).refine(v => v.accepted || Boolean(v.reason?.trim()), { message: 'A reason is required when declining.' });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('lot_member_session')?.value; const session = readSession(token); const memberId = session?.role === 'member' ? session.sub : undefined; if (!memberId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  await ensureStoreReady(); const member = store.members.find(item => item.id === memberId); if (!member || !hasCurrentMembership(member)) return NextResponse.json({ error: 'An active membership is required.', code: 'MEMBERSHIP_INACTIVE' }, { status: 403 });
  try { const input = schema.parse(await request.json()); const { id } = await params; return NextResponse.json(await respondToInvitation(id, memberId, input.accepted, input.reason)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update invitation.' }, { status: 400 }); }
}

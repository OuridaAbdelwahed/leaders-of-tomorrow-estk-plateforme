import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/server/adminAuth';
import { invitationMail } from '@/server/mailTemplates';
import { sendMail } from '@/server/mail';
import { safeId } from '@/server/security';
import { ensureStoreReady, persistStore, store } from '@/server/store';
import { hasCurrentMembership } from '@/features/membership/access';

const schema = z.object({ eventId: z.string().min(1), memberId: z.string().min(1) });
export async function POST(request: Request) {
  const auth = await requireAdminPermission('invitations.manage'); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try { await ensureStoreReady(); const input = schema.parse(await request.json()); const member = store.members.find(m => m.id === input.memberId && hasCurrentMembership(m)); if (!member) throw new Error('Member not found or membership period is inactive.'); const event = store.events.find(item => item.id === input.eventId); if (!event) throw new Error('Event not found.'); if (store.invitations.some(i => i.eventId === input.eventId && i.memberId === input.memberId && i.status === 'PENDING')) throw new Error('This member already has a pending invitation.'); const invitation = { id: safeId('inv'), ...input, status: 'PENDING' as const, createdAt: new Date().toISOString() }; store.invitations.push(invitation); await persistStore(); await sendMail({ to: member.email, ...invitationMail(member.fullName, event) }); return NextResponse.json(invitation, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send invitation.' }, { status: 400 }); }
}

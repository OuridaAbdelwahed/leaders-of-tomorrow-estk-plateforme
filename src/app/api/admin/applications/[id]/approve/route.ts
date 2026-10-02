import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/server/adminAuth';
import { approveApplication } from '@/server/store';

const schema = z.object({
  badge: z.string().trim().min(2).max(80),
  badgeImageDataUrl: z.string().max(6_000_000).startsWith('data:image/'),
  role: z.enum(['MEMBER','TEAM_LEAD','BUREAU','PRESIDENT']),
  additionalContribution: z.number().min(0).max(100000),
  membershipStartsAt: z.iso.datetime(),
  membershipEndsAt: z.iso.datetime().optional(),
}).refine(value => !value.membershipEndsAt || Date.parse(value.membershipEndsAt) > Date.parse(value.membershipStartsAt), { path: ['membershipEndsAt'], message: 'Membership end date must be after the start date.' });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminPermission('applications.manage'); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try { const input = schema.parse(await request.json()); const { id } = await params; const result = await approveApplication(id, input.badge, input.badgeImageDataUrl, input.role, input.additionalContribution, input.membershipStartsAt, input.membershipEndsAt); return NextResponse.json({ member: { ...result.member, passwordHash: undefined }, temporaryPassword: result.temporaryPassword }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to approve application.' }, { status: 400 }); }
}

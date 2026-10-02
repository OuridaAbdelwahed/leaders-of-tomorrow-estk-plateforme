import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/server/adminAuth';
import { generateAndEmailAllMemberCredentials } from '@/server/memberCredentials';

const schema = z.object({ confirmation: z.literal('GENERATE_AND_EMAIL') });

export async function POST(request: Request) {
  const auth = await requireAdminPermission('members.manage'); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    schema.parse(await request.json());
    return NextResponse.json(await generateAndEmailAllMemberCredentials());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to send member credentials.' }, { status: 400 });
  }
}

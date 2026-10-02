import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/server/adminAuth';
import { generateMemberCredentials } from '@/server/memberCredentials';

const schema = z.object({ sendEmail: z.boolean() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminPermission('members.manage'); if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { id } = await params;
    const { sendEmail } = schema.parse(await request.json());
    return NextResponse.json(await generateMemberCredentials(id, sendEmail));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to generate member credentials.' }, { status: 400 });
  }
}

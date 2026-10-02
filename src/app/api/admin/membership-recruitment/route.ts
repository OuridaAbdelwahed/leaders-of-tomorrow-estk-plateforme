import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/server/adminAuth';
import { createRecruitmentPeriod, getRecruitmentAvailability, listRecruitmentPeriods, updateRecruitmentPeriod } from '@/server/membershipRecruitmentRepository';
import { validateMutationRequest } from '@/server/requestSecurity';

const periodSchema = z.object({
  title: z.object({ en: z.string().trim().min(3).max(160), ar: z.string().trim().min(3).max(160) }),
  opensAt: z.iso.datetime(),
  closesAt: z.iso.datetime().nullable().optional(),
  enabled: z.boolean(),
});

async function responseBody() {
  const periods = await listRecruitmentPeriods();
  return { periods, availability: await getRecruitmentAvailability() };
}

export async function GET() {
  const auth = await requireAdminPermission('applications.view');
  if (!auth.ok) {
    const manageAuth = await requireAdminPermission('applications.manage');
    if (!manageAuth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return NextResponse.json(await responseBody(), { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const trust = validateMutationRequest(request);
  if (!trust.ok) return NextResponse.json({ error: trust.reason }, { status: 403 });
  const auth = await requireAdminPermission('applications.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const input = periodSchema.parse(await request.json());
    await createRecruitmentPeriod({ ...input, closesAt: input.closesAt ?? undefined }, auth.admin);
    return NextResponse.json(await responseBody(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? 'Review the recruitment period fields.' : error instanceof Error ? error.message : 'Unable to create the recruitment period.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const trust = validateMutationRequest(request);
  if (!trust.ok) return NextResponse.json({ error: trust.reason }, { status: 403 });
  const auth = await requireAdminPermission('applications.manage');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = z.object({ id: z.string().min(1).max(64), period: periodSchema }).parse(await request.json());
    await updateRecruitmentPeriod(body.id, { ...body.period, closesAt: body.period.closesAt ?? undefined }, auth.admin);
    return NextResponse.json(await responseBody());
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? 'Review the recruitment period fields.' : error instanceof Error ? error.message : 'Unable to update the recruitment period.' }, { status: 400 });
  }
}

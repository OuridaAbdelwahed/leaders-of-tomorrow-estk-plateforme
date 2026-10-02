import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasPermission } from '@/server/adminPermissions';
import { getAdminSession } from '@/server/adminAuth';
import { getDonationSettings, updateDonationSettings } from '@/server/donationRepository';

const schema = z.object({
  enabled: z.boolean().optional(),
  membershipCompletedEnabled: z.boolean().optional(),
  pageBottomEnabled: z.boolean().optional(),
  eligiblePages: z.array(z.string().trim().min(1).max(120)).optional(),
  scrollThreshold: z.number().min(85).max(95).optional(),
  suggestedAmounts: z.array(z.number().positive()).optional(),
  maximumAmount: z.number().positive().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  title: z.string().trim().min(3).max(180).optional(),
  description: z.string().trim().min(10).max(900).optional(),
  laterDays: z.number().min(1).max(365).optional(),
  declinedDays: z.number().min(1).max(365).optional(),
  donorDays: z.number().min(1).max(730).optional(),
  sessionLimit: z.number().min(1).max(3).optional(),
  anonymousAvailable: z.boolean().optional(),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!hasPermission(admin.permissions, 'donations.view')) return NextResponse.json({ error: 'You are not allowed to view donation settings.' }, { status: 403 });
  return NextResponse.json({ settings: await getDonationSettings() });
}

export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!hasPermission(admin.permissions, 'donations.manage')) return NextResponse.json({ error: 'You are not allowed to manage donation settings.' }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    return NextResponse.json({ settings: await updateDonationSettings(input) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update donation settings.' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { hasPermission } from '@/server/adminPermissions';
import { getAdminSession } from '@/server/adminAuth';
import { donationSummary, listDonations } from '@/server/donationRepository';

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!hasPermission(admin.permissions, 'donations.view')) return NextResponse.json({ error: 'You are not allowed to view donations.' }, { status: 403 });
  const url = new URL(request.url);
  const donations = await listDonations({
    context: url.searchParams.get('context') || undefined,
    status: url.searchParams.get('status') || undefined,
    page: url.searchParams.get('page') || undefined,
    anonymous: url.searchParams.get('anonymous') || undefined,
    minAmount: url.searchParams.get('minAmount') ? Number(url.searchParams.get('minAmount')) : undefined,
    maxAmount: url.searchParams.get('maxAmount') ? Number(url.searchParams.get('maxAmount')) : undefined,
  });
  const summary = await donationSummary();
  return NextResponse.json({ donations, summary });
}

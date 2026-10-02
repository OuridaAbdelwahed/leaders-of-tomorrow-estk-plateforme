import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { maskCouponForGuest } from '@/features/sponsorship/access';
import { readSession } from '@/server/security';
import { getActiveCoupons } from '@/server/sponsorshipRepository';
import { ensureStoreReady, store } from '@/server/store';
import { hasCurrentMembership } from '@/features/membership/access';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const session = readSession((await cookies()).get('lot_member_session')?.value);
    await ensureStoreReady();
    const member = session?.role === 'member' ? store.members.find(item => item.id === session.sub) : undefined;
    const memberId = member && hasCurrentMembership(member) ? member.id : undefined;
    const result = await getActiveCoupons({
      category: url.searchParams.get('category') || undefined,
      search: url.searchParams.get('search') || undefined,
      memberId,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('pageSize') || 24),
    });
    const payload = memberId
      ? result
      : { ...result, items: result.items.map(maskCouponForGuest) };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load coupons.' }, { status: 500 });
  }
}

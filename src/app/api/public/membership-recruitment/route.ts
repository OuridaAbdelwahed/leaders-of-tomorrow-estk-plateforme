import { NextResponse } from 'next/server';
import { getRecruitmentAvailability } from '@/server/membershipRecruitmentRepository';

export async function GET() {
  try {
    return NextResponse.json(await getRecruitmentAvailability(), { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to load the membership recruitment schedule.' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}

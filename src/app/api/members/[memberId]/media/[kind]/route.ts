import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '@/server/database';

type MediaRow = RowDataPacket & { media: string | null };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string; kind: string }> },
) {
  const { memberId, kind } = await params;
  if (kind !== 'badge' && kind !== 'photo') {
    return NextResponse.json({ error: 'Unknown member media type.' }, { status: 404 });
  }

  const column = kind === 'badge' ? 'badge_image' : 'photo';
  const rows = await queryRows<MediaRow>(`SELECT ${column} AS media FROM members WHERE id=? AND active=1 LIMIT 1`, [memberId]);
  const value = rows[0]?.media;
  if (!value) return NextResponse.json({ error: 'Member image not found.' }, { status: 404 });

  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return NextResponse.json({ error: 'Stored member image is invalid.' }, { status: 500 });

  return new NextResponse(Buffer.from(match[2], 'base64'), {
    headers: {
      'Content-Type': match[1],
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

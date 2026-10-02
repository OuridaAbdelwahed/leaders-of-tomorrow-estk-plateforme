import { NextResponse } from 'next/server';
import { getLegalPolicy, legalPolicies, loadLegalDocument } from '@/lib/legal';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getLegalPolicy(slug)) return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
  const locale = new URL(request.url).searchParams.get('locale') === 'ar' ? 'ar' : 'en';
  const document = await loadLegalDocument(slug, locale);
  if (!document) return NextResponse.json({ success: false, error: 'Policy not found.' }, { status: 404 });
  return NextResponse.json(
    {
      success: true,
      data: {
        document,
        policies: legalPolicies.map(policy => ({
          slug: policy.slug,
          title: policy.title,
          shortTitle: policy.shortTitle,
          category: policy.category,
        })),
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  );
}

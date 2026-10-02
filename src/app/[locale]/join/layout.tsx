import type { Metadata } from 'next';
import { localizedMetadata } from '@/lib/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ar = locale === 'ar';
  return localizedMetadata({
    locale,
    path: 'join',
    title: ar ? 'انضم إلى نادي قادة الغد' : 'Join Leaders of Tomorrow',
    description: ar ? 'قدّم طلب عضويتك في مجتمع قادة الغد الطلابي بالمدرسة العليا للتكنولوجيا بخنيفرة.' : 'Apply to join the Leaders of Tomorrow student community at EST Khenifra.',
    keywords: ar ? ['عضوية نادي طلابي', 'قادة الغد بخنيفرة'] : ['join student club Khenifra', 'Leaders of Tomorrow membership'],
  });
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}

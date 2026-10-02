import { EventsExperience } from '@/components/EventsExperience';
import { JsonLd } from '@/components/JsonLd';
import type { Metadata } from 'next';
import { ensureStoreReady, store } from '@/server/store';
import { absoluteUrl, localizedMetadata } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ar = locale === 'ar';
  return localizedMetadata({
    locale,
    path: 'events',
    title: ar ? 'الفعاليات والبرامج الطلابية' : 'Student Events & Leadership Programs',
    description: ar ? 'اكتشف فعاليات وورش وتجارب نادي قادة الغد في المدرسة العليا للتكنولوجيا بخنيفرة.' : 'Discover leadership events, workshops, and student experiences from Leaders of Tomorrow at EST Khenifra.',
    keywords: ar ? ['فعاليات طلابية بخنيفرة', 'ورش القيادة', 'قادة الغد'] : ['student events Khenifra', 'leadership workshops Morocco', 'ESTK events'],
  });
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  await ensureStoreReady();
  const { locale } = await params;
  const events = store.events.filter((event) => event.status === 'PUBLISHED').sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'ar' ? 'فعاليات قادة الغد' : 'Leaders of Tomorrow events',
    itemListElement: events.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: locale === 'ar' ? event.title.ar : event.title.en,
      url: absoluteUrl(`/${locale}/events/${event.slug}`),
    })),
  };
  return <><JsonLd data={itemList} /><EventsExperience locale={locale} events={events} /></>;
}

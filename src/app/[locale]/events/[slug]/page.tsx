import { CalendarMonth, CheckCircleOutline, LocationOnOutlined, PeopleOutline } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { JsonLd } from '@/components/JsonLd';
import { t } from '@/lib/content';
import { absoluteUrl, localizedMetadata, SITE_NAME, SITE_URL } from '@/lib/site';
import { ensureStoreReady, store } from '@/server/store';
import { CampaignPlacement } from '@/components/sponsorship/CampaignPlacement';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  await ensureStoreReady();
  const { locale, slug } = await params;
  const event = store.events.find(item => item.slug === slug && item.status === 'PUBLISHED');
  if (!event) return {};
  return localizedMetadata({
    locale,
    path: `events/${slug}`,
    title: t(event.title, locale),
    description: t(event.summary, locale),
    image: event.coverPath || undefined,
    keywords: [event.category, 'Leaders of Tomorrow', 'EST Khenifra', 'student event'],
  });
}

export default async function EventDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  await ensureStoreReady();
  const { locale, slug } = await params;
  const ar = locale === 'ar';
  const event = store.events.find(item => item.slug === slug && item.status === 'PUBLISHED');
  if (!event) notFound();

  const remaining = event.capacity ? Math.max(0, event.capacity - event.registered) : undefined;
  const eventUrl = absoluteUrl(`/${locale}/events/${event.slug}`);
  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${eventUrl}#event`,
    name: t(event.title, locale),
    description: t(event.summary, locale),
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: new Date(event.endsAt) < new Date() ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: t(event.location, locale),
      address: { '@type': 'PostalAddress', addressLocality: 'Khenifra', addressCountry: 'MA' },
    },
    image: [absoluteUrl(event.coverPath || '/media/landing/club-cover.jpeg')],
    url: eventUrl,
    inLanguage: ar ? 'ar-MA' : 'en',
    organizer: { '@type': 'Organization', '@id': `${SITE_URL}#organization`, name: SITE_NAME, url: SITE_URL.toString() },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: ar ? 'الرئيسية' : 'Home', item: absoluteUrl(`/${locale}`) },
      { '@type': 'ListItem', position: 2, name: ar ? 'الفعاليات' : 'Events', item: absoluteUrl(`/${locale}/events`) },
      { '@type': 'ListItem', position: 3, name: t(event.title, locale), item: eventUrl },
    ],
  };
  const experienceItems = ar
    ? ['تجربة تطبيقية يقودها ميسّرون', 'مواد قابلة للاستخدام بعد الفعالية', 'مساحة آمنة للتعلم والتجربة']
    : ['Facilitated hands-on practice', 'Take-away resources', 'A safe space to learn and try'];

  return <>
    <JsonLd data={[eventJsonLd, breadcrumbs]} />
    <Box sx={{ bgcolor: '#071215', color: 'white', py: { xs: 9, md: 14 } }} className="cinema-grid">
      <Box className="container">
        <Chip label={event.category} sx={{ bgcolor: '#EAB526', fontWeight: 800 }} />
        <Typography variant="h1" sx={{ mt: 3, maxWidth: 930, fontSize: { xs: 48, md: 80 } }}>{t(event.title, locale)}</Typography>
        <Typography sx={{ mt: 3, maxWidth: 680, color: 'rgba(255,255,255,.7)', fontSize: 20 }}>{t(event.summary, locale)}</Typography>
      </Box>
    </Box>
    <Box className="section">
      <Box className="container" sx={{ display: 'grid', gridTemplateColumns: { lg: '1fr 380px' }, gap: 4 }}>
        <Box>
          <Typography variant="h3">{ar ? 'ماذا ستعيش' : 'What you’ll experience'}</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, fontSize: 18, maxWidth: 760 }}>
            {ar ? 'جلسات عملية ومجموعات صغيرة ومساحة للتطبيق والتغذية الراجعة. جميع أجزاء البرنامج مصممة لتكون واضحة وميسرة وقابلة للتطبيق.' : 'Practical sessions, small-group work, room to apply ideas, and useful feedback. Every part of the program is designed to be clear, accessible, and immediately applicable.'}
          </Typography>
          <CampaignPlacement placement="EVENT_NATIVE" variant="native" eventId={event.id} />
          <Stack spacing={2} sx={{ mt: 4 }}>
            {experienceItems.map(item => <Stack key={item} direction="row" spacing={1.5}><CheckCircleOutline color="success" /><Typography>{item}</Typography></Stack>)}
          </Stack>
        </Box>
        <Stack spacing={3} sx={{ alignSelf: 'start' }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5">{ar ? 'تفاصيل الفعالية' : 'Event details'}</Typography>
              <Stack spacing={2.5} sx={{ my: 3 }}>
                <Detail icon={<CalendarMonth />} label={new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(event.startsAt))} />
                <Detail icon={<LocationOnOutlined />} label={t(event.location, locale)} />
                <Detail icon={<PeopleOutline />} label={remaining === undefined ? (ar ? 'مقاعد غير محدودة' : 'Unlimited places') : <><AnimatedNumber value={remaining} locale={locale} /> {ar ? 'مقعداً متبقياً' : 'places remaining'}</>} />
              </Stack>
              <Button href={`/${locale}/events/${event.slug}/register`} variant="contained" fullWidth>{ar ? 'سجّل الآن' : 'Register now'}</Button>
            </CardContent>
          </Card>
          <CampaignPlacement placement="SIDEBAR" variant="sidebar" eventId={event.id} />
        </Stack>
      </Box>
    </Box>
  </>;
}

function Detail({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return <Stack direction="row" spacing={1.5} alignItems="center">
    <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 3, bgcolor: '#DDECEF', color: 'primary.main' }}>{icon}</Box>
    <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{label}</Typography>
  </Stack>;
}

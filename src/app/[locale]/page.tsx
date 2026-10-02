import {
  ArrowForward,
  AutoAwesome,
  CalendarMonthOutlined,
  Diversity3Outlined,
  EmojiEventsOutlined,
  Groups2Outlined,
  Handshake,
  LightbulbOutlined,
  LocationOnOutlined,
  SchoolOutlined,
  ScheduleOutlined,
} from '@mui/icons-material';
import { Avatar, AvatarGroup, Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Decorations } from '@/components/landing';
import { FloatingBadge, Reveal } from '@/components/landing/LandingMotion';
import { MemberAwareCta } from '@/components/MemberSession';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { hasCurrentMembership } from '@/features/membership/access';
import { t } from '@/lib/content';
import { ensureStoreReady, store } from '@/server/store';
import { localizedMetadata, SITE_DESCRIPTION, SITE_DESCRIPTION_AR } from '@/lib/site';
import { CampaignPlacement } from '@/components/sponsorship/CampaignPlacement';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ar = locale === 'ar';
  return localizedMetadata({
    locale,
    title: ar ? 'قادة الغد في المدرسة العليا للتكنولوجيا بخنيفرة' : 'Student Leadership at EST Khenifra',
    description: ar ? SITE_DESCRIPTION_AR : SITE_DESCRIPTION,
    keywords: ar
      ? ['نادي طلابي بخنيفرة', 'القيادة الطلابية', 'المدرسة العليا للتكنولوجيا بخنيفرة', 'فعاليات طلابية']
      : ['student leadership Morocco', 'EST Khenifra club', 'student community Khenifra', 'leadership events'],
  });
}

const people = [
  ['/media/people/president.jpeg', 'Rim Adafal'],
  ['/media/people/vice.jpeg', 'Doha Benstila'],
  ['/media/people/designer.png', 'Ourida Abdelwahed'],
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  await ensureStoreReady();
  const { locale } = await params;
  const ar = locale === 'ar';
  const publishedEvents = store.events
    .filter((event) => event.status === 'PUBLISHED')
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const activePartnerCount = store.sponsors.filter((sponsor) => sponsor.active).length;

  const pillars = [
    { icon: <Handshake key="collaborate" />, title: ar ? 'نتعاون' : 'Collaborate', body: ar ? 'نحوّل طاقة الفريق إلى مبادرات تخدم مجتمعنا.' : 'We turn shared energy into projects that serve our community.' },
    { icon: <LightbulbOutlined key="learn" />, title: ar ? 'نتعلم' : 'Learn', body: ar ? 'نبني مهارات عملية من خلال التجربة والتوجيه.' : 'We build practical skills through experience and mentorship.' },
    { icon: <EmojiEventsOutlined key="lead" />, title: ar ? 'نقود' : 'Lead', body: ar ? 'نمنح الطلبة الثقة لأخذ المبادرة وإلهام الآخرين.' : 'We give students the confidence to step up and inspire others.' },
  ];
  const programs = [
    { icon: <SchoolOutlined />, title: ar ? 'تطوير القيادة' : 'Leadership development', body: ar ? 'ورشات وتجارب تبني الثقة والتواصل واتخاذ القرار.' : 'Workshops and experiences that strengthen confidence, communication, and decision-making.' },
    { icon: <Groups2Outlined />, title: ar ? 'الأثر المجتمعي' : 'Community impact', body: ar ? 'مشاريع يقودها الطلبة لتحويل الأفكار إلى أثر محلي ملموس.' : 'Student-led projects that turn ideas into visible local impact.' },
    { icon: <CalendarMonthOutlined />, title: ar ? 'الفعاليات والمؤتمرات' : 'Events & conferences', body: ar ? 'لقاءات تجمع الطلبة والخبراء والشركاء حول فرص جديدة.' : 'Experiences that connect students, experts, and partners around new opportunities.' },
    { icon: <AutoAwesome />, title: ar ? 'الابتكار والإبداع' : 'Innovation & creativity', body: ar ? 'مساحة آمنة لتجربة أفكار جديدة وتطوير حلول قابلة للتنفيذ.' : 'A supportive space to test new ideas and build useful solutions.' },
  ];
  const stats = [
    [store.members.filter((member) => hasCurrentMembership(member)).length, ar ? 'عضو نشط' : 'active members', <Groups2Outlined key="members" />],
    [publishedEvents.length, ar ? 'فعاليات منشورة' : 'published events', <CalendarMonthOutlined key="events" />],
    [activePartnerCount, ar ? 'شركاء وداعمون' : 'partners & supporters', <Handshake key="partners" />],
    [store.registrations.length, ar ? 'تسجيلات الفعاليات' : 'event registrations', <Diversity3Outlined key="registrations" />],
  ];

  return (
    <>
      <Box component="section" className="landing-hero">
        <Decorations.DotPattern className="hero-dots" />
        <Decorations.OrbitRing className="hero-ring" />
        <Decorations.FloatingOrb className="hero-orb" />
        <Box className="container landing-hero-grid">
          <Reveal direction={ar ? 'right' : 'left'}>
            <Box className="landing-hero-copy">
              <Typography className="eyebrow" sx={{ color: '#58D4D0' }}>{ar ? 'نُمَكّن • نُلهم • نقود' : 'EMPOWER • INSPIRE • LEAD'}</Typography>
              <Typography component="h1" sx={{ mt: 2.25, color: 'white', fontWeight: 750, fontSize: { xs: 'clamp(3.05rem, 14vw, 4.6rem)', md: 'clamp(4.3rem, 7vw, 6.6rem)' }, lineHeight: .97, letterSpacing: '-.055em' }}>
                {ar ? <>قُد اليوم،<br />وألهم <Box component="span" sx={{ color: '#F5BC23' }}>الغد.</Box></> : <>Lead Today,<br />Inspire <Box component="span" sx={{ color: '#F5BC23' }}>Tomorrow.</Box></>}
              </Typography>
              <Typography sx={{ mt: 3, maxWidth: 610, color: 'rgba(255,255,255,.75)', fontSize: { xs: 16, md: 19 }, lineHeight: 1.75 }}>
                {ar ? 'مجتمع طلابي في المدرسة العليا للتكنولوجيا بخنيفرة يطوّر المهارات، ويبني الروابط، ويحوّل الإمكانات إلى أثر.' : 'A student-led community at EST Khenifra where young minds learn to lead, build meaningful connections, and turn potential into impact.'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                <MemberAwareCta locale={locale} guestLabel={ar ? 'انضم إلى النادي' : 'Join the club'} memberLabel={ar ? 'افتح ملفي' : 'Open my profile'} variant="contained" color="secondary" />
                <Button href={`/${locale}/events`} variant="outlined" startIcon={<CalendarMonthOutlined />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.42)', '&:hover': { borderColor: '#58D4D0', bgcolor: 'rgba(88,212,208,.08)' } }}>{ar ? 'استكشف الفعاليات' : 'Explore events'}</Button>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 4.25 }}>
                <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 40, height: 40, borderColor: '#08262E' } }}>{people.map(([src, alt]) => <Avatar key={src} src={src} alt={alt} />)}</AvatarGroup>
                <Box><Typography sx={{ color: 'white', fontWeight: 800 }}>{ar ? 'فريق واحد، طموح مشترك' : 'One team. Shared ambition.'}</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,.58)' }}>{ar ? 'طلبة يصنعون التغيير معاً' : 'Students creating change together'}</Typography></Box>
              </Stack>
            </Box>
          </Reveal>

          <Reveal direction={ar ? 'left' : 'right'} delay={0.12}>
            <Box className="hero-visual">
              <Box className="hero-visual-layer hero-visual-layer-gold" aria-hidden="true" />
              <Box className="hero-visual-layer hero-visual-layer-teal" aria-hidden="true" />
              <Decorations.OrganicMedia className="hero-organic-media">
                <Image src="/media/landing/club-cover.jpeg" alt={ar ? 'الصورة الجماعية لنادي قادة الغد' : 'Leaders of Tomorrow club group'} fill priority sizes="(max-width: 760px) 94vw, 670px" className="hero-cover-image" />
              </Decorations.OrganicMedia>
              <FloatingBadge className="hero-message"><span>{ar ? <>معاً<br />نصنع<br />التغيير</> : <>Together<br />we create<br />change</>}</span></FloatingBadge>
              <Decorations.WaveLine className="hero-wave" />
            </Box>
          </Reveal>
        </Box>
        <Box className="hero-curve" aria-hidden="true" />
      </Box>

      <Box className="container"><CampaignPlacement placement="HOMEPAGE_HERO" variant="hero" /></Box>

      <Box component="section" className="section who-section">
        <Decorations.DotPattern className="who-dots" />
        <Box className="container who-grid">
          <Reveal direction={ar ? 'right' : 'left'}>
            <Box className="people-collage" aria-label={ar ? 'فريق قادة الغد' : 'Leaders of Tomorrow team'}>
              {people.map(([src, alt], index) => <Box key={src} className={`collage-photo collage-photo-${index + 1}`}><Image src={src} alt={alt} fill sizes="(max-width: 900px) 45vw, 240px" style={{ objectFit: 'cover' }} /></Box>)}
              <Decorations.OrbitRing className="collage-ring" />
            </Box>
          </Reveal>
          <Reveal direction={ar ? 'left' : 'right'} delay={0.08}>
            <Box>
              <Typography className="eyebrow" color="primary.main">{ar ? 'مَنْ نَحْنُ' : 'WHO WE ARE'}</Typography>
              <Typography variant="h2" sx={{ mt: 1.5, fontSize: { xs: 40, md: 58 }, maxWidth: 620 }}>{ar ? <>نبني قادة،<br />ونصنع <Box component="span" color="primary.main">أثراً.</Box></> : <>Building leaders,<br />creating <Box component="span" color="primary.main">impact.</Box></>}</Typography>
              <Typography color="text.secondary" sx={{ mt: 2.25, maxWidth: 650, fontSize: 17 }}>{ar ? 'نجمع الطلبة الطموحين في بيئة تتعلّم بالفعل، وتعمل بروح الفريق، وتمنح كل عضو مساحة حقيقية للنمو.' : 'We bring ambitious students together in a community that learns by doing, works as one team, and gives every member room to grow.'}</Typography>
              <Stack className="pillar-list" sx={{ mt: 4 }}>
                {pillars.map((pillar, index) => <Box className="pillar-row" key={pillar.title}><Box className="pillar-icon">{pillar.icon}</Box><Box><Typography component="h3" variant="h5" fontWeight={800}>{pillar.title}</Typography><Typography color="text.secondary" sx={{ mt: .4 }}>{pillar.body}</Typography></Box>{index < pillars.length - 1 && <Box className="pillar-connector" aria-hidden="true" />}</Box>)}
              </Stack>
              <Button href={`/${locale}/gallery`} variant="contained" endIcon={<ArrowForward />} sx={{ mt: 4 }}>{ar ? 'شاهد لحظاتنا' : 'See our moments'}</Button>
            </Box>
          </Reveal>
        </Box>
      </Box>

      <Box component="section" className="container impact-strip-wrap">
        <Reveal direction="scale"><Box className="impact-strip"><Decorations.WaveLine className="impact-wave" />{stats.map(([value, label, icon]) => <Box className="impact-stat" key={String(label)}><Box className="impact-icon">{icon}</Box><Box><Typography component="p" variant="h3" sx={{ color: '#F5BC23', fontWeight: 850, fontVariantNumeric: 'tabular-nums' }}><AnimatedNumber value={Number(value)} locale={locale} /></Typography><Typography sx={{ color: 'rgba(255,255,255,.7)', fontWeight: 650 }}>{label}</Typography></Box></Box>)}</Box></Reveal>
      </Box>

      <Box component="section" className="section programs-section">
        <Decorations.OrbitRing className="program-ring" />
        <Box className="container">
          <Reveal><Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto' }}><Typography className="eyebrow" color="primary.main">{ar ? 'بَرَامِجُنَا' : 'OUR PROGRAMS'}</Typography><Typography variant="h2" sx={{ mt: 1.4, fontSize: { xs: 40, md: 58 } }}>{ar ? <>برامج <Box component="span" color="secondary.main">تُلهم</Box></> : <>Programs that <Box component="span" color="secondary.main">inspire</Box></>}</Typography><Typography color="text.secondary" sx={{ mt: 2, fontSize: 17 }}>{ar ? 'تجارب عملية مصممة لتنمية المهارات وتوسيع شبكة العلاقات وصناعة أثر مستدام.' : 'Practical experiences designed to grow skills, expand connections, and create lasting impact.'}</Typography></Box></Reveal>
          <Box className="program-grid">{programs.map((program, index) => <Reveal key={program.title} delay={index * .06}><Card variant="outlined" className="program-card"><Box className="program-icon">{program.icon}</Box><Typography component="h3" variant="h5" sx={{ mt: 2.5, fontWeight: 800 }}>{program.title}</Typography><Typography color="text.secondary" sx={{ mt: 1.25 }}>{program.body}</Typography><Box className="program-accent" /></Card></Reveal>)}</Box>
        </Box>
      </Box>

      <Box className="container" sx={{ display: 'grid', gap: 3, pb: { xs: 7, md: 10 } }}>
        <CampaignPlacement placement="HOMEPAGE_CAROUSEL" variant="carousel" />
        <CampaignPlacement placement="HOMEPAGE_CARD" variant="native" />
      </Box>

      <Box component="section" className="section events-section">
        <Decorations.DotPattern className="events-dots" />
        <Box className="container">
          <Reveal><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'end' }} spacing={2}><Box><Typography className="eyebrow" color="primary.main">{ar ? 'الفَعَالِيَّاتُ القَادِمَة' : 'UPCOMING EVENTS'}</Typography><Typography variant="h2" sx={{ mt: 1.4, fontSize: { xs: 40, md: 58 } }}>{ar ? <>لا تفوّت <Box component="span" color="primary.main">القادم</Box></> : <>Don’t miss <Box component="span" color="primary.main">what’s next</Box></>}</Typography></Box><Button href={`/${locale}/events`} variant="outlined" endIcon={<ArrowForward />}>{ar ? 'كل الفعاليات' : 'View all events'}</Button></Stack></Reveal>
          {publishedEvents.length ? <Box className="event-grid">{publishedEvents.slice(0, 3).map((event, index) => {
            const date = new Date(event.startsAt);
            return <Reveal key={event.id} delay={index * .07}><Card variant="outlined" className="landing-event-card"><Box className={`event-art event-art-${index + 1}`}>{event.coverPath ? <Box component="img" src={event.coverPath} alt="" loading="lazy" /> : <><CalendarMonthOutlined /><Decorations.OrbitRing className="event-orbit" /></>}<Box className="event-date"><strong>{new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date)}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)}</span></Box></Box><Box sx={{ p: 3 }}><Chip size="small" label={event.category} /><Typography component="h3" variant="h5" sx={{ mt: 2, fontWeight: 800 }}>{t(event.title, locale)}</Typography><Typography color="text.secondary" sx={{ mt: 1, minHeight: 78 }}>{t(event.summary, locale)}</Typography><Stack spacing={.75} sx={{ mt: 2.25 }}><Stack direction="row" spacing={1} alignItems="center"><ScheduleOutlined fontSize="small" color="primary" /><Typography variant="body2">{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)}</Typography></Stack><Stack direction="row" spacing={1} alignItems="center"><LocationOnOutlined fontSize="small" color="primary" /><Typography variant="body2" noWrap>{t(event.location, locale)}</Typography></Stack></Stack><Button href={`/${locale}/events/${event.slug}`} endIcon={<ArrowForward />} sx={{ mt: 2.25, px: 0 }}>{ar ? 'تفاصيل الفعالية' : 'Event details'}</Button></Box></Card></Reveal>;
          })}</Box> : <Box className="events-empty"><CalendarMonthOutlined /><Typography variant="h5">{ar ? 'نحضّر لفعاليات جديدة.' : 'New events are being prepared.'}</Typography></Box>}
        </Box>
      </Box>

      <Box component="section" className="container final-cta-wrap">
        <Reveal direction="scale"><Box className="final-cta"><Decorations.DotPattern className="cta-dots" /><Decorations.OrbitRing className="cta-ring" /><Box className="cta-portraits">{people.slice(0, 3).map(([src, alt], index) => <Box className={`cta-portrait cta-portrait-${index + 1}`} key={src}><Image src={src} alt={alt} fill sizes="180px" style={{ objectFit: 'cover' }} /></Box>)}</Box><Box className="cta-copy"><Typography className="eyebrow" sx={{ color: '#58D4D0' }}>{ar ? 'ابدأ رحلتك' : 'START YOUR JOURNEY'}</Typography><Typography variant="h2" sx={{ mt: 1.2, color: 'white', fontSize: { xs: 38, md: 58 } }}>{ar ? <>كُن جزءاً من<br /><Box component="span" color="#F5BC23">شيء أكبر.</Box></> : <>Be part of<br />something <Box component="span" color="#F5BC23">bigger.</Box></>}</Typography><Typography sx={{ mt: 2, color: 'rgba(255,255,255,.7)', maxWidth: 520 }}>{ar ? 'انضم إلى مجتمع من الطلبة الطموحين وابدأ رحلتك نحو القيادة وصناعة الأثر.' : 'Join a vibrant community of motivated students and start your journey toward leadership and impact.'}</Typography><MemberAwareCta locale={locale} guestLabel={ar ? 'انضم إلى النادي' : 'Join the club'} memberLabel={ar ? 'عرض مساحة العضو' : 'View member space'} variant="contained" color="secondary" sx={{ mt: 3 }} /></Box></Box></Reveal>
      </Box>
    </>
  );
}

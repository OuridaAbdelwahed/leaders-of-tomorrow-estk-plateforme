'use client';

import { ArrowBack, ArrowForward, AutoAwesomeOutlined, CalendarMonthOutlined, Diversity3Outlined, GroupsOutlined, LocationOnOutlined, Pause, PlayArrow, Search, ScheduleOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Chip, IconButton, InputAdornment, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import type { EventRecord } from '@/lib/types';
import { AnimatedNumber } from '@/components/AnimatedNumber';

const pageLoadedAt = Date.now();

export function EventsExperience({ locale, events }: { locale: string; events: EventRecord[] }) {
  const ar = locale === 'ar';
  const [active, setActive] = useState(() => Math.max(0, events.length - 1));
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const railRef = useRef<HTMLDivElement | null>(null);
  const railItems = useRef<Array<HTMLButtonElement | null>>([]);
  const current = events[active];

  const categories = useMemo(() => ['All', 'Upcoming', 'Past', ...Array.from(new Set(events.map(event => event.category)))], [events]);
  const visible = useMemo(() => events.filter(event => {
    const haystack = `${event.title.en} ${event.title.ar} ${event.summary.en} ${event.summary.ar} ${event.location.en} ${event.location.ar}`.toLowerCase();
    const starts = +new Date(event.startsAt);
    return haystack.includes(query.trim().toLowerCase())
      && (filter === 'All' || (filter === 'Upcoming' && starts >= pageLoadedAt) || (filter === 'Past' && starts < pageLoadedAt) || event.category === filter);
  }), [events, filter, query]);

  const move = (direction: number) => setActive(value => events.length ? (value + direction + events.length) % events.length : 0);

  useEffect(() => {
    if (paused || events.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % events.length), 5000);
    return () => window.clearInterval(timer);
  }, [events.length, paused]);

  useEffect(() => {
    const rail = railRef.current;
    const card = railItems.current[active];
    if (!rail || !card) return;
    const left = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2;
    rail.scrollTo({ left, behavior: 'smooth' });
  }, [active]);

  if (!current) return <Box component="main" className="events-zero-page" dir={ar?'rtl':'ltr'}>
    <Box className="events-zero-grid" aria-hidden="true"/><Box className="events-zero-orb events-zero-orb-one" aria-hidden="true"/><Box className="events-zero-orb events-zero-orb-two" aria-hidden="true"/>
    <Box className="container events-zero-inner">
      <Box className="events-zero-visual" aria-hidden="true"><Box className="events-zero-calendar"><span/><CalendarMonthOutlined/><i/><i/><i/></Box><Box className="events-zero-spark spark-one"><AutoAwesomeOutlined/></Box><Box className="events-zero-spark spark-two"><AutoAwesomeOutlined/></Box></Box>
      <Box className="events-zero-copy">
        <Typography className="eyebrow">{ar?'تقويم الفعاليات':'EVENTS CALENDAR'}</Typography>
        <Typography component="h1">{ar?'لا توجد فعاليات منشورة حالياً.':'No published events right now.'}</Typography>
        <Typography className="events-zero-lead">{ar?'عند نشر الفعالية القادمة ستظهر هنا تلقائياً مع جميع التفاصيل ومعلومات التسجيل.':'When the next event is published, it will appear here automatically with its full details and registration information.'}</Typography>
        <Stack direction={{xs:'column',sm:'row'}} gap={1.25} className="events-zero-actions"><Button href={`/${locale}`} variant="contained" color="secondary" endIcon={<ArrowForward/>}>{ar?'استكشف المنصة':'Explore the platform'}</Button><Button href={`/${locale}/join`} variant="outlined" endIcon={<GroupsOutlined/>}>{ar?'انضم إلى النادي':'Become a member'}</Button></Stack>
      </Box>
    </Box>
  </Box>;

  const currentDate = new Date(current.startsAt);
  const title = ar ? current.title.ar : current.title.en;
  const summary = ar ? current.summary.ar : current.summary.en;
  const location = ar ? current.location.ar : current.location.en;

  return (
    <Box className="events-reference-page">
      <Box component="section" className="events-reference-hero" aria-roledescription="carousel" aria-label={ar ? 'أبرز الفعاليات' : 'Featured events'}>
        <Box className="event-hero-grid-pattern" aria-hidden="true" />
        <Box className="event-hero-rings" aria-hidden="true" />
        <Box className="container events-reference-hero-inner">
          <Box className="event-reference-copy" key={`copy-${current.id}`}>
            <Chip label={current.category} />
            <Typography component="h1">{!ar && current.slug === 'career-stories-night' ? <>Career<br /><span>Stories Night</span></> : title}</Typography>
            <Typography className="event-reference-summary">{summary}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} className="event-reference-meta">
              <Stack direction="row"><ScheduleOutlined /><Typography>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(currentDate)}</Typography></Stack>
              <Stack direction="row"><LocationOnOutlined /><Typography>{location}</Typography></Stack>
            </Stack>
            <Button href={`/${locale}/events/${current.slug}`} variant="contained" color="secondary" endIcon={<ArrowForward />}>{ar ? 'التفاصيل والتسجيل' : 'Details & registration'}</Button>
          </Box>

          <Box className="event-reference-visual" key={`visual-${current.id}`}>
            <Box className="event-reference-photo">{current.coverPath ? <Box component="img" src={current.coverPath} alt="" /> : <Box className="event-placeholder-art"><CalendarMonthOutlined /></Box>}</Box>
            <Box className="event-purpose-card"><Diversity3Outlined /><Typography>{ar ? <>شارك<br />ألهم<br />تواصل</> : <>Share<br />Inspire<br />Connect</>}</Typography></Box>
            <Box className="event-gold-swoop" aria-hidden="true" />
          </Box>
        </Box>

        <Box className="event-slider-controls">
          <IconButton onClick={() => move(ar ? 1 : -1)} aria-label={ar ? 'الفعالية السابقة' : 'Previous event'}><ArrowBack /></IconButton>
          <IconButton onClick={() => setPaused(value => !value)} aria-label={paused ? (ar ? 'تشغيل العرض' : 'Play slideshow') : (ar ? 'إيقاف العرض' : 'Pause slideshow')}>{paused ? <PlayArrow /> : <Pause />}</IconButton>
          <Box className="event-slider-dots">{events.map((event, index) => <button type="button" key={event.id} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`${ar ? 'الفعالية' : 'Event'} ${index + 1}`} aria-current={index === active ? 'true' : undefined} />)}</Box>
          <IconButton onClick={() => move(ar ? -1 : 1)} aria-label={ar ? 'الفعالية التالية' : 'Next event'}><ArrowForward /></IconButton>
        </Box>
        <Box className="events-hero-wave" aria-hidden="true" />
      </Box>

      <Box component="section" className="events-program-section">
        <Box className="events-page-shape events-page-shape-one" aria-hidden="true" />
        <Box className="events-page-shape events-page-shape-two" aria-hidden="true" />
        <Box className="container">
          <Typography className="eyebrow" color="primary.main">{ar ? 'البرنامج' : 'THE PROGRAM'}</Typography>
          <Typography component="h2" variant="h2">{ar ? 'اختر تجربتك القادمة.' : <>Choose your next experience<span>.</span></>}</Typography>

          <Box className="events-filter-row">
            <TextField value={query} onChange={event => setQuery(event.target.value)} label={ar ? 'ابحث في الفعاليات' : 'Search events'} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
            <Box className="category-rail" role="group" aria-label={ar ? 'تصفية الفعاليات' : 'Filter events'}>{categories.map(value => <Chip key={value} label={value} clickable color={filter === value ? 'primary' : 'default'} variant={filter === value ? 'filled' : 'outlined'} onClick={() => setFilter(value)} />)}</Box>
          </Box>

          <Box className="event-reference-rail" ref={railRef} aria-label={ar ? 'شريط الفعاليات' : 'Event rail'}>{events.map((event, index) => {
            const date = new Date(event.startsAt);
            return <Box component="button" type="button" key={event.id} ref={(node: HTMLButtonElement | null) => { railItems.current[index] = node; }} className={`event-reference-rail-card ${index === active ? 'is-active' : ''}`} onClick={() => setActive(index)} aria-current={index === active ? 'true' : undefined}><Box className="rail-date-icon"><CalendarMonthOutlined /></Box><Box><strong>{ar ? event.title.ar : event.title.en}</strong><small>{new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit' }).format(date)}</small></Box></Box>;
          })}</Box>

          {visible.length ? <Box className="event-reference-grid" key={`${filter}-${query}`}>{visible.map((event, index) => {
            const date = new Date(event.startsAt);
            const capacity = event.capacity ? Math.min(100, event.registered / event.capacity * 100) : 0;
            return <Box component="article" className="event-reference-card" key={event.id} style={{ '--item-index': index } as CSSProperties}>
              <Box className="event-reference-date-panel"><strong>{new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date)}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)}</span><CalendarMonthOutlined /></Box>
              <Box className="event-reference-card-copy"><Chip label={event.category} size="small" /><Typography component="h3" variant="h4">{ar ? event.title.ar : event.title.en}</Typography><Typography color="text.secondary">{ar ? event.summary.ar : event.summary.en}</Typography><Stack spacing={.8}><Stack direction="row"><ScheduleOutlined /><Typography variant="body2">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)}</Typography></Stack><Stack direction="row"><LocationOnOutlined /><Typography variant="body2">{ar ? event.location.ar : event.location.en}</Typography></Stack></Stack><Box className="event-capacity"><Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}><AnimatedNumber value={event.registered} locale={locale} /> / {event.capacity || '∞'} {ar ? 'مقعداً' : 'places'}</Typography><LinearProgress variant="determinate" value={capacity} /></Box><Button href={`/${locale}/events/${event.slug}`} endIcon={<ArrowForward />}>{ar ? 'التفاصيل والتسجيل' : 'Details & registration'}</Button></Box>
            </Box>;
          })}</Box> : <Alert severity="info" sx={{ mt: 4 }}>{ar ? 'لا توجد فعاليات تطابق هذا البحث.' : 'No events match this search.'}</Alert>}

          <Box className="events-bottom-cta"><Box className="events-bottom-icon"><CalendarMonthOutlined /></Box><Box><Typography variant="h5">{ar ? 'لا تفوّت ما يهم.' : 'Don’t miss what matters.'}</Typography><Typography color="text.secondary">{ar ? 'انضم إلى فعاليات ملهمة وانمُ مع مجتمعنا.' : 'Join inspiring events and grow with our community.'}</Typography></Box><Button href={`/${locale}/events`} variant="contained" color="secondary" endIcon={<ArrowForward />}>{ar ? 'كل الفعاليات' : 'View all events'}</Button></Box>
        </Box>
      </Box>
    </Box>
  );
}

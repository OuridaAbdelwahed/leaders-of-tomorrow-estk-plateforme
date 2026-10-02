'use client';

import { ArrowBack, ArrowForward, Instagram, Pause, PhotoLibraryOutlined, PlayArrow, VideocamOutlined } from '@mui/icons-material';
import { Box, Button, Chip, IconButton, Typography } from '@mui/material';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryItem } from '@/lib/types';

type Filter = 'ALL' | GalleryItem['mediaType'];

export function GalleryExperience({ locale, items }: { locale: string; items: GalleryItem[] }) {
  const ar = locale === 'ar';
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [paused, setPaused] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);
  const railItems = useRef<Array<HTMLButtonElement | null>>([]);
  const current = items[active];
  const filtered = useMemo(() => filter === 'ALL' ? items : items.filter(item => item.mediaType === filter), [filter, items]);

  const move = (direction: number) => setActive(value => items.length ? (value + direction + items.length) % items.length : 0);

  useEffect(() => {
    if (paused || items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive(value => (value + 1) % items.length), 5000);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  useEffect(() => {
    const rail = railRef.current;
    const card = railItems.current[active];
    if (!rail || !card) return;
    const left = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2;
    rail.scrollTo({ left, behavior: 'smooth' });
  }, [active]);

  if (!current) return <Box className="experience-empty"><PhotoLibraryOutlined /><Typography>{ar ? 'سيتم نشر لحظاتنا قريباً.' : 'Our moments will appear here soon.'}</Typography></Box>;

  const title = ar ? current.title.ar : current.title.en;
  const filters: Array<[Filter, string]> = [['ALL', ar ? 'الكل' : 'All moments'], ['PHOTO', ar ? 'صور' : 'Photos'], ['VIDEO', ar ? 'فيديو' : 'Videos']];

  return (
    <Box className="gallery-reference-page">
      <Box component="section" className="gallery-reference-hero" aria-roledescription="carousel" aria-label={ar ? 'أبرز لحظات النادي' : 'Featured club moments'}>
        <Box className="gallery-hero-rings" aria-hidden="true" />
        <Box className="gallery-hero-dots" aria-hidden="true" />
        <Box className="container gallery-reference-hero-inner">
          <Box className="gallery-reference-copy" key={`copy-${current.id}`}>
            <Typography className="eyebrow">{ar ? 'معرض النادي' : 'CLUB GALLERY'}</Typography>
            <Typography component="h1">{title}<span>.</span></Typography>
            <Typography>{ar ? 'لقطات حقيقية من العمل الجماعي، الإنجازات المشتركة، واللحظات التي صنعت مجتمعنا.' : 'Real frames of teamwork, shared achievements, and the moments that shaped our community.'}</Typography>
            <Button component="a" href="https://www.instagram.com/club_leadersoftomorrow_estk/" target="_blank" rel="noopener noreferrer" variant="contained" color="secondary" startIcon={<Instagram />}>{ar ? 'تابعنا على إنستغرام' : 'Follow on Instagram'}</Button>
          </Box>
          <Box className="gallery-reference-visual" key={`visual-${current.id}`}>
            <Box className="gallery-reference-media">{current.mediaType === 'VIDEO' ? <Box component="video" src={current.filePath} autoPlay muted loop playsInline aria-label={title} /> : <Box component="img" src={current.filePath} alt={title} />}</Box>
            <Box className="gallery-format-badge">{current.mediaType === 'VIDEO' ? <VideocamOutlined /> : <PhotoLibraryOutlined />}<Typography>{current.mediaType === 'VIDEO' ? (ar ? 'فيديو' : 'Video story') : (ar ? 'صورة' : 'Photo story')}</Typography></Box>
            <Box className="gallery-gold-shape" aria-hidden="true" />
          </Box>
        </Box>
        <Box className="gallery-slider-controls">
          <IconButton onClick={() => move(ar ? 1 : -1)} aria-label={ar ? 'اللحظة السابقة' : 'Previous moment'}><ArrowBack /></IconButton>
          <IconButton onClick={() => setPaused(value => !value)} aria-label={paused ? (ar ? 'تشغيل العرض' : 'Play slideshow') : (ar ? 'إيقاف العرض' : 'Pause slideshow')}>{paused ? <PlayArrow /> : <Pause />}</IconButton>
          <Box className="gallery-slider-dots">{items.map((item, index) => <button type="button" key={item.id} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`${ar ? 'اللحظة' : 'Moment'} ${index + 1}`} aria-current={index === active ? 'true' : undefined} />)}</Box>
          <IconButton onClick={() => move(ar ? -1 : 1)} aria-label={ar ? 'اللحظة التالية' : 'Next moment'}><ArrowForward /></IconButton>
        </Box>
        <Box className="gallery-hero-wave" aria-hidden="true" />
      </Box>

      <Box component="section" className="gallery-reference-section">
        <Box className="gallery-page-shape gallery-page-shape-one" aria-hidden="true" />
        <Box className="container">
          <Typography className="eyebrow" color="primary.main">{ar ? 'استكشف المعرض' : 'EXPLORE THE GALLERY'}</Typography>
          <Typography component="h2" variant="h2">{ar ? 'كل لحظة لها قصة.' : <>Every moment has a story<span>.</span></>}</Typography>
          <Box className="category-rail" role="group" aria-label={ar ? 'تصفية المعرض' : 'Filter gallery'}>{filters.map(([value, label]) => <Chip key={value} label={label} clickable color={filter === value ? 'primary' : 'default'} variant={filter === value ? 'filled' : 'outlined'} onClick={() => setFilter(value)} icon={value === 'PHOTO' ? <PhotoLibraryOutlined /> : value === 'VIDEO' ? <VideocamOutlined /> : undefined} />)}</Box>

          <Box className="gallery-reference-rail" ref={railRef} aria-label={ar ? 'شريط لحظات المعرض' : 'Gallery rail'}>{items.map((item, index) => <Box component="button" type="button" key={item.id} ref={(node: HTMLButtonElement | null) => { railItems.current[index] = node; }} className={`gallery-reference-rail-card ${index === active ? 'is-active' : ''}`} onClick={() => setActive(index)} aria-current={index === active ? 'true' : undefined}>{item.mediaType === 'VIDEO' ? <Box component="video" src={item.filePath} muted preload="metadata" /> : <Box component="img" src={item.filePath} alt="" loading="lazy" />}<Box className="gallery-reference-rail-copy">{item.mediaType === 'VIDEO' ? <VideocamOutlined /> : <PhotoLibraryOutlined />}<strong>{ar ? item.title.ar : item.title.en}</strong></Box></Box>)}</Box>

          <Box className="gallery-reference-grid" key={filter}>{filtered.map((item, index) => <Box component="article" className={`gallery-reference-card gallery-reference-card-${index % 3 + 1}`} key={item.id} style={{ '--item-index': index } as CSSProperties}>{item.mediaType === 'VIDEO' ? <Box component="video" src={item.filePath} controls playsInline preload="metadata" aria-label={ar ? item.title.ar : item.title.en} /> : <Box component="img" src={item.filePath} alt={ar ? item.title.ar : item.title.en} loading="lazy" />}<Box className="gallery-reference-caption"><Box>{item.mediaType === 'VIDEO' ? <VideocamOutlined /> : <PhotoLibraryOutlined />}</Box><Typography component="h3" variant="h5">{ar ? item.title.ar : item.title.en}</Typography><Typography variant="caption">{item.mediaType}</Typography></Box></Box>)}</Box>
        </Box>
      </Box>
    </Box>
  );
}

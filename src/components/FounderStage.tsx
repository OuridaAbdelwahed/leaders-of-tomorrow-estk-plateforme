'use client';

import { ArrowBack, ArrowForward, Pause, PlayArrow } from '@mui/icons-material';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { founders, t } from '@/lib/content';

export function FounderStage({ locale }: { locale: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const founder = founders[index];
  const previous = () => setIndex((index - 1 + founders.length) % founders.length);
  const next = () => setIndex((index + 1) % founders.length);
  return (
    <Box sx={{ bgcolor: '#071215', color: 'white', borderRadius: { xs: 0, md: '40px' }, overflow: 'hidden', minHeight: { xs: 690, md: 610 }, position: 'relative' }} className="cinema-grid">
      <Box aria-hidden="true" sx={{ position: 'absolute', width: { xs: 260, md: 460 }, height: { xs: 360, md: 520 }, top: { xs: 80, md: 40 }, left: { xs: '50%', md: '28%' }, transform: 'translateX(-50%) rotate(-4deg)', borderRadius: '46% 46% 30% 30%', background: `linear-gradient(145deg, ${founder.accent}, #264f58)`, opacity: .9, transition: 'background .3s ease' }} />
      <Box component="img" src={founder.image} alt={founder.name} sx={{ position: 'absolute', zIndex: 1, width: { xs: 224, md: 360 }, height: { xs: 310, md: 470 }, top: { xs: 104, md: 64 }, left: { xs: '50%', md: '28%' }, transform: 'translateX(-50%)', objectFit: 'cover', objectPosition: 'center top', borderRadius: '46% 46% 28% 28%', filter: 'saturate(.84) contrast(1.04)', boxShadow: '0 28px 80px rgba(0,0,0,.38)' }} />
      <Box aria-hidden="true" sx={{ position: 'absolute', zIndex: 2, width: { xs: 180, md: 290 }, height: { xs: 250, md: 390 }, top: { xs: 132, md: 88 }, left: { xs: '50%', md: '28%' }, transform: 'translateX(-50%)', border: '1px solid rgba(234,181,38,.75)', borderRadius: '46% 46% 24% 24%', boxShadow: '0 0 0 8px rgba(72,128,143,.08)' }}>
        <Box sx={{ position: 'absolute', inset: '20% 18%', border: '1px solid rgba(255,255,255,.42)', borderRadius: '50% 50% 45% 45%' }} />
      </Box>
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0 48%, rgba(5,8,15,.45) 60%, rgba(5,8,15,.95) 100%)', display: { xs: 'none', md: 'block' } }} />
      <Box sx={{ position: 'relative', zIndex: 3, p: { xs: 3, sm: 5, md: 7 }, height: '100%', display: 'grid', gridTemplateColumns: { md: '1.05fr .95fr' }, alignItems: 'center' }}>
        <Box sx={{ minHeight: { xs: 390, md: 480 }, display: 'flex', alignItems: 'flex-end' }}>
          <Stack direction="row" spacing={1} alignItems="center"><span className="gold-dot" /><Typography className="eyebrow" sx={{ color: 'rgba(255,255,255,.68)' }}>SUBJECT 0{index + 1} · FRAME LOCKED</Typography></Stack>
        </Box>
        <Box className="reveal" key={index} sx={{ bgcolor: { xs: 'rgba(11,21,23,.92)', md: 'transparent' }, borderRadius: { xs: 5, md: 0 }, p: { xs: 3, md: 0 } }}>
          <Chip label={t(founder.role, locale)} sx={{ bgcolor: founder.accent, color: '#071215', fontWeight: 800, mb: 2 }} />
          <Typography variant="h2" sx={{ fontSize: { xs: 38, md: 58 }, maxWidth: 500 }}>{founder.name}</Typography>
          <Typography sx={{ mt: 1, color: '#8fc4d0', fontWeight: 700 }}>{t(founder.program, locale)}</Typography>
          <Typography sx={{ mt: 3, color: 'rgba(255,255,255,.76)', fontSize: { xs: 17, md: 20 }, maxWidth: 480 }}>{t(founder.statement, locale)}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 4 }}>
            <IconButton onClick={previous} aria-label="Previous founder" sx={{ color: 'white', border: '1px solid rgba(255,255,255,.25)' }}><ArrowBack /></IconButton>
            <IconButton onClick={() => setPaused(!paused)} aria-label={paused ? 'Play sequence' : 'Pause sequence'} sx={{ color: '#071215', bgcolor: '#EAB526', '&:hover': { bgcolor: '#d3a322' } }}>{paused ? <PlayArrow /> : <Pause />}</IconButton>
            <IconButton onClick={next} aria-label="Next founder" sx={{ color: 'white', border: '1px solid rgba(255,255,255,.25)' }}><ArrowForward /></IconButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

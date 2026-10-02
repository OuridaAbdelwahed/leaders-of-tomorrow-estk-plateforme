import { Box, Typography } from '@mui/material';
import { Decorations } from '@/components/landing';
import { Reveal } from '@/components/landing/LandingMotion';

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return <Box component="section" className="section-page-hero cinema-grid">
    <Decorations.DotPattern className="section-hero-dots" />
    <Decorations.OrbitRing className="section-hero-orbit" />
    <Box className="section-hero-gold" aria-hidden="true" />
    <Box className="container section-hero-content"><Reveal><Typography className="eyebrow" sx={{ color: '#8fc4d0' }}>{eyebrow}</Typography><Typography component="h1" variant="h1" sx={{ mt: 2, maxWidth: 900, fontSize: { xs: 48, md: 78 } }}>{title}</Typography><Typography sx={{ mt: 3, maxWidth: 700, fontSize: { xs: 17, md: 20 }, color: 'rgba(255,255,255,.7)' }}>{intro}</Typography></Reveal></Box>
    <Box className="section-hero-curve" aria-hidden="true" />
  </Box>;
}

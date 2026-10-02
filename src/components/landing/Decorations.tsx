import { Box } from '@mui/material';
import type { ReactNode } from 'react';

export function DotPattern({ className = '' }: { className?: string }) {
  return <Box className={`landing-dots ${className}`} aria-hidden="true" />;
}

export function OrbitRing({ className = '' }: { className?: string }) {
  return <Box className={`landing-orbit ${className}`} aria-hidden="true"><span /></Box>;
}

export function FloatingOrb({ className = '' }: { className?: string }) {
  return <Box className={`landing-orb ${className}`} aria-hidden="true" />;
}

export function WaveLine({ className = '' }: { className?: string }) {
  return (
    <Box component="svg" className={`landing-wave ${className}`} viewBox="0 0 220 36" fill="none" aria-hidden="true">
      <path d="M2 18C20 2 38 34 56 18S92 2 110 18s36 16 54 0 36-16 54 0" pathLength="1" />
    </Box>
  );
}

export function OrganicMedia({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Box className={`organic-media ${className}`}>{children}</Box>;
}

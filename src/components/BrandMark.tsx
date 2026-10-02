import { Box } from '@mui/material';
import Image from 'next/image';

export function BrandMark({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: compact ? 54 : { xs: 142, sm: 168 }, height: compact ? 42 : { xs: 48, sm: 54 }, position: 'relative' }} aria-label="Leaders of Tomorrow">
      <Image src={light ? '/brand/logo-white.png' : '/brand/logo-colored.png'} alt="Leaders of Tomorrow" fill sizes={compact ? '54px' : '(max-width: 600px) 142px, 168px'} style={{ objectFit: 'contain', objectPosition: 'left center' }} priority />
    </Box>
  );
}

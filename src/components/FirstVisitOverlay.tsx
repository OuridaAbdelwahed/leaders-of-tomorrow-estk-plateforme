'use client';

import { Close, Groups2Outlined, Login, PersonAddAlt1 } from '@mui/icons-material';
import { Box, Button, Dialog, DialogContent, IconButton, Stack, Typography } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMemberSession } from './MemberSession';

export function FirstVisitOverlay({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const ar = locale === 'ar';
  const { member, loading } = useMemberSession();

  useEffect(() => {
    const exempt = Boolean(member) || ['/join', '/login', '/member'].some(value => pathname.includes(value)) || window.location.search.includes('welcome=0');
    const frame = requestAnimationFrame(() => {
      if (!loading && !exempt && !sessionStorage.getItem('lot-entry-choice')) setOpen(true);
      if (exempt) setOpen(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, member, pathname]);

  const close = () => { sessionStorage.setItem('lot-entry-choice', 'later'); setOpen(false); };
  const choose = (path: 'login' | 'join') => { sessionStorage.setItem('lot-entry-choice', 'seen'); setOpen(false); router.push(`/${locale}/${path}`); };

  return <Dialog open={open} onClose={close} maxWidth="xs" fullWidth aria-labelledby="membership-choice-title" PaperProps={{ className: 'membership-choice-paper' }}>
    <DialogContent className="membership-choice-content">
      <IconButton onClick={close} aria-label={ar ? 'إغلاق' : 'Close'} className="membership-choice-close"><Close /></IconButton>
      <Box className="membership-choice-icon" aria-hidden="true"><Groups2Outlined /></Box>
      <Typography id="membership-choice-title" component="h2" variant="h4">{ar ? 'هل أنت عضو؟' : 'Êtes-vous membre ?'}</Typography>
      <Stack spacing={1.25} className="membership-choice-actions">
        <Button variant="contained" size="large" startIcon={<Login />} onClick={() => choose('login')}>Je suis membre</Button>
        <Button variant="outlined" size="large" startIcon={<PersonAddAlt1 />} onClick={() => choose('join')}>Je ne suis pas membre</Button>
      </Stack>
    </DialogContent>
  </Dialog>;
}

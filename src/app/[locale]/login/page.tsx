'use client';

import { ArrowForward, EmailOutlined, LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Checkbox, FormControlLabel, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function MemberLogin() {
  const { locale } = useParams<{ locale: string }>();
  const ar = locale === 'ar';
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/member/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
    const result = await response.json() as { error?: string; code?: string; membershipStartsAt?: string; membershipEndsAt?: string };
    setLoading(false);
    if (!response.ok) {
      if (result.code === 'MEMBERSHIP_EXPIRED') {
        const ended = result.membershipEndsAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(result.membershipEndsAt)) : undefined;
        return setError(ar ? `انتهت مدة عضويتك${ended ? ` في ${ended}` : ''}. تواصل مع النادي لتجديدها.` : `Your membership period ended${ended ? ` on ${ended}` : ''}. Contact the club to renew it.`);
      }
      if (result.code === 'MEMBERSHIP_NOT_STARTED') return setError(ar ? 'لم تبدأ مدة عضويتك بعد.' : 'Your membership period has not started yet.');
      if (result.code === 'MEMBERSHIP_SUSPENDED') return setError(ar ? 'تم تعليق حساب العضوية. تواصل مع النادي.' : 'Your membership account is suspended. Contact the club for assistance.');
      return setError(result.error || (ar ? 'تعذر تسجيل الدخول.' : 'Unable to sign in.'));
    }
    router.push(`/${locale}/member`);
    router.refresh();
  };

  return (
    <Box className="form-stage login-stage">
      <Box className="form-orbit form-orbit-one" aria-hidden="true" />
      <Box className="form-orbit form-orbit-two" aria-hidden="true" />
      <Box className="form-dot-cloud" aria-hidden="true" />
      <Box className="container login-layout">
        <Box className="login-story-panel">
          <Box className="login-lock-orbit"><LockOutlined /></Box>
          <Typography component="h1" variant="h1">{ar ? 'مرحباً بعودتك' : <>Welcome<br /><span>back</span></>}</Typography>
          <Typography>{ar ? 'ادخل إلى بطاقتك ودعواتك وسجل مساهماتك.' : 'Access your badge, invitations, and contribution history.'}</Typography>
          <Box className="login-story-dots" aria-hidden="true" />
        </Box>

        <Card component="form" onSubmit={submit} className="login-form-card form-card-special">
          <CardContent>
            <Typography className="eyebrow" color="primary.main">{ar ? 'مساحة الأعضاء' : 'MEMBER SPACE'}</Typography>
            <Typography component="h2" variant="h3">{ar ? 'سجّل الدخول إلى حسابك' : 'Sign in to your account'}</Typography>
            <Typography color="text.secondary">{ar ? 'مرحباً بك مجدداً في مجتمع قادة الغد.' : 'Welcome back to your Leaders of Tomorrow community.'}</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack spacing={2.25}>
              <TextField name="email" type="email" required label={ar ? 'البريد الإلكتروني' : 'Email address'} autoComplete="email" InputProps={{ startAdornment: <InputAdornment position="start"><Box className="field-icon"><EmailOutlined /></Box></InputAdornment> }} />
              <TextField name="password" type={show ? 'text' : 'password'} required label={ar ? 'كلمة المرور' : 'Password'} autoComplete="current-password" InputProps={{ startAdornment: <InputAdornment position="start"><Box className="field-icon"><LockOutlined /></Box></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShow(value => !value)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              <Box className="login-form-options"><FormControlLabel control={<Checkbox defaultChecked />} label={ar ? 'تذكرني' : 'Remember me'} /><Typography component="a" href="mailto:contact@leadersoftomorrowestk.com?subject=Member%20login%20help">{ar ? 'تحتاج مساعدة؟' : 'Need help?'}</Typography></Box>
              <Button type="submit" variant="contained" disabled={loading} endIcon={<ArrowForward />} className="form-submit-button">{loading ? (ar ? 'جارٍ الدخول…' : 'Signing in…') : (ar ? 'تسجيل الدخول' : 'Sign in')}</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

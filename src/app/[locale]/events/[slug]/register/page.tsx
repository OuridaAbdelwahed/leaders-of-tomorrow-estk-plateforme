'use client';

import {
  ArrowBack, ArrowForward, BadgeOutlined, CalendarMonthOutlined, CheckCircleOutline, DownloadOutlined,
  EmailOutlined, LockOutlined, MarkEmailReadOutlined, PersonOutline, PhoneOutlined, SchoolOutlined, VerifiedUserOutlined,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress, InputAdornment, ListSubheader, MenuItem, Skeleton, Stack, TextField, Typography,
} from '@mui/material';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { getAllEducationPrograms } from '@/lib/education';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove?: (id: string) => void;
      reset?: (id: string) => void;
    };
  }
}

const programs = getAllEducationPrograms();
const programGroups = [...new Set(programs.map(program => program.group))];

type PublicTicketType = { id: string; name: { en: string; ar: string }; description: { en: string; ar: string }; price: number };
type TicketResult = {
  code: string; status: 'ACTIVE' | 'WAITLIST' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'DELETED'; waitlistPosition?: number;
  qrDataUrl: string; ticketUrl: string; downloadUrl: string; ticketType: { en: string; ar: string };
  participant: { fullName: string; email: string; phone: string; studentId: string; programCode: string };
  event: { slug: string; title: { en: string; ar: string }; location: { en: string; ar: string }; startsAt: string; endsAt: string; coverPath?: string; category: string };
};
type FormState = { fullName: string; email: string; phone: string; studentId: string; programCode: string; ticketTypeId: string };
type VerificationState = { verificationToken: string; maskedEmail: string; expiresInSeconds: number; resendCooldownSeconds: number };

let turnstileScriptPromise: Promise<void> | undefined;
function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-lot-turnstile]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load security challenge.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.lotTurnstile = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load security challenge.'));
      document.head.appendChild(script);
    });
  }
  return turnstileScriptPromise;
}

function browserFingerprint() {
  if (typeof window === 'undefined') return '';
  const nav = window.navigator as Navigator & { deviceMemory?: number };
  return JSON.stringify({
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    languages: nav.languages,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    pixelRatio: window.devicePixelRatio,
    touch: nav.maxTouchPoints,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
  });
}

export default function RegistrationPage() {
  const { locale, slug } = useParams<{ locale: string; slug: string }>();
  const ar = locale === 'ar';
  const [ticket, setTicket] = useState<TicketResult>();
  const [ticketTypes, setTicketTypes] = useState<PublicTicketType[]>();
  const [form, setForm] = useState<FormState>({ fullName: '', email: '', phone: '', studentId: '', programCode: '', ticketTypeId: '' });
  const [verification, setVerification] = useState<VerificationState>();
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [step, setStep] = useState<'details' | 'otp' | 'creating'>('details');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [acceptedTicketTerms,setAcceptedTicketTerms]=useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/events/${slug}/ticket-types`, { signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load ticket types.');
      setTicketTypes(body.ticketTypes);
      setForm(current => ({ ...current, ticketTypeId: current.ticketTypeId || body.ticketTypes[0]?.id || '' }));
    }).catch(value => { if (value.name !== 'AbortError') setError(value instanceof Error ? value.message : 'Unable to load ticket types.'); });
    fetch('/api/public/security-config', { signal: controller.signal }).then(async response => response.ok && setTurnstileSiteKey((await response.json()).turnstileSiteKey || '')).catch(() => undefined);
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const update = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => setForm(value => ({ ...value, [key]: event.target.value }));

  const requestOtp = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setLoading(true); setError('');
    try {
      if(!acceptedTicketTerms) throw new Error(ar?'يجب قبول شروط التذاكر ومدونة السلوك وسياسة الخصوصية أولاً.':'You must accept the Ticket Terms, Code of Conduct, and Privacy Policy first.');
      if (turnstileSiteKey && !turnstileToken) throw new Error(ar ? 'أكمل التحقق الأمني أولاً.' : 'Please complete the security challenge first.');
      const response = await fetch(`/api/public/events/${slug}/ticket-verification/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.email, fingerprint: browserFingerprint(), turnstileToken, locale }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send verification code.');
      setVerification(result);
      setCooldown(result.resendCooldownSeconds ?? 45);
      setStep('otp');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (verificationToken: string) => {
    const response = await fetch(`/api/public/events/${slug}/registrations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, verificationToken, fingerprint: browserFingerprint(), locale, acceptedPolicies:true }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to create the ticket.');
    setTicket(result.ticket);
  };

  const verifyOtp = async (code: string) => {
    if (!verification) return;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/public/events/${slug}/ticket-verification/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.email, verificationToken: verification.verificationToken, code, fingerprint: browserFingerprint() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Invalid verification code.');
      setStep('creating');
      await createTicket(verification.verificationToken);
    } catch (value) {
      setStep('otp');
      setError(value instanceof Error ? value.message : 'Unable to verify the code.');
    } finally {
      setLoading(false);
    }
  };

  if (ticket) return <TicketSuccess ticket={ticket} locale={locale} />;
  const icon = (node: ReactNode) => <InputAdornment position="start"><Box className="field-icon">{node}</Box></InputAdornment>;

  return <Box className="form-stage registration-stage">
    <Box className="form-orbit form-orbit-one" aria-hidden="true" /><Box className="form-orbit form-orbit-two" aria-hidden="true" />
    <Box className="container registration-layout">
      <Box className="form-story-panel">
        <Typography className="eyebrow">{ar ? 'تسجيل الفعالية' : 'EVENT REGISTRATION'}</Typography>
        <Typography component="h1" variant="h1">{ar ? 'احجز مكانك.' : <>Reserve<br />your place<span>.</span></>}</Typography>
        <Typography>{ar ? 'نرسل رمز تحقق إلى بريدك الإلكتروني قبل إصدار التذكرة.' : 'We verify your email first, then issue one secure ticket for this event.'}</Typography>
      </Box>
      {step === 'creating' ? <CreatingTicketCard ar={ar} /> : step === 'otp' && verification ? <OtpVerificationCard
        ar={ar}
        maskedEmail={verification.maskedEmail}
        loading={loading}
        error={error}
        cooldown={cooldown}
        onVerify={verifyOtp}
        onBack={() => { setStep('details'); setError(''); }}
        onResend={() => requestOtp()}
      /> : <Card component="form" onSubmit={requestOtp} className="registration-form-card form-card-special">
        <CardContent>
          <Box className="form-card-heading"><Box className="form-heading-icon"><CalendarMonthOutlined /></Box><Box><Typography component="h2" variant="h3">{ar ? 'جهّز تذكرتك' : 'Get your ticket ready'}</Typography><Box className="heading-mark" /></Box></Box>
          <Typography color="text.secondary" className="form-security-note"><VerifiedUserOutlined />{ar ? 'بريد واحد وتذكرة واحدة لكل فعالية.' : 'One verified email, one ticket per event.'}</Typography>
          {error && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField name="fullName" required label={ar ? 'الاسم الكامل' : 'Full name'} autoComplete="name" value={form.fullName} onChange={update('fullName')} InputProps={{ startAdornment: icon(<PersonOutline />) }} />
            <TextField name="email" required type="email" label={ar ? 'البريد الإلكتروني' : 'Email address'} autoComplete="email" value={form.email} onChange={update('email')} InputProps={{ startAdornment: icon(<EmailOutlined />) }} />
            <TextField name="phone" required type="tel" label={ar ? 'الهاتف' : 'Phone'} autoComplete="tel" value={form.phone} onChange={update('phone')} InputProps={{ startAdornment: icon(<PhoneOutlined />) }} />
            <TextField name="studentId" required label={ar ? 'رقم الطالب' : 'Student ID'} value={form.studentId} onChange={update('studentId')} InputProps={{ startAdornment: icon(<BadgeOutlined />) }} />
            <TextField name="programCode" select required value={form.programCode} onChange={update('programCode')} label={ar ? 'المسلك / التخصص' : 'Program / field'} InputProps={{ startAdornment: icon(<SchoolOutlined />) }} SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 430 } } } }}>
              {programGroups.flatMap(group => [<ListSubheader key={`${group}-header`} disableSticky>{group}</ListSubheader>, ...programs.filter(program => program.group === group).map(program => <MenuItem key={program.value} value={program.value}>{program.code ? `${program.code} · ` : ''}{program.label}</MenuItem>)])}
            </TextField>
            {ticketTypes === undefined ? <Skeleton variant="rounded" height={56} /> : <TextField name="ticketTypeId" select required value={form.ticketTypeId} onChange={update('ticketTypeId')} label={ar ? 'نوع التذكرة' : 'Ticket type'} disabled={!ticketTypes.length}>
              {ticketTypes.map(type => <MenuItem key={type.id} value={type.id}>{ar ? type.name.ar : type.name.en} · {new Intl.NumberFormat(locale, { style: 'currency', currency: 'MAD' }).format(type.price)}</MenuItem>)}
            </TextField>}
            {ticketTypes?.length === 0 && <Alert severity="warning">{ar ? 'لا يوجد نوع تذكرة نشط لهذه الفعالية.' : 'This event has no active ticket type.'}</Alert>}
            <Box className="mandatory-consent-card">
              <Checkbox id="ticket-policy-consent" required checked={acceptedTicketTerms} onChange={event=>setAcceptedTicketTerms(event.target.checked)} inputProps={{'aria-labelledby':'ticket-policy-consent-copy'}}/>
              <Box className="mandatory-consent-content">
                <Typography id="ticket-policy-consent-copy" component="p" className="mandatory-consent-copy">
                  {ar ? <>أوافق على <Link href={`/${locale}/legal/event-ticket-terms`} target="_blank" rel="noopener noreferrer">شروط التذاكر</Link> و<Link href={`/${locale}/legal/code-of-conduct`} target="_blank" rel="noopener noreferrer">مدونة السلوك</Link>، وأقر بمعالجة بيانات التسجيل وفق <Link href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer">سياسة الخصوصية</Link>.</> : <>I agree to the <Link href={`/${locale}/legal/event-ticket-terms`} target="_blank" rel="noopener noreferrer">Ticket Terms</Link> and <Link href={`/${locale}/legal/code-of-conduct`} target="_blank" rel="noopener noreferrer">Code of Conduct</Link>, and acknowledge registration data processing under the <Link href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</>}
                </Typography>
              </Box>
            </Box>
            <TurnstileWidget siteKey={turnstileSiteKey} locale={locale} onToken={setTurnstileToken} />
            <Button type="submit" variant="contained" disabled={loading || !ticketTypes?.length || !acceptedTicketTerms} endIcon={loading ? <CircularProgress color="inherit" size={18} /> : <ArrowForward />} className="form-submit-button">{loading ? (ar ? 'نرسل الرمز…' : 'Sending code…') : (ar ? 'إرسال رمز التحقق' : 'Send verification code')}</Button>
          </Stack>
        </CardContent>
      </Card>}
    </Box>
  </Box>;
}

function TurnstileWidget({ siteKey, locale, onToken }: { siteKey: string; locale: string; onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let widgetId: string | undefined;
    let active = true;
    loadTurnstileScript().then(() => {
      if (!active || !ref.current || !window.turnstile) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: 'light',
        language: locale === 'ar' ? 'ar' : 'en',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    }).catch(() => onToken(''));
    return () => { active = false; if (widgetId && window.turnstile?.remove) window.turnstile.remove(widgetId); };
  }, [locale, onToken, siteKey]);

  if (!siteKey) return <Alert severity="info" className="ticket-security-note">Local mode: Turnstile is not configured, so the backend will skip the browser challenge outside production.</Alert>;
  return <Box className="turnstile-wrap"><div ref={ref} /></Box>;
}

function OtpVerificationCard({ ar, maskedEmail, loading, error, cooldown, onVerify, onBack, onResend }: {
  ar: boolean; maskedEmail: string; loading: boolean; error: string; cooldown: number; onVerify: (code: string) => void; onBack: () => void; onResend: () => void;
}) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join('');

  const changeDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = Array(6).fill('');
      clean.slice(0, 6).split('').forEach((digit, itemIndex) => { next[itemIndex] = digit; });
      setDigits(next);
      inputs.current[Math.min(clean.length, 6) - 1]?.focus();
      return;
    }
    setDigits(current => current.map((digit, itemIndex) => itemIndex === index ? clean : digit));
    if (clean && index < 5) inputs.current[index + 1]?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (code.length === 6) onVerify(code);
  };

  return <Box component="form" onSubmit={submit} className="otp-Form leaders-otp-card" dir={ar ? 'rtl' : 'ltr'}>
    <Button type="button" className="exitBtn leaders-otp-exit" onClick={onBack} aria-label={ar ? 'العودة' : 'Back'}><ArrowBack fontSize="small" /></Button>
    <Box className="leaders-otp-icon"><MarkEmailReadOutlined /></Box>
    <Typography className="mainHeading">{ar ? 'أدخل رمز التحقق' : 'Enter verification code'}</Typography>
    <Typography className="otpSubheading">{ar ? `أرسلنا الرمز إلى ${maskedEmail}` : `We sent the code to ${maskedEmail}`}</Typography>
    {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
    <Box className="inputContainer">
      {digits.map((digit, index) => <input
        key={index}
        ref={element => { inputs.current[index] = element; }}
        required
        inputMode="numeric"
        autoComplete={index === 0 ? 'one-time-code' : 'off'}
        maxLength={1}
        type="text"
        className="otp-input"
        value={digit}
        onChange={event => changeDigit(index, event.target.value)}
        onKeyDown={event => { if (event.key === 'Backspace' && !digit && index > 0) inputs.current[index - 1]?.focus(); }}
      />)}
    </Box>
    <Button className="verifyButton" type="submit" disabled={loading || code.length !== 6} startIcon={<LockOutlined />}>{loading ? (ar ? 'جاري التحقق…' : 'Verifying…') : (ar ? 'تأكيد' : 'Verify')}</Button>
    <Typography className="resendNote">{ar ? 'لم يصلك الرمز؟' : "Didn't receive the code?"}<Button type="button" className="resendBtn" disabled={loading || cooldown > 0} onClick={onResend}>{cooldown > 0 ? `${cooldown}s` : (ar ? 'إعادة الإرسال' : 'Resend Code')}</Button></Typography>
  </Box>;
}

function CreatingTicketCard({ ar }: { ar: boolean }) {
  return <Card className="registration-form-card form-card-special"><CardContent sx={{ minHeight: 360, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
    <Stack alignItems="center" spacing={2}>
      <Box className="leaders-otp-icon"><CheckCircleOutline /></Box>
      <CircularProgress />
      <Typography variant="h3">{ar ? 'نجهز تذكرتك…' : 'Preparing your ticket…'}</Typography>
      <Typography color="text.secondary">{ar ? 'تم تأكيد البريد الإلكتروني. لا تغلق الصفحة.' : 'Your email is verified. Please keep this page open.'}</Typography>
    </Stack>
  </CardContent></Card>;
}

function TicketSuccess({ ticket, locale }: { ticket: TicketResult; locale: string }) {
  const ar = locale === 'ar';
  const active = ticket.status === 'ACTIVE';
  const title = ar ? ticket.event.title.ar : ticket.event.title.en;
  const previewUrl = `${ticket.downloadUrl}${ticket.downloadUrl.includes('?') ? '&' : '?'}preview=1`;
  const filename = `ticket-${ticket.event.slug}-${ticket.code}.png`.toLowerCase();
  return <Box className="form-stage ticket-stage"><Box className="container ticket-confirmation-layout compact-ticket-confirmation">
    <Card className="event-ticket-card"><CardContent className="ticket-body compact-ticket-success">
      <Box><Typography className="eyebrow">{ar ? 'تذكرة الفعالية' : 'EVENT TICKET'}</Typography><Typography variant="h3">{title}</Typography></Box>
      <Box className="compact-ticket-preview"><Box component="img" src={previewUrl} alt={ar ? `تذكرة ${ticket.participant.fullName}` : `Ticket for ${ticket.participant.fullName}`} /></Box>
      <Button component="a" href={ticket.downloadUrl} download={filename} variant="contained" startIcon={<DownloadOutlined />} className="form-submit-button">{ar ? 'تحميل التذكرة' : 'Download ticket'}</Button>
    </CardContent></Card>
    <Alert severity={active ? 'success' : 'warning'}>{active ? (ar ? 'تم إصدار تذكرتك وهي صالحة.' : 'Your ticket is ready and valid.') : (ar ? `أنت في لائحة الانتظار رقم ${ticket.waitlistPosition}.` : `You are on waitlist #${ticket.waitlistPosition}.`)}</Alert>
  </Box></Box>;
}

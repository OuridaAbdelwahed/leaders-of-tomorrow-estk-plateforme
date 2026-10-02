'use client';

import { ArrowBack, ArrowForward, CalendarMonthOutlined, CheckCircle, CloudUploadOutlined, EventAvailableOutlined, EventBusyOutlined, Refresh, SchoolOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, LinearProgress, ListSubheader, MenuItem, Skeleton, Snackbar, Stack, TextField, Typography } from '@mui/material';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { educationInstitutions, getProgramsForInstitution, isValidEducationSelection } from '@/lib/education';
import { useDonationPrompt } from '@/components/donations/DonationPromptProvider';
import type { RecruitmentAvailability } from '@/features/membership/recruitment';

type Form = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  institution: string;
  program: string;
  contribution: string;
  motivation: string;
  consent: boolean;
  photoDataUrl?: string;
  cvName?: string;
};

type FormErrors = Partial<Record<keyof Form, string>>;

const empty: Form = { fullName: '', email: '', phone: '', city: '', institution: '', program: '', contribution: '50', motivation: '', consent: false };
const institutionGroups = ['Public high schools', 'Private high schools', 'Higher education & training'] as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stepFields: Record<number, Array<keyof Form>> = {
  0: ['fullName', 'email', 'phone', 'city', 'institution', 'program'],
  1: ['contribution'],
  2: ['motivation', 'consent'],
};

async function fetchRecruitmentSchedule() {
  const response = await fetch('/api/public/membership-recruitment', { cache: 'no-store' });
  const result = await response.json() as RecruitmentAvailability & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Unable to load the recruitment schedule.');
  return result;
}

function validateApplicationForm(value: Form, ar = false): FormErrors {
  const errors: FormErrors = {};
  if (value.fullName.trim().length < 3) errors.fullName = 'Full name must contain at least 3 characters.';
  if (!emailPattern.test(value.email.trim())) errors.email = 'Enter a valid email address.';
  if (value.phone.trim().length < 8) errors.phone = 'Phone number must contain at least 8 characters.';
  if (value.city.trim().length < 2) errors.city = 'City is required.';
  if (!value.institution.trim()) errors.institution = 'Choose your institution.';
  if (!value.program.trim()) errors.program = 'Choose your program or field.';
  if (value.institution && value.program && !isValidEducationSelection(value.institution, value.program)) errors.program = 'This program does not belong to the selected institution.';
  const contribution = Number(value.contribution);
  if (!Number.isFinite(contribution) || contribution < 50) errors.contribution = 'Contribution must be at least 50 MAD.';
  if (contribution > 10000) errors.contribution = 'Contribution cannot exceed 10,000 MAD.';
  if (value.motivation.trim().length < 20) errors.motivation = 'Motivation must contain at least 20 characters.';
  if (value.motivation.length > 700) errors.motivation = 'Motivation cannot exceed 700 characters.';
  if (!value.consent) errors.consent = ar ? 'يجب قبول وثائق العضوية الإلزامية والموافقة على معالجة البيانات قبل الإرسال.' : 'You must accept the mandatory membership documents and required data processing before submitting.';
  return errors;
}

export default function JoinPage() {
  const { locale } = useParams<{ locale: string }>();
  const ar = locale === 'ar';
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [availability, setAvailability] = useState<RecruitmentAvailability>();
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const { openDonationPrompt } = useDonationPrompt();
  const programOptions = getProgramsForInstitution(form.institution);
  const programGroups = [...new Set(programOptions.map(option => option.group))];
  const formErrors = validateApplicationForm(form, ar);
  const currentStepValid = stepFields[step].every(field => !formErrors[field]);
  const fieldError = (field: keyof Form) => formErrors[field] && (touched[field] || stepFields[step].includes(field)) ? formErrors[field] : '';
  const touch = (field: keyof Form) => setTouched(current => ({ ...current, [field]: true }));

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true); setScheduleError('');
    try {
      setAvailability(await fetchRecruitmentSchedule());
    } catch (scheduleLoadError) {
      setScheduleError(scheduleLoadError instanceof Error ? scheduleLoadError.message : 'Unable to load the recruitment schedule.');
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchRecruitmentSchedule()
      .then(result => { if (active) setAvailability(result); })
      .catch(scheduleLoadError => { if (active) setScheduleError(scheduleLoadError instanceof Error ? scheduleLoadError.message : 'Unable to load the recruitment schedule.'); })
      .finally(() => { if (active) setScheduleLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const draft = localStorage.getItem('lot-application-draft');
    if (!draft) return;
    const timer = window.setTimeout(() => {
      try {
        const restored = { ...empty, ...JSON.parse(draft) } as Form;
        if (!isValidEducationSelection(restored.institution, restored.program)) restored.program = '';
        setForm(restored);
      } catch {
        localStorage.removeItem('lot-application-draft');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!reference) return;
    const timer = window.setTimeout(() => {
      openDonationPrompt({
        context: 'membership_completed',
        relatedEntityId: applicationId || undefined,
        page: `/${locale}/join`,
        donorName: form.fullName,
        donorEmail: form.email,
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [applicationId, form.email, form.fullName, locale, openDonationPrompt, reference]);

  const update = (key: keyof Form, value: string | boolean) => { touch(key); setForm(current => ({ ...current, [key]: value })); };
  const updateInstitution = (institution: string) => { touch('institution'); touch('program'); setForm(current => ({ ...current, institution, program: '' })); };
  const save = () => { localStorage.setItem('lot-application-draft', JSON.stringify(form)); setSaved(true); };
  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000 || !file.type.startsWith('image/')) return setError(ar ? 'الصورة يجب أن تكون أقل من 1.5 ميغابايت.' : 'Photo must be an image smaller than 1.5 MB.');
    const reader = new FileReader();
    reader.onload = () => setForm(value => ({ ...value, photoDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(current => ({ ...current, motivation: true, consent: true }));
    if (!currentStepValid) return setError('Please correct the highlighted fields before submitting.');
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/public/membership-applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, contribution: Number(form.contribution), locale }) });
      const result = await response.json();
      if (!response.ok) {
        if (result.code === 'MEMBERSHIP_RECRUITMENT_UNAVAILABLE' && result.availability) setAvailability(result.availability);
        return setError(result.error || 'Unable to submit application.');
      }
      localStorage.removeItem('lot-application-draft');
      setApplicationId(result.id || '');
      setReference(result.reference);
    } catch {
      setError(ar ? 'تعذر إرسال الطلب. تحقق من اتصالك ثم حاول مرة أخرى.' : 'Unable to submit the application. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };
  const continueStep = () => {
    setTouched(current => ({ ...current, ...Object.fromEntries(stepFields[step].map(field => [field, true])) }));
    if (!currentStepValid) return setError('Please correct the highlighted fields before continuing.');
    setError('');
    setStep(step + 1);
  };

  if (reference) return <Box className="section"><Box className="container" sx={{ maxWidth: 720 }}><Card><CardContent sx={{ p: { xs: 4, md: 7 }, textAlign: 'center' }}><CheckCircle color="success" sx={{ fontSize: 76 }} /><Typography variant="h2" sx={{ mt: 2 }}>{ar ? 'وصل طلبك.' : 'Your application is in.'}</Typography><Typography color="text.secondary" sx={{ mt: 2 }}>{ar ? 'احتفظ بالرقم المرجعي. سنرسل تحديثات الحالة إلى بريدك الإلكتروني.' : 'Keep this reference. Status updates will be sent to your email.'}</Typography><Typography className="eyebrow" color="primary.main" sx={{ mt: 4, fontSize: 18 }}>{reference}</Typography><Button component={Link} href={`/${locale}`} variant="contained" sx={{ mt: 4 }}>{ar ? 'العودة للرئيسية' : 'Back to home'}</Button></CardContent></Card></Box></Box>;

  if (scheduleLoading) return <Box className="form-stage join-stage"><Box className="container" sx={{ position: 'relative', zIndex: 2, maxWidth: 900 }}><Card className="join-form-card"><CardContent sx={{ p: { xs: 3, md: 6 } }}><Skeleton variant="rounded" width={56} height={56} /><Skeleton width="58%" height={58} sx={{ mt: 2 }} /><Skeleton width="88%" /><Skeleton width="72%" /><Skeleton variant="rounded" height={48} sx={{ mt: 4 }} /></CardContent></Card></Box></Box>;

  if (scheduleError || !availability || availability.state !== 'OPEN') return <RecruitmentUnavailable locale={locale} availability={availability} error={scheduleError} retry={loadSchedule} />;

  const stepLabels = ar ? ['المعلومات الشخصية', 'التعليم والمساهمة', 'الدافع'] : ['Personal info', 'Education & contribution', 'Interests'];
  return <Box className="form-stage join-stage"><Box className="join-stage-glow" aria-hidden="true" /><Box className="join-stage-line" aria-hidden="true" /><Box className="container join-layout">
    <Box className="join-story-panel"><Typography className="eyebrow">{ar ? 'طلب العضوية' : 'MEMBERSHIP APPLICATION'}</Typography><Typography component="h1" variant="h1">{ar ? 'ابدأ من مكانك. سنبني القادم معاً.' : <>Start where<br />you are.<br /><span>We’ll build<br />what’s next<br />together.</span></>}</Typography><Typography>{ar ? 'مسودة تلقائية، خطوات واضحة، وبياناتك الخاصة لا تظهر للعموم.' : 'A clear three-step form with local draft saving. Your private information never appears publicly.'}</Typography><LinearProgress variant="determinate" value={(step + 1) / 3 * 100} /><Box className="join-stepper">{stepLabels.map((label, index) => <Box key={label} className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}><span>{index + 1}</span><Typography variant="caption">{label}</Typography></Box>)}</Box></Box>
    <Card component="form" onSubmit={submit} className="join-form-card form-card-special"><CardContent>
      {availability.period?.closesAt && <Alert severity="info" icon={<EventAvailableOutlined />} sx={{ mb: 3 }}>{ar ? <>باب الترشح مفتوح إلى <strong>{formatRecruitmentDate(availability.period.closesAt, locale)}</strong>.</> : <>Applications are open until <strong>{formatRecruitmentDate(availability.period.closesAt, locale)}</strong>.</>}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {step === 0 && <Stack spacing={2.5}>
        <Typography variant="h4">{ar ? 'معلوماتك الأساسية' : 'Tell us who you are'}</Typography>
        <TextField required error={Boolean(fieldError('fullName'))} helperText={fieldError('fullName') || ' '} label={ar ? 'الاسم الكامل' : 'Full name'} value={form.fullName} onBlur={() => touch('fullName')} onChange={event => update('fullName', event.target.value)} autoComplete="name" />
        <TextField required type="email" error={Boolean(fieldError('email'))} label={ar ? 'البريد الإلكتروني' : 'Email address'} value={form.email} onBlur={() => touch('email')} onChange={event => update('email', event.target.value)} autoComplete="email" helperText={fieldError('email') || (ar ? 'سيصل قرار الطلب وبيانات الحساب إلى هذا البريد.' : 'Your decision and future account credentials will be sent here.')} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 2 }}>
          <TextField required type="tel" error={Boolean(fieldError('phone'))} helperText={fieldError('phone') || ' '} label={ar ? 'الهاتف' : 'Phone'} value={form.phone} onBlur={() => touch('phone')} onChange={event => update('phone', event.target.value)} autoComplete="tel" />
          <TextField required error={Boolean(fieldError('city'))} helperText={fieldError('city') || ' '} label={ar ? 'المدينة' : 'City'} value={form.city} onBlur={() => touch('city')} onChange={event => update('city', event.target.value)} autoComplete="address-level2" />
        </Box>

        <Box className="education-path-panel">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5, minWidth: 0 }}>
            <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: '14px 5px 14px 14px', bgcolor: 'primary.main', color: 'white' }}><SchoolOutlined /></Box>
            <Box sx={{ minWidth: 0 }}><Typography fontWeight={800}>{ar ? 'مسارك الدراسي' : 'Education path'}</Typography><Typography variant="caption" color="text.secondary">{ar ? 'اختر المؤسسة أولاً لإظهار المسالك المتاحة.' : 'Choose your institution first to reveal its available programs.'}</Typography></Box>
          </Stack>
          <Stack spacing={2}>
            <TextField select required error={Boolean(fieldError('institution'))} label={ar ? 'المؤسسة التي تدرس بها' : 'Institution you study at'} value={form.institution} onBlur={() => touch('institution')} onChange={event => updateInstitution(event.target.value)} helperText={fieldError('institution') || (ar ? 'الثانويات والمؤسسات العليا ومراكز التكوين بخنيفرة.' : 'High schools, higher education, and training institutes in Khenifra.')} SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 420 } } } }}>
              {institutionGroups.flatMap(group => [
                <ListSubheader key={`${group}-header`} disableSticky>{group}</ListSubheader>,
                ...educationInstitutions.filter(institution => institution.group === group).map(institution => <MenuItem key={institution.name} value={institution.name} sx={{ whiteSpace: 'normal', gap: 1.5 }}><Typography variant="body2" sx={{ flex: 1, fontWeight: 650 }}>{institution.name}</Typography><Chip label={institution.status} size="small" color={institution.status === 'Private' ? 'secondary' : 'default'} /></MenuItem>),
              ])}
            </TextField>
            {form.institution && <TextField select required error={Boolean(fieldError('program'))} label={ar ? 'المسلك / التخصص' : 'Program / field'} value={form.program} onBlur={() => touch('program')} onChange={event => update('program', event.target.value)} helperText={fieldError('program') || (ar ? `${programOptions.length} خياراً متاحاً لهذه المؤسسة.` : `${programOptions.length} option${programOptions.length === 1 ? '' : 's'} available for this institution.`)} SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 430 } } } }}>
              {programGroups.flatMap(group => [
                <ListSubheader key={`${group}-header`} disableSticky>{group}</ListSubheader>,
                ...programOptions.filter(option => option.group === group).map(option => <MenuItem key={option.value} value={option.value} sx={{ whiteSpace: 'normal', py: 1.25 }}><Box><Typography variant="body2" fontWeight={750}>{option.code ? `${option.code} — ` : ''}{option.label}</Typography><Typography variant="caption" color="text.secondary">{[option.group, option.detail].filter(Boolean).join(' · ')}</Typography></Box></MenuItem>),
              ])}
            </TextField>}
          </Stack>
        </Box>
      </Stack>}
      {step === 1 && <Stack spacing={2.5}><Typography variant="h4">{ar ? 'صورتك ومساهمتك' : 'Your profile & contribution'}</Typography><Button component="label" variant="outlined" startIcon={<CloudUploadOutlined />} sx={{ borderStyle: 'dashed', minHeight: 96 }}>{form.photoDataUrl ? (ar ? 'تم اختيار الصورة' : 'Photo selected') : (ar ? 'حمّل صورة حسابك' : 'Upload profile photo')}<input hidden accept="image/*" type="file" onChange={uploadPhoto} /></Button><Button component="label" variant="outlined" startIcon={<CloudUploadOutlined />}>{form.cvName || (ar ? 'حمّل سيرتك الذاتية (اختياري)' : 'Upload CV (optional)')}<input hidden accept=".pdf,.doc,.docx" type="file" onChange={event => update('cvName', event.target.files?.[0]?.name || '')} /></Button><TextField select required error={Boolean(fieldError('contribution'))} label={ar ? 'المساهمة (درهم)' : 'Contribution (MAD)'} value={form.contribution} onBlur={() => touch('contribution')} onChange={event => update('contribution', event.target.value)} helperText={fieldError('contribution') || (ar ? 'الحد الأدنى للمساهمة هو 50 درهماً، وتظهر المساهمات المؤكدة داخل حساب العضو.' : 'The minimum contribution is 50 MAD. Confirmed contributions appear in your member account.')}>{[50,100,200,300,500].map(value => <MenuItem key={value} value={value}>{value} MAD</MenuItem>)}</TextField></Stack>}
      {step === 2 && <Stack spacing={2.5}>
        <Typography variant="h4">{ar ? 'لماذا تريد الانضمام؟' : 'Why do you want to join?'}</Typography>
        <TextField required multiline minRows={5} error={Boolean(fieldError('motivation'))} inputProps={{ maxLength: 700 }} label={ar ? 'الدافع' : 'Motivation'} value={form.motivation} onBlur={() => touch('motivation')} onChange={event => update('motivation', event.target.value)} helperText={fieldError('motivation') || `${form.motivation.length}/700`} />
        <Box className="mandatory-consent-card">
          <Checkbox id="membership-policy-consent" required checked={form.consent} onChange={event => update('consent', event.target.checked)} inputProps={{ 'aria-labelledby': 'membership-policy-consent-copy' }} />
          <Box className="mandatory-consent-content">
            <Typography id="membership-policy-consent-copy" component="p" className="mandatory-consent-copy">
              {ar ? <>قرأت وأوافق على <Link href={`/${locale}/legal/membership-agreement`} target="_blank" rel="noopener noreferrer">اتفاقية العضوية</Link>، و<Link href={`/${locale}/legal/internal-regulations`} target="_blank" rel="noopener noreferrer">النظام الداخلي</Link>، و<Link href={`/${locale}/legal/code-of-conduct`} target="_blank" rel="noopener noreferrer">مدونة السلوك</Link>، و<Link href={`/${locale}/legal/terms`} target="_blank" rel="noopener noreferrer">شروط الخدمة</Link>، وأوافق على معالجة بياناتي وفق <Link href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer">سياسة الخصوصية</Link>.</> : <>I have read and accept the <Link href={`/${locale}/legal/membership-agreement`} target="_blank" rel="noopener noreferrer">Membership Agreement</Link>, <Link href={`/${locale}/legal/internal-regulations`} target="_blank" rel="noopener noreferrer">Internal Regulations</Link>, <Link href={`/${locale}/legal/code-of-conduct`} target="_blank" rel="noopener noreferrer">Code of Conduct</Link>, and <Link href={`/${locale}/legal/terms`} target="_blank" rel="noopener noreferrer">Terms of Service</Link>, and consent to data processing under the <Link href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</>}
            </Typography>
            {fieldError('consent') && <Typography role="alert" variant="caption" color="error.main" className="mandatory-consent-error">{fieldError('consent')}</Typography>}
          </Box>
        </Box>
      </Stack>}
      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="space-between" gap={1.5} className="join-form-actions"><Stack direction="row" gap={1}>{step > 0 && <Button startIcon={<ArrowBack />} onClick={() => { setError(''); setStep(step - 1); }}>{ar ? 'السابق' : 'Back'}</Button>}<Button onClick={save}>{ar ? 'احفظ المسودة' : 'Save draft'}</Button></Stack>{step < 2 ? <Button variant="contained" endIcon={<ArrowForward />} onClick={continueStep} disabled={!currentStepValid}>{ar ? 'التالي' : 'Continue'}</Button> : <Button type="submit" variant="contained" disabled={loading || !currentStepValid}>{loading ? (ar ? 'جارٍ الإرسال…' : 'Submitting…') : (ar ? 'أرسل الطلب' : 'Submit application')}</Button>}</Stack>
    </CardContent></Card>
  </Box><Snackbar open={saved} autoHideDuration={3500} onClose={() => setSaved(false)} message={ar ? 'تم حفظ المسودة على هذا الجهاز.' : 'Draft saved on this device.'} /></Box>;
}

function formatRecruitmentDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));
}

function RecruitmentUnavailable({ locale, availability, error, retry }: { locale: string; availability?: RecruitmentAvailability; error?: string; retry: () => Promise<void> }) {
  const ar = locale === 'ar';
  const state = availability?.state;
  const scheduled = state === 'SCHEDULED';
  const paused = state === 'PAUSED';
  const title = error
    ? (ar ? 'تعذر التحقق من فترة الترشح' : 'We could not verify the recruitment period')
    : scheduled
      ? (ar ? 'ستنطلق فترة الترشح قريباً' : 'The next recruitment period is scheduled')
      : paused
        ? (ar ? 'طلبات العضوية متوقفة مؤقتاً' : 'Membership applications are paused')
        : (ar ? 'انتهت فترة الترشح الحالية' : 'The current recruitment period has closed');
  const description = error
    ? (ar ? 'لم نعرض الاستمارة لحماية طلبك من الضياع. أعد المحاولة بعد لحظات.' : 'The form is unavailable until the schedule can be verified, so your work is not lost after submission.')
    : scheduled && availability?.period
      ? (ar ? 'ستظهر استمارة العضوية تلقائياً عند فتح باب الترشح.' : 'The membership form will become available automatically when recruitment opens.')
      : (ar ? 'تم إيقاف الطلبات الجديدة، لكن الطلبات المرسلة سابقاً ما زالت محفوظة وقيد المعالجة.' : 'New submissions are unavailable, while previously submitted applications remain saved and under review.');
  const Icon = error ? EventBusyOutlined : scheduled ? CalendarMonthOutlined : EventBusyOutlined;
  return <Box className="form-stage join-stage" dir={ar ? 'rtl' : 'ltr'}><Box className="join-stage-glow" aria-hidden="true" /><Box className="join-stage-line" aria-hidden="true" /><Box className="container" sx={{ position: 'relative', zIndex: 2, maxWidth: 860 }}>
    <Card className="join-form-card recruitment-closed-card"><CardContent sx={{ p: { xs: 3.5, md: 7 }, textAlign: 'center' }}>
      <Box sx={{ width: 72, height: 72, mx: 'auto', display: 'grid', placeItems: 'center', borderRadius: '24px 8px 24px 24px', bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: '0 14px 32px rgba(9,91,101,.24)' }}><Icon sx={{ fontSize: 36 }} /></Box>
      <Typography className="eyebrow" color="primary.main" sx={{ mt: 3 }}>{ar ? 'فترة الانضمام' : 'MEMBERSHIP RECRUITMENT'}</Typography>
      <Typography component="h1" variant="h2" sx={{ mt: 1.2 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 2, mx: 'auto', maxWidth: 620, fontSize: '1.03rem', lineHeight: 1.75 }}>{description}</Typography>
      {scheduled && availability?.period && <Box sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: 'primary.light', border: '1px solid', borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">{ar ? 'فتح باب الترشح' : 'APPLICATIONS OPEN'}</Typography><Typography variant="h5" sx={{ mt: .5, fontVariantNumeric: 'tabular-nums' }}>{formatRecruitmentDate(availability.period.opensAt, locale)}</Typography>{availability.period.closesAt && <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{ar ? 'آخر أجل: ' : 'Closing date: '}{formatRecruitmentDate(availability.period.closesAt, locale)}</Typography>}</Box>}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={1.5} sx={{ mt: 4 }}>
        {error && <Button variant="contained" startIcon={<Refresh />} onClick={() => void retry()} sx={{ minHeight: 46 }}>{ar ? 'إعادة المحاولة' : 'Try again'}</Button>}
        <Button component={Link} href={`/${locale}`} variant={error ? 'outlined' : 'contained'} sx={{ minHeight: 46 }}>{ar ? 'العودة للرئيسية' : 'Back to home'}</Button>
        <Button component={Link} href={`/${locale}/contact`} variant="text" sx={{ minHeight: 46 }}>{ar ? 'تواصل معنا' : 'Contact the club'}</Button>
      </Stack>
    </CardContent></Card>
  </Box></Box>;
}

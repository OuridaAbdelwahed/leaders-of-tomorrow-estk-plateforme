'use client';

import { Add, CalendarMonthOutlined, EditOutlined, EventAvailableOutlined, PauseCircleOutline, SaveOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { getRecruitmentPeriodState, validateRecruitmentPeriod, type RecruitmentAvailability, type RecruitmentPeriod, type RecruitmentState } from '@/features/membership/recruitment';

type ApiResponse = { periods: RecruitmentPeriod[]; availability: RecruitmentAvailability };
type FormState = { id?: string; titleEn: string; titleAr: string; opensAt: string; closesAt: string; enabled: boolean };
const emptyForm: FormState = { titleEn: '', titleAr: '', opensAt: '', closesAt: '', enabled: true };

async function fetchRecruitmentPeriods() {
  const response = await fetch('/api/admin/membership-recruitment', { cache: 'no-store' });
  const result = await response.json() as ApiResponse & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Unable to load recruitment periods.');
  return result;
}

const stateMeta: Record<RecruitmentState, { label: string; color: 'success' | 'info' | 'default' | 'warning'; description: string }> = {
  OPEN: { label: 'Applications open', color: 'success', description: 'The public application form is accepting submissions.' },
  SCHEDULED: { label: 'Scheduled', color: 'info', description: 'The public page shows the next opening date.' },
  CLOSED: { label: 'Period closed', color: 'default', description: 'New submissions are blocked while previous applications remain available.' },
  PAUSED: { label: 'Applications paused', color: 'warning', description: 'New submissions are manually disabled.' },
};

function toInputDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function editForm(period: RecruitmentPeriod): FormState {
  return { id: period.id, titleEn: period.title.en, titleAr: period.title.ar, opensAt: toInputDate(period.opensAt), closesAt: toInputDate(period.closesAt), enabled: period.enabled };
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'No closing date';
}

export function RecruitmentPeriodsPanel({ canManage, notify, reportError, onPeriodsChange }: { canManage: boolean; notify: (message: string) => void; reportError: (message: string) => void; onPeriodsChange?: (periods: RecruitmentPeriod[]) => void }) {
  const [data, setData] = useState<ApiResponse>();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRecruitmentPeriods();
      setData(result);
      onPeriodsChange?.(result.periods);
      setForm(current => current.id ? current : result.availability.period ? editForm(result.availability.period) : emptyForm);
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Unable to load recruitment periods.');
    } finally {
      setLoading(false);
    }
  }, [onPeriodsChange, reportError]);

  useEffect(() => {
    let active = true;
    void fetchRecruitmentPeriods()
      .then(result => {
        if (!active) return;
        setData(result);
        onPeriodsChange?.(result.periods);
        setForm(result.availability.period ? editForm(result.availability.period) : emptyForm);
      })
      .catch(error => { if (active) reportError(error instanceof Error ? error.message : 'Unable to load recruitment periods.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onPeriodsChange, reportError]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }));
  const newPeriod = () => { setLocalError(''); setForm(emptyForm); };
  const save = async () => {
    const opensAt = form.opensAt ? new Date(form.opensAt).toISOString() : '';
    const closesAt = form.closesAt ? new Date(form.closesAt).toISOString() : undefined;
    const periodError = validateRecruitmentPeriod(opensAt, closesAt);
    if (periodError) return setLocalError(periodError);
    if (form.titleEn.trim().length < 3 || form.titleAr.trim().length < 3) return setLocalError('Add a clear English and Arabic name for this recruitment period.');
    setSaving(true); setLocalError(''); reportError('');
    try {
      const payload = { title: { en: form.titleEn, ar: form.titleAr }, opensAt, closesAt, enabled: form.enabled };
      const response = await fetch('/api/admin/membership-recruitment', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form.id ? { id: form.id, period: payload } : payload),
      });
      const result = await response.json() as ApiResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to save the recruitment period.');
      setData(result);
      onPeriodsChange?.(result.periods);
      const saved = form.id ? result.periods.find(period => period.id === form.id) : result.periods[0];
      if (saved) setForm(editForm(saved));
      notify(form.id ? 'Recruitment period updated.' : 'Recruitment period scheduled.');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to save the recruitment period.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card variant="outlined" sx={{ mb: 4 }}><CardContent sx={{ p: 3 }}><Skeleton width={180} height={28} /><Skeleton width="55%" /><Skeleton variant="rounded" height={150} sx={{ mt: 2 }} /></CardContent></Card>;
  if (!data) return <Alert severity="error" action={<Button color="inherit" onClick={() => void load()}>Retry</Button>} sx={{ mb: 4 }}>The recruitment schedule could not be loaded.</Alert>;

  const activeMeta = stateMeta[data.availability.state];
  return <Card variant="outlined" sx={{ mb: 4, overflow: 'hidden', borderColor: 'divider' }}>
    <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} gap={2}>
        <Stack direction="row" gap={1.5} alignItems="flex-start">
          <Box sx={{ width: 48, height: 48, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main' }}><CalendarMonthOutlined /></Box>
          <Box><Stack direction="row" flexWrap="wrap" gap={1} alignItems="center"><Typography variant="h5">Recruitment calendar</Typography><Chip label={activeMeta.label} color={activeMeta.color} size="small" /></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: .6, maxWidth: 720 }}>{activeMeta.description}</Typography></Box>
        </Stack>
        {canManage && <Button startIcon={<Add />} onClick={newPeriod}>New period</Button>}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { lg: 'minmax(0,1.25fr) minmax(270px,.75fr)' }, gap: 3, mt: 3 }}>
        <Box component="fieldset" disabled={!canManage || saving} sx={{ minWidth: 0, m: 0, p: 0, border: 0 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, gap: 2 }}>
              <TextField required label="Period name (English)" value={form.titleEn} onChange={event => set('titleEn', event.target.value)} />
              <TextField required label="اسم الفترة (العربية)" value={form.titleAr} onChange={event => set('titleAr', event.target.value)} inputProps={{ dir: 'rtl' }} />
              <TextField required type="datetime-local" label="Applications open" value={form.opensAt} onChange={event => set('opensAt', event.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField type="datetime-local" label="Applications close" value={form.closesAt} onChange={event => set('closesAt', event.target.value)} InputLabelProps={{ shrink: true }} helperText="Leave empty only when applications should remain open-ended." />
            </Box>
            <FormControlLabel control={<Switch checked={form.enabled} onChange={event => set('enabled', event.target.checked)} />} label={form.enabled ? 'Accept applications during this period' : 'Pause this period'} />
            {localError && <Alert severity="error" role="alert">{localError}</Alert>}
            {canManage && <Button variant="contained" startIcon={<SaveOutlined />} disabled={saving || !form.opensAt || !form.titleEn.trim() || !form.titleAr.trim()} onClick={() => void save()} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>{saving ? 'Saving schedule…' : form.id ? 'Save period' : 'Schedule period'}</Button>}
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0 }}><Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.2 }}>RECENT & UPCOMING PERIODS</Typography><Stack spacing={1}>
          {data.periods.slice(0, 6).map(period => {
            const state = getRecruitmentPeriodState(period, data.availability.serverNow);
            const Icon = state === 'OPEN' ? EventAvailableOutlined : state === 'PAUSED' ? PauseCircleOutline : CalendarMonthOutlined;
            return <Button key={period.id} variant={form.id === period.id ? 'outlined' : 'text'} onClick={() => { setLocalError(''); setForm(editForm(period)); }} sx={{ minHeight: 58, justifyContent: 'flex-start', textAlign: 'left', px: 1.5 }}>
              <Icon sx={{ mr: 1.25, flex: '0 0 auto' }} /><Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="body2" fontWeight={800} noWrap>{period.title.en}</Typography><Typography variant="caption" color="text.secondary">{formatDate(period.opensAt)} → {formatDate(period.closesAt)}</Typography></Box><Chip label={state} size="small" color={stateMeta[state].color} sx={{ ml: 1 }} />{form.id === period.id && <EditOutlined sx={{ ml: 1, fontSize: 18 }} />}
            </Button>;
          })}
        </Stack></Box>
      </Box>
    </CardContent>
  </Card>;
}

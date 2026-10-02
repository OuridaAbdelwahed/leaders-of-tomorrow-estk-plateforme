'use client';

import { Refresh, SaveOutlined, VolunteerActivismOutlined } from '@mui/icons-material';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, FormControlLabel, MenuItem, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatedNumber } from '@/components/AnimatedNumber';

type Donation = {
  id: string;
  publicId: string;
  context: 'membership_completed' | 'page_bottom' | 'manual';
  sourcePage?: string;
  membershipRequestId?: string;
  donorName?: string;
  donorEmailMasked?: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  providerOrderId?: string;
  providerCaptureId?: string;
  status: 'initiated' | 'pending' | 'captured' | 'failed' | 'cancelled' | 'expired' | 'refunded';
  isAnonymous: boolean;
  paidAt?: string;
  createdAt: string;
};

type Summary = {
  confirmedTotal: number;
  capturedCount: number;
  averageDonation: number;
  membershipDonations: number;
  pageDonations: number;
  pendingPayments: number;
  failedPayments: number;
  refundedDonations: number;
};

type Settings = {
  enabled: boolean;
  membershipCompletedEnabled: boolean;
  pageBottomEnabled: boolean;
  eligiblePages: string[];
  scrollThreshold: number;
  suggestedAmounts: number[];
  maximumAmount: number;
  currency: string;
  title: string;
  description: string;
  laterDays: number;
  declinedDays: number;
  donorDays: number;
  sessionLimit: number;
  anonymousAvailable: boolean;
  paypalConfigured: boolean;
  paypalMode: 'sandbox' | 'live';
};

type Filters = { context: string; status: string; page: string; anonymous: string; minAmount: string; maxAmount: string };
const emptySummary: Summary = { confirmedTotal: 0, capturedCount: 0, averageDonation: 0, membershipDonations: 0, pageDonations: 0, pendingPayments: 0, failedPayments: 0, refundedDonations: 0 };
const emptyFilters: Filters = { context: '', status: '', page: '', anonymous: '', minAmount: '', maxAmount: '' };

export function DonationsPanel({ canManage }: { canManage: boolean }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [settings, setSettings] = useState<Settings>();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [donationsResponse, settingsResponse] = await Promise.all([
        fetch(`/api/admin/donations${query ? `?${query}` : ''}`),
        fetch('/api/admin/donations/settings'),
      ]);
      const donationsBody = await donationsResponse.json();
      const settingsBody = await settingsResponse.json();
      if (!donationsResponse.ok) throw new Error(donationsBody.error || 'Unable to load donations.');
      if (!settingsResponse.ok) throw new Error(settingsBody.error || 'Unable to load donation settings.');
      setDonations(donationsBody.donations || []);
      setSummary(donationsBody.summary || emptySummary);
      setSettings(settingsBody.settings);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to load donations.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updateFilter = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(current => current ? { ...current, [key]: value } : current);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/donations/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          eligiblePages: settings.eligiblePages.map(page => page.trim()).filter(Boolean),
          suggestedAmounts: settings.suggestedAmounts.map(Number).filter(value => Number.isFinite(value) && value > 0),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save donation settings.');
      setSettings(body.settings);
      setMessage('Donation settings saved.');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to save donation settings.');
    } finally {
      setSaving(false);
    }
  };

  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} gap={2}>
      <Box>
        <Typography sx={{ color: 'primary.main', fontSize: '.68rem', fontWeight: 760, letterSpacing: '.11em' }}>OPTIONAL SUPPORT</Typography>
        <Typography variant="h3" sx={{ mt: .7 }}>Donations</Typography>
        <Typography color="text.secondary" sx={{ mt: .8, maxWidth: 760 }}>
          Track voluntary club donations and configure when the public prompt appears. Payment secrets stay in environment variables.
        </Typography>
      </Box>
      <Button startIcon={<Refresh />} onClick={load} disabled={loading}>Refresh</Button>
    </Stack>

    {error && <Alert severity="error">{error}</Alert>}
    {message && <Alert severity="success" onClose={() => setMessage('')}>{message}</Alert>}
    {settings && !settings.paypalConfigured && <Alert severity="warning">PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to the server environment before accepting live donations.</Alert>}

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
      <SummaryCard label="Confirmed donation total" value={summary.confirmedTotal} suffix={` ${settings?.currency || ''}`} />
      <SummaryCard label="Confirmed donations" value={summary.capturedCount} />
      <SummaryCard label="Average donation" value={summary.averageDonation} suffix={` ${settings?.currency || ''}`} />
      <SummaryCard label="Donations after membership" value={summary.membershipDonations} />
      <SummaryCard label="Donations from public pages" value={summary.pageDonations} />
      <SummaryCard label="Pending payments" value={summary.pendingPayments} />
      <SummaryCard label="Failed payments" value={summary.failedPayments} />
      <SummaryCard label="Refunded donations" value={summary.refundedDonations} />
    </Box>

    <Card variant="outlined">
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h5">Filters</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { md: 'repeat(6, 1fr)' }, gap: 1.5, mt: 2 }}>
          <TextField select label="Context" value={filters.context} onChange={event => updateFilter('context', event.target.value)}>
            <MenuItem value="">All</MenuItem><MenuItem value="membership_completed">After membership</MenuItem><MenuItem value="page_bottom">Page bottom</MenuItem><MenuItem value="manual">Manual</MenuItem>
          </TextField>
          <TextField select label="Status" value={filters.status} onChange={event => updateFilter('status', event.target.value)}>
            <MenuItem value="">All</MenuItem>{['initiated','pending','captured','failed','cancelled','expired','refunded'].map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}
          </TextField>
          <TextField label="Page" value={filters.page} onChange={event => updateFilter('page', event.target.value)} />
          <TextField select label="Anonymous" value={filters.anonymous} onChange={event => updateFilter('anonymous', event.target.value)}>
            <MenuItem value="">All</MenuItem><MenuItem value="true">Anonymous</MenuItem><MenuItem value="false">Named</MenuItem>
          </TextField>
          <TextField type="number" label="Min amount" value={filters.minAmount} onChange={event => updateFilter('minAmount', event.target.value)} />
          <TextField type="number" label="Max amount" value={filters.maxAmount} onChange={event => updateFilter('maxAmount', event.target.value)} />
        </Box>
      </CardContent>
    </Card>

    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
      <CardContent sx={{ p: 0 }}>
        {loading ? <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : donations.length ? <TableContainer>
          <Table sx={{ minWidth: 1160 }}>
            <TableHead><TableRow>{['Reference','Context','Donor','Amount','Status','PayPal','Related request','Date'].map(header => <TableCell key={header}>{header}</TableCell>)}</TableRow></TableHead>
            <TableBody>{donations.map(donation => <TableRow hover key={donation.id}>
              <TableCell><Typography fontWeight={850}>{donation.publicId}</Typography><Typography variant="caption" color="text.secondary">{donation.sourcePage || '—'}</Typography></TableCell>
              <TableCell><Chip size="small" label={donation.context} /></TableCell>
              <TableCell><Typography>{donation.isAnonymous ? 'Anonymous' : donation.donorName || 'Visitor'}</Typography><Typography variant="caption" color="text.secondary">{donation.isAnonymous ? 'Hidden by choice' : donation.donorEmailMasked || 'No email'}</Typography></TableCell>
              <TableCell>{donation.amount.toFixed(2)} {donation.currency}</TableCell>
              <TableCell><DonationStatusChip status={donation.status} /></TableCell>
              <TableCell><Typography variant="caption">Order: {donation.providerOrderId || '—'}</Typography><br /><Typography variant="caption">Capture: {donation.providerCaptureId || '—'}</Typography></TableCell>
              <TableCell>{donation.membershipRequestId || '—'}</TableCell>
              <TableCell>{formatDate(donation.paidAt || donation.createdAt)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer> : <Box sx={{ p: 5, textAlign: 'center' }}><VolunteerActivismOutlined color="primary" sx={{ fontSize: 48 }} /><Typography variant="h5" sx={{ mt: 1 }}>No donations yet</Typography><Typography color="text.secondary">Confirmed and attempted donations will appear here.</Typography></Box>}
      </CardContent>
    </Card>

    {settings && <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
          <Box><Typography variant="h5">Donation popup configuration</Typography><Typography color="text.secondary" sx={{ mt: .6 }}>Admins can adjust prompt behavior; PayPal credentials stay in .env.</Typography></Box>
          <Chip color={settings.paypalMode === 'live' ? 'success' : 'warning'} label={`PayPal mode: ${settings.paypalMode}`} />
        </Stack>
        <Divider sx={{ my: 2.5 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, gap: 2 }}>
          <FormControlLabel control={<Switch disabled={!canManage} checked={settings.enabled} onChange={event => updateSetting('enabled', event.target.checked)} />} label="Enable donation system" />
          <FormControlLabel control={<Switch disabled={!canManage} checked={settings.anonymousAvailable} onChange={event => updateSetting('anonymousAvailable', event.target.checked)} />} label="Allow anonymous donations" />
          <FormControlLabel control={<Switch disabled={!canManage} checked={settings.membershipCompletedEnabled} onChange={event => updateSetting('membershipCompletedEnabled', event.target.checked)} />} label="Trigger after membership completion" />
          <FormControlLabel control={<Switch disabled={!canManage} checked={settings.pageBottomEnabled} onChange={event => updateSetting('pageBottomEnabled', event.target.checked)} />} label="Trigger near bottom of public pages" />
          <TextField disabled={!canManage} type="number" label="Scroll threshold (%)" value={settings.scrollThreshold} onChange={event => updateSetting('scrollThreshold', Number(event.target.value))} inputProps={{ min: 85, max: 95 }} />
          <TextField disabled={!canManage} type="number" label="Session limit" value={settings.sessionLimit} onChange={event => updateSetting('sessionLimit', Number(event.target.value))} inputProps={{ min: 1, max: 3 }} />
          <TextField disabled={!canManage} label="Currency" value={settings.currency} onChange={event => updateSetting('currency', event.target.value.toUpperCase().slice(0, 3))} />
          <TextField disabled={!canManage} type="number" label="Maximum amount" value={settings.maximumAmount} onChange={event => updateSetting('maximumAmount', Number(event.target.value))} />
          <TextField disabled={!canManage} type="number" label="Later delay (days)" value={settings.laterDays} onChange={event => updateSetting('laterDays', Number(event.target.value))} />
          <TextField disabled={!canManage} type="number" label="No thanks delay (days)" value={settings.declinedDays} onChange={event => updateSetting('declinedDays', Number(event.target.value))} />
          <TextField disabled={!canManage} type="number" label="Post-donation delay (days)" value={settings.donorDays} onChange={event => updateSetting('donorDays', Number(event.target.value))} />
          <TextField disabled={!canManage} label="Suggested amounts" value={settings.suggestedAmounts.join(', ')} onChange={event => updateSetting('suggestedAmounts', event.target.value.split(',').map(value => Number(value.trim())).filter(Number.isFinite))} helperText={`Comma-separated ${settings.currency} amounts.`} />
          <TextField disabled={!canManage} label="Eligible pages" value={settings.eligiblePages.join(', ')} onChange={event => updateSetting('eligiblePages', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} helperText="Examples: /, /events, /gallery, /contact, /join" sx={{ gridColumn: { md: '1 / -1' } }} />
          <TextField disabled={!canManage} label="Popup title" value={settings.title} onChange={event => updateSetting('title', event.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} />
          <TextField disabled={!canManage} multiline minRows={4} label="Popup description" value={settings.description} onChange={event => updateSetting('description', event.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} />
        </Box>
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2.5 }}>
          <Button variant="contained" startIcon={<SaveOutlined />} disabled={!canManage || saving} onClick={saveSettings}>{saving ? 'Saving…' : 'Save settings'}</Button>
        </Stack>
      </CardContent>
    </Card>}
  </Stack>;
}

function SummaryCard({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return <Card variant="outlined"><CardContent sx={{ p: 2.1 }}><Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums' }}><AnimatedNumber value={Number(value.toFixed(2))} suffix={suffix} /></Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>{label}</Typography></CardContent></Card>;
}

function DonationStatusChip({ status }: { status: Donation['status'] }) {
  const color = status === 'captured' ? 'success' : status === 'pending' || status === 'initiated' ? 'warning' : status === 'refunded' ? 'info' : 'error';
  return <Chip size="small" color={color} label={status} />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

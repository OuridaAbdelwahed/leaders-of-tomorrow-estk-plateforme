'use client';

import { BlockOutlined, CheckCircleOutline, Refresh, SecurityOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminOverview } from './types';

type SecurityEvent = {
  id: string;
  eventId: string;
  eventTitle: string;
  ticketCode?: string;
  emailMasked?: string;
  riskScore: number;
  flags: string[];
  action: string;
  blocked: boolean;
  reason?: string;
  createdAt: string;
};

const actions = ['otp_requested', 'otp_verified', 'ticket_allowed', 'ticket_blocked', 'rate_limited', 'turnstile_failed'];

export function TicketSecurityPanel({ data }: { data: AdminOverview }) {
  const [eventId, setEventId] = useState('');
  const [action, setAction] = useState('');
  const [blocked, setBlocked] = useState('');
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (eventId) params.set('eventId', eventId);
    if (action) params.set('action', action);
    if (blocked) params.set('blocked', blocked);
    params.set('limit', '200');
    return params.toString();
  }, [action, blocked, eventId]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/ticket-security?${query}`, { cache: 'no-store' });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(body.error || 'Unable to load ticket security events.');
      setEvents(body.events ?? []);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to load ticket security events.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const blockedCount = events.filter(item => item.blocked).length;
  const allowedCount = events.filter(item => !item.blocked && item.action === 'ticket_allowed').length;

  return <>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} gap={2} sx={{ mb: 3.5 }}>
      <Box>
        <Typography sx={{ color: 'primary.main', fontSize: '.68rem', fontWeight: 760, letterSpacing: '.11em' }}>VISITOR SECURITY</Typography>
        <Typography variant="h3" sx={{ mt: .7 }}>Ticket security</Typography>
        <Typography color="text.secondary" sx={{ mt: .8, maxWidth: 760 }}>Review OTP requests, verified emails, blocked duplicate attempts, rate limits, and Turnstile failures by event.</Typography>
      </Box>
      <Button startIcon={<Refresh />} onClick={load} disabled={loading}>Refresh</Button>
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
      <SecurityStat icon={<SecurityOutlined />} value={events.length} label="Security events loaded" />
      <SecurityStat icon={<CheckCircleOutline />} value={allowedCount} label="Allowed ticket creations" />
      <SecurityStat icon={<BlockOutlined />} value={blockedCount} label="Blocked attempts" tone="error.main" />
    </Box>
    <Card variant="outlined" sx={{ mb: 3, boxShadow: 'none' }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
      <TextField select label="Event" value={eventId} onChange={event => setEventId(event.target.value)} sx={{ minWidth: 260 }}>
        <MenuItem value="">All events</MenuItem>
        {data.events.map(item => <MenuItem key={item.id} value={item.id}>{item.title.en}</MenuItem>)}
      </TextField>
      <TextField select label="Action" value={action} onChange={event => setAction(event.target.value)} sx={{ minWidth: 220 }}>
        <MenuItem value="">All actions</MenuItem>
        {actions.map(item => <MenuItem key={item} value={item}>{item}</MenuItem>)}
      </TextField>
      <TextField select label="Blocked" value={blocked} onChange={event => setBlocked(event.target.value)} sx={{ minWidth: 180 }}>
        <MenuItem value="">All</MenuItem>
        <MenuItem value="true">Blocked only</MenuItem>
        <MenuItem value="false">Allowed only</MenuItem>
      </TextField>
    </Stack></CardContent></Card>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {!loading && !events.length && <Alert severity="info">No ticket security events match these filters yet.</Alert>}
    <Stack spacing={1.5}>
      {events.map(item => <Card key={item.id} variant="outlined" sx={{ boxShadow: 'none' }}><CardContent sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              <Chip label={item.action} size="small" color={item.blocked ? 'error' : item.action === 'ticket_allowed' ? 'success' : 'default'} />
              <Chip label={`risk ${item.riskScore}`} size="small" variant="outlined" />
              {item.ticketCode && <Chip label={item.ticketCode} size="small" variant="outlined" />}
            </Stack>
            <Typography variant="h5" sx={{ mt: 1 }}>{item.eventTitle}</Typography>
            <Typography color="text.secondary">{item.emailMasked ?? 'No email'} · {new Date(item.createdAt).toLocaleString()}</Typography>
            {item.reason && <Typography sx={{ mt: 1 }}>{item.reason}</Typography>}
          </Box>
          <Stack direction="row" flexWrap="wrap" gap={.75} sx={{ alignContent: 'flex-start' }}>
            {item.flags.map(flag => <Chip key={flag} size="small" label={flag} />)}
          </Stack>
        </Stack>
      </CardContent></Card>)}
    </Stack>
  </>;
}

function SecurityStat({ icon, value, label, tone = 'primary.main' }: { icon: ReactNode; value: number; label: string; tone?: string }) {
  return <Card variant="outlined" sx={{ boxShadow: 'none' }}><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h4">{value}</Typography><Typography color="text.secondary">{label}</Typography></Box><Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: 'primary.light', color: tone }}>{icon}</Box></Stack></CardContent></Card>;
}

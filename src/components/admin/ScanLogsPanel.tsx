'use client';

import { DownloadOutlined, Refresh, Search } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, Pagination, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminOverview } from './types';
import { AnimatedNumber } from '@/components/AnimatedNumber';

type Summary = { totalTickets: number; totalScans: number; successfulScans: number; rejectedScans: number; uniqueValidatedTickets: number; remainingUnscannedTickets: number; duplicateScanAttempts: number; validationPercentage: number };
type Log = { id: string; scannedValue: string; scannerUserId: string; scannerName: string; scanResult: string; rejectionReason?: string; scannedAt: string; deviceInfo?: string; ipAddress?: string; ticketCode?: string; participantName?: string; ticketType?: string };
type LogsResponse = { items: Log[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
const results = ['valid','invalid','not_found','already_used','cancelled','refunded','wrong_event','expired','not_yet_valid','unauthorized','duplicate','error'];

export function ScanLogsPanel({ data }: { data: AdminOverview }) {
  const [eventId, setEventId] = useState(data.events[0]?.id ?? '');
  const [filters, setFilters] = useState({ result: '', scannerUserId: '', ticketTypeId: '', from: '', to: '', ticketCode: '', participantName: '' });
  const [page, setPage] = useState(1); const [summary, setSummary] = useState<Summary>(); const [logs, setLogs] = useState<LogsResponse>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const query = useMemo(() => { const value = new URLSearchParams({ page: String(page), pageSize: '25' }); Object.entries(filters).forEach(([key, item]) => { if (item) value.set(key, item); }); return value; }, [filters, page]);
  const load = useCallback(async () => {
    if (!eventId) return; setLoading(true); setError('');
    try {
      const [logsResponse, summaryResponse] = await Promise.all([fetch(`/api/events/${eventId}/scan-logs?${query}`, { cache: 'no-store' }), fetch(`/api/events/${eventId}/scan-summary`, { cache: 'no-store' })]);
      const logsBody = await logsResponse.json(); const summaryBody = await summaryResponse.json();
      if (!logsResponse.ok) throw new Error(logsBody.error || 'Unable to load scan logs.'); if (!summaryResponse.ok) throw new Error(summaryBody.error || 'Unable to load scan summary.');
      setLogs(logsBody); setSummary(summaryBody.summary);
    } catch (value) { setError(value instanceof Error ? value.message : 'Unable to load scan logs.'); }
    finally { setLoading(false); }
  }, [eventId, query]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const setFilter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters(current => ({ ...current, [key]: value })); };
  const eventTypes = data.ticketTypes.filter(type => type.eventId === eventId);

  return <>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'end' }} gap={2} sx={{ mb: 3 }}><Box><Typography variant="overline" color="primary">ENTRY ANALYTICS</Typography><Typography component="h1" variant="h3">Scan logs</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>Every accepted and rejected attempt, organized by event.</Typography></Box><Stack direction="row" gap={1}><Button startIcon={<Refresh />} onClick={load} disabled={loading}>Refresh</Button><Button component="a" href={eventId ? `/api/events/${eventId}/scan-logs/export?${query}` : undefined} startIcon={<DownloadOutlined />} disabled={!eventId}>Export CSV</Button></Stack></Stack>
    <TextField select fullWidth label="Event" value={eventId} onChange={event => { setEventId(event.target.value); setPage(1); }} sx={{ maxWidth: 620, mb: 2.5 }}>{data.events.map(event => <MenuItem key={event.id} value={event.id}>{event.title.en}</MenuItem>)}</TextField>
    {!eventId && <Alert severity="info">Create or select an event to view scan logs.</Alert>}
    {summary && <Box className="scan-stats-grid">{[
      ['Total tickets', summary.totalTickets, ''], ['Total scans', summary.totalScans, ''], ['Successful', summary.successfulScans, ''], ['Rejected', summary.rejectedScans, ''], ['Unique validated', summary.uniqueValidatedTickets, ''], ['Remaining', summary.remainingUnscannedTickets, ''], ['Duplicates', summary.duplicateScanAttempts, ''], ['Validation', summary.validationPercentage, '%'],
    ].map(([label, value, suffix]) => <Card variant="outlined" key={label}><CardContent><Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums' }}><AnimatedNumber value={Number(value)} suffix={String(suffix)} locale="fr" /></Typography><Typography variant="body2" color="text.secondary">{label}</Typography></CardContent></Card>)}</Box>}
    <Card variant="outlined" sx={{ my: 2.5 }}><CardContent><Box className="scan-log-filters">
      <TextField select label="Result" value={filters.result} onChange={event => setFilter('result', event.target.value)}><MenuItem value="">All results</MenuItem>{results.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
      <TextField select label="Scanner" value={filters.scannerUserId} onChange={event => setFilter('scannerUserId', event.target.value)}><MenuItem value="">All scanners</MenuItem>{data.adminUsers.map(user => <MenuItem key={user.id} value={user.id}>{user.fullName}</MenuItem>)}</TextField>
      <TextField select label="Ticket type" value={filters.ticketTypeId} onChange={event => setFilter('ticketTypeId', event.target.value)}><MenuItem value="">All types</MenuItem>{eventTypes.map(type => <MenuItem key={type.id} value={type.id}>{type.name.en}</MenuItem>)}</TextField>
      <TextField type="date" label="From" value={filters.from} onChange={event => setFilter('from', event.target.value)} InputLabelProps={{ shrink: true }} />
      <TextField type="date" label="To" value={filters.to} onChange={event => setFilter('to', event.target.value)} InputLabelProps={{ shrink: true }} />
      <TextField label="Ticket code" value={filters.ticketCode} onChange={event => setFilter('ticketCode', event.target.value)} InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }} />
      <TextField label="Participant" value={filters.participantName} onChange={event => setFilter('participantName', event.target.value)} />
    </Box></CardContent></Card>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={load}>Retry</Button>}>{error}</Alert>}
    {loading && !logs ? <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Loading scan logs" /></Box> : logs?.items.length ? <Card variant="outlined"><TableContainer><Table sx={{ minWidth: 1050 }}><TableHead><TableRow>{['Date','Participant / ticket','Type','Scanner','Result','Reason','Device / IP'].map(header => <TableCell key={header}>{header}</TableCell>)}</TableRow></TableHead><TableBody>{logs.items.map(log => <TableRow key={log.id} hover><TableCell>{new Intl.DateTimeFormat('fr', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.scannedAt))}</TableCell><TableCell><Typography fontWeight={750}>{log.participantName || 'Unknown ticket'}</Typography><Typography variant="caption" color="text.secondary">{log.ticketCode || log.scannedValue}</Typography></TableCell><TableCell>{log.ticketType || '—'}</TableCell><TableCell>{log.scannerName}</TableCell><TableCell><Chip size="small" color={log.scanResult === 'valid' ? 'success' : 'error'} label={log.scanResult} /></TableCell><TableCell>{log.rejectionReason || '—'}</TableCell><TableCell><Typography variant="caption" display="block">{log.deviceInfo || 'Unknown device'}</Typography><Typography variant="caption" color="text.secondary">{log.ipAddress || 'Unknown IP'}</Typography></TableCell></TableRow>)}</TableBody></Table></TableContainer></Card> : !loading && eventId ? <Alert severity="info">No scan attempts match these filters.</Alert> : null}
    {logs && logs.pagination.totalPages > 1 && <Stack alignItems="center" sx={{ mt: 3 }}><Pagination page={logs.pagination.page} count={logs.pagination.totalPages} onChange={(_, value) => setPage(value)} color="primary" /></Stack>}
  </>;
}

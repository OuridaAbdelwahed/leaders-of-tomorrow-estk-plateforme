'use client';

import { Add, DeleteOutline } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminOverview } from './types';

type Access = { userId: string; eventId: string; userName: string; eventName: string };
export function ScannerAccessPanel({ data }: { data: AdminOverview }) {
  const scannerRoleIds = useMemo(() => new Set(data.adminRoles.filter(role => role.permissions.includes('tickets.scan')).map(role => role.id)), [data.adminRoles]);
  const scanners = data.adminUsers.filter(user => user.active && scannerRoleIds.has(user.roleId));
  const [userId, setUserId] = useState(scanners[0]?.id ?? ''); const [eventId, setEventId] = useState(data.events[0]?.id ?? ''); const [items, setItems] = useState<Access[]>(); const [error, setError] = useState('');
  const load = useCallback(async () => { const response = await fetch('/api/admin/scanner-access', { cache: 'no-store' }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setItems(body.access); }, []);
  useEffect(() => { const timer = setTimeout(() => { void load().catch(value => setError(value instanceof Error ? value.message : 'Unable to load access.')); }, 0); return () => clearTimeout(timer); }, [load]);
  const mutate = async (method: 'POST' | 'DELETE', payload: { userId: string; eventId: string }) => { setError(''); const response = await fetch('/api/admin/scanner-access', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const body = await response.json(); if (!response.ok) return setError(body.error); await load(); };
  return <><Box sx={{ mb: 3 }}><Typography variant="overline" color="primary">SCANNER SECURITY</Typography><Typography component="h1" variant="h3">Scanner event access</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>Scanner accounts see and validate tickets only for the events assigned here.</Typography></Box>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Card variant="outlined"><CardContent><Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}><TextField select label="Scanner" value={userId} onChange={event => setUserId(event.target.value)} sx={{ flex: 1 }}>{scanners.map(user => <MenuItem key={user.id} value={user.id}>{user.fullName} · {user.email}</MenuItem>)}</TextField><TextField select label="Event" value={eventId} onChange={event => setEventId(event.target.value)} sx={{ flex: 1 }}>{data.events.map(event => <MenuItem key={event.id} value={event.id}>{event.title.en}</MenuItem>)}</TextField><Button variant="contained" startIcon={<Add />} disabled={!userId || !eventId} onClick={() => mutate('POST', { userId, eventId })}>Assign event</Button></Stack>{!scanners.length && <Alert severity="info" sx={{ mt: 2 }}>Create an active user with the Scanner role first.</Alert>}</CardContent></Card>
    <Stack spacing={1.25} sx={{ mt: 2 }}>{items?.map(item => <Card variant="outlined" key={`${item.userId}-${item.eventId}`}><CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}><Box><Typography fontWeight={800}>{item.userName}</Typography><Typography color="text.secondary">{item.eventName}</Typography></Box><IconButton color="error" aria-label={`Remove ${item.userName} from ${item.eventName}`} onClick={() => mutate('DELETE', item)}><DeleteOutline /></IconButton></CardContent></Card>)}{items?.length === 0 && <Alert severity="info">No scanner-event assignments yet.</Alert>}</Stack>
  </>;
}

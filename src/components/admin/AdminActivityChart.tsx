'use client';

import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartActiveDot, ChartTooltipContent } from '@/components/application/charts/charts-base';
import type { AdminOverview } from './types';
import { buildAdminActivity } from './adminActivity';

const series = [
  { key: 'registrations', label: 'Registrations', color: '#155E68', dash: 'solid' },
  { key: 'members', label: 'New members', color: '#B7791F', dash: 'dashed' },
  { key: 'applications', label: 'Applications', color: '#5D6D71', dash: 'dotted' },
] as const;

export function AdminActivityChart({ data }: { data: AdminOverview }) {
  const activity = buildAdminActivity(data);
  return <Card variant="outlined" sx={{ mt: 3, overflow: 'hidden' }}>
    <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} alignItems={{ md: 'flex-start' }}>
        <Box>
          <Typography variant="h5">Participation pulse</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>Database activity across the last six months.</Typography>
        </Box>
        <Stack direction="row" gap={.75} flexWrap="wrap" aria-label="Chart legend">
          {series.map(item => <Chip key={item.key} variant="outlined" label={item.label} icon={<Box component="span" sx={{ width: 15, height: 3, borderRadius: 4, bgcolor: item.color, borderTop: item.dash === 'dotted' ? `2px dotted ${item.color}` : item.dash === 'dashed' ? `2px dashed ${item.color}` : 0 }} />} />)}
        </Stack>
      </Stack>
      <Box sx={{ width: '100%', height: { xs: 260, sm: 310 }, mt: 3 }} role="img" aria-label="Monthly registrations, new members, and membership applications">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activity} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} accessibilityLayer>
            <defs>
              <linearGradient id="leadersRegistrationFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#155E68" stopOpacity={.22} /><stop offset="100%" stopColor="#155E68" stopOpacity={.015} /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E3E9EA" strokeDasharray="3 5" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#63757A', fontSize: 12 }} dy={8} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#63757A', fontSize: 12 }} />
            <Tooltip cursor={{ stroke: '#9DB0B4', strokeDasharray: '4 4' }} content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="registrations" name="Registrations" stroke="#155E68" strokeWidth={2.5} fill="url(#leadersRegistrationFill)" activeDot={<ChartActiveDot />} />
            <Area type="monotone" dataKey="members" name="New members" stroke="#B7791F" strokeWidth={2.2} strokeDasharray="7 5" fill="transparent" activeDot={<ChartActiveDot />} />
            <Area type="monotone" dataKey="applications" name="Applications" stroke="#5D6D71" strokeWidth={2} strokeDasharray="2 5" fill="transparent" activeDot={<ChartActiveDot />} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
      <Box component="table" className="sr-only" aria-label="Participation pulse data"><thead><tr><th>Month</th><th>Registrations</th><th>New members</th><th>Applications</th></tr></thead><tbody>{activity.map(row => <tr key={row.key}><td>{row.month}</td><td>{row.registrations}</td><td>{row.members}</td><td>{row.applications}</td></tr>)}</tbody></Box>
    </CardContent>
  </Card>;
}

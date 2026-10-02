'use client';

import {
  AdminPanelSettings, ApprovalOutlined, ArticleOutlined, AssessmentOutlined, CalendarMonthOutlined, CollectionsOutlined,
  CorporateFareOutlined, GroupOutlined, HowToRegOutlined, Logout, MailOutline, Menu as MenuIcon, OpenInNew, VolunteerActivismOutlined,
  QrCodeScannerOutlined, SecurityOutlined, SmartToyOutlined, SupervisorAccountOutlined,
} from '@mui/icons-material';
import { Alert, AppBar, Box, Button, Card, CardContent, Chip, Divider, Drawer, IconButton, Stack, TextField, Toolbar, Typography } from '@mui/material';
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';
import { AdminPanels } from './admin/AdminPanels';
import { AdminThemeProvider } from './admin/AdminThemeProvider';
import type { AdminOverview, AdminSection } from './admin/types';
import { Avatar as ProfileAvatar } from '@/components/base/avatar/avatar';
import { PlatformPreloader } from './PlatformPreloader';
import { ChatbotAdmin } from './admin/chatbot/ChatbotAdmin';

const navigation: Array<{ label: AdminSection; icon: ReactNode; group: 'OPERATIONS' | 'PEOPLE & SECURITY'; permission: AdminOverview['permissions'][number]; superAdminOnly?:boolean }> = [
  { label: 'Dashboard', icon: <AssessmentOutlined />, group: 'OPERATIONS', permission: 'dashboard.view' },
  { label: 'Assistant', icon: <SmartToyOutlined />, group: 'OPERATIONS', permission: 'dashboard.view', superAdminOnly:true },
  { label: 'Scanner', icon: <QrCodeScannerOutlined />, group: 'OPERATIONS', permission: 'tickets.scan' },
  { label: 'Scan logs', icon: <HowToRegOutlined />, group: 'OPERATIONS', permission: 'scan_logs.view' },
  { label: 'Scanner access', icon: <SecurityOutlined />, group: 'OPERATIONS', permission: 'roles.manage' },
  { label: 'Ticket security', icon: <SecurityOutlined />, group: 'OPERATIONS', permission: 'ticket_security.view' },
  { label: 'Events', icon: <CalendarMonthOutlined />, group: 'OPERATIONS', permission: 'events.manage' },
  { label: 'Ticket types', icon: <HowToRegOutlined />, group: 'OPERATIONS', permission: 'events.manage' },
  { label: 'Posts', icon: <ArticleOutlined />, group: 'OPERATIONS', permission: 'content.manage' },
  { label: 'Gallery', icon: <CollectionsOutlined />, group: 'OPERATIONS', permission: 'content.manage' },
  { label: 'Sponsors', icon: <CorporateFareOutlined />, group: 'OPERATIONS', permission: 'sponsorship.view' },
  { label: 'Applications', icon: <ApprovalOutlined />, group: 'PEOPLE & SECURITY', permission: 'applications.view' },
  { label: 'Finance', icon: <AssessmentOutlined />, group: 'PEOPLE & SECURITY', permission: 'finance.view' },
  { label: 'Donations', icon: <VolunteerActivismOutlined />, group: 'PEOPLE & SECURITY', permission: 'donations.view' },
  { label: 'Registrations', icon: <HowToRegOutlined />, group: 'PEOPLE & SECURITY', permission: 'registrations.view' },
  { label: 'Attendance', icon: <HowToRegOutlined />, group: 'PEOPLE & SECURITY', permission: 'attendance.view' },
  { label: 'Members', icon: <GroupOutlined />, group: 'PEOPLE & SECURITY', permission: 'members.view' },
  { label: 'Invitations', icon: <MailOutline />, group: 'PEOPLE & SECURITY', permission: 'invitations.manage' },
  { label: 'Roles', icon: <SupervisorAccountOutlined />, group: 'PEOPLE & SECURITY', permission: 'roles.manage' },
  { label: 'Audit log', icon: <SecurityOutlined />, group: 'PEOPLE & SECURITY', permission: 'audit.view' },
];

export function AdminConsole({ portal }: { portal: string }) { return <AdminThemeProvider><AdminConsoleContent portal={portal} /></AdminThemeProvider>; }

function AdminConsoleContent({ portal }: { portal: string }) {
  const [data, setData] = useState<AdminOverview>(); const [authenticated, setAuthenticated] = useState<boolean>(); const [section, setSection] = useState<AdminSection>('Dashboard'); const [drawer, setDrawer] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const visibleNavigation = data ? navigation.filter(item => (!item.superAdminOnly||data.admin.superAdmin)&&(data.permissions.includes(item.permission) || (item.label === 'Applications' && data.permissions.includes('applications.manage')) || (item.label === 'Donations' && data.permissions.includes('donations.manage')) || (item.label === 'Registrations' && data.permissions.includes('registrations.manage')) || (item.label === 'Members' && data.permissions.includes('members.manage')))) : navigation;
  const effectiveSection = data && !visibleNavigation.some(item => item.label === section) ? visibleNavigation[0]?.label ?? 'Dashboard' : section;
  const load = useCallback(async () => { const response = await fetch('/api/admin/overview', { cache: 'no-store' }); if (response.status === 401) { setAuthenticated(false); setData(undefined); return; } const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to load the operations console.'); setData(result); setAuthenticated(true); }, []);
  useEffect(() => { const timer = setTimeout(() => { void load().catch(value => setError(value instanceof Error ? value.message : 'Unable to load console.')); }, 0); return () => clearTimeout(timer); }, [load]);
  const login = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); const response = await fetch('/api/admin/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ portal, email: form.get('email'), password: form.get('password') }) }); const result = await response.json(); if (!response.ok) return setError(result.error || 'Unable to sign in.'); await load(); };
  const logout = async () => { await fetch('/api/admin/auth/logout', { method: 'POST' }); setAuthenticated(false); setData(undefined); setSection('Dashboard'); };
  if (authenticated === undefined) return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: '#F4F6F7' }}><PlatformPreloader label="Opening the operations console" /></Box>;
  if (!authenticated) return <AdminLogin onSubmit={login} error={error} />;
  const choose = (value: AdminSection) => { setSection(value); setDrawer(false); setError(''); };
  const sidebar = <Box sx={{ width: 264, minHeight: '100%', p: 2, display: 'flex', flexDirection: 'column', color: '#EAF2F3' }}><Box sx={{ px: 1, py: 1 }}><BrandMark light /></Box>{(['OPERATIONS','PEOPLE & SECURITY'] as const).map(group => <Box key={group} sx={{ mt: group === 'OPERATIONS' ? 4 : 3 }}><Typography sx={{ px: 1.5, mb: 1, color: '#789196', fontSize: '.65rem', fontWeight: 750, letterSpacing: '.12em' }}>{group}</Typography><Stack spacing={.5}>{visibleNavigation.filter(item => item.group === group).map(item => <Button key={item.label} onClick={() => choose(item.label)} startIcon={item.icon} aria-current={effectiveSection === item.label ? 'page' : undefined} sx={{ minHeight: 44, px: 1.5, justifyContent: 'flex-start', color: effectiveSection === item.label ? '#fff' : '#9DB0B4', bgcolor: effectiveSection === item.label ? 'rgba(255,255,255,.1)' : 'transparent', borderInlineStart: '2px solid', borderColor: effectiveSection === item.label ? 'secondary.main' : 'transparent', '&:hover': { bgcolor: 'rgba(255,255,255,.07)', color: '#fff' } }}>{item.label}</Button>)}</Stack></Box>)}<Box sx={{ mt: 'auto', pt: 3 }}><Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,.1)' }} /><Button href="/en" target="_blank" rel="noopener noreferrer" fullWidth startIcon={<OpenInNew />} sx={{ justifyContent: 'flex-start', color: '#9DB0B4' }}>View public site</Button><Button fullWidth startIcon={<Logout />} onClick={logout} sx={{ justifyContent: 'flex-start', mt: .5, color: '#F3A6A1' }}>Sign out</Button></Box></Box>;
  return <Box className="admin-shell" sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex' }}><Box component="aside" sx={{ display: { xs: 'none', lg: 'block' }, bgcolor: '#0B2025', position: 'sticky', top: 0, height: '100dvh', overflowY: 'auto' }}>{sidebar}</Box><Drawer open={drawer} onClose={() => setDrawer(false)} PaperProps={{ sx: { width: 264, bgcolor: '#0B2025' } }}>{sidebar}</Drawer><Box sx={{ flex: 1, minWidth: 0 }}><AppBar position="sticky" elevation={0} color="inherit" sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)' }}><Toolbar sx={{ minHeight: 64 }}><IconButton onClick={() => setDrawer(true)} sx={{ display: { lg: 'none' } }} aria-label="Open console navigation"><MenuIcon /></IconButton><Box sx={{ ml: { xs: 1, lg: 0 } }}><Typography variant="caption" color="text.secondary" display="block">Operations console</Typography><Typography fontWeight={700}>{effectiveSection}</Typography></Box><Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 'auto' }}><Chip label={data?.admin.roleName.toUpperCase() ?? 'ADMIN'} variant="outlined" color="primary" size="small" /><ProfileAvatar size="sm" initials={(data?.admin.name ?? 'AD').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()} alt={data?.admin.name ?? 'Administrator'} className="leaders-untitled-avatar" border status="online" /></Stack></Toolbar></AppBar><Box component="main" sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1420, mx: 'auto' }}>{error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>{error}</Alert>}{data ? effectiveSection==='Assistant'?<ChatbotAdmin/>:<AdminPanels section={effectiveSection} data={data} reload={load} reportError={setError} notify={setNotice} /> : <Box sx={{ py: 12, display: 'grid', placeItems: 'center' }}><PlatformPreloader compact label="Refreshing dashboard data" /></Box>}</Box></Box>{notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ position: 'fixed', zIndex: 1600, right: 24, bottom: 24, boxShadow: 8, maxWidth: 520 }}>{notice}</Alert>}</Box>;
}

function AdminLogin({ onSubmit, error }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string }) {
  return <Box className="admin-shell" sx={{ minHeight: '100dvh', bgcolor: '#0B2025', display: 'grid', placeItems: 'center', p: 2 }}><Card component="form" onSubmit={onSubmit} sx={{ width: 'min(100%, 460px)', border: 0, boxShadow: '0 32px 90px rgba(0,0,0,.28)' }}><CardContent sx={{ p: { xs: 3, sm: 5 } }}><BrandMark /><Box sx={{ width: 46, height: 46, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1.25, mt: 4 }}><AdminPanelSettings fontSize="small" /></Box><Typography variant="h3" sx={{ mt: 2.5 }}>Sign in to operations</Typography><Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Use your database-backed administrator credentials.</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Stack spacing={2}><TextField name="email" type="email" required label="Admin email" autoComplete="username" /><TextField name="password" type="password" required label="Password" autoComplete="current-password" /><Button type="submit" variant="contained" size="large">Sign in securely</Button></Stack></CardContent></Card></Box>;
}

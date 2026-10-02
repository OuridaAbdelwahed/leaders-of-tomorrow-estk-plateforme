'use client';

import {
  AccountBalanceWalletOutlined, BadgeOutlined, CalendarMonth, Check, Close, DownloadOutlined, EmailOutlined,
  EmojiEventsOutlined, LanguageOutlined, LocationOnOutlined, PhoneOutlined, SchoolOutlined, StarOutline,
  WorkspacePremiumOutlined, LogoutOutlined, LockClockOutlined,
} from '@mui/icons-material';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { EventInvitation, EventRecord, Member } from '@/lib/types';
import { t } from '@/lib/content';
import { AnimatedNumber } from '@/components/AnimatedNumber';

type Payload = { member: Omit<Member, 'passwordHash'>; invitations: Array<EventInvitation & { event?: EventRecord }> };
type MembershipBlock = { code: 'MEMBERSHIP_EXPIRED' | 'MEMBERSHIP_NOT_STARTED' | 'MEMBERSHIP_SUSPENDED'; membershipStartsAt?: string; membershipEndsAt?: string };

export default function MemberSpace() {
  const { locale } = useParams<{ locale: string }>();
  const ar = locale === 'ar';
  const router = useRouter();
  const [data, setData] = useState<Payload>();
  const [blocked, setBlocked] = useState<MembershipBlock>();
  const [error, setError] = useState('');
  const [loadedAt] = useState(() => Date.now());
  const [decline, setDecline] = useState<string>();
  const [reason, setReason] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/member/me', { cache: 'no-store' });
    const payload = await response.json();
    if (response.status === 401) return router.replace(`/${locale}/login`);
    if (response.status === 403) { setBlocked(payload as MembershipBlock); setData(undefined); return; }
    if (!response.ok) { setError(payload.error || 'Unable to load the member space.'); return; }
    setBlocked(undefined); setData(payload as Payload);
  }, [locale, router]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const respond = async (id: string, accepted: boolean) => {
    const response = await fetch(`/api/member/invitations/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accepted, reason: accepted ? undefined : reason }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error);
    setDecline(undefined); setReason(''); await load();
  };
  const logout = async () => {
    await fetch('/api/auth/member/logout', { method: 'POST' });
    router.replace(`/${locale}`);
    router.refresh();
  };

  if (blocked) return <MembershipUnavailable locale={locale} state={blocked} logout={logout} />;
  if (!data) return <Box sx={{ minHeight: 500, display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Loading member profile" /></Box>;
  const { member, invitations } = data;
  const special = member.membershipStatus === 'SPECIAL';
  const joined = new Date(member.joinedAt);
  const membershipEnd = member.membershipEndsAt ? new Date(member.membershipEndsAt) : undefined;
  const daysRemaining = membershipEnd ? Math.ceil((membershipEnd.getTime() - loadedAt) / 86_400_000) : undefined;
  const statusLabel = special ? (ar ? 'عضو مميز' : 'SPECIAL MEMBER') : (ar ? 'عضو' : 'MEMBER');
  const activities = [
    { icon: <CalendarMonth />, title: ar ? 'انضم إلى المجتمع' : 'Joined the community', detail: ar ? 'انضممت إلى قادة الغد' : 'You joined Leaders of Tomorrow', date: joined },
    { icon: <WorkspacePremiumOutlined />, title: ar ? 'حصل على شارة' : 'Badge earned', detail: member.badge, date: new Date(joined.getTime() + 86_400_000 * 28) },
    { icon: <StarOutline />, title: ar ? 'شارك في فعالية' : 'Event participation', detail: `${member.eventsAttended} ${ar ? 'فعاليات' : 'events attended'}`, date: new Date() },
  ];

  return <Box className={`member-profile-page member-profile-${special ? 'special' : 'simple'}`} dir={ar ? 'rtl' : 'ltr'}>
    <Box className="member-profile-orb member-profile-orb-one" /><Box className="member-profile-orb member-profile-orb-two" />
    <Box className="container member-profile-container">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Button variant="outlined" color="inherit" startIcon={<LogoutOutlined />} onClick={logout}>{ar ? 'تسجيل الخروج' : 'Sign out'}</Button></Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {daysRemaining !== undefined && daysRemaining <= 30 && <Alert severity="warning" sx={{ mb: 3 }}>{ar ? `ستنتهي عضويتك خلال ${daysRemaining} يومًا. تواصل مع النادي للتجديد.` : `Your membership expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Contact the club to renew it.`}</Alert>}
      <Box className="member-profile-hero">
        <Box className="member-profile-identity">
          <Box className="member-avatar-frame"><Avatar src={member.photoDataUrl} alt={member.fullName}>{member.fullName[0]}</Avatar></Box>
          <Box className="member-profile-copy">
            <Chip className="member-status-chip" label={statusLabel} size="small" />
            <Typography component="h1">{member.fullName}</Typography>
            <Chip className="member-role-chip" icon={special ? <WorkspacePremiumOutlined /> : <BadgeOutlined />} label={member.badge} />
            <Stack className="member-profile-meta" direction="row" flexWrap="wrap" gap={2.5}>
              <span><LocationOnOutlined />{member.city}</span>
              <span><CalendarMonth />{ar ? 'عضو منذ' : 'Member since'} {new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(joined)}</span>
            </Stack>
            <Box className="member-quote"><span>“</span><Typography>{member.quote}</Typography></Box>
          </Box>
        </Box>

        <Card className="member-education-card"><CardContent>
          <Box className="profile-section-icon"><SchoolOutlined /></Box>
          <Box><Typography className="profile-card-eyebrow">{ar ? 'المسار الدراسي' : 'EDUCATION PATH'}</Typography><Typography variant="h5">{member.institution}</Typography><Typography color="text.secondary">{member.program}</Typography></Box>
        </CardContent></Card>

        <Card className="member-badge-panel"><CardContent>
          <Typography className="profile-card-eyebrow">{ar ? 'معاينة شارتك' : 'YOUR BADGE PREVIEW'}</Typography>
          {member.badgeImageDataUrl ? <Box component="img" src={member.badgeImageDataUrl} alt={`${member.fullName} digital membership badge`} className="member-badge-art" /> : <Box className="member-badge-pending"><BadgeOutlined /><Typography>{ar ? 'الشارة قيد الإعداد' : 'Badge artwork pending'}</Typography></Box>}
          <Button component="a" href={member.badgeImageDataUrl || undefined} download={`${member.fullName.replaceAll(' ', '-')}-badge.png`} disabled={!member.badgeImageDataUrl} fullWidth variant="outlined" startIcon={<DownloadOutlined />}>{ar ? 'تحميل الشارة' : 'Download badge'}</Button>
        </CardContent></Card>
      </Box>

      <Box className="member-metrics-strip">
        <Metric icon={<BadgeOutlined />} value={member.badge} label={ar ? 'الشارة الحالية' : 'Current badge'} />
        <Metric icon={<AccountBalanceWalletOutlined />} value={<><AnimatedNumber value={member.totalContributions} locale={locale} /> MAD</>} label={ar ? 'إجمالي المساهمات' : 'Total contributions'} />
        <Metric icon={<CalendarMonth />} value={membershipEnd ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(membershipEnd) : (ar ? 'بدون تاريخ انتهاء' : 'No end date')} label={ar ? 'صالحة إلى' : 'Valid until'} />
        <Metric icon={<StarOutline />} value={<AnimatedNumber value={member.eventsAttended} locale={locale} />} label={ar ? 'الفعاليات المحضورة' : 'Events attended'} />
      </Box>

      <Box className="member-profile-grid">
        <ProfileCard title={ar ? 'عني' : 'ABOUT ME'} icon={<BadgeOutlined />}>
          <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>{member.bio}</Typography>
          <Stack className="member-contact-list">
            <a href={`mailto:${member.email}`}><EmailOutlined /><span>{member.email}</span></a>
            <a href={`tel:${member.phone.replace(/\s/g, '')}`}><PhoneOutlined /><span>{member.phone}</span></a>
            <span><LocationOnOutlined /><span>{member.city}</span></span>
            {member.website && <a href={member.website} target="_blank" rel="noreferrer"><LanguageOutlined /><span>{member.website}</span></a>}
          </Stack>
        </ProfileCard>
        <ProfileCard title={ar ? 'النشاط الأخير' : 'RECENT ACTIVITY'} icon={<StarOutline />}>
          <Stack className="member-timeline">{activities.map((activity, index) => <Box className="member-timeline-item" key={activity.title}><Box className="member-timeline-icon">{activity.icon}</Box><Box><Typography fontWeight={850}>{activity.title}</Typography><Typography variant="body2" color="text.secondary">{activity.detail}</Typography></Box><Typography variant="caption" color="text.secondary">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(activity.date)}</Typography>{index < activities.length - 1 && <span className="member-timeline-line" />}</Box>)}</Stack>
        </ProfileCard>
        <ProfileCard title={ar ? 'الإنجازات' : 'ACHIEVEMENTS'} icon={<EmojiEventsOutlined />}>
          <Box className="member-achievements">
            <Achievement icon={<BadgeOutlined />} title="Community Builder" tone="teal" />
            <Achievement icon={<StarOutline />} title={special ? member.badge : 'Active Member'} tone="purple" />
            <Achievement icon={<WorkspacePremiumOutlined />} title={member.totalContributions >= 100 ? 'Top Contributor' : 'Community Supporter'} tone="gold" />
          </Box>
        </ProfileCard>
        <ProfileCard title={ar ? 'المهارات والاهتمامات' : 'SKILLS & INTERESTS'} icon={<WorkspacePremiumOutlined />}>
          <Stack direction="row" flexWrap="wrap" gap={1}>{member.skills.map((skill, index) => <Chip key={skill} label={skill} className={`member-skill member-skill-${index % 3}`} />)}</Stack>
        </ProfileCard>
      </Box>

      <Box sx={{ mt: { xs: 5, md: 7 } }}><Typography className="profile-card-eyebrow">{ar ? 'المشاركة' : 'PARTICIPATION'}</Typography><Typography variant="h3" sx={{ mb: 3 }}>{ar ? 'دعوات الفعاليات' : 'Event invitations'}</Typography><Box sx={{ display: 'grid', gap: 2 }}>{invitations.length ? invitations.map(invitation => <Card key={invitation.id} className="member-invitation-card"><CardContent sx={{ p: 3, display: 'grid', gridTemplateColumns: { md: '1fr auto' }, alignItems: 'center', gap: 3 }}><Box><Stack direction="row" gap={1} alignItems="center"><Typography variant="h5">{invitation.event ? t(invitation.event.title, locale) : 'Event'}</Typography><Chip size="small" label={invitation.status} color={invitation.status === 'ACCEPTED' ? 'success' : invitation.status === 'PENDING' ? 'warning' : 'default'} /></Stack>{invitation.event && <Typography color="text.secondary" sx={{ mt: 1 }}>{new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(invitation.event.startsAt))} · {t(invitation.event.location, locale)}</Typography>}{invitation.reason && <Typography variant="body2" sx={{ mt: 1 }}>{ar ? 'السبب:' : 'Reason:'} {invitation.reason}</Typography>}</Box>{invitation.status === 'PENDING' && <Stack direction="row" gap={1}><Button variant="contained" color="success" startIcon={<Check />} onClick={() => respond(invitation.id, true)}>{ar ? 'أؤكد' : 'Accept'}</Button><Button color="error" startIcon={<Close />} onClick={() => setDecline(invitation.id)}>{ar ? 'أعتذر' : 'Decline'}</Button></Stack>}</CardContent></Card>) : <Alert severity="info">{ar ? 'لا توجد دعوات حالياً.' : 'No invitations right now.'}</Alert>}</Box></Box>
    </Box>
    <Dialog open={Boolean(decline)} onClose={() => setDecline(undefined)} fullWidth maxWidth="sm"><DialogTitle>{ar ? 'لماذا لا يمكنك المشاركة؟' : 'Why can’t you participate?'}</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>{ar ? 'سيساعد السبب الفريق على اختيار عضو آخر مناسب.' : 'Your reason helps the team invite another suitable member.'}</Typography><TextField autoFocus required multiline minRows={3} label={ar ? 'سبب الاعتذار' : 'Reason for declining'} value={reason} onChange={event => setReason(event.target.value)} /></DialogContent><DialogActions><Button onClick={() => setDecline(undefined)}>{ar ? 'إلغاء' : 'Cancel'}</Button><Button variant="contained" color="error" disabled={!reason.trim()} onClick={() => decline && respond(decline, false)}>{ar ? 'تأكيد الاعتذار' : 'Confirm decline'}</Button></DialogActions></Dialog>
  </Box>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) { return <Box className="member-metric"><Box className="member-metric-icon">{icon}</Box><Box><Typography variant="caption">{label}</Typography><Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography></Box></Box>; }
function ProfileCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <Card className="member-profile-card"><CardContent><Stack direction="row" gap={1.5} alignItems="center" className="member-card-title"><Box>{icon}</Box><Typography>{title}</Typography></Stack>{children}</CardContent></Card>; }
function Achievement({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: string }) { return <Box className="member-achievement"><Box className={`member-achievement-icon member-achievement-${tone}`}>{icon}</Box><Typography fontWeight={850}>{title}</Typography><Typography variant="caption" color="text.secondary">Earned 2024</Typography></Box>; }

function MembershipUnavailable({ locale, state, logout }: { locale: string; state: MembershipBlock; logout: () => Promise<void> }) {
  const ar = locale === 'ar';
  const expired = state.code === 'MEMBERSHIP_EXPIRED';
  const scheduled = state.code === 'MEMBERSHIP_NOT_STARTED';
  const title = expired ? (ar ? 'انتهت مدة عضويتك' : 'Your membership period has ended') : scheduled ? (ar ? 'لم تبدأ مدة العضوية بعد' : 'Your membership period has not started') : (ar ? 'تم تعليق العضوية' : 'Your membership is suspended');
  const detail = expired ? (ar ? 'تم إيقاف الوصول إلى مزايا العضوية وحساب العضو تلقائيًا. تواصل مع النادي لتجديد المدة.' : 'Access to member benefits and the member space has been locked automatically. Contact the club to renew your period.') : scheduled ? (ar ? 'سيصبح حسابك متاحًا تلقائيًا عند بداية مدة العضوية.' : 'Your account will become available automatically when the membership period starts.') : (ar ? 'تواصل مع إدارة النادي لاستعادة الوصول.' : 'Contact the club administration to restore access.');
  const boundary = expired ? state.membershipEndsAt : state.membershipStartsAt;
  return <Box className="membership-unavailable" dir={ar ? 'rtl' : 'ltr'}><Card variant="outlined"><CardContent><Box className="membership-unavailable-icon" aria-hidden="true"><LockClockOutlined /></Box><Typography className="eyebrow" color="error.main">{expired ? (ar ? 'انتهت الصلاحية' : 'MEMBERSHIP EXPIRED') : (ar ? 'الوصول غير متاح' : 'ACCESS UNAVAILABLE')}</Typography><Typography component="h1" variant="h3">{title}</Typography><Typography color="text.secondary">{detail}</Typography>{boundary && <Box className="membership-unavailable-date"><CalendarMonth /><span>{expired ? (ar ? 'انتهت في' : 'Ended on') : (ar ? 'تبدأ في' : 'Starts on')}</span><strong>{new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(boundary))}</strong></Box>}<Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25}><Button component="a" href="mailto:contact@leadersoftomorrowestk.com?subject=Membership%20renewal" variant="contained">{ar ? 'طلب تجديد العضوية' : 'Request membership renewal'}</Button><Button variant="outlined" startIcon={<LogoutOutlined />} onClick={logout}>{ar ? 'تسجيل الخروج' : 'Sign out'}</Button></Stack></CardContent></Card></Box>;
}

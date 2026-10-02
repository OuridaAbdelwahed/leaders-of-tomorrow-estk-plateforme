'use client';

import { AlternateEmail, ArrowForward, CalendarMonthOutlined, Close, CodeRounded, DarkModeOutlined, DescriptionOutlined, EmailOutlined, Facebook, GitHub, Handshake, HomeOutlined, Instagram, Language, LightModeOutlined, LinkedIn, LocationOnOutlined, LoginOutlined, Menu, PersonOutline, PhotoLibraryOutlined, PolicyOutlined, SendOutlined, ShieldOutlined } from '@mui/icons-material';
import { AppBar, Box, Button, Drawer, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';
import { FirstVisitOverlay } from './FirstVisitOverlay';
import { TikTokIcon } from './SocialIcons';
import { useColorMode } from '@/theme/AppThemeProvider';
import { MemberSessionProvider, type PublicMember, useMemberSession } from './MemberSession';
import { DonationBottomTrigger, DonationPromptProvider } from './donations/DonationPromptProvider';
import { CampaignPlacement } from './sponsorship/CampaignPlacement';
import { CookieConsentBanner } from './legal/CookieConsentBanner';
import { LegalDocumentOverlay } from './legal/LegalDocumentOverlay';
import dynamic from 'next/dynamic';

const ChatbotWidget = dynamic(() => import('./chatbot/ChatbotWidget'), { ssr: false });

const links = [
  ['', 'Home', 'الرئيسية'],
  ['events', 'Events', 'الفعاليات'],
  ['student-discounts', 'Offers', 'عروض الطلاب'],
  ['sponsors', 'Partner with us', 'كن شريكًا'],
  ['gallery', 'Gallery', 'المعرض'],
  ['contact', 'Contact', 'تواصل'],
] as const;

const footerLinks = [
  ['student-discounts', 'Student offers', 'عروض الطلاب', DescriptionOutlined],
  ['sponsors', 'Become a sponsor', 'كن شريكًا', Handshake],
  ['', 'Home', 'الرئيسية', HomeOutlined],
  ['events', 'Events', 'الفعاليات', CalendarMonthOutlined],
  ['gallery', 'Gallery', 'المعرض', PhotoLibraryOutlined],
  ['contact', 'Contact', 'تواصل', SendOutlined],
] as const;

const clubSocials = [
  ['Instagram', 'https://www.instagram.com/club_leadersoftomorrow_estk/', Instagram],
  ['TikTok', 'https://www.tiktok.com/@leaders_of_tomorrow_club', TikTokIcon],
  ['LinkedIn', 'https://www.linkedin.com/company/club-leaders-of-tomorrow-', LinkedIn],
  ['Email', 'mailto:contact@leadersoftomorrowestk.com', EmailOutlined],
] as const;

const developerSocials = [
  ['LinkedIn', 'https://www.linkedin.com/in/ourida-abdelwahed/', LinkedIn],
  ['GitHub', 'https://github.com/OuridaAbdelwahed', GitHub],
  ['Instagram', 'https://www.instagram.com/1bdul__?igsh=MTBvaTh6b282OXppZw==', Instagram],
  ['Facebook', 'https://web.facebook.com/abdelwahed.wydadi.5', Facebook],
  ['Threads', 'https://www.threads.com/@1bdul__', AlternateEmail],
  ['TikTok', 'https://www.tiktok.com/@o1abdul_?_r=1&_t=ZS-98EWGJLIAlh', TikTokIcon],
  ['Portfolio', 'https://ouridaabdelwahed.github.io/', Language],
] as const;

export function PublicShell(props: { locale: string; children: ReactNode; partnerMarks: [string, string, string][]; initialMember?: PublicMember | null }) {
  return <MemberSessionProvider initialMember={props.initialMember}><DonationPromptProvider locale={props.locale}><PublicShellContent {...props} /></DonationPromptProvider></MemberSessionProvider>;
}

function PublicShellContent({ locale, children, partnerMarks }: { locale: string; children: ReactNode; partnerMarks: [string, string, string][]; initialMember?: PublicMember | null }) {
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { mode, toggleMode } = useColorMode();
  const { member, loading } = useMemberSession();
  const pathname = usePathname();
  const ar = locale === 'ar';
  const home = pathname === `/${locale}` || pathname === `/${locale}/`;
  const alternate = ar ? 'en' : 'ar';
  const altPath = `/${alternate}${pathname.replace(/^\/(en|ar)/, '')}`;

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const hrefFor = (slug: string) => slug ? `/${locale}/${slug}` : `/${locale}`;
  const active = (slug: string) => slug ? pathname.includes(`/${slug}`) : home;
  const partnershipFormRoute = pathname.endsWith('/sponsors') || pathname.endsWith('/become-a-sponsor');

  return (
    <Box className={ar ? 'rtl' : ''} dir={ar ? 'rtl' : 'ltr'}>
      <AppBar position="sticky" elevation={0} color="transparent" className={`public-navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <Toolbar className="container nav-surface" disableGutters>
          <Box className="nav-glow" aria-hidden="true" />
          <Link href={`/${locale}`} aria-label={ar ? 'الصفحة الرئيسية' : 'Home'} className="nav-brand"><BrandMark light={mode === 'dark'} /></Link>
          <Stack direction="row" spacing={.25} className="desktop-navigation" sx={{ ml: ar ? 0 : 'auto', mr: ar ? 'auto' : 0 }}>
            {links.map(([slug, en, arabic]) => (
              <Button key={slug || 'home'} component={Link} href={hrefFor(slug)} aria-current={active(slug) ? 'page' : undefined} color="inherit" className={active(slug) ? 'nav-link-active' : ''}>
                {ar ? arabic : en}
              </Button>
            ))}
          </Stack>
          <Box className="nav-actions">
            <IconButton component={Link} href={altPath} aria-label={ar ? 'English' : 'العربية'}><Language /></IconButton>
            <IconButton onClick={toggleMode} aria-label={ar ? 'تغيير المظهر' : `Switch to ${mode === 'light' ? 'dark' : 'light'} mode`} aria-pressed={mode === 'dark'} className="theme-toggle">{mode === 'light' ? <DarkModeOutlined /> : <LightModeOutlined />}</IconButton>
            {loading ? <Box className="member-session-placeholder" aria-hidden="true" /> : member ? <MemberProfileChip locale={locale} member={member} /> : <>
              <Button component={Link} href={`/${locale}/login`} variant="outlined" startIcon={<LoginOutlined />} className="member-login-button">{ar ? 'دخول الأعضاء' : 'Member login'}</Button>
              <Button component={Link} href={`/${locale}/join`} variant="contained" startIcon={<PersonOutline />} className="join-nav-button">{ar ? 'انضم إلينا' : 'Join us'}</Button>
            </>}
            <IconButton aria-label={ar ? 'فتح القائمة' : 'Open navigation'} onClick={() => setDrawer(true)} className="mobile-menu-button"><Menu /></IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor={ar ? 'left' : 'right'} open={drawer} onClose={() => setDrawer(false)} PaperProps={{ className: 'public-drawer' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}><BrandMark light={mode === 'dark'} /><IconButton onClick={() => setDrawer(false)} aria-label={ar ? 'إغلاق' : 'Close'}><Close /></IconButton></Box>
        <Stack spacing={.5}>{links.map(([slug, en, arabic]) => <Button key={slug || 'home'} component={Link} href={hrefFor(slug)} aria-current={active(slug) ? 'page' : undefined} onClick={() => setDrawer(false)} sx={{ justifyContent: 'flex-start', fontSize: 17, color: active(slug) ? 'primary.main' : 'text.secondary' }}>{ar ? arabic : en}</Button>)}</Stack>
        <Stack spacing={1.25} sx={{ mt: 3 }}>
          {member ? <MemberProfileChip locale={locale} member={member} drawer onClick={() => setDrawer(false)} /> : <>
            <Button component={Link} href={`/${locale}/login`} onClick={() => setDrawer(false)} variant="outlined" startIcon={<LoginOutlined />}>{ar ? 'دخول الأعضاء' : 'Member login'}</Button>
            <Button component={Link} href={`/${locale}/join`} onClick={() => setDrawer(false)} variant="contained" startIcon={<PersonOutline />}>{ar ? 'طلب العضوية' : 'Membership application'}</Button>
          </>}
        </Stack>
      </Drawer>

      <FirstVisitOverlay locale={locale} />
      <CookieConsentBanner locale={locale} />
      <LegalDocumentOverlay locale={locale} />
      <main id="main-content">{children}</main>
      {!partnershipFormRoute && <CampaignPlacement placement="POPUP" variant="popup" />}
      <DonationBottomTrigger />
      {!partnershipFormRoute && <Box className="container"><CampaignPlacement placement="FOOTER" variant="carousel" /></Box>}

      {!partnershipFormRoute && partnerMarks.length > 0 && <Box component="section" className="global-partners" aria-labelledby="global-partners-title">
        <Box className="partner-orbit" aria-hidden="true" />
        <Box className="container global-partners-heading"><Typography className="eyebrow" color="primary.main">{ar ? 'شركاؤنا وداعمونا' : 'OUR PARTNERS & SUPPORTERS'}</Typography><Typography id="global-partners-title" variant="h3">{ar ? 'أقوى معاً' : 'Stronger together'}</Typography></Box>
        <Box className="partner-marquee" aria-label={ar ? 'شعارات الشركاء' : 'Partner logos'}><Box className="partner-marquee-track">{[0, 1].map(setIndex => <Box className="partner-marquee-set" key={setIndex} aria-hidden={setIndex === 1 ? 'true' : undefined}>{partnerMarks.map(([src, alt, sponsorSlug]) => <Box component={Link} href={`/${locale}/sponsors/${sponsorSlug}`} className="partner-logo-item" key={`${setIndex}-${src}`} aria-label={setIndex === 0 ? alt : undefined} tabIndex={setIndex === 1 ? -1 : undefined}><Box component="img" src={src} alt={setIndex === 0 ? alt : ''} loading="lazy" draggable={false} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} /></Box>)}</Box>)}</Box></Box>
      </Box>}

      <Box component="footer" className="public-footer cinematic-footer">
        <Box className="footer-ambient footer-ambient-one" aria-hidden="true" />
        <Box className="footer-ambient footer-ambient-two" aria-hidden="true" />
        <Box className="footer-dot-field" aria-hidden="true" />
        <Box className="footer-gold-line" aria-hidden="true" />
        <Box className="container footer-main-frame">
          <Box className="footer-brand-column">
            <Box className="footer-brand-lockup" dir="ltr"><BrandMark light /><Box className="footer-logo-divider" /><Box component="img" src="/brand/logo-estk.png" alt="EST Khenifra and Université Sultan Moulay Slimane" /></Box>
            <Typography>{ar ? 'مجتمع طلابي يحوّل الإمكانات إلى أثر واضح ومستدام.' : 'A student community turning potential into visible, lasting impact.'}</Typography>
            <Box className="footer-accent-rule" />
            <Box className="footer-socials" aria-label={ar ? 'روابط النادي الاجتماعية' : 'Club social links'}>{clubSocials.map(([label, href, Icon]) => <IconButton key={label} component="a" href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'} aria-label={label}><Icon /></IconButton>)}</Box>
            <Button component={Link} href={member ? `/${locale}/member` : `/${locale}/login`} variant="outlined" startIcon={<PersonOutline />} endIcon={<ArrowForward />} className="footer-member-button">{member ? (ar ? 'ملفي الشخصي' : 'My profile') : (ar ? 'مساحة الأعضاء' : 'Member space')}</Button>
          </Box>

          <Box className="footer-link-column">
            <Box className="footer-column-heading"><Box><PersonOutline /></Box><Typography variant="h5">{ar ? 'روابط سريعة' : 'Quick links'}</Typography></Box>
            <Stack>{footerLinks.map(([slug, en, arabic, Icon]) => <Button key={slug || 'home'} component={Link} href={hrefFor(slug)} className="footer-rich-link"><Box className="footer-link-icon"><Icon /></Box><span>{ar ? arabic : en}</span><ArrowForward /></Button>)}</Stack>
          </Box>

          <Box className="footer-info-column">
            <Box className="footer-column-heading footer-column-heading-gold"><Box><ShieldOutlined /></Box><Typography variant="h5">{ar ? 'الموارد' : 'Resources'}</Typography></Box>
            <Stack>{[['become-a-sponsor', 'Become a sponsor', 'كن شريكاً', Handshake], ['legal', 'Legal & trust center', 'المركز القانوني والثقة', PolicyOutlined], ['legal/privacy', 'Privacy', 'الخصوصية', ShieldOutlined], ['legal/terms', 'Terms', 'الشروط', DescriptionOutlined]].map(([slug, en, arabic, Icon]) => <Button key={String(slug)} component={Link} href={`/${locale}/${slug}`} className="footer-rich-link"><Box className="footer-link-icon"><Icon /></Box><span>{ar ? String(arabic) : String(en)}</span><ArrowForward /></Button>)}</Stack>
            <Box className="footer-contact-block"><Box className="footer-column-heading"><Box><SendOutlined /></Box><Typography variant="h5">{ar ? 'تواصل معنا' : 'Contact us'}</Typography></Box><Typography><LocationOnOutlined />Khenifra, Morocco</Typography><Typography component="a" href="mailto:contact@leadersoftomorrowestk.com"><EmailOutlined />contact@leadersoftomorrowestk.com</Typography></Box>
          </Box>
        </Box>

        <Box className="container footer-lower-panel">
          <Box className="footer-quote"><Typography component="span">“</Typography><Typography>{ar ? 'نُمكّن طلاب اليوم ليقودوا الغد.' : 'Empowering today’s students to lead tomorrow.'}</Typography></Box>
          <Box className="footer-developer"><Box className="footer-code-icon"><CodeRounded /></Box><Typography>{ar ? 'تم التطوير بحب بواسطة' : 'Developed with care by'} <Box component="a" href="https://www.linkedin.com/in/ourida-abdelwahed/" target="_blank" rel="noopener noreferrer">OURIDA ABDELWAHED</Box></Typography></Box>
          <Box className="developer-socials" aria-label="Developer links">{developerSocials.map(([label, href, Icon]) => <IconButton key={label} component="a" href={href} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon /></IconButton>)}</Box>
        </Box>
        <Box className="footer-copyright-pill"><span />© 2026 <strong>Leaders of Tomorrow</strong> ESTK. {ar ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}<span /></Box>
      </Box>
      <ChatbotWidget locale={locale} />
    </Box>
  );
}

type ProfileMember = Pick<import('@/lib/types').Member, 'fullName' | 'membershipStatus' | 'photoDataUrl'>;

function MemberProfileChip({ locale, member, drawer = false, onClick }: { locale: string; member: ProfileMember; drawer?: boolean; onClick?: () => void }) {
  const ar = locale === 'ar';
  const initials = member.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const status = member.membershipStatus === 'SPECIAL' ? (ar ? 'عضو مميز' : 'Special member') : (ar ? 'عضو' : 'Simple member');
  return <Button component={Link} href={`/${locale}/member`} onClick={onClick} className={`member-profile-chip ${drawer ? 'member-profile-chip-drawer' : ''}`} aria-label={`${member.fullName}, ${status}`}>
    <Box className={`member-profile-ring ${member.membershipStatus === 'SPECIAL' ? 'is-special' : 'is-simple'}`}>{member.photoDataUrl ? <Box component="img" src={member.photoDataUrl} alt="" /> : <span>{initials}</span>}</Box>
    <Box className="member-profile-copy"><strong>{member.fullName}</strong><span>{status}</span></Box>
    <ArrowForward className="member-profile-arrow" />
  </Button>;
}

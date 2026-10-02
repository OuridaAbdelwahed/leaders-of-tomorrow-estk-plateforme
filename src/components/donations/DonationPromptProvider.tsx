'use client';

import {
  CardGiftcardOutlined,
  Close,
  EditOutlined,
  EmailOutlined,
  FavoriteBorderOutlined,
  HighlightOffOutlined,
  InfoOutlined,
  LockOutlined,
  PersonOutlineOutlined,
  ScheduleOutlined,
  VerifiedUserOutlined,
  VolunteerActivismOutlined,
} from '@mui/icons-material';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogContent, FormControlLabel, IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { usePathname } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FaCcAmex, FaCcVisa, FaPaypal } from 'react-icons/fa';

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: Record<string, unknown>) => { render: (selector: HTMLElement) => Promise<void>; close?: () => void };
    };
  }
}

type DonationContext = 'membership_completed' | 'page_bottom' | 'manual';
type PromptInput = { context: DonationContext; relatedEntityId?: string; page?: string; eventId?: string; donorName?: string; donorEmail?: string };
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

type DonationPromptValue = {
  openDonationPrompt: (input: PromptInput) => boolean;
  settings?: Settings;
};

const DonationPromptContext = createContext<DonationPromptValue | undefined>(undefined);
const preferenceKey = 'lot-donation-popup-preferences';
const sessionCountKey = 'lot-donation-popup-session-count';
const paypalSupportedCurrencies = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD',
  'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD',
]);

const defaultSettings: Settings = {
  enabled: true,
  membershipCompletedEnabled: true,
  pageBottomEnabled: true,
  eligiblePages: ['/', '/events', '/gallery', '/contact', '/join'],
  scrollThreshold: 90,
  suggestedAmounts: [5, 10, 20, 50],
  maximumAmount: 10_000,
  currency: 'USD',
  title: 'Support the growth of our club',
  description: 'Your donation is completely optional. It helps the club grow, improve its services, and organize more activities, events, and initiatives for our members.',
  laterDays: 7,
  declinedDays: 30,
  donorDays: 90,
  sessionLimit: 1,
  anonymousAvailable: true,
  paypalConfigured: false,
  paypalMode: 'sandbox',
};

function readPreferences() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(preferenceKey) || '{}') as Record<string, string>; } catch { return {}; }
}

function writePreferences(next: Record<string, string>) {
  localStorage.setItem(preferenceKey, JSON.stringify(next));
  document.cookie = `donation_popup_choice=${encodeURIComponent(next.donation_popup_choice || '')}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  if (next.donation_popup_dismissed_until) document.cookie = `donation_popup_dismissed_until=${encodeURIComponent(next.donation_popup_dismissed_until)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function suppressUntil(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function hasActiveBlockingModal() {
  return Boolean(document.querySelector('.MuiDialog-root:not(.donation-dialog-root), [role="dialog"]:not(.donation-dialog-paper)'));
}

function isExcludedPath(pathname: string) {
  return /\/(login|console|member|tickets|register|privacy|terms)(\/|$)/.test(pathname) || pathname.includes('/api') || pathname.includes('/404');
}

function normalizePage(pathname: string) {
  const value = pathname.replace(/^\/(en|ar)/, '') || '/';
  return value.replace(/\/$/, '') || '/';
}

function pageEligible(pathname: string, settings: Settings) {
  if (isExcludedPath(pathname)) return false;
  const page = normalizePage(pathname);
  return settings.eligiblePages.some(item => item === page || (item !== '/' && page.startsWith(item)));
}

function currencySymbol(currency: string) {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return '';
}

export function DonationPromptProvider({ locale, children }: { locale: string; children: ReactNode }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<Settings>();
  const [paypalClientId, setPaypalClientId] = useState('');
  const [prompt, setPrompt] = useState<PromptInput>();
  const openedThisVisit = useRef(new Set<string>());
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/donations/config', { signal: controller.signal }).then(async response => {
      if (!response.ok) return setSettings(defaultSettings);
      const body = await response.json();
      setSettings({ ...defaultSettings, ...body.settings });
      setPaypalClientId(body.paypalClientId || '');
    }).catch(() => setSettings(defaultSettings));
    return () => controller.abort();
  }, []);

  const record = useCallback((eventName: string, input?: PromptInput, selectedAmountCategory?: string) => {
    void fetch('/api/public/donations/interaction', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventName,
        context: input?.context ?? prompt?.context,
        sourcePage: input?.page ?? prompt?.page ?? normalizePage(pathname),
        eventId: input?.eventId ?? prompt?.eventId,
        membershipRequestId: input?.relatedEntityId ?? prompt?.relatedEntityId,
        selectedAmountCategory,
      }),
    }).catch(() => undefined);
  }, [pathname, prompt]);

  const openDonationPrompt = useCallback((input: PromptInput) => {
    const activeSettings = settings ?? defaultSettings;
    const isManual = input.context === 'manual';
    if (!activeSettings.enabled) return false;
    if (input.context === 'membership_completed' && !activeSettings.membershipCompletedEnabled) return false;
    if (input.context === 'page_bottom' && !activeSettings.pageBottomEnabled) return false;
    if (input.context === 'page_bottom' && !pageEligible(pathname, activeSettings)) return false;
    if (prompt || hasActiveBlockingModal()) return false;
    const visitKey = `${input.context}:${input.page ?? normalizePage(pathname)}`;
    if (!isManual && openedThisVisit.current.has(visitKey)) return false;
    const preferences = readPreferences();
    const dismissedUntil = preferences.donation_popup_dismissed_until ? Date.parse(preferences.donation_popup_dismissed_until) : 0;
    const completedAt = preferences.donation_popup_completed_at ? Date.parse(preferences.donation_popup_completed_at) : 0;
    if (!isManual && dismissedUntil > Date.now()) return false;
    if (!isManual && completedAt && completedAt + activeSettings.donorDays * 86_400_000 > Date.now()) return false;
    const sessionCount = Number(sessionStorage.getItem(sessionCountKey) || 0);
    if (!isManual && sessionCount >= activeSettings.sessionLimit) return false;
    if (!isManual) sessionStorage.setItem(sessionCountKey, String(sessionCount + 1));
    openedThisVisit.current.add(visitKey);
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPrompt({ ...input, page: input.page ?? normalizePage(pathname) });
    writePreferences({ ...preferences, donation_popup_last_shown_at: new Date().toISOString(), donation_popup_choice: 'shown' });
    record('donation_popup_shown', input);
    return true;
  }, [pathname, prompt, record, settings]);

  const closePrompt = (choice: 'closed' | 'later' | 'declined' | 'completed') => {
    const activeSettings = settings ?? defaultSettings;
    const preferences = readPreferences();
    const next: Record<string, string> = { ...preferences, donation_popup_choice: choice };
    if (choice === 'later') next.donation_popup_dismissed_until = suppressUntil(activeSettings.laterDays);
    if (choice === 'declined') next.donation_popup_dismissed_until = suppressUntil(activeSettings.declinedDays);
    if (choice === 'completed') {
      next.donation_popup_completed_at = new Date().toISOString();
      next.donation_popup_dismissed_until = suppressUntil(activeSettings.donorDays);
    }
    writePreferences(next);
    const eventName = choice === 'later' ? 'donation_popup_later' : choice === 'declined' ? 'donation_popup_declined' : 'donation_popup_closed';
    if (choice !== 'completed') record(eventName);
    setPrompt(undefined);
    window.setTimeout(() => previouslyFocused.current?.focus(), 0);
  };

  const value = useMemo(() => ({ openDonationPrompt, settings }), [openDonationPrompt, settings]);
  return <DonationPromptContext.Provider value={value}>
    {children}
    <DonationFloatingButton
      settings={settings ?? defaultSettings}
      hidden={Boolean(prompt)}
      onOpen={() => openDonationPrompt({ context: 'manual', page: normalizePage(pathname) })}
    />
    {prompt && <DonationPopup
      locale={locale}
      prompt={prompt}
      settings={settings ?? defaultSettings}
      paypalClientId={paypalClientId}
      onClose={() => closePrompt('closed')}
      onLater={() => closePrompt('later')}
      onDecline={() => closePrompt('declined')}
      onCompleted={() => closePrompt('completed')}
      record={record}
    />}
  </DonationPromptContext.Provider>;
}

function DonationFloatingButton({ settings, hidden, onOpen }: {
  settings: Settings;
  hidden: boolean;
  onOpen: () => void;
}) {
  const pathname = usePathname();
  if (!settings.enabled || hidden || isExcludedPath(pathname)) return null;

  return (
    <Box
      component="button"
      type="button"
      className="donation-floating-button"
      aria-label="Open optional donation popup"
      onClick={onOpen}
    >
      <span className="donation-floating-icon" aria-hidden="true">
        <VolunteerActivismOutlined fontSize="small" />
      </span>
      <span className="donation-floating-label">Donate for us</span>
    </Box>
  );
}

export function useDonationPrompt() {
  const value = useContext(DonationPromptContext);
  if (!value) throw new Error('useDonationPrompt must be used inside DonationPromptProvider.');
  return value;
}

export function DonationBottomTrigger() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);
  const { openDonationPrompt, settings } = useDonationPrompt();
  useEffect(() => {
    if (!settings?.enabled || !settings.pageBottomEnabled || !ref.current || !pageEligible(pathname, settings)) return;
    const thresholdMargin = Math.max(5, Math.min(15, 100 - settings.scrollThreshold));
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) openDonationPrompt({ context: 'page_bottom', page: normalizePage(pathname) });
    }, { root: null, threshold: 0.1, rootMargin: `0px 0px ${thresholdMargin}% 0px` });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [openDonationPrompt, pathname, settings]);
  return <Box ref={ref} aria-hidden="true" sx={{ width: 1, height: 1 }} />;
}

function DonationPopup({ locale, prompt, settings, paypalClientId, onClose, onLater, onDecline, onCompleted, record }: {
  locale: string;
  prompt: PromptInput;
  settings: Settings;
  paypalClientId: string;
  onClose: () => void;
  onLater: () => void;
  onDecline: () => void;
  onCompleted: () => void;
  record: (eventName: string, input?: PromptInput, selectedAmountCategory?: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState(prompt.donorName ?? '');
  const [donorEmail, setDonorEmail] = useState(prompt.donorEmail ?? '');
  const [anonymous, setAnonymous] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ publicId: string; amount: number; currency: string }>();
  const selectedAmount = amount === 'custom' ? customAmount : amount;
  const membershipCopy = prompt.context === 'membership_completed';
  const currencySupported = paypalSupportedCurrencies.has(settings.currency);

  const chooseAmount = (value: string) => {
    setAmount(value);
    setPaymentReady(false);
    record('donation_amount_selected', prompt, value === 'custom' ? 'custom' : value);
  };

  const validate = () => {
    if (selectedAmount === '') return 0;
    const parsed = Number(selectedAmount);
    if (!Number.isFinite(parsed)) throw new Error('Invalid amount.');
    if (parsed < 0) throw new Error('The donation amount cannot be negative.');
    if (parsed > settings.maximumAmount) throw new Error(`The maximum allowed amount is ${settings.maximumAmount} ${settings.currency}.`);
    return Math.round(parsed * 100) / 100;
  };

  const startPayment = () => {
    setError('');
    try {
      if (!currencySupported) {
        setError(`PayPal donations are not available in ${settings.currency}. Please set the donation currency to USD or EUR in the admin donation settings.`);
        return;
      }
      const value = validate();
      if (value <= 0) {
        setError('No payment was started. You can close this window and continue normally.');
        return;
      }
      setPaymentReady(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Invalid amount.');
    }
  };

  return <Dialog
    open
    onClose={processing ? undefined : onClose}
    fullWidth
    maxWidth="sm"
    className="donation-dialog-root"
    PaperProps={{ className: 'donation-dialog-paper' }}
    aria-labelledby="donation-dialog-title"
  >
    <DialogContent className="donation-popup-content">
      <IconButton className="donation-popup-close" onClick={onClose} disabled={processing} aria-label="Close"><Close /></IconButton>
      {success ? <DonationSuccessState locale={locale} success={success} onCompleted={onCompleted} /> : <>
        <Box className="donation-popup-icon"><VolunteerActivismOutlined /></Box>
        <Typography id="donation-dialog-title" variant="h3">{membershipCopy ? 'Would you like to support our club?' : settings.title}</Typography>
        {membershipCopy && <Alert severity="success" sx={{ width: '100%' }}>Your membership request has already been submitted successfully.</Alert>}
        <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
          {membershipCopy
            ? 'If you wish, you can support the club with an optional donation to help us create more activities and events.'
            : settings.description}
        </Typography>
        <Box className="donation-independence-note">
          <span><InfoOutlined /></span>
          <Typography>Your access to the platform, your membership request, and your tickets <strong>do not depend on your donation.</strong></Typography>
          <VerifiedUserOutlined className="donation-independence-shield" />
        </Box>
        <Box className="donation-section">
          <Box className="donation-section-heading">
            <span><CardGiftcardOutlined /></span>
            <Box>
              <Typography fontWeight={900}>Choose the amount you would like to give</Typography>
              <Typography variant="body2" color="text.secondary">No minimum amount is required.</Typography>
            </Box>
          </Box>
          <Box className="donation-amount-grid">
            {settings.suggestedAmounts.map(value => {
              const selected = amount === String(value);
              return <button
                key={value}
                type="button"
                className={`donation-amount-card${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => chooseAmount(String(value))}
              >
                <strong>{currencySymbol(settings.currency)}{value}</strong>
                <small>{settings.currency}</small>
                {selected && <span className="donation-amount-check" aria-hidden="true">✓</span>}
              </button>;
            })}
            <button
              type="button"
              className={`donation-amount-card donation-amount-custom${amount === 'custom' ? ' is-selected' : ''}`}
              aria-pressed={amount === 'custom'}
              onClick={() => chooseAmount('custom')}
            >
              <strong>Custom</strong>
              <small>amount</small>
              <EditOutlined aria-hidden="true" />
            </button>
          </Box>
          {amount === 'custom' && <TextField sx={{ mt: 1 }} fullWidth type="number" label={`Amount (${settings.currency})`} value={customAmount} onChange={event => { setCustomAmount(event.target.value); setPaymentReady(false); }} inputProps={{ min: 0, max: settings.maximumAmount, step: '0.01' }} />}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ width: '100%' }}>
          <TextField label="Donor name (optional)" value={donorName} onChange={event => setDonorName(event.target.value)} fullWidth disabled={anonymous} InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineOutlined /></InputAdornment> }} />
          <TextField label="Confirmation email (optional)" type="email" value={donorEmail} onChange={event => setDonorEmail(event.target.value)} fullWidth disabled={anonymous} InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined /></InputAdornment> }} />
        </Stack>
        {settings.anonymousAvailable && <FormControlLabel control={<Checkbox checked={anonymous} onChange={event => setAnonymous(event.target.checked)} />} label="Make this donation anonymous" />}
        {error && <Alert severity={error.includes('No payment') ? 'info' : 'error'} sx={{ width: '100%' }}>{error}</Alert>}
        <PaymentBrandStrip />
        <Button className="donation-primary-button" fullWidth variant="contained" startIcon={<FavoriteBorderOutlined />} onClick={startPayment} disabled={processing}>Donate now</Button>
        {paymentReady && <PayPalDonationButton
          prompt={prompt}
          settings={settings}
          paypalClientId={paypalClientId}
          amount={validate()}
          donorName={anonymous ? undefined : donorName}
          donorEmail={anonymous ? undefined : donorEmail}
          anonymous={anonymous}
          setProcessing={setProcessing}
          setError={setError}
          onSuccess={setSuccess}
        />}
        {!settings.paypalConfigured && <Alert severity="warning" sx={{ width: '100%' }}>PayPal is not configured yet. You can close this window and continue normally.</Alert>}
        {!currencySupported && <Alert severity="warning" sx={{ width: '100%' }}>The current donation currency ({settings.currency}) is not supported by PayPal Checkout. Use USD or EUR for PayPal donations.</Alert>}
        <Box className="donation-secondary-actions">
          <Button startIcon={<ScheduleOutlined />} onClick={onLater} disabled={processing}>Later</Button>
          <span>or</span>
          <Button startIcon={<HighlightOffOutlined />} onClick={onDecline} disabled={processing} color="inherit">No thanks</Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: .7, alignItems: 'center' }}><LockOutlined fontSize="inherit" /> Secure payment by PayPal. We never store card details.</Typography>
        <Typography variant="caption" color="text.secondary" textAlign="center">{locale==='ar'?'بإتمام التبرع، تقر بسياسة الاسترداد والتبرعات وسياسة الخصوصية.':'By completing a donation, you acknowledge the Refund & Donation Policy and Privacy Policy.'} <Box component="a" href={`/${locale}/legal/refunds-donations`} target="_blank" rel="noopener noreferrer" sx={{fontWeight:900,color:'primary.main'}}>{locale==='ar'?'اقرأ السياسة المالية':'Read financial policy'}</Box> · <Box component="a" href={`/${locale}/legal/privacy`} target="_blank" rel="noopener noreferrer" sx={{fontWeight:900,color:'primary.main'}}>{locale==='ar'?'الخصوصية':'Privacy'}</Box></Typography>
      </>}
    </DialogContent>
  </Dialog>;
}

function PaymentBrandStrip() {
  return <Box className="donation-payment-methods" aria-label="Accepted donation payment methods">
    <Typography component="p" className="donation-payment-methods-title">Accepted payment methods</Typography>
    <Box className="donation-payment-brands" aria-hidden="true">
      <span className="donation-brand-tile donation-brand-paypal"><FaPaypal /><strong>PayPal</strong></span>
      <span className="donation-brand-tile donation-brand-visa"><FaCcVisa /></span>
      <span className="donation-brand-tile donation-brand-mastercard"><Box component="img" src="https://www.mastercard.com/brandcenter/de/de/artwork/_jcr_content/root/container/container_1578756628/container/tabs_copy/container/container/container/container_copy/image_copy.coreimg.png/1751346738517/mastercard-circles-92px-2x.png" alt="" width={92} height={55} referrerPolicy="no-referrer" /></span>
      <span className="donation-brand-tile donation-brand-amex"><FaCcAmex /></span>
    </Box>
  </Box>;
}

let paypalScriptPromise: Promise<void> | undefined;
function loadPaypalScript(clientId: string, currency: string) {
  if (window.paypal) return Promise.resolve();
  if (!clientId) return Promise.reject(new Error('PayPal is not configured.'));
  if (!paypalScriptPromise) {
    paypalScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&components=buttons&enable-funding=card`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('The payment service is temporarily unavailable.'));
      document.head.appendChild(script);
    });
  }
  return paypalScriptPromise;
}

function PayPalDonationButton({ prompt, settings, paypalClientId, amount, donorName, donorEmail, anonymous, setProcessing, setError, onSuccess }: {
  prompt: PromptInput;
  settings: Settings;
  paypalClientId: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  anonymous: boolean;
  setProcessing: (value: boolean) => void;
  setError: (value: string) => void;
  onSuccess: (value: { publicId: string; amount: number; currency: string }) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const donationPublicId = useRef('');

  useEffect(() => {
    if (!container.current || amount <= 0) return;
    let active = true;
    container.current.innerHTML = '';
    loadPaypalScript(paypalClientId, settings.currency).then(() => {
      const target = container.current;
      if (!active || !target || !window.paypal) return;
      const buttons = window.paypal.Buttons({
        style: { layout: 'vertical', shape: 'rect', label: 'donate', color: 'gold' },
        createOrder: async () => {
          try {
            setProcessing(true);
            setError('');
            const response = await fetch('/api/public/donations/create-order', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                context: prompt.context,
                sourcePage: prompt.page,
                membershipRequestId: prompt.relatedEntityId,
                eventId: prompt.eventId,
                donorName,
                donorEmail,
                amount,
                isAnonymous: anonymous,
              }),
            });
            const body = await response.json();
            if (!response.ok || body.skipped) throw new Error(body.error || 'The payment service is temporarily unavailable.');
            donationPublicId.current = body.donationPublicId;
            return body.orderId;
          } catch (error) {
            setProcessing(false);
            setError(error instanceof Error ? error.message : 'The payment service is temporarily unavailable.');
            throw error;
          }
        },
        onApprove: async (data: { orderID?: string }) => {
          const response = await fetch('/api/public/donations/capture', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ donationPublicId: donationPublicId.current, orderId: data.orderID }),
          });
          const body = await response.json();
          setProcessing(false);
          if (!response.ok) throw new Error(body.error || 'The payment could not be confirmed.');
          onSuccess({ publicId: body.publicId, amount: body.amount, currency: body.currency });
        },
        onCancel: () => {
          setProcessing(false);
          if (donationPublicId.current) void fetch('/api/public/donations/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ donationPublicId: donationPublicId.current }) }).catch(() => undefined);
          setError('The payment was cancelled. You can try again or close this window. Your use of the platform is not affected.');
        },
        onError: () => {
          setProcessing(false);
          setError('The payment could not be confirmed. Please check your PayPal account before trying again. Your access to the platform is unchanged.');
        },
      });
      void buttons.render(target);
    }).catch(error => setError(error instanceof Error ? error.message : 'The payment service is temporarily unavailable.'));
    return () => { active = false; };
  }, [amount, anonymous, donorEmail, donorName, onSuccess, paypalClientId, prompt, setError, setProcessing, settings.currency]);

  return <Box ref={container} sx={{ width: '100%', minHeight: 120 }} aria-label="PayPal Checkout" />;
}

function DonationSuccessState({ locale, success, onCompleted }: { locale: string; success: { publicId: string; amount: number; currency: string }; onCompleted: () => void }) {
  return <Stack spacing={2.3} alignItems="center" textAlign="center">
    <Box className="donation-popup-icon is-success"><FavoriteBorderOutlined /></Box>
    <Typography variant="h3">Thank you for your support!</Typography>
    <Typography color="text.secondary">Your donation of {success.amount.toFixed(2)} {success.currency} has been received. Your contribution helps our club keep growing and offer more activities and events.</Typography>
    <Chip label={`Reference: ${success.publicId}`} />
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.2}>
      <Button variant="contained" onClick={onCompleted}>Close</Button>
      <Button href={`/${locale}/events`}>Discover our activities</Button>
    </Stack>
  </Stack>;
}

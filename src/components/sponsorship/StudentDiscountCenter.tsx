'use client';

import {
  Close,
  ContentCopyOutlined,
  Favorite,
  FavoriteBorder,
  LockOutlined,
  Login,
  OpenInNew,
  PersonAddAlt1,
  QrCode2Outlined,
  Search,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import QRCode from 'qrcode';
import { useCallback, useEffect, useState } from 'react';
import { useMemberSession } from '@/components/MemberSession';
import type { PublicOffer } from '@/features/sponsorship/access';
import { COUPON_CATEGORIES, type Paginated } from '@/features/sponsorship/types';

export function StudentDiscountCenter({ locale }: { locale: string }) {
  const ar = locale === 'ar';
  const { member } = useMemberSession();
  const [data, setData] = useState<Paginated<PublicOffer>>();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [error, setError] = useState('');
  const [qr, setQr] = useState<{ title: string; url: string }>();
  const [lockedOffer, setLockedOffer] = useState<PublicOffer>();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ pageSize: '48' });
      if (category) params.set('category', category);
      if (debounced) params.set('search', debounced);
      const response = await fetch(`/api/public/sponsorship/coupons?${params}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load offers.');
    }
  }, [category, debounced]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const requireMember = (coupon: PublicOffer) => {
    if (member) return true;
    setLockedOffer(coupon);
    return false;
  };

  const favorite = async (coupon: PublicOffer) => {
    if (!requireMember(coupon)) return;
    const response = await fetch(`/api/public/sponsorship/coupons/${coupon.id}/favorite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ favorite: !coupon.favorite }),
    });
    if (response.status === 401) {
      setLockedOffer(coupon);
      return;
    }
    if (response.ok) await load();
  };

  const copyCode = async (coupon: PublicOffer) => {
    if (!requireMember(coupon)) return;
    if (!coupon.couponCode) return setError(ar ? 'أعد تحميل الصفحة للوصول إلى الرمز.' : 'Refresh the page to access this code.');
    try {
      await navigator.clipboard.writeText(coupon.couponCode);
    } catch {
      setError(ar ? 'تعذر نسخ الرمز. حاول مرة أخرى.' : 'The code could not be copied. Please try again.');
    }
  };

  const redeem = async (coupon: PublicOffer) => {
    if (!requireMember(coupon)) return;
    const response = await fetch(`/api/public/sponsorship/coupons/${coupon.id}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: localStorage.getItem('lot_sponsor_device') }),
    });
    const result = await response.json();
    if (response.status === 401) {
      setLockedOffer(coupon);
      return;
    }
    if (!response.ok) return setError(result.error);
    await navigator.clipboard.writeText(result.couponCode);
    if (result.redemptionUrl) window.open(result.redemptionUrl, '_blank', 'noopener,noreferrer');
    await load();
  };

  const showQr = async (coupon: PublicOffer) => {
    if (!requireMember(coupon)) return;
    if (!coupon.redemptionUrl) return setError(ar ? 'أعد تحميل الصفحة للوصول إلى رمز QR.' : 'Refresh the page to access this QR code.');
    setQr({
      title: coupon.title,
      url: await QRCode.toDataURL(coupon.redemptionUrl, {
        width: 700,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0B3F47', light: '#FFFFFF' },
      }),
    });
  };

  return (
    <Box className="discount-center">
      <Box className="discount-toolbar">
        <TextField
          label={ar ? 'البحث في العروض' : 'Search offers'}
          value={search}
          onChange={event => setSearch(event.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        />
        <Stack direction="row" className="discount-category-scroll" gap={1}>
          <Chip clickable label={ar ? 'الكل' : 'All'} color={!category ? 'primary' : 'default'} onClick={() => setCategory('')} />
          {COUPON_CATEGORIES.map(value => (
            <Chip clickable key={value} label={humanize(value)} color={category === value ? 'primary' : 'default'} onClick={() => setCategory(value)} />
          ))}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

      {!data ? (
        <Box className="public-coupon-grid">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} variant="rounded" height={390} />)}
        </Box>
      ) : (
        <Box className="public-coupon-grid">
          {data.items.map(coupon => (
            <Card key={coupon.id} className="public-coupon-card">
              <Box className="coupon-brand-band">
                <Avatar src={coupon.sponsorLogo} alt={coupon.sponsorName} />
                <Tooltip title={member ? (coupon.favorite ? 'Remove favorite' : 'Save favorite') : 'Members only'}>
                  <IconButton onClick={() => favorite(coupon)} aria-label={coupon.favorite ? 'Remove favorite' : 'Save favorite'}>
                    {coupon.favorite ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                </Tooltip>
              </Box>
              <CardContent>
                <Typography className="coupon-public-discount">{discount(coupon)}</Typography>
                <Typography variant="h4">{coupon.title}</Typography>
                <Typography color="text.secondary">{coupon.sponsorName} · {humanize(coupon.category)}</Typography>
                {coupon.description && <Typography sx={{ mt: 1.5 }}>{coupon.description}</Typography>}
                <Box className={`public-coupon-code ${member ? '' : 'is-locked'}`}>
                  <code>{member && coupon.couponCode ? coupon.couponCode : <><LockOutlined /> {ar ? 'للأعضاء فقط' : 'MEMBERS ONLY'}</>}</code>
                  <Tooltip title={member ? 'Copy code' : 'Unlock member offer'}>
                    <IconButton onClick={() => copyCode(coupon)} aria-label={member ? 'Copy coupon code' : 'Unlock member offer'}>
                      {member ? <ContentCopyOutlined /> : <LockOutlined />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Stack direction="row" gap={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => redeem(coupon)}
                    endIcon={member ? <OpenInNew /> : <LockOutlined />}
                  >
                    {member ? (ar ? 'استخدام' : 'Redeem') : (ar ? 'افتح العرض' : 'Unlock offer')}
                  </Button>
                  <IconButton className="coupon-qr-button" onClick={() => showQr(coupon)} aria-label={member ? 'Show offer QR code' : 'Unlock offer QR code'}>
                    {member ? <QrCode2Outlined /> : <LockOutlined />}
                  </IconButton>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                  {ar ? 'ينتهي في' : 'Expires'} {formatDate(coupon.expirationDate, locale)}{coupon.terms ? ` · ${coupon.terms}` : ''}
                </Typography>
              </CardContent>
            </Card>
          ))}
          {!data.items.length && (
            <Box className="public-empty-offers">
              <DiscountEmpty />
              <Typography variant="h4">{ar ? 'لا توجد عروض مطابقة' : 'No matching offers'}</Typography>
              <Typography color="text.secondary">{ar ? 'جرّب فئة أو عبارة بحث أخرى.' : 'Try another category or search phrase.'}</Typography>
            </Box>
          )}
        </Box>
      )}

      <Dialog open={Boolean(lockedOffer)} onClose={() => setLockedOffer(undefined)} maxWidth="xs" fullWidth aria-labelledby="member-offer-title" PaperProps={{ className: 'member-offer-dialog' }}>
        <IconButton className="member-offer-close" onClick={() => setLockedOffer(undefined)} aria-label={ar ? 'إغلاق' : 'Close'}><Close /></IconButton>
        <DialogContent>
          <Box className="member-offer-lock" aria-hidden="true"><LockOutlined /></Box>
          <Typography id="member-offer-title" component="h2" variant="h4">{ar ? 'عرض حصري للأعضاء' : 'A members-only offer'}</Typography>
          <Typography color="text.secondary">
            {ar
              ? `انضم أو سجّل الدخول لفتح عرض ${lockedOffer?.title ?? ''} ورؤية الرمز واستخدام رمز QR.`
              : `Join or sign in to unlock ${lockedOffer?.title ?? 'this offer'}, reveal its code, and access its QR code.`}
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 3 }}>
            <Button href={`/${locale}/join`} variant="contained" size="large" startIcon={<PersonAddAlt1 />}>
              {ar ? 'كن عضوًا' : 'Become a member'}
            </Button>
            <Button href={`/${locale}/login`} variant="outlined" size="large" startIcon={<Login />}>
              {ar ? 'تسجيل دخول الأعضاء' : 'Member login'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(qr)} onClose={() => setQr(undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>{qr?.title}</DialogTitle>
        <DialogContent>{qr && <Box component="img" src={qr.url} alt="Offer QR code" sx={{ width: '100%', display: 'block' }} />}</DialogContent>
      </Dialog>
    </Box>
  );
}

function DiscountEmpty() { return <Box className="discount-empty-icon"><QrCode2Outlined /></Box>; }
function humanize(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, character => character.toUpperCase()); }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)); }
function discount(coupon: PublicOffer) { return coupon.discountType === 'PERCENTAGE' ? `${coupon.percentage}% OFF` : coupon.discountType === 'FIXED' ? `${coupon.fixedAmount} ${coupon.currency} OFF` : 'SPECIAL OFFER'; }

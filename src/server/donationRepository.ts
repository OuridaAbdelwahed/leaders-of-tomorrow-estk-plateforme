import type { RowDataPacket } from 'mysql2/promise';
import { execute, queryRows, withTransaction } from './database';
import { sendMail } from './mail';
import { donationConfirmationMail } from './mailTemplates';
import { safeId } from './security';

type DbRow = RowDataPacket & Record<string, unknown>;

export type DonationContext = 'membership_completed' | 'page_bottom' | 'manual';
export type DonationStatus = 'initiated' | 'pending' | 'captured' | 'failed' | 'cancelled' | 'expired' | 'refunded';
export type DonationEventName =
  | 'donation_popup_shown'
  | 'donation_popup_closed'
  | 'donation_popup_later'
  | 'donation_popup_declined'
  | 'donation_amount_selected'
  | 'donation_payment_started'
  | 'donation_payment_completed'
  | 'donation_payment_failed';

export type DonationSettings = {
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

export type DonationRecord = {
  id: string;
  publicId: string;
  context: DonationContext;
  sourcePage?: string;
  membershipRequestId?: string;
  donorName?: string;
  donorEmailMasked?: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  providerOrderId?: string;
  providerCaptureId?: string;
  status: DonationStatus;
  isAnonymous: boolean;
  paidAt?: string;
  createdAt: string;
};

const envNumber = (key: string, fallback: number) => {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaults: Omit<DonationSettings, 'paypalConfigured' | 'paypalMode'> = {
  enabled: true,
  membershipCompletedEnabled: true,
  pageBottomEnabled: true,
  eligiblePages: ['/', '/events', '/gallery', '/contact', '/join'],
  scrollThreshold: envNumber('DONATION_POPUP_SCROLL_THRESHOLD', 90),
  suggestedAmounts: [5, 10, 20, 50],
  maximumAmount: 10_000,
  currency: 'USD',
  title: 'Support the growth of our club',
  description: 'Your donation is completely optional. It helps the club grow, improve its services, and organize more activities, events, and initiatives for our members.',
  laterDays: envNumber('DONATION_POPUP_LATER_DAYS', 7),
  declinedDays: envNumber('DONATION_POPUP_DECLINED_DAYS', 30),
  donorDays: envNumber('DONATION_POPUP_DONOR_DAYS', 90),
  sessionLimit: envNumber('DONATION_POPUP_SESSION_LIMIT', 1),
  anonymousAvailable: true,
};

const bool = (value: unknown, fallback = false) => value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
const number = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const json = <T>(value: unknown, fallback: T) => {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
};
const normalizeEmail = (value?: string) => value?.trim().toLowerCase() || undefined;
const publicId = () => `DON-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const paypalSupportedCurrencies = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD',
  'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD',
]);

export function maskDonationEmail(email?: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  const [name, domain] = normalized.split('@');
  if (!name || !domain) return normalized;
  return `${name.slice(0, 2)}${'*'.repeat(Math.min(5, Math.max(1, name.length - 2)))}@${domain}`;
}

export function validateDonationAmount(value: unknown, maximumAmount: number) {
  if (value === '' || value === null || value === undefined) return 0;
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error('Invalid amount.');
  if (amount < 0) throw new Error('The donation amount cannot be negative.');
  if (amount === 0) return 0;
  if (amount > maximumAmount) throw new Error(`The maximum allowed amount is ${maximumAmount}.`);
  return Math.round(amount * 100) / 100;
}

function assertPaypalCurrencySupported(currency: string) {
  if (!paypalSupportedCurrencies.has(currency)) {
    throw new Error(`PayPal Checkout does not support ${currency}. Please use USD or EUR for donations.`);
  }
}

export async function getDonationSettings(): Promise<DonationSettings> {
  const rows = await queryRows<DbRow>("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'donations.%'");
  const map = new Map(rows.map(row => [String(row.setting_key), String(row.setting_value)]));
  return {
    enabled: bool(map.get('donations.enabled'), defaults.enabled),
    membershipCompletedEnabled: bool(map.get('donations.trigger.membership_completed'), defaults.membershipCompletedEnabled),
    pageBottomEnabled: bool(map.get('donations.trigger.page_bottom'), defaults.pageBottomEnabled),
    eligiblePages: json<string[]>(map.get('donations.eligible_pages'), defaults.eligiblePages),
    scrollThreshold: Math.min(95, Math.max(85, number(map.get('donations.scroll_threshold'), defaults.scrollThreshold))),
    suggestedAmounts: json<number[]>(map.get('donations.suggested_amounts'), defaults.suggestedAmounts).filter(value => Number.isFinite(Number(value)) && Number(value) > 0).map(Number),
    maximumAmount: Math.max(1, number(map.get('donations.maximum_amount'), defaults.maximumAmount)),
    currency: String(map.get('donations.currency') || defaults.currency).slice(0, 3).toUpperCase(),
    title: String(map.get('donations.title') || defaults.title),
    description: String(map.get('donations.description') || defaults.description),
    laterDays: Math.max(1, number(map.get('donations.later_days'), defaults.laterDays)),
    declinedDays: Math.max(1, number(map.get('donations.declined_days'), defaults.declinedDays)),
    donorDays: Math.max(1, number(map.get('donations.donor_days'), defaults.donorDays)),
    sessionLimit: Math.max(1, number(map.get('donations.session_limit'), defaults.sessionLimit)),
    anonymousAvailable: bool(map.get('donations.anonymous_available'), defaults.anonymousAvailable),
    paypalConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    paypalMode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
  };
}

export async function updateDonationSettings(input: Partial<DonationSettings>) {
  const values: Array<[string, string, number]> = [];
  if (input.enabled !== undefined) values.push(['donations.enabled', String(input.enabled), 1]);
  if (input.membershipCompletedEnabled !== undefined) values.push(['donations.trigger.membership_completed', String(input.membershipCompletedEnabled), 1]);
  if (input.pageBottomEnabled !== undefined) values.push(['donations.trigger.page_bottom', String(input.pageBottomEnabled), 1]);
  if (input.eligiblePages) values.push(['donations.eligible_pages', JSON.stringify(input.eligiblePages), 1]);
  if (input.scrollThreshold !== undefined) values.push(['donations.scroll_threshold', String(Math.min(95, Math.max(85, input.scrollThreshold))), 1]);
  if (input.suggestedAmounts) values.push(['donations.suggested_amounts', JSON.stringify(input.suggestedAmounts.map(Number).filter(value => Number.isFinite(value) && value > 0)), 1]);
  if (input.maximumAmount !== undefined) values.push(['donations.maximum_amount', String(Math.max(1, input.maximumAmount)), 1]);
  if (input.currency) values.push(['donations.currency', input.currency.slice(0, 3).toUpperCase(), 1]);
  if (input.title) values.push(['donations.title', input.title, 1]);
  if (input.description) values.push(['donations.description', input.description, 1]);
  if (input.laterDays !== undefined) values.push(['donations.later_days', String(Math.max(1, input.laterDays)), 1]);
  if (input.declinedDays !== undefined) values.push(['donations.declined_days', String(Math.max(1, input.declinedDays)), 1]);
  if (input.donorDays !== undefined) values.push(['donations.donor_days', String(Math.max(1, input.donorDays)), 1]);
  if (input.sessionLimit !== undefined) values.push(['donations.session_limit', String(Math.max(1, input.sessionLimit)), 1]);
  if (input.anonymousAvailable !== undefined) values.push(['donations.anonymous_available', String(input.anonymousAvailable), 1]);
  for (const [key, value, isPublic] of values) {
    await execute('INSERT INTO settings (setting_key,setting_value,is_public) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), is_public=VALUES(is_public)', [key, value, isPublic]);
  }
  return getDonationSettings();
}

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('The payment service is temporarily unavailable.');
  const base = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const body = await response.json() as { access_token?: string };
  if (!response.ok || !body.access_token) throw new Error('The payment service is temporarily unavailable.');
  return { token: body.access_token, base };
}

export async function createDonationOrder(input: {
  context: DonationContext;
  sourcePage?: string;
  membershipRequestId?: string;
  eventId?: string;
  donorName?: string;
  donorEmail?: string;
  amount: unknown;
  isAnonymous?: boolean;
}) {
  const settings = await getDonationSettings();
  if (!settings.enabled) throw new Error('The donation system is disabled.');
  assertPaypalCurrencySupported(settings.currency);
  const amount = validateDonationAmount(input.amount, settings.maximumAmount);
  if (amount <= 0) return { skipped: true as const };
  const { token, base } = await paypalAccessToken();
  const id = safeId('don');
  const donationPublicId = publicId();
  const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: donationPublicId,
        amount: { currency_code: settings.currency, value: amount.toFixed(2) },
        description: 'Optional donation to Leaders of Tomorrow ESTK',
      }],
    }),
  });
  const order = await orderResponse.json() as { id?: string };
  if (!orderResponse.ok || !order.id) throw new Error('The payment service is temporarily unavailable.');
  await execute(
    `INSERT INTO donations
      (id,public_id,context,source_page,event_id,membership_request_id,donor_name,donor_email_normalized,amount,currency,provider_order_id,status,is_anonymous)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, donationPublicId, input.context, input.sourcePage ?? null, input.eventId ?? null, input.membershipRequestId ?? null, input.donorName ?? null, normalizeEmail(input.donorEmail) ?? null, amount, settings.currency, order.id, 'pending', input.isAnonymous ? 1 : 0],
  );
  await recordDonationEvent({ eventName: 'donation_payment_started', donationId: id, context: input.context, sourcePage: input.sourcePage, membershipRequestId: input.membershipRequestId, selectedAmountCategory: amountCategory(amount, settings.suggestedAmounts) });
  return { skipped: false as const, donationPublicId, orderId: order.id };
}

export async function captureDonationOrder(input: { donationPublicId: string; orderId: string }) {
  const { token, base } = await paypalAccessToken();
  return withTransaction(async connection => {
    const rows = await queryRows<DbRow>('SELECT * FROM donations WHERE public_id=? AND provider_order_id=? LIMIT 1 FOR UPDATE', [input.donationPublicId, input.orderId], connection);
    const donation = rows[0];
    if (!donation) throw new Error('Donation not found.');
    if (donation.status === 'captured') return { success: true, publicId: String(donation.public_id), amount: Number(donation.amount), currency: String(donation.currency) };
    assertPaypalCurrencySupported(String(donation.currency));
    const response = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    });
    const capture = await response.json() as {
      status?: string;
      purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }> } }>;
    };
    const captured = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const capturedAmount = Number(captured?.amount?.value);
    const sameAmount = Number(donation.amount) === Math.round(capturedAmount * 100) / 100;
    const sameCurrency = String(donation.currency) === captured?.amount?.currency_code;
    if (!response.ok || capture.status !== 'COMPLETED' || captured?.status !== 'COMPLETED' || !captured.id || !sameAmount || !sameCurrency) {
      await execute("UPDATE donations SET status='failed' WHERE id=?", [donation.id], connection);
      await recordDonationEvent({ eventName: 'donation_payment_failed', donationId: String(donation.id), context: String(donation.context) as DonationContext, sourcePage: donation.source_page ? String(donation.source_page) : undefined, membershipRequestId: donation.membership_request_id ? String(donation.membership_request_id) : undefined }, connection);
      throw new Error('The payment could not be confirmed.');
    }
    await execute("UPDATE donations SET status='captured', provider_capture_id=?, paid_at=UTC_TIMESTAMP(3) WHERE id=?", [captured.id, donation.id], connection);
    await recordDonationEvent({ eventName: 'donation_payment_completed', donationId: String(donation.id), context: String(donation.context) as DonationContext, sourcePage: donation.source_page ? String(donation.source_page) : undefined, membershipRequestId: donation.membership_request_id ? String(donation.membership_request_id) : undefined }, connection);
    const email = donation.donor_email_normalized ? String(donation.donor_email_normalized) : undefined;
    if (email && !Number(donation.is_anonymous)) {
      const mail = donationConfirmationMail({ amount: Number(donation.amount), currency: String(donation.currency), reference: String(donation.public_id), date: new Date().toISOString() });
      void sendMail({ to: email, ...mail });
    }
    return { success: true, publicId: String(donation.public_id), amount: Number(donation.amount), currency: String(donation.currency) };
  });
}

export async function cancelDonationOrder(publicId: string) {
  const rows = await queryRows<DbRow>("SELECT id, context, source_page, membership_request_id FROM donations WHERE public_id=? AND status IN ('initiated','pending') LIMIT 1", [publicId]);
  const donation = rows[0];
  if (!donation) return { updated: false };
  await execute("UPDATE donations SET status='cancelled' WHERE id=?", [donation.id]);
  await recordDonationEvent({
    eventName: 'donation_payment_failed',
    donationId: String(donation.id),
    context: String(donation.context) as DonationContext,
    sourcePage: donation.source_page ? String(donation.source_page) : undefined,
    membershipRequestId: donation.membership_request_id ? String(donation.membership_request_id) : undefined,
  });
  return { updated: true };
}

export async function recordDonationEvent(input: {
  eventName: DonationEventName;
  donationId?: string;
  context?: DonationContext | string;
  sourcePage?: string;
  eventId?: string;
  membershipRequestId?: string;
  selectedAmountCategory?: string;
}, connection?: Parameters<typeof execute>[2]) {
  await execute(
    `INSERT INTO donation_events (id,donation_id,event_name,context,source_page,event_id,membership_request_id,selected_amount_category)
      VALUES (?,?,?,?,?,?,?,?)`,
    [safeId('dne'), input.donationId ?? null, input.eventName, input.context ?? null, input.sourcePage ?? null, input.eventId ?? null, input.membershipRequestId ?? null, input.selectedAmountCategory ?? null],
    connection,
  );
}

export function amountCategory(amount: number, suggested: number[]) {
  return suggested.includes(amount) ? `${amount}` : amount > 0 ? 'custom' : 'empty_or_zero';
}

function mapDonation(row: DbRow): DonationRecord {
  return {
    id: String(row.id),
    publicId: String(row.public_id),
    context: String(row.context) as DonationContext,
    sourcePage: row.source_page ? String(row.source_page) : undefined,
    membershipRequestId: row.membership_request_id ? String(row.membership_request_id) : undefined,
    donorName: row.donor_name ? String(row.donor_name) : undefined,
    donorEmailMasked: maskDonationEmail(row.donor_email_normalized ? String(row.donor_email_normalized) : undefined),
    amount: Number(row.amount),
    currency: String(row.currency),
    paymentProvider: String(row.payment_provider),
    providerOrderId: row.provider_order_id ? String(row.provider_order_id) : undefined,
    providerCaptureId: row.provider_capture_id ? String(row.provider_capture_id) : undefined,
    status: String(row.status) as DonationStatus,
    isAnonymous: Boolean(row.is_anonymous),
    paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listDonations(filters: { context?: string; status?: string; page?: string; anonymous?: string; minAmount?: number; maxAmount?: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.context) { where.push('context=?'); params.push(filters.context); }
  if (filters.status) { where.push('status=?'); params.push(filters.status); }
  if (filters.page) { where.push('source_page LIKE ?'); params.push(`%${filters.page}%`); }
  if (filters.anonymous === 'true' || filters.anonymous === 'false') { where.push('is_anonymous=?'); params.push(filters.anonymous === 'true' ? 1 : 0); }
  if (Number.isFinite(filters.minAmount)) { where.push('amount>=?'); params.push(filters.minAmount); }
  if (Number.isFinite(filters.maxAmount)) { where.push('amount<=?'); params.push(filters.maxAmount); }
  const rows = await queryRows<DbRow>(`SELECT * FROM donations ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 500`, params);
  return rows.map(mapDonation);
}

export async function donationSummary() {
  const rows = await queryRows<DbRow>(`SELECT
    COALESCE(SUM(CASE WHEN status='captured' THEN amount ELSE 0 END),0) AS total,
    SUM(CASE WHEN status='captured' THEN 1 ELSE 0 END) AS captured_count,
    AVG(CASE WHEN status='captured' THEN amount ELSE NULL END) AS average_amount,
    SUM(CASE WHEN status='captured' AND context='membership_completed' THEN 1 ELSE 0 END) AS membership_count,
    SUM(CASE WHEN status='captured' AND context='page_bottom' THEN 1 ELSE 0 END) AS page_count,
    SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed_count,
    SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END) AS refunded_count
    FROM donations`);
  const row = rows[0] ?? {};
  return {
    confirmedTotal: Number(row.total ?? 0),
    capturedCount: Number(row.captured_count ?? 0),
    averageDonation: Number(row.average_amount ?? 0),
    membershipDonations: Number(row.membership_count ?? 0),
    pageDonations: Number(row.page_count ?? 0),
    pendingPayments: Number(row.pending_count ?? 0),
    failedPayments: Number(row.failed_count ?? 0),
    refundedDonations: Number(row.refunded_count ?? 0),
  };
}

import { createHash, randomBytes } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import QRCode from 'qrcode';
import { maskCouponForGuest } from '@/features/sponsorship/access';
import type { Campaign, CampaignPlacement, Coupon, Invoice, PartnershipRequest, QrCodeRecord, Sponsor, SponsorshipOverview } from '@/features/sponsorship/types';
import { campaignInputSchema, couponInputSchema, invoiceInputSchema, partnershipRequestSchema, sponsorInputSchema } from '@/features/sponsorship/schemas';
import { execute, queryRows, withTransaction } from './database';
import { reference, safeId, sha256 } from './security';
import { sendMail } from './mail';

type DbRow = RowDataPacket & Record<string, unknown>;
const bool = (value: unknown) => Boolean(Number(value));
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
const optionalIso = (value: unknown) => value ? iso(value) : undefined;
const optionalNumber = (value: unknown) => value === null || value === undefined ? undefined : Number(value);
const json = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
};

const sponsorSelect = `SELECT s.*, COALESCE(NULLIF(s.company_name,''), s.name) AS resolved_company_name,
  COALESCE(NULLIF(s.sponsor_level,''), s.level) AS resolved_level,
  COALESCE(NULLIF(s.display_priority,0), s.sort_order, 0) AS resolved_priority
  FROM sponsors s`;
const campaignSelect = `SELECT c.*, COALESCE(NULLIF(s.company_name,''),s.name) AS sponsor_name, s.logo_path AS sponsor_logo,
  GROUP_CONCAT(DISTINCT ce.event_id ORDER BY ce.event_id SEPARATOR ',') AS event_ids
  FROM sponsor_campaigns c JOIN sponsors s ON s.id=c.sponsor_id
  LEFT JOIN sponsor_campaign_events ce ON ce.campaign_id=c.id`;
const couponSelect = `SELECT c.*, COALESCE(NULLIF(s.company_name,''),s.name) AS sponsor_name, s.logo_path AS sponsor_logo
  FROM sponsor_coupons c JOIN sponsors s ON s.id=c.sponsor_id`;

function mapSponsor(row: DbRow): Sponsor {
  return {
    id: String(row.id), companyName: String(row.resolved_company_name ?? row.company_name ?? row.name), slug: String(row.slug ?? row.id), logo: String(row.logo_path ?? ''),
    coverImage: row.cover_image ? String(row.cover_image) : undefined, description: String(row.description ?? ''), website: row.website_url ? String(row.website_url) : undefined,
    phone: row.phone ? String(row.phone) : undefined, email: row.email ? String(row.email) : undefined, address: row.address ? String(row.address) : undefined,
    city: row.city ? String(row.city) : undefined, country: row.country ? String(row.country) : undefined, socialLinks: json(row.social_links, {}), category: row.category ? String(row.category) : undefined,
    sponsorLevel: String(row.resolved_level ?? 'PARTNER') as Sponsor['sponsorLevel'], status: String(row.status ?? (bool(row.active) ? 'ACTIVE' : 'PAUSED')) as Sponsor['status'],
    verified: bool(row.verified), featured: bool(row.featured), displayPriority: Number(row.resolved_priority ?? 0), partnershipStart: optionalIso(row.partnership_start), partnershipEnd: optionalIso(row.partnership_end),
    notes: row.notes ? String(row.notes) : undefined, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapCampaign(row: DbRow): Campaign {
  return {
    id: String(row.id), sponsorId: String(row.sponsor_id), sponsorName: row.sponsor_name ? String(row.sponsor_name) : undefined, sponsorLogo: row.sponsor_logo ? String(row.sponsor_logo) : undefined,
    campaignName: String(row.campaign_name), slug: String(row.slug), description: row.description ? String(row.description) : undefined, placement: String(row.placement) as Campaign['placement'], campaignType: String(row.campaign_type) as Campaign['campaignType'],
    bannerImage: row.banner_image ? String(row.banner_image) : undefined, tabletImage: row.tablet_image ? String(row.tablet_image) : undefined, mobileImage: row.mobile_image ? String(row.mobile_image) : undefined,
    targetUrl: String(row.target_url), targetBehavior: String(row.target_behavior) as Campaign['targetBehavior'], startDate: iso(row.start_date), endDate: iso(row.end_date),
    maxViews: optionalNumber(row.max_views), maxClicks: optionalNumber(row.max_clicks), currentViews: Number(row.current_views), currentClicks: Number(row.current_clicks), priority: Number(row.priority), weight: Number(row.weight),
    active: bool(row.active), autoExpire: bool(row.auto_expire), popupFrequencyHours: optionalNumber(row.popup_frequency_hours), eventIds: row.event_ids ? String(row.event_ids).split(',') : [], createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapCoupon(row: DbRow): Coupon {
  return {
    id: String(row.id), sponsorId: String(row.sponsor_id), sponsorName: row.sponsor_name ? String(row.sponsor_name) : undefined, sponsorLogo: row.sponsor_logo ? String(row.sponsor_logo) : undefined,
    title: String(row.title), slug: String(row.slug), description: row.description ? String(row.description) : undefined, couponCode: String(row.coupon_code), discountType: String(row.discount_type) as Coupon['discountType'],
    percentage: optionalNumber(row.percentage), fixedAmount: optionalNumber(row.fixed_amount), currency: String(row.currency), minimumPurchase: optionalNumber(row.minimum_purchase), expirationDate: iso(row.expiration_date),
    usageLimit: optionalNumber(row.usage_limit), currentUsage: Number(row.current_usage), terms: row.terms ? String(row.terms) : undefined, category: String(row.category) as Coupon['category'], redemptionUrl: row.redemption_url ? String(row.redemption_url) : undefined,
    active: bool(row.active), favorite: row.favorite === undefined ? undefined : bool(row.favorite), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapRequest(row: DbRow): PartnershipRequest {
  return {
    id: String(row.id), reference: String(row.reference), companyName: String(row.company_name), contactName: String(row.contact_name), phone: String(row.phone), email: String(row.email), website: row.website ? String(row.website) : undefined,
    activity: String(row.activity), budget: optionalNumber(row.budget), budgetCurrency: String(row.budget_currency), message: String(row.message), logo: row.logo ? String(row.logo) : undefined, companyProfile: row.company_profile ? String(row.company_profile) : undefined,
    agreementAccepted: bool(row.agreement_accepted), status: String(row.status) as PartnershipRequest['status'], adminNotes: row.admin_notes ? String(row.admin_notes) : undefined, convertedSponsorId: row.converted_sponsor_id ? String(row.converted_sponsor_id) : undefined,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapInvoice(row: DbRow): Invoice {
  const paidAmount = Number(row.paid_amount ?? 0); const amount = Number(row.amount) + Number(row.tax_amount ?? 0);
  return {
    id: String(row.id), sponsorId: String(row.sponsor_id), sponsorName: row.sponsor_name ? String(row.sponsor_name) : undefined, campaignId: row.campaign_id ? String(row.campaign_id) : undefined,
    campaignName: row.campaign_name ? String(row.campaign_name) : undefined, invoiceNumber: String(row.invoice_number), amount: Number(row.amount), taxAmount: Number(row.tax_amount), currency: String(row.currency),
    paymentStatus: String(row.payment_status) as Invoice['paymentStatus'], issuedAt: iso(row.issued_at), dueDate: iso(row.due_date), paidAt: optionalIso(row.paid_at), generatedPdf: row.generated_pdf ? String(row.generated_pdf) : undefined,
    notes: row.notes ? String(row.notes) : undefined, paidAmount, outstandingAmount: Math.max(0, amount - paidAmount), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapQr(row: DbRow): QrCodeRecord {
  return { id: String(row.id), sponsorId: String(row.sponsor_id), campaignId: row.campaign_id ? String(row.campaign_id) : undefined, couponId: row.coupon_id ? String(row.coupon_id) : undefined,
    format: String(row.format) as QrCodeRecord['format'], destinationType: String(row.destination_type) as QrCodeRecord['destinationType'], destinationUrl: String(row.destination_url), qrDataUrl: row.qr_data_url ? String(row.qr_data_url) : undefined,
    active: bool(row.active), scanCount: Number(row.scan_count), createdAt: iso(row.created_at) };
}

export async function getPublicSponsors(options: { featured?: boolean; limit?: number; category?: string } = {}) {
  const filters = ["s.status='ACTIVE'", 's.active=1', '(s.partnership_start IS NULL OR s.partnership_start<=UTC_TIMESTAMP(3))', '(s.partnership_end IS NULL OR s.partnership_end>=UTC_TIMESTAMP(3))'];
  const values: unknown[] = [];
  if (options.featured) filters.push('s.featured=1');
  if (options.category) { filters.push('s.category=?'); values.push(options.category); }
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 100), 1), 200);
  return (await queryRows<DbRow>(`${sponsorSelect} WHERE ${filters.join(' AND ')} ORDER BY s.featured DESC, resolved_priority DESC, s.created_at DESC LIMIT ${limit}`, values)).map(mapSponsor);
}

export async function getPublicSponsor(slug: string, options: { includeProtectedOfferFields?: boolean } = {}) {
  const rows = await queryRows<DbRow>(`${sponsorSelect} WHERE s.slug=? AND s.status='ACTIVE' AND s.active=1 LIMIT 1`, [slug]);
  const sponsor = rows[0] ? mapSponsor(rows[0]) : undefined;
  if (!sponsor) return;
  const [campaigns, coupons, gallery, events] = await Promise.all([
    queryRows<DbRow>(`${campaignSelect} WHERE c.sponsor_id=? AND c.active=1 AND c.start_date<=UTC_TIMESTAMP(3) AND c.end_date>=UTC_TIMESTAMP(3) GROUP BY c.id ORDER BY c.priority DESC`, [sponsor.id]),
    queryRows<DbRow>(`${couponSelect} WHERE c.sponsor_id=? AND c.active=1 AND c.expiration_date>=UTC_TIMESTAMP(3) ORDER BY c.expiration_date`, [sponsor.id]),
    queryRows<DbRow>('SELECT * FROM sponsor_gallery WHERE sponsor_id=? ORDER BY sort_order, created_at', [sponsor.id]),
    queryRows<DbRow>(`SELECT DISTINCT e.id,e.slug,e.title_en,e.title_ar,e.starts_at,e.cover_path FROM events e JOIN sponsor_campaign_events ce ON ce.event_id=e.id JOIN sponsor_campaigns c ON c.id=ce.campaign_id WHERE c.sponsor_id=? AND e.status='PUBLISHED' ORDER BY e.starts_at DESC`, [sponsor.id]),
  ]);
  const visibleCoupons = coupons
    .map(mapCoupon)
    .map(coupon => options.includeProtectedOfferFields ? coupon : maskCouponForGuest(coupon));
  return { sponsor, campaigns: campaigns.map(mapCampaign), coupons: visibleCoupons, gallery: gallery.map(row => ({ id: String(row.id), mediaType: String(row.media_type), mediaPath: String(row.media_path), altText: String(row.alt_text) })), events: events.map(row => ({ id: String(row.id), slug: String(row.slug), title: { en: String(row.title_en), ar: String(row.title_ar) }, startsAt: iso(row.starts_at), coverPath: row.cover_path ? String(row.cover_path) : undefined })) };
}

export async function getActiveCoupons(options: { category?: string; search?: string; memberId?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, options.page ?? 1); const pageSize = Math.min(60, Math.max(1, options.pageSize ?? 24)); const values: unknown[] = []; const filters = ['c.active=1', "s.status='ACTIVE'", 's.active=1', 'c.expiration_date>=UTC_TIMESTAMP(3)', '(c.usage_limit IS NULL OR c.current_usage<c.usage_limit)'];
  if (options.category) { filters.push('c.category=?'); values.push(options.category); }
  if (options.search) { filters.push('(c.title LIKE ? OR c.description LIKE ? OR s.company_name LIKE ?)'); const term = `%${options.search}%`; values.push(term, term, term); }
  const favoriteJoin = options.memberId ? 'LEFT JOIN sponsor_coupon_favorites f ON f.coupon_id=c.id AND f.member_id=?' : '';
  const favoriteColumn = options.memberId ? ', f.member_id IS NOT NULL AS favorite' : '';
  const dataValues = options.memberId ? [options.memberId, ...values] : values;
  const count = await queryRows<DbRow>(`SELECT COUNT(*) AS total FROM sponsor_coupons c JOIN sponsors s ON s.id=c.sponsor_id ${favoriteJoin} WHERE ${filters.join(' AND ')}`, dataValues);
  const rows = await queryRows<DbRow>(`${couponSelect.replace('FROM sponsor_coupons', `${favoriteColumn} FROM sponsor_coupons`)} ${favoriteJoin} WHERE ${filters.join(' AND ')} ORDER BY c.expiration_date, c.created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, dataValues);
  const total = Number(count[0]?.total ?? 0); return { items: rows.map(mapCoupon), page, pageSize, total, pageCount: Math.ceil(total / pageSize) };
}

export async function getEligibleCampaigns(placement: CampaignPlacement, eventId?: string) {
  const eventJoin = eventId ? 'JOIN sponsor_campaign_events delivery_event ON delivery_event.campaign_id=c.id AND delivery_event.event_id=?' : '';
  const values: unknown[] = eventId ? [eventId, placement] : [placement];
  const rows = await queryRows<DbRow>(`${campaignSelect} ${eventJoin} WHERE c.placement=? AND c.active=1 AND s.active=1 AND s.status='ACTIVE'
    AND c.start_date<=UTC_TIMESTAMP(3) AND c.end_date>=UTC_TIMESTAMP(3) AND (c.max_views IS NULL OR c.current_views<c.max_views) AND (c.max_clicks IS NULL OR c.current_clicks<c.max_clicks)
    GROUP BY c.id ORDER BY c.priority DESC, s.display_priority DESC`, values);
  return rows.map(mapCampaign);
}

export function selectWeightedCampaign(campaigns: Campaign[], excludeCampaignIds: string[] = []) {
  if (!campaigns.length) return;
  const topPriority = Math.max(...campaigns.map(item => item.priority));
  let pool = campaigns.filter(item => item.priority === topPriority && !excludeCampaignIds.includes(item.id));
  if (!pool.length) pool = campaigns.filter(item => item.priority === topPriority);
  const total = pool.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let selection = Math.random() * total;
  for (const item of pool) { selection -= Math.max(1, item.weight); if (selection <= 0) return item; }
  return pool.at(-1);
}

export function createCouponCode(now = new Date(), entropy: Uint8Array = randomBytes(6)) {
  return `LOT-${now.getUTCFullYear()}-${Buffer.from(entropy).toString('hex').toUpperCase()}`;
}

async function createUniqueCouponCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createCouponCode();
    const existing = await queryRows<DbRow>('SELECT id FROM sponsor_coupons WHERE coupon_code=? LIMIT 1', [code]);
    if (!existing.length) return code;
  }
  throw new Error('Unable to generate a unique coupon code. Please try again.');
}

function clientDetails(request: Request, suppliedDeviceId?: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const secret = process.env.ANALYTICS_HASH_SECRET || process.env.SESSION_SECRET || 'local-analytics-secret';
  const agent = request.headers.get('user-agent') || 'unknown';
  const device = suppliedDeviceId || agent;
  const deviceType = /mobile|android|iphone/i.test(agent) ? 'Mobile' : /tablet|ipad/i.test(agent) ? 'Tablet' : 'Desktop';
  const browser = /edg/i.test(agent) ? 'Edge' : /firefox/i.test(agent) ? 'Firefox' : /chrome/i.test(agent) ? 'Chrome' : /safari/i.test(agent) ? 'Safari' : 'Other';
  const operatingSystem = /windows/i.test(agent) ? 'Windows' : /android/i.test(agent) ? 'Android' : /iphone|ipad|mac os/i.test(agent) ? 'Apple' : /linux/i.test(agent) ? 'Linux' : 'Other';
  return { ipHash: createHash('sha256').update(`${secret}:${ip}`).digest('hex'), deviceIdHash: createHash('sha256').update(`${secret}:${device}`).digest('hex'), deviceType, browser, operatingSystem };
}

export async function trackCampaignEvent(input: { campaignId: string; page: string; placement: string; deviceId?: string; memberId?: string; source?: 'WEB' | 'QR'; country?: string; city?: string }, request: Request, kind: 'impression' | 'click') {
  const rows = await queryRows<DbRow>('SELECT sponsor_id FROM sponsor_campaigns WHERE id=? AND active=1 AND start_date<=UTC_TIMESTAMP(3) AND end_date>=UTC_TIMESTAMP(3) LIMIT 1', [input.campaignId]);
  if (!rows[0]) throw new Error('Campaign is not eligible for tracking.');
  const details = clientDetails(request, input.deviceId); const source = input.source ?? 'WEB';
  const windowMs = kind === 'impression' ? 30 * 60_000 : 5 * 60_000; const bucket = Math.floor(Date.now() / windowMs); const table = kind === 'impression' ? 'sponsor_impressions' : 'sponsor_clicks'; const timeField = 'occurred_at';
  const result = await execute(`INSERT IGNORE INTO ${table} (sponsor_id,campaign_id,member_id,device_id_hash,page,placement,source,ip_hash,country,city,device_type,browser,operating_system,${timeField},dedupe_bucket) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3),?)`,
    [String(rows[0].sponsor_id), input.campaignId, input.memberId ?? null, details.deviceIdHash, input.page.slice(0, 500), input.placement.slice(0, 80), source, details.ipHash, input.country?.slice(0, 120) ?? null, input.city?.slice(0, 120) ?? null, details.deviceType, details.browser, details.operatingSystem, bucket]);
  if (result.affectedRows) await execute(`UPDATE sponsor_campaigns SET ${kind === 'impression' ? 'current_views=current_views+1' : 'current_clicks=current_clicks+1'} WHERE id=?`, [input.campaignId]);
  return { recorded: Boolean(result.affectedRows) };
}

export async function submitPartnershipRequest(raw: unknown) {
  const input = partnershipRequestSchema.parse(raw); const id = safeId('prq'); const ref = reference().replace('LOT-', 'LOT-SP-');
  await execute(`INSERT INTO partnership_requests (id,reference,company_name,contact_name,phone,email,website,activity,budget,budget_currency,message,logo,company_profile,agreement_accepted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [id, ref, input.companyName, input.contactName, input.phone, input.email, input.website ?? null, input.activity, input.budget ?? null, input.budgetCurrency, input.message, input.logo ?? null, input.companyProfile ?? null]);
  await execute(`INSERT INTO sponsorship_activities (actor,action,resource_type,resource_id,detail) VALUES ('public','request.created','partnership_request',?,?)`, [id, `${input.companyName} · ${ref}`]);
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (adminEmail) void sendMail({ to: adminEmail, subject: `New partnership request · ${ref}`, text: `${input.companyName}\n${input.contactName}\n${input.email}\n${input.phone}\n\n${input.message}` });
  void sendMail({ to: input.email, subject: `Partnership request ${ref} received`, text: `Hello ${input.contactName},\n\nWe received ${input.companyName}'s partnership request. Our team will review it and contact you using reference ${ref}.\n\nLeaders of Tomorrow ESTK` });
  return { id, reference: ref };
}

export async function toggleCouponFavorite(couponId: string, memberId: string, favorite: boolean) {
  if (favorite) await execute('INSERT IGNORE INTO sponsor_coupon_favorites (coupon_id,member_id) SELECT id,? FROM sponsor_coupons WHERE id=? AND active=1', [memberId, couponId]);
  else await execute('DELETE FROM sponsor_coupon_favorites WHERE coupon_id=? AND member_id=?', [couponId, memberId]);
  return { favorite };
}

export async function redeemCoupon(couponId: string, memberId: string, request: Request, deviceId?: string) {
  const details = clientDetails(request, deviceId); const id = safeId('red');
  return withTransaction(async connection => {
    const coupons = await queryRows<DbRow>('SELECT * FROM sponsor_coupons WHERE id=? AND active=1 AND expiration_date>=UTC_TIMESTAMP(3) FOR UPDATE', [couponId], connection);
    const coupon = coupons[0]; if (!coupon || (coupon.usage_limit !== null && Number(coupon.current_usage) >= Number(coupon.usage_limit))) throw new Error('This coupon is no longer available.');
    await execute('INSERT INTO sponsor_coupon_redemptions (id,coupon_id,member_id,device_id_hash,ip_hash) VALUES (?,?,?,?,?)', [id, couponId, memberId, details.deviceIdHash, details.ipHash], connection);
    await execute('UPDATE sponsor_coupons SET current_usage=current_usage+1 WHERE id=?', [couponId], connection);
    return { id, couponCode: String(coupon.coupon_code), redemptionUrl: coupon.redemption_url ? String(coupon.redemption_url) : undefined };
  });
}

async function logActivity(actor: string, action: string, resourceType: string, resourceId: string, detail?: string, connection?: PoolConnection) {
  await execute('INSERT INTO sponsorship_activities (actor,action,resource_type,resource_id,detail) VALUES (?,?,?,?,?)', [actor, action, resourceType, resourceId, detail ?? null], connection);
}

function refreshAssistantKnowledge(actor:string){globalThis.lotKnowledgeLastSync=0;void import('./chatbotKnowledgeRepository').then(module=>module.queuePlatformKnowledgeSync(`sponsorship:${actor}`)).catch(()=>undefined);}

export async function createSponsor(raw: unknown, actor: string) {
  const input = sponsorInputSchema.parse(raw); const id = safeId('spn');
  await execute(`INSERT INTO sponsors (id,name,company_name,slug,level,sponsor_level,logo_path,cover_image,description,website_url,phone,email,address,city,country,social_links,category,status,verified,featured,sort_order,display_priority,active,partnership_start,partnership_end,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, input.companyName, input.companyName, input.slug, input.sponsorLevel, input.sponsorLevel, input.logo, input.coverImage ?? null, input.description, input.website ?? null, input.phone ?? null, input.email ?? null, input.address ?? null, input.city ?? null, input.country ?? null, JSON.stringify(input.socialLinks), input.category ?? null, input.status, input.verified, input.featured, Math.max(0, input.displayPriority), input.displayPriority, input.status === 'ACTIVE', input.partnershipStart ?? null, input.partnershipEnd ?? null, input.notes ?? null]);
  await logActivity(actor, 'sponsor.created', 'sponsor', id, input.companyName); refreshAssistantKnowledge(actor); return getAdminSponsor(id);
}

export async function getAdminSponsor(id: string) { const rows = await queryRows<DbRow>(`${sponsorSelect} WHERE s.id=? LIMIT 1`, [id]); return rows[0] ? mapSponsor(rows[0]) : undefined; }

export async function updateSponsor(id: string, raw: unknown, actor: string) {
  const input = sponsorInputSchema.parse(raw);
  const result = await execute(`UPDATE sponsors SET name=?,company_name=?,slug=?,level=?,sponsor_level=?,logo_path=?,cover_image=?,description=?,website_url=?,phone=?,email=?,address=?,city=?,country=?,social_links=?,category=?,status=?,verified=?,featured=?,sort_order=?,display_priority=?,active=?,partnership_start=?,partnership_end=?,notes=? WHERE id=?`,
    [input.companyName, input.companyName, input.slug, input.sponsorLevel, input.sponsorLevel, input.logo, input.coverImage ?? null, input.description, input.website ?? null, input.phone ?? null, input.email ?? null, input.address ?? null, input.city ?? null, input.country ?? null, JSON.stringify(input.socialLinks), input.category ?? null, input.status, input.verified, input.featured, Math.max(0, input.displayPriority), input.displayPriority, input.status === 'ACTIVE', input.partnershipStart ?? null, input.partnershipEnd ?? null, input.notes ?? null, id]);
  if (!result.affectedRows) throw new Error('Sponsor not found.'); await logActivity(actor, 'sponsor.updated', 'sponsor', id, input.companyName); refreshAssistantKnowledge(actor); return getAdminSponsor(id);
}

export async function createCampaign(raw: unknown, actor: string) { const input = campaignInputSchema.parse(raw); const id = safeId('cmp'); await withTransaction(async connection => {
  await execute(`INSERT INTO sponsor_campaigns (id,sponsor_id,campaign_name,slug,description,placement,campaign_type,banner_image,tablet_image,mobile_image,target_url,target_behavior,start_date,end_date,max_views,max_clicks,priority,weight,active,auto_expire,popup_frequency_hours) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id,input.sponsorId,input.campaignName,input.slug,input.description??null,input.placement,input.campaignType,input.bannerImage??null,input.tabletImage??null,input.mobileImage??null,input.targetUrl,input.targetBehavior,input.startDate,input.endDate,input.maxViews??null,input.maxClicks??null,input.priority,input.weight,input.active,input.autoExpire,input.popupFrequencyHours??null], connection);
  for (const eventId of input.eventIds) await execute('INSERT INTO sponsor_campaign_events (campaign_id,event_id) VALUES (?,?)', [id,eventId], connection); await logActivity(actor,'campaign.created','campaign',id,input.campaignName,connection); }); return getAdminCampaign(id); }

export async function getAdminCampaign(id: string) { const rows=await queryRows<DbRow>(`${campaignSelect} WHERE c.id=? GROUP BY c.id LIMIT 1`,[id]); return rows[0]?mapCampaign(rows[0]):undefined; }
export async function updateCampaign(id:string,raw:unknown,actor:string) { const input=campaignInputSchema.parse(raw); await withTransaction(async connection=>{
  const result=await execute(`UPDATE sponsor_campaigns SET sponsor_id=?,campaign_name=?,slug=?,description=?,placement=?,campaign_type=?,banner_image=?,tablet_image=?,mobile_image=?,target_url=?,target_behavior=?,start_date=?,end_date=?,max_views=?,max_clicks=?,priority=?,weight=?,active=?,auto_expire=?,popup_frequency_hours=? WHERE id=?`,
    [input.sponsorId,input.campaignName,input.slug,input.description??null,input.placement,input.campaignType,input.bannerImage??null,input.tabletImage??null,input.mobileImage??null,input.targetUrl,input.targetBehavior,input.startDate,input.endDate,input.maxViews??null,input.maxClicks??null,input.priority,input.weight,input.active,input.autoExpire,input.popupFrequencyHours??null,id],connection); if(!result.affectedRows) throw new Error('Campaign not found.');
  await execute('DELETE FROM sponsor_campaign_events WHERE campaign_id=?',[id],connection); for(const eventId of input.eventIds) await execute('INSERT INTO sponsor_campaign_events (campaign_id,event_id) VALUES (?,?)',[id,eventId],connection); await logActivity(actor,'campaign.updated','campaign',id,input.campaignName,connection); }); return getAdminCampaign(id); }

export async function createCoupon(raw:unknown,actor:string){const couponCode=await createUniqueCouponCode();const input=couponInputSchema.parse({...raw as Record<string,unknown>,couponCode});const id=safeId('cpn');await execute(`INSERT INTO sponsor_coupons (id,sponsor_id,title,slug,description,coupon_code,discount_type,percentage,fixed_amount,currency,minimum_purchase,expiration_date,usage_limit,terms,category,redemption_url,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[id,input.sponsorId,input.title,input.slug,input.description??null,input.couponCode,input.discountType,input.percentage??null,input.fixedAmount??null,input.currency,input.minimumPurchase??null,input.expirationDate,input.usageLimit??null,input.terms??null,input.category,input.redemptionUrl??null,input.active]);await logActivity(actor,'coupon.created','coupon',id,input.title);refreshAssistantKnowledge(actor);return getAdminCoupon(id);}
export async function getAdminCoupon(id:string){const rows=await queryRows<DbRow>(`${couponSelect} WHERE c.id=? LIMIT 1`,[id]);return rows[0]?mapCoupon(rows[0]):undefined;}
export async function updateCoupon(id:string,raw:unknown,actor:string){const existing=await getAdminCoupon(id);if(!existing)throw new Error('Coupon not found.');const input=couponInputSchema.parse({...raw as Record<string,unknown>,couponCode:existing.couponCode});const result=await execute(`UPDATE sponsor_coupons SET sponsor_id=?,title=?,slug=?,description=?,coupon_code=?,discount_type=?,percentage=?,fixed_amount=?,currency=?,minimum_purchase=?,expiration_date=?,usage_limit=?,terms=?,category=?,redemption_url=?,active=? WHERE id=?`,[input.sponsorId,input.title,input.slug,input.description??null,input.couponCode,input.discountType,input.percentage??null,input.fixedAmount??null,input.currency,input.minimumPurchase??null,input.expirationDate,input.usageLimit??null,input.terms??null,input.category,input.redemptionUrl??null,input.active,id]);if(!result.affectedRows)throw new Error('Coupon not found.');await logActivity(actor,'coupon.updated','coupon',id,input.title);refreshAssistantKnowledge(actor);return getAdminCoupon(id);}

export async function createInvoice(raw:unknown,actor:string){const input=invoiceInputSchema.parse(raw);const id=safeId('inv');await execute(`INSERT INTO sponsor_invoices (id,sponsor_id,campaign_id,invoice_number,amount,tax_amount,currency,payment_status,issued_at,due_date,paid_at,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[id,input.sponsorId,input.campaignId??null,input.invoiceNumber,input.amount,input.taxAmount,input.currency,input.paymentStatus,input.issuedAt,input.dueDate,input.paidAt??null,input.notes??null]);await logActivity(actor,'invoice.created','invoice',id,input.invoiceNumber);return getAdminInvoice(id);}
export async function getAdminInvoice(id:string){const rows=await queryRows<DbRow>(`SELECT i.*,COALESCE(NULLIF(s.company_name,''),s.name) sponsor_name,c.campaign_name,COALESCE(SUM(p.amount),0) paid_amount FROM sponsor_invoices i JOIN sponsors s ON s.id=i.sponsor_id LEFT JOIN sponsor_campaigns c ON c.id=i.campaign_id LEFT JOIN sponsor_payments p ON p.invoice_id=i.id WHERE i.id=? GROUP BY i.id LIMIT 1`,[id]);return rows[0]?mapInvoice(rows[0]):undefined;}
export async function updateInvoice(id:string,raw:unknown,actor:string){const input=invoiceInputSchema.parse(raw);const result=await execute(`UPDATE sponsor_invoices SET sponsor_id=?,campaign_id=?,invoice_number=?,amount=?,tax_amount=?,currency=?,payment_status=?,issued_at=?,due_date=?,paid_at=?,notes=? WHERE id=?`,[input.sponsorId,input.campaignId??null,input.invoiceNumber,input.amount,input.taxAmount,input.currency,input.paymentStatus,input.issuedAt,input.dueDate,input.paidAt??null,input.notes??null,id]);if(!result.affectedRows)throw new Error('Invoice not found.');await logActivity(actor,'invoice.updated','invoice',id,input.invoiceNumber);return getAdminInvoice(id);}

export async function updatePartnershipRequest(id:string,raw:unknown,actor:string){const status=String((raw as Record<string,unknown>).status??'');const notes=String((raw as Record<string,unknown>).adminNotes??'').slice(0,20000);if(!['NEW','IN_REVIEW','CHANGES_REQUESTED','ACCEPTED','REJECTED'].includes(status))throw new Error('Invalid request status.');const result=await execute('UPDATE partnership_requests SET status=?,admin_notes=? WHERE id=?',[status,notes||null,id]);if(!result.affectedRows)throw new Error('Request not found.');await logActivity(actor,'request.updated','partnership_request',id,status);return getAdminRequest(id);}
export async function getAdminRequest(id:string){const rows=await queryRows<DbRow>('SELECT * FROM partnership_requests WHERE id=? LIMIT 1',[id]);return rows[0]?mapRequest(rows[0]):undefined;}

export async function convertPartnershipRequest(id:string,actor:string){return withTransaction(async connection=>{const rows=await queryRows<DbRow>('SELECT * FROM partnership_requests WHERE id=? FOR UPDATE',[id],connection);const request=rows[0];if(!request)throw new Error('Request not found.');if(request.converted_sponsor_id)throw new Error('Request has already been converted.');const sponsorId=safeId('spn');let slug=String(request.company_name).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||sponsorId;const exists=await queryRows<DbRow>('SELECT id FROM sponsors WHERE slug=?',[slug],connection);if(exists.length)slug=`${slug}-${randomBytes(2).toString('hex')}`;
  await execute(`INSERT INTO sponsors (id,name,company_name,slug,level,sponsor_level,logo_path,description,website_url,phone,email,category,status,active,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[sponsorId,String(request.company_name),String(request.company_name),slug,'PARTNER','PARTNER',String(request.logo??''),String(request.message),request.website??null,String(request.phone),String(request.email),String(request.activity),'DRAFT',0,`Converted from ${request.reference}`],connection);
  await execute("UPDATE partnership_requests SET status='CONVERTED',converted_sponsor_id=? WHERE id=?",[sponsorId,id],connection);await logActivity(actor,'request.converted','sponsor',sponsorId,String(request.reference),connection);return {sponsorId,slug};});}

const resourceTables={campaigns:'sponsor_campaigns',coupons:'sponsor_coupons',invoices:'sponsor_invoices',requests:'partnership_requests',qrs:'sponsor_qr_codes'} as const;
export async function deleteSponsorshipResource(resource:string,id:string,actor:string){if(resource==='sponsors'){await execute("UPDATE sponsors SET status='ARCHIVED',active=0 WHERE id=?",[id]);await logActivity(actor,'sponsor.archived','sponsor',id);return;}const table=resourceTables[resource as keyof typeof resourceTables];if(!table)throw new Error('Unsupported sponsorship resource.');const result=await execute(`DELETE FROM ${table} WHERE id=?`,[id]);if(!result.affectedRows)throw new Error('Resource not found.');await logActivity(actor,`${resource}.deleted`,resource,id);}

export async function generateSponsorQr(raw:Record<string,unknown>,actor:string){const sponsorId=String(raw.sponsorId??'');const campaignId=raw.campaignId?String(raw.campaignId):undefined;const couponId=raw.couponId?String(raw.couponId):undefined;const format=String(raw.format??'POSTER');const destinationType=String(raw.destinationType??'TRACKING_LINK');const destinationUrl=String(raw.destinationUrl??'');if(!sponsorId||!destinationUrl||!['POSTER','FLYER','STICKER','BUSINESS_CARD'].includes(format))throw new Error('Sponsor, format, and destination URL are required.');new URL(destinationUrl);const id=safeId('sqr');const token=randomBytes(32).toString('hex');const trackingUrl=`${(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000').replace(/\/$/,'')}/api/public/sponsorship/qr/${token}`;const settings=await queryRows<DbRow>("SELECT setting_value FROM sponsorship_settings WHERE setting_key='qr'");const design=json(settings[0]?.setting_value,{foreground:'#0B3F47',background:'#FFFFFF',margin:2,errorCorrectionLevel:'H'});const qrDataUrl=await QRCode.toDataURL(trackingUrl,{width:format==='POSTER'?1200:640,margin:Number((design as Record<string,unknown>).margin??2),errorCorrectionLevel:'H',color:{dark:String((design as Record<string,unknown>).foreground??'#0B3F47'),light:String((design as Record<string,unknown>).background??'#FFFFFF')}});await execute(`INSERT INTO sponsor_qr_codes (id,sponsor_id,campaign_id,coupon_id,format,destination_type,destination_url,token_hash,design,qr_data_url) VALUES (?,?,?,?,?,?,?,?,?,?)`,[id,sponsorId,campaignId??null,couponId??null,format,destinationType,destinationUrl,sha256(token),JSON.stringify(design),qrDataUrl]);await logActivity(actor,'qr.created','qr',id,format);return {id,qrDataUrl,trackingUrl};}

export async function resolveQrScan(token:string,request:Request){const tokenHash=sha256(token);const rows=await queryRows<DbRow>('SELECT * FROM sponsor_qr_codes WHERE token_hash=? AND active=1 LIMIT 1',[tokenHash]);const qr=rows[0];if(!qr)return;await execute('UPDATE sponsor_qr_codes SET scan_count=scan_count+1 WHERE id=?',[qr.id]);if(qr.campaign_id)await trackCampaignEvent({campaignId:String(qr.campaign_id),page:'qr',placement:'QR',source:'QR'},request,'impression');return String(qr.destination_url);}

export async function updateSponsorshipSettings(raw:Record<string,unknown>,actorId:string|undefined,actor:string){await withTransaction(async connection=>{for(const [key,value] of Object.entries(raw)){if(!['delivery','coupons','invoices','qr','packages','analytics'].includes(key))continue;await execute('INSERT INTO sponsorship_settings (setting_key,setting_value,updated_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_by=VALUES(updated_by)',[key,JSON.stringify(value),actorId??null],connection);}await logActivity(actor,'settings.updated','settings','sponsorship',undefined,connection);});return getSponsorshipSettings();}
export async function getSponsorshipSettings(){const rows=await queryRows<DbRow>('SELECT setting_key,setting_value FROM sponsorship_settings ORDER BY setting_key');return Object.fromEntries(rows.map(row=>[String(row.setting_key),json(row.setting_value,null)]));}

export async function getSponsorshipOverview(from?:string,to?:string):Promise<SponsorshipOverview>{const end=to?new Date(to):new Date();const start=from?new Date(from):new Date(end.getTime()-29*86400000);if(Number.isNaN(+start)||Number.isNaN(+end))throw new Error('Invalid analytics date range.');const params=[start.toISOString(),end.toISOString()];
  const [statsRows,timeline,topSponsors,topCampaigns,couponUsage,devices,countries,browsers,activities,sponsors,campaigns,coupons,invoices,requests,qrs,settings]=await Promise.all([
    queryRows<DbRow>(`SELECT (SELECT COUNT(*) FROM sponsors WHERE status<>'ARCHIVED') total_sponsors,(SELECT COUNT(*) FROM sponsor_campaigns WHERE active=1 AND start_date<=UTC_TIMESTAMP(3) AND end_date>=UTC_TIMESTAMP(3)) active_campaigns,(SELECT COUNT(*) FROM sponsor_impressions WHERE occurred_at>=UTC_DATE()) today_views,(SELECT COUNT(*) FROM sponsor_clicks WHERE occurred_at>=UTC_DATE()) today_clicks,(SELECT COALESCE(SUM(amount+tax_amount),0) FROM sponsor_invoices WHERE payment_status='PAID' AND paid_at BETWEEN ? AND ?) revenue,(SELECT COUNT(*) FROM partnership_requests WHERE status IN ('NEW','IN_REVIEW','CHANGES_REQUESTED')) pending_requests,(SELECT COUNT(*) FROM sponsor_campaigns WHERE active=1 AND end_date BETWEEN UTC_TIMESTAMP(3) AND DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 14 DAY)) expiring_campaigns,(SELECT COALESCE(SUM(GREATEST(0,i.amount+i.tax_amount-COALESCE(p.paid,0))),0) FROM sponsor_invoices i LEFT JOIN (SELECT invoice_id,SUM(amount) paid FROM sponsor_payments GROUP BY invoice_id) p ON p.invoice_id=i.id WHERE i.payment_status NOT IN ('PAID','VOID')) outstanding_balance`,params),
    queryRows<DbRow>(`WITH RECURSIVE dates AS (SELECT DATE(?) day UNION ALL SELECT day+INTERVAL 1 DAY FROM dates WHERE day<DATE(?)),v AS (SELECT DATE(occurred_at) day,COUNT(*) views,COUNT(DISTINCT device_id_hash) unique_views,SUM(source='QR') qr_scans FROM sponsor_impressions WHERE occurred_at BETWEEN ? AND ? GROUP BY DATE(occurred_at)),c AS (SELECT DATE(occurred_at) day,COUNT(*) clicks FROM sponsor_clicks WHERE occurred_at BETWEEN ? AND ? GROUP BY DATE(occurred_at)),r AS (SELECT DATE(occurred_at) day,COUNT(*) uses FROM sponsor_coupon_redemptions WHERE occurred_at BETWEEN ? AND ? GROUP BY DATE(occurred_at)),rev AS (SELECT DATE(paid_at) day,SUM(amount+tax_amount) revenue FROM sponsor_invoices WHERE payment_status='PAID' AND paid_at BETWEEN ? AND ? GROUP BY DATE(paid_at)) SELECT DATE_FORMAT(d.day,'%Y-%m-%d') date,COALESCE(v.views,0) views,COALESCE(v.unique_views,0) unique_views,COALESCE(c.clicks,0) clicks,COALESCE(v.qr_scans,0) qr_scans,COALESCE(r.uses,0) coupon_uses,COALESCE(rev.revenue,0) revenue FROM dates d LEFT JOIN v ON v.day=d.day LEFT JOIN c ON c.day=d.day LEFT JOIN r ON r.day=d.day LEFT JOIN rev ON rev.day=d.day ORDER BY d.day`,[...params,...params,...params,...params,...params]),
    queryRows<DbRow>(`SELECT s.id,COALESCE(NULLIF(s.company_name,''),s.name) name,COUNT(DISTINCT i.id) views,COUNT(DISTINCT c.id) clicks FROM sponsors s LEFT JOIN sponsor_impressions i ON i.sponsor_id=s.id AND i.occurred_at BETWEEN ? AND ? LEFT JOIN sponsor_clicks c ON c.sponsor_id=s.id AND c.occurred_at BETWEEN ? AND ? GROUP BY s.id ORDER BY views DESC,clicks DESC LIMIT 10`,[...params,...params]),
    queryRows<DbRow>(`SELECT sc.id,sc.campaign_name name,COUNT(DISTINCT i.id) views,COUNT(DISTINCT c.id) clicks FROM sponsor_campaigns sc LEFT JOIN sponsor_impressions i ON i.campaign_id=sc.id AND i.occurred_at BETWEEN ? AND ? LEFT JOIN sponsor_clicks c ON c.campaign_id=sc.id AND c.occurred_at BETWEEN ? AND ? GROUP BY sc.id ORDER BY views DESC,clicks DESC LIMIT 10`,[...params,...params]),
    queryRows<DbRow>('SELECT id,title AS name,current_usage AS coupon_usage,usage_limit AS coupon_limit FROM sponsor_coupons ORDER BY current_usage DESC LIMIT 10'),
    queryRows<DbRow>('SELECT COALESCE(device_type,\'Unknown\') name,COUNT(*) value FROM sponsor_impressions WHERE occurred_at BETWEEN ? AND ? GROUP BY device_type ORDER BY value DESC',params),
    queryRows<DbRow>('SELECT COALESCE(country,\'Unknown\') name,COUNT(*) value FROM sponsor_impressions WHERE occurred_at BETWEEN ? AND ? GROUP BY country ORDER BY value DESC LIMIT 12',params),
    queryRows<DbRow>('SELECT COALESCE(browser,\'Unknown\') name,COUNT(*) value FROM sponsor_impressions WHERE occurred_at BETWEEN ? AND ? GROUP BY browser ORDER BY value DESC',params),
    queryRows<DbRow>('SELECT * FROM sponsorship_activities ORDER BY occurred_at DESC LIMIT 30'),queryRows<DbRow>(`${sponsorSelect} ORDER BY s.created_at DESC LIMIT 250`),queryRows<DbRow>(`${campaignSelect} GROUP BY c.id ORDER BY c.created_at DESC LIMIT 250`),queryRows<DbRow>(`${couponSelect} ORDER BY c.created_at DESC LIMIT 250`),queryRows<DbRow>(`SELECT i.*,COALESCE(NULLIF(s.company_name,''),s.name) sponsor_name,c.campaign_name,COALESCE(SUM(p.amount),0) paid_amount FROM sponsor_invoices i JOIN sponsors s ON s.id=i.sponsor_id LEFT JOIN sponsor_campaigns c ON c.id=i.campaign_id LEFT JOIN sponsor_payments p ON p.invoice_id=i.id GROUP BY i.id ORDER BY i.created_at DESC LIMIT 250`),queryRows<DbRow>('SELECT * FROM partnership_requests ORDER BY created_at DESC LIMIT 250'),queryRows<DbRow>('SELECT * FROM sponsor_qr_codes ORDER BY created_at DESC LIMIT 250'),getSponsorshipSettings()]);
  const stat=statsRows[0]??{};const todayViews=Number(stat.today_views??0),todayClicks=Number(stat.today_clicks??0);const rank=(row:DbRow)=>({id:String(row.id),name:String(row.name),views:Number(row.views),clicks:Number(row.clicks),ctr:Number(row.views)?Number(((Number(row.clicks)/Number(row.views))*100).toFixed(2)):0});return{stats:{totalSponsors:Number(stat.total_sponsors??0),activeCampaigns:Number(stat.active_campaigns??0),todayViews,todayClicks,ctr:todayViews?Number(((todayClicks/todayViews)*100).toFixed(2)):0,revenue:Number(stat.revenue??0),pendingRequests:Number(stat.pending_requests??0),expiringCampaigns:Number(stat.expiring_campaigns??0),outstandingBalance:Number(stat.outstanding_balance??0)},timeline:timeline.map(row=>({date:String(row.date),views:Number(row.views),uniqueViews:Number(row.unique_views),clicks:Number(row.clicks),qrScans:Number(row.qr_scans),couponUses:Number(row.coupon_uses),revenue:Number(row.revenue),ctr:Number(row.views)?Number(((Number(row.clicks)/Number(row.views))*100).toFixed(2)):0})),topSponsors:topSponsors.map(rank),topCampaigns:topCampaigns.map(rank),couponUsage:couponUsage.map(row=>({id:String(row.id),name:String(row.name),usage:Number(row.coupon_usage),limit:optionalNumber(row.coupon_limit)})),devices:devices.map(row=>({name:String(row.name),value:Number(row.value)})),countries:countries.map(row=>({name:String(row.name),value:Number(row.value)})),browsers:browsers.map(row=>({name:String(row.name),value:Number(row.value)})),recentActivities:activities.map(row=>({id:Number(row.id),actor:String(row.actor),action:String(row.action),resourceType:String(row.resource_type),detail:row.detail?String(row.detail):undefined,occurredAt:iso(row.occurred_at)})),sponsors:sponsors.map(mapSponsor),campaigns:campaigns.map(mapCampaign),coupons:coupons.map(mapCoupon),invoices:invoices.map(mapInvoice),requests:requests.map(mapRequest),qrCodes:qrs.map(mapQr),settings};}

export function sponsorshipAnalyticsCsv(overview:SponsorshipOverview){const escape=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;return ['Date,Views,Unique views,Clicks,CTR,QR scans,Coupon uses,Revenue',...overview.timeline.map(row=>[row.date,row.views,row.uniqueViews,row.clicks,row.ctr,row.qrScans,row.couponUses,row.revenue].map(escape).join(','))].join('\n');}

export async function getSponsorshipAudienceStats(){const currentMembership=`active=1 AND (membership_starts_at IS NULL OR membership_starts_at<=NOW(3)) AND (membership_ends_at IS NULL OR membership_ends_at>NOW(3))`;const rows=await queryRows<DbRow>(`SELECT (SELECT COUNT(*) FROM members WHERE ${currentMembership}) active_members,(SELECT COUNT(*) FROM events WHERE status='PUBLISHED') published_events,(SELECT COUNT(*) FROM tickets WHERE status IN ('ACTIVE','USED')) event_participants,(SELECT COUNT(*) FROM sponsors WHERE active=1 AND status='ACTIVE') active_partners,(SELECT COUNT(*) FROM sponsor_impressions) campaign_views,(SELECT COUNT(DISTINCT institution) FROM members WHERE ${currentMembership}) institutions,(SELECT COUNT(DISTINCT city) FROM members WHERE ${currentMembership}) cities`);const row=rows[0]??{};return{activeMembers:Number(row.active_members??0),publishedEvents:Number(row.published_events??0),eventParticipants:Number(row.event_participants??0),activePartners:Number(row.active_partners??0),campaignViews:Number(row.campaign_views??0),institutions:Number(row.institutions??0),cities:Number(row.cities??0)};}

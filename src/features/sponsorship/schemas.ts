import { z } from 'zod';
import { CAMPAIGN_PLACEMENTS, CAMPAIGN_TYPES, COUPON_CATEGORIES, SPONSOR_LEVELS, SPONSOR_STATUSES } from './types';

const optionalUrl = z.preprocess(
  value => typeof value === 'string' ? value.trim() || undefined : value,
  z.url().max(1000).optional(),
);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined);
const imageValue = z.string().trim().max(6_000_000).refine(value => !value || value.startsWith('/') || value.startsWith('data:image/'), 'Use a public image path or a supported image upload.');

export function sponsorshipErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof z.ZodError)) return error instanceof Error ? error.message : fallback;
  const issue = error.issues[0];
  if (!issue) return fallback;
  const field = issue.path.length
    ? String(issue.path.at(-1)).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, character => character.toUpperCase())
    : 'Value';
  return `${field}: ${issue.message}`;
}

export const sponsorInputSchema = z.object({
  companyName: z.string().trim().min(2).max(180), slug: z.string().trim().min(2).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logo: imageValue.min(1), coverImage: imageValue.optional(), description: z.string().trim().max(10000).default(''), website: optionalUrl,
  phone: optionalText(50), email: z.union([z.literal(''), z.email().max(190)]).optional().transform(value => value || undefined), address: optionalText(300),
  city: optionalText(120), country: optionalText(120), socialLinks: z.record(z.string(), z.url().max(1000)).default({}), category: optionalText(100),
  sponsorLevel: z.enum(SPONSOR_LEVELS).default('PARTNER'), status: z.enum(SPONSOR_STATUSES).default('DRAFT'), verified: z.boolean().default(false),
  featured: z.boolean().default(false), displayPriority: z.coerce.number().int().min(-1000).max(1000).default(0),
  partnershipStart: z.iso.datetime().optional(), partnershipEnd: z.iso.datetime().optional(), notes: optionalText(20000),
}).refine(value => !value.partnershipStart || !value.partnershipEnd || value.partnershipEnd > value.partnershipStart, { path: ['partnershipEnd'], message: 'Partnership end must be after its start.' });

export const campaignInputSchema = z.object({
  sponsorId: z.string().trim().min(1).max(64), campaignName: z.string().trim().min(2).max(180), slug: z.string().trim().min(2).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: optionalText(20000), placement: z.enum(CAMPAIGN_PLACEMENTS), campaignType: z.enum(CAMPAIGN_TYPES), bannerImage: imageValue.optional(), tabletImage: imageValue.optional(), mobileImage: imageValue.optional(),
  targetUrl: z.url().max(1000), targetBehavior: z.enum(['SAME_TAB', 'NEW_TAB']).default('NEW_TAB'), startDate: z.iso.datetime(), endDate: z.iso.datetime(),
  maxViews: z.coerce.number().int().positive().optional(), maxClicks: z.coerce.number().int().positive().optional(), priority: z.coerce.number().int().min(-1000).max(1000).default(0),
  weight: z.coerce.number().int().min(1).max(1000).default(1), active: z.boolean().default(true), autoExpire: z.boolean().default(true), popupFrequencyHours: z.coerce.number().int().min(1).max(8760).optional(),
  eventIds: z.array(z.string().max(64)).max(500).default([]),
}).refine(value => value.endDate > value.startDate, { path: ['endDate'], message: 'Campaign end must be after its start.' });

export const couponInputSchema = z.object({
  sponsorId: z.string().trim().min(1).max(64), title: z.string().trim().min(2).max(180), slug: z.string().trim().min(2).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: optionalText(20000), couponCode: z.string().trim().min(2).max(100), discountType: z.enum(['PERCENTAGE', 'FIXED', 'CUSTOM']), percentage: z.coerce.number().positive().max(100).optional(),
  fixedAmount: z.coerce.number().positive().optional(), currency: z.string().trim().length(3).default('MAD'), minimumPurchase: z.coerce.number().nonnegative().optional(), expirationDate: z.iso.datetime(),
  usageLimit: z.coerce.number().int().positive().optional(), terms: optionalText(20000), category: z.enum(COUPON_CATEGORIES), redemptionUrl: optionalUrl, active: z.boolean().default(true),
}).superRefine((value, context) => {
  if (value.discountType === 'PERCENTAGE' && value.percentage === undefined) context.addIssue({ code: 'custom', path: ['percentage'], message: 'Percentage is required.' });
  if (value.discountType === 'FIXED' && value.fixedAmount === undefined) context.addIssue({ code: 'custom', path: ['fixedAmount'], message: 'Fixed amount is required.' });
});

export const partnershipRequestSchema = z.object({
  companyName: z.string().trim().min(2).max(180), contactName: z.string().trim().min(2).max(160), phone: z.string().trim().min(6).max(50), email: z.email().max(190),
  website: optionalUrl, activity: z.string().trim().min(2).max(160), budget: z.coerce.number().nonnegative().optional(), budgetCurrency: z.string().trim().length(3).default('MAD'),
  message: z.string().trim().min(20).max(20000), logo: imageValue.optional(), companyProfile: z.string().trim().max(10_000_000).optional(), agreementAccepted: z.literal(true),
});

export const invoiceInputSchema = z.object({
  sponsorId: z.string().trim().min(1).max(64), campaignId: z.string().trim().max(64).optional(), invoiceNumber: z.string().trim().min(2).max(100), amount: z.coerce.number().positive(),
  taxAmount: z.coerce.number().nonnegative().default(0), currency: z.string().trim().length(3).default('MAD'), paymentStatus: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID']).default('DRAFT'),
  issuedAt: z.iso.datetime(), dueDate: z.iso.datetime(), paidAt: z.iso.datetime().optional(), notes: optionalText(20000),
}).refine(value => value.dueDate >= value.issuedAt, { path: ['dueDate'], message: 'Due date cannot precede issue date.' });

export const requestStatusSchema = z.object({ status: z.enum(['NEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'ACCEPTED', 'REJECTED']), adminNotes: z.string().trim().max(20000).optional() });

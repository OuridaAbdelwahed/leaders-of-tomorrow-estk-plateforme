export const SPONSOR_LEVELS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'PARTNER'] as const;
export const SPONSOR_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'] as const;
export const CAMPAIGN_TYPES = ['HERO_BANNER', 'HOMEPAGE_CARD', 'CAROUSEL', 'SIDEBAR', 'FOOTER', 'POPUP', 'EVENT_PAGE', 'NEWS_PAGE', 'STUDENT_DISCOUNT', 'ANNOUNCEMENT'] as const;
export const CAMPAIGN_PLACEMENTS = ['HOMEPAGE_HERO', 'HOMEPAGE_CAROUSEL', 'HOMEPAGE_CARD', 'SIDEBAR', 'FOOTER', 'POPUP', 'EVENT_NATIVE', 'NEWS_NATIVE', 'ARTICLE_NATIVE', 'BLOG_NATIVE', 'STUDENT_OFFERS'] as const;
export const COUPON_CATEGORIES = ['RESTAURANTS', 'TECHNOLOGY', 'BOOKS', 'PERFUMES', 'TRANSPORT', 'EDUCATION', 'HEALTH', 'SPORTS', 'COFFEE', 'SHOPPING'] as const;

export type SponsorLevel = typeof SPONSOR_LEVELS[number];
export type SponsorStatus = typeof SPONSOR_STATUSES[number];
export type CampaignType = typeof CAMPAIGN_TYPES[number];
export type CampaignPlacement = typeof CAMPAIGN_PLACEMENTS[number];
export type CouponCategory = typeof COUPON_CATEGORIES[number];

export type Sponsor = {
  id: string;
  companyName: string;
  slug: string;
  logo: string;
  coverImage?: string;
  description: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  socialLinks: Record<string, string>;
  category?: string;
  sponsorLevel: SponsorLevel;
  status: SponsorStatus;
  verified: boolean;
  featured: boolean;
  displayPriority: number;
  partnershipStart?: string;
  partnershipEnd?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  sponsorId: string;
  sponsorName?: string;
  sponsorLogo?: string;
  campaignName: string;
  slug: string;
  description?: string;
  placement: CampaignPlacement;
  campaignType: CampaignType;
  bannerImage?: string;
  tabletImage?: string;
  mobileImage?: string;
  targetUrl: string;
  targetBehavior: 'SAME_TAB' | 'NEW_TAB';
  startDate: string;
  endDate: string;
  maxViews?: number;
  maxClicks?: number;
  currentViews: number;
  currentClicks: number;
  priority: number;
  weight: number;
  active: boolean;
  autoExpire: boolean;
  popupFrequencyHours?: number;
  eventIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type Coupon = {
  id: string;
  sponsorId: string;
  sponsorName?: string;
  sponsorLogo?: string;
  title: string;
  slug: string;
  description?: string;
  couponCode: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'CUSTOM';
  percentage?: number;
  fixedAmount?: number;
  currency: string;
  minimumPurchase?: number;
  expirationDate: string;
  usageLimit?: number;
  currentUsage: number;
  terms?: string;
  category: CouponCategory;
  redemptionUrl?: string;
  active: boolean;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PartnershipRequest = {
  id: string;
  reference: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website?: string;
  activity: string;
  budget?: number;
  budgetCurrency: string;
  message: string;
  logo?: string;
  companyProfile?: string;
  agreementAccepted: boolean;
  status: 'NEW' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  adminNotes?: string;
  convertedSponsorId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  sponsorId: string;
  sponsorName?: string;
  campaignId?: string;
  campaignName?: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  currency: string;
  paymentStatus: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  generatedPdf?: string;
  notes?: string;
  paidAmount: number;
  outstandingAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type QrCodeRecord = {
  id: string;
  sponsorId: string;
  campaignId?: string;
  couponId?: string;
  format: 'POSTER' | 'FLYER' | 'STICKER' | 'BUSINESS_CARD';
  destinationType: 'CAMPAIGN' | 'SPONSOR' | 'OFFER' | 'TRACKING_LINK';
  destinationUrl: string;
  qrDataUrl?: string;
  active: boolean;
  scanCount: number;
  createdAt: string;
};

export type AnalyticsPoint = { date: string; views: number; uniqueViews: number; clicks: number; qrScans: number; couponUses: number; revenue: number; ctr: number };
export type RankedMetric = { id: string; name: string; views: number; clicks: number; ctr: number };
export type SponsorshipOverview = {
  stats: {
    totalSponsors: number;
    activeCampaigns: number;
    todayViews: number;
    todayClicks: number;
    ctr: number;
    revenue: number;
    pendingRequests: number;
    expiringCampaigns: number;
    outstandingBalance: number;
  };
  timeline: AnalyticsPoint[];
  topSponsors: RankedMetric[];
  topCampaigns: RankedMetric[];
  couponUsage: Array<{ id: string; name: string; usage: number; limit?: number }>;
  devices: Array<{ name: string; value: number }>;
  countries: Array<{ name: string; value: number }>;
  browsers: Array<{ name: string; value: number }>;
  recentActivities: Array<{ id: number; actor: string; action: string; resourceType: string; detail?: string; occurredAt: string }>;
  sponsors: Sponsor[];
  campaigns: Campaign[];
  coupons: Coupon[];
  invoices: Invoice[];
  requests: PartnershipRequest[];
  qrCodes: QrCodeRecord[];
  settings: Record<string, unknown>;
};

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number; pageCount: number };


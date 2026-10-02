import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Campaign } from '@/features/sponsorship/types';
import { campaignInputSchema, couponInputSchema, sponsorInputSchema } from '@/features/sponsorship/schemas';
import { createCouponCode, selectWeightedCampaign } from './sponsorshipRepository';

const campaign=(id:string,priority:number,weight:number):Campaign=>({id,sponsorId:'sponsor',campaignName:id,slug:id,placement:'HOMEPAGE_HERO',campaignType:'HERO_BANNER',targetUrl:'https://example.com',targetBehavior:'NEW_TAB',startDate:'2026-01-01T00:00:00.000Z',endDate:'2027-01-01T00:00:00.000Z',currentViews:0,currentClicks:0,priority,weight,active:true,autoExpire:true,eventIds:[],createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});

describe('sponsorship delivery',()=>{
  afterEach(()=>vi.restoreAllMocks());
  it('always limits selection to the highest priority tier',()=>{vi.spyOn(Math,'random').mockReturnValue(.99);expect(selectWeightedCampaign([campaign('low',1,100),campaign('high',10,1)])?.id).toBe('high');});
  it('avoids an immediate repeat when another top-priority campaign is eligible',()=>{vi.spyOn(Math,'random').mockReturnValue(0);expect(selectWeightedCampaign([campaign('first',10,1),campaign('second',10,1)],['first'])?.id).toBe('second');});
  it('falls back safely when every top-priority campaign is excluded',()=>{expect(selectWeightedCampaign([campaign('only',10,1)],['only'])?.id).toBe('only');});
});

describe('sponsorship validation',()=>{
  it('rejects invalid campaign date ranges and zero weight',()=>{const result=campaignInputSchema.safeParse({sponsorId:'s',campaignName:'Launch',slug:'launch',placement:'HOMEPAGE_HERO',campaignType:'HERO_BANNER',targetUrl:'https://example.com',startDate:'2026-08-02T00:00:00.000Z',endDate:'2026-08-01T00:00:00.000Z',weight:0,eventIds:[]});expect(result.success).toBe(false);});
  it('requires matching coupon value fields',()=>{const result=couponInputSchema.safeParse({sponsorId:'s',title:'Ten off',slug:'ten-off',couponCode:'TEN',discountType:'PERCENTAGE',currency:'MAD',expirationDate:'2027-01-01T00:00:00.000Z',category:'SHOPPING'});expect(result.success).toBe(false);});
  it('accepts a production sponsor profile',()=>{const result=sponsorInputSchema.safeParse({companyName:'Example Company',slug:'example-company',logo:'/media/partners/example.webp',description:'A partner profile.',socialLinks:{linkedin:'https://linkedin.com/company/example'},sponsorLevel:'GOLD',status:'ACTIVE',verified:true,featured:true,displayPriority:20});expect(result.success).toBe(true);});
  it('treats a whitespace-only redemption URL as optional',()=>{const result=couponInputSchema.safeParse({sponsorId:'s',title:'Ten off',slug:'ten-off',couponCode:'TEN',discountType:'PERCENTAGE',percentage:10,currency:'MAD',expirationDate:'2027-01-01T00:00:00.000Z',category:'SHOPPING',redemptionUrl:'   '});expect(result.success).toBe(true);if(result.success)expect(result.data.redemptionUrl).toBeUndefined();});
  it('creates a stable, non-guessable coupon code format',()=>{expect(createCouponCode(new Date('2026-07-29T00:00:00.000Z'),Buffer.from('a1b2c3d4e5f6','hex'))).toBe('LOT-2026-A1B2C3D4E5F6');});
});

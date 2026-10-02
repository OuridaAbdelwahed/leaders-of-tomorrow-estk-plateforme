import { describe, expect, it } from 'vitest';
import { maskCouponForGuest } from './access';
import type { Coupon } from './types';

const coupon: Coupon = {
  id: 'coupon-1',
  sponsorId: 'sponsor-1',
  sponsorName: 'Example partner',
  title: 'Member technology offer',
  slug: 'member-technology-offer',
  couponCode: 'MEMBER20',
  discountType: 'PERCENTAGE',
  percentage: 20,
  currency: 'MAD',
  expirationDate: '2027-01-01T00:00:00.000Z',
  currentUsage: 0,
  category: 'TECHNOLOGY',
  redemptionUrl: 'https://example.test/redeem',
  active: true,
  favorite: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('maskCouponForGuest', () => {
  it('keeps the offer discoverable without exposing member redemption data', () => {
    const result = maskCouponForGuest(coupon);

    expect(result.title).toBe(coupon.title);
    expect(result.percentage).toBe(20);
    expect(result.couponCode).toBeUndefined();
    expect(result.redemptionUrl).toBeUndefined();
    expect(result.favorite).toBeUndefined();
  });
});

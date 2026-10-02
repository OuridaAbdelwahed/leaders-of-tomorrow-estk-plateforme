import type { Coupon } from './types';

export type PublicOffer = Omit<Coupon, 'couponCode' | 'redemptionUrl' | 'favorite'> & {
  couponCode?: string;
  redemptionUrl?: string;
  favorite?: boolean;
};

/** Keep offer discovery public while reserving redemption details for members. */
export function maskCouponForGuest(coupon: Coupon): PublicOffer {
  return {
    ...coupon,
    couponCode: undefined,
    redemptionUrl: undefined,
    favorite: undefined,
  };
}

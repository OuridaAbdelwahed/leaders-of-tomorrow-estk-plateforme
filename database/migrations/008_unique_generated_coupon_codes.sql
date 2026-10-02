UPDATE sponsor_coupons AS coupon
JOIN (
  SELECT coupon_code
  FROM sponsor_coupons
  GROUP BY coupon_code
  HAVING COUNT(*) > 1
) AS duplicate_codes ON duplicate_codes.coupon_code = coupon.coupon_code
SET coupon.coupon_code = CONCAT(
  LEFT(coupon.coupon_code, 78),
  '-',
  UPPER(RIGHT(REPLACE(coupon.id, '_', ''), 16))
);

ALTER TABLE sponsor_coupons
  ADD UNIQUE KEY sponsor_coupons_code_unique (coupon_code);

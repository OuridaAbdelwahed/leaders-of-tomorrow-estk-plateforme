import { describe, expect, it } from 'vitest';
import { amountCategory, maskDonationEmail, validateDonationAmount } from './donationRepository';

describe('donation amount validation', () => {
  it('treats empty and zero amounts as no donation', () => {
    expect(validateDonationAmount('', 1000)).toBe(0);
    expect(validateDonationAmount(0, 1000)).toBe(0);
  });

  it('accepts positive custom amounts and rounds to cents', () => {
    expect(validateDonationAmount('75.129', 1000)).toBe(75.13);
  });

  it('rejects malformed, negative, and above-maximum amounts', () => {
    expect(() => validateDonationAmount('abc', 1000)).toThrow('Invalid amount');
    expect(() => validateDonationAmount(-1, 1000)).toThrow('cannot be negative');
    expect(() => validateDonationAmount(1001, 1000)).toThrow('maximum');
  });
});

describe('donation safe metadata helpers', () => {
  it('categorizes suggested, custom, and skipped amounts without sensitive data', () => {
    expect(amountCategory(50, [20, 50, 100])).toBe('50');
    expect(amountCategory(75, [20, 50, 100])).toBe('custom');
    expect(amountCategory(0, [20, 50, 100])).toBe('empty_or_zero');
  });

  it('masks donor email for the admin list', () => {
    expect(maskDonationEmail('donor@example.com')).toBe('do***@example.com');
    expect(maskDonationEmail('a@example.com')).toBe('a*@example.com');
    expect(maskDonationEmail(undefined)).toBeUndefined();
  });
});

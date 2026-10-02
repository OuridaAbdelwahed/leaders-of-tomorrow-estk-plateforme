import { describe, expect, it } from 'vitest';
import { createOtpHash, evaluateSecurityRisk, maskEmail, normalizeEmail, verifyOtpHash } from './visitorSecurity';

describe('visitor ticket security helpers', () => {
  it('normalizes email addresses before verification checks', () => {
    expect(normalizeEmail('  Student@Example.COM ')).toBe('student@example.com');
  });

  it('masks emails for security logs without exposing the full local part', () => {
    expect(maskEmail('ourida@example.com')).toBe('ou****@example.com');
  });

  it('verifies the exact OTP hash and rejects wrong codes', () => {
    const hash = createOtpHash('evt_1', 'student@example.com', 'ver_1', '123456');
    expect(verifyOtpHash('evt_1', 'student@example.com', 'ver_1', '123456', hash)).toBe(true);
    expect(verifyOtpHash('evt_1', 'student@example.com', 'ver_1', '000000', hash)).toBe(false);
  });

  it('raises risk when the same device or fingerprint is reused for an event', () => {
    const risk = evaluateSecurityRisk({ duplicateDeviceTickets: 1, duplicateFingerprintTickets: 1, hasFingerprint: true });
    expect(risk.score).toBe(80);
    expect(risk.flags).toContain('device_reused_for_event');
    expect(risk.flags).toContain('fingerprint_reused_for_event');
  });
});

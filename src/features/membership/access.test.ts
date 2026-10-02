import { describe, expect, it } from 'vitest';
import { getMembershipAccessState, hasCurrentMembership, validateMembershipPeriod } from './access';

const now = Date.parse('2026-07-30T12:00:00.000Z');

describe('membership access period', () => {
  it('keeps an active member without an end date eligible', () => {
    expect(hasCurrentMembership({ active: true }, now)).toBe(true);
  });

  it('locks access at the exact membership end time', () => {
    expect(getMembershipAccessState({ active: true, membershipEndsAt: '2026-07-30T12:00:00.000Z' }, now)).toBe('EXPIRED');
  });

  it('distinguishes scheduled and manually suspended memberships', () => {
    expect(getMembershipAccessState({ active: true, membershipStartsAt: '2026-08-01T00:00:00.000Z' }, now)).toBe('SCHEDULED');
    expect(getMembershipAccessState({ active: false }, now)).toBe('SUSPENDED');
  });

  it('rejects an inverted membership period', () => {
    expect(validateMembershipPeriod('2026-08-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z')).toMatch(/after/);
  });
});


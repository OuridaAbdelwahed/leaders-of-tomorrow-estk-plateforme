import { describe, expect, it } from 'vitest';
import { getRecruitmentPeriodState, resolveRecruitmentAvailability, validateRecruitmentPeriod, type RecruitmentPeriod } from './recruitment';

const period = (overrides: Partial<RecruitmentPeriod> = {}): RecruitmentPeriod => ({
  id: 'recruitment_1',
  title: { en: 'Autumn intake', ar: 'فترة الخريف' },
  opensAt: '2026-09-01T00:00:00.000Z',
  closesAt: '2026-09-30T23:59:59.000Z',
  enabled: true,
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
  ...overrides,
});

describe('membership recruitment periods', () => {
  it('treats the opening instant as open and the closing instant as closed', () => {
    expect(getRecruitmentPeriodState(period(), '2026-09-01T00:00:00.000Z')).toBe('OPEN');
    expect(getRecruitmentPeriodState(period(), '2026-09-30T23:59:59.000Z')).toBe('CLOSED');
  });

  it('distinguishes scheduled and manually paused periods', () => {
    expect(getRecruitmentPeriodState(period(), '2026-08-31T23:59:59.000Z')).toBe('SCHEDULED');
    expect(getRecruitmentPeriodState(period({ enabled: false }), '2026-09-15T00:00:00.000Z')).toBe('PAUSED');
  });

  it('selects an open period before the next scheduled period', () => {
    const availability = resolveRecruitmentAvailability([
      period({ id: 'next', opensAt: '2026-10-01T00:00:00.000Z', closesAt: '2026-10-31T00:00:00.000Z' }),
      period({ id: 'current' }),
    ], '2026-09-15T00:00:00.000Z');
    expect(availability.state).toBe('OPEN');
    expect(availability.period?.id).toBe('current');
  });

  it('reports a manually paused current window before older closed periods', () => {
    const availability = resolveRecruitmentAvailability([
      period({ id: 'old', opensAt: '2026-07-01T00:00:00.000Z', closesAt: '2026-07-31T00:00:00.000Z' }),
      period({ id: 'paused', enabled: false }),
    ], '2026-09-15T00:00:00.000Z');
    expect(availability.state).toBe('PAUSED');
    expect(availability.period?.id).toBe('paused');
  });

  it('validates the chronological order', () => {
    expect(validateRecruitmentPeriod('', undefined)).toBe('A valid opening date is required.');
    expect(validateRecruitmentPeriod('2026-09-10T00:00:00.000Z', '2026-09-01T00:00:00.000Z')).toBe('The closing date must be after the opening date.');
    expect(validateRecruitmentPeriod('2026-09-01T00:00:00.000Z', '2026-09-10T00:00:00.000Z')).toBeUndefined();
  });
});

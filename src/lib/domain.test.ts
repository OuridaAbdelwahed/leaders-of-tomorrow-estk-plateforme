import { describe, expect, it } from 'vitest';
import { contributionTotal, eventAvailability } from './domain';
import type { EventRecord } from './types';

const event: EventRecord = { id: '1', slug: 'test', title: { en: 'Test', ar: 'اختبار' }, summary: { en: '', ar: '' }, location: { en: '', ar: '' }, startsAt: '2026-09-10T10:00:00Z', endsAt: '2026-09-10T12:00:00Z', capacity: 10, registered: 3, status: 'PUBLISHED', category: 'Test' };

describe('eventAvailability', () => {
  it('classifies future, ongoing, and past events', () => {
    expect(eventAvailability(event, new Date('2026-09-09T10:00:00Z'))).toBe('upcoming');
    expect(eventAvailability(event, new Date('2026-09-10T11:00:00Z'))).toBe('ongoing');
    expect(eventAvailability(event, new Date('2026-09-11T10:00:00Z'))).toBe('past');
  });
  it('reports sold-out before upcoming', () => expect(eventAvailability({ ...event, registered: 10 }, new Date('2026-09-09T10:00:00Z'))).toBe('sold-out'));
});

describe('contributionTotal', () => {
  it('adds confirmed non-negative contributions', () => expect(contributionTotal([30, 50, -20, 100])).toBe(180));
});

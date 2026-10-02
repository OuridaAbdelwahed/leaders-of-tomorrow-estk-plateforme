import type { EventRecord } from './types';

export function eventAvailability(event: EventRecord, now = new Date()) {
  if (event.status === 'CLOSED') return 'closed';
  if (new Date(event.endsAt) < now) return 'past';
  if (new Date(event.startsAt) <= now) return 'ongoing';
  if (event.registered >= event.capacity) return 'sold-out';
  return 'upcoming';
}

export function contributionTotal(values: number[]) {
  return values.reduce((sum, value) => sum + Math.max(0, value), 0);
}

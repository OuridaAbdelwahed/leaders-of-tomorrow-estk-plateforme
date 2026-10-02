import type { AdminOverview } from './types';

export type AdminActivityPoint = { key: string; month: string; registrations: number; members: number; applications: number };

function monthKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildAdminActivity(data: Pick<AdminOverview, 'registrations' | 'members' | 'applications'>, now = new Date()): AdminActivityPoint[] {
  const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return { key: monthKey(date), month: formatter.format(date), registrations: 0, members: 0, applications: 0 };
  });
  const byKey = new Map(months.map(item => [item.key, item]));
  data.registrations.forEach(item => { const point = byKey.get(monthKey(item.createdAt)); if (point) point.registrations += 1; });
  data.members.forEach(item => { const point = byKey.get(monthKey(item.joinedAt)); if (point) point.members += 1; });
  data.applications.forEach(item => { const point = byKey.get(monthKey(item.createdAt)); if (point) point.applications += 1; });
  return months;
}

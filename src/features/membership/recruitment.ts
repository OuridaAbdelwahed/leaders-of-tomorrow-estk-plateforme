export type RecruitmentPeriod = {
  id: string;
  title: { en: string; ar: string };
  opensAt: string;
  closesAt?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecruitmentState = 'OPEN' | 'SCHEDULED' | 'CLOSED' | 'PAUSED';

export type RecruitmentAvailability = {
  state: RecruitmentState;
  period?: RecruitmentPeriod;
  serverNow: string;
};

export function getRecruitmentPeriodState(period: Pick<RecruitmentPeriod, 'enabled' | 'opensAt' | 'closesAt'>, now: Date | string | number = new Date()) : RecruitmentState {
  if (!period.enabled) return 'PAUSED';
  const nowTime = new Date(now).getTime();
  const opensTime = new Date(period.opensAt).getTime();
  const closesTime = period.closesAt ? new Date(period.closesAt).getTime() : Number.POSITIVE_INFINITY;
  if (nowTime < opensTime) return 'SCHEDULED';
  if (nowTime >= closesTime) return 'CLOSED';
  return 'OPEN';
}

export function validateRecruitmentPeriod(opensAt?: string, closesAt?: string) {
  if (!opensAt || Number.isNaN(new Date(opensAt).getTime())) return 'A valid opening date is required.';
  if (closesAt && Number.isNaN(new Date(closesAt).getTime())) return 'Enter a valid closing date.';
  if (closesAt && new Date(closesAt).getTime() <= new Date(opensAt).getTime()) return 'The closing date must be after the opening date.';
  return undefined;
}

export function resolveRecruitmentAvailability(periods: RecruitmentPeriod[], now: Date | string | number = new Date()): RecruitmentAvailability {
  const instant = new Date(now);
  const candidates = periods.map(period => ({ period, state: getRecruitmentPeriodState(period, instant) }));
  const open = candidates.find(item => item.state === 'OPEN');
  if (open) return { state: 'OPEN', period: open.period, serverNow: instant.toISOString() };

  const pausedCurrent = candidates.find(item => item.state === 'PAUSED'
    && instant.getTime() >= new Date(item.period.opensAt).getTime()
    && (!item.period.closesAt || instant.getTime() < new Date(item.period.closesAt).getTime()));
  if (pausedCurrent) return { state: 'PAUSED', period: pausedCurrent.period, serverNow: instant.toISOString() };

  const scheduled = candidates
    .filter(item => item.state === 'SCHEDULED')
    .sort((a, b) => new Date(a.period.opensAt).getTime() - new Date(b.period.opensAt).getTime())[0];
  if (scheduled) return { state: 'SCHEDULED', period: scheduled.period, serverNow: instant.toISOString() };

  const closed = candidates
    .filter(item => item.state === 'CLOSED')
    .sort((a, b) => new Date(b.period.closesAt ?? b.period.opensAt).getTime() - new Date(a.period.closesAt ?? a.period.opensAt).getTime())[0];
  if (closed) return { state: 'CLOSED', period: closed.period, serverNow: instant.toISOString() };

  const paused = candidates.sort((a, b) => new Date(b.period.updatedAt).getTime() - new Date(a.period.updatedAt).getTime())[0];
  return { state: 'PAUSED', period: paused?.period, serverNow: instant.toISOString() };
}

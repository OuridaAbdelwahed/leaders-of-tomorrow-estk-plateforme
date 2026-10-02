import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { resolveRecruitmentAvailability, validateRecruitmentPeriod, type RecruitmentAvailability, type RecruitmentPeriod } from '@/features/membership/recruitment';
import { execute, queryRows, withTransaction } from './database';
import { safeId } from './security';

type DbRow = RowDataPacket & Record<string, unknown>;
export type RecruitmentPeriodInput = {
  title: { en: string; ar: string };
  opensAt: string;
  closesAt?: string;
  enabled: boolean;
};

const iso = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
const mapPeriod = (row: DbRow): RecruitmentPeriod => ({
  id: String(row.id),
  title: { en: String(row.title_en), ar: String(row.title_ar) },
  opensAt: iso(row.opens_at),
  closesAt: row.closes_at ? iso(row.closes_at) : undefined,
  enabled: Boolean(Number(row.enabled)),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

async function assertNoEnabledOverlap(input: RecruitmentPeriodInput, excludedId?: string, connection?: PoolConnection) {
  if (!input.enabled) return;
  const rows = await queryRows<DbRow>(`SELECT id,title_en FROM membership_recruitment_periods
    WHERE enabled=1 AND id<>?
      AND (? IS NULL OR opens_at < ?)
      AND (closes_at IS NULL OR closes_at > ?)
    LIMIT 1 FOR UPDATE`, [excludedId ?? '', input.closesAt ?? null, input.closesAt ?? null, input.opensAt], connection);
  if (rows[0]) throw new Error(`This schedule overlaps the enabled period “${String(rows[0].title_en)}”. Pause or close that period first.`);
}

function validateInput(input: RecruitmentPeriodInput) {
  const periodError = validateRecruitmentPeriod(input.opensAt, input.closesAt);
  if (periodError) throw new Error(periodError);
  if (input.title.en.trim().length < 3 || input.title.ar.trim().length < 3) throw new Error('English and Arabic recruitment period names are required.');
}

export async function listRecruitmentPeriods() {
  const rows = await queryRows<DbRow>('SELECT * FROM membership_recruitment_periods ORDER BY opens_at DESC, created_at DESC LIMIT 100');
  return rows.map(mapPeriod);
}

export async function getRecruitmentAvailability(): Promise<RecruitmentAvailability> {
  return resolveRecruitmentAvailability(await listRecruitmentPeriods(), new Date());
}

export async function createRecruitmentPeriod(input: RecruitmentPeriodInput, actor: { id?: string; email: string }) {
  validateInput(input);
  const id = safeId('recruitment');
  await withTransaction(async connection => {
    await assertNoEnabledOverlap(input, undefined, connection);
    await execute(`INSERT INTO membership_recruitment_periods
      (id,title_en,title_ar,opens_at,closes_at,enabled,created_by_user_id,updated_by_user_id)
      VALUES (?,?,?,?,?,?,?,?)`, [id, input.title.en.trim(), input.title.ar.trim(), input.opensAt, input.closesAt ?? null, input.enabled ? 1 : 0, actor.id ?? null, actor.id ?? null], connection);
    await execute(`INSERT INTO audit_logs (id,actor_user_id,actor_label,action,resource_type,resource_id,detail)
      VALUES (?,?,?,?,?,?,?)`, [safeId('audit'), actor.id ?? null, actor.email, 'recruitment_period.created', 'membership_recruitment_period', id, JSON.stringify(input)], connection);
  });
  return (await listRecruitmentPeriods()).find(period => period.id === id)!;
}

export async function updateRecruitmentPeriod(id: string, input: RecruitmentPeriodInput, actor: { id?: string; email: string }) {
  validateInput(input);
  const existing = await queryRows<DbRow>('SELECT id FROM membership_recruitment_periods WHERE id=? LIMIT 1', [id]);
  if (!existing[0]) throw new Error('Recruitment period not found.');
  await withTransaction(async connection => {
    await assertNoEnabledOverlap(input, id, connection);
    await execute(`UPDATE membership_recruitment_periods
      SET title_en=?,title_ar=?,opens_at=?,closes_at=?,enabled=?,updated_by_user_id=? WHERE id=?`,
      [input.title.en.trim(), input.title.ar.trim(), input.opensAt, input.closesAt ?? null, input.enabled ? 1 : 0, actor.id ?? null, id], connection);
    await execute(`INSERT INTO audit_logs (id,actor_user_id,actor_label,action,resource_type,resource_id,detail)
      VALUES (?,?,?,?,?,?,?)`, [safeId('audit'), actor.id ?? null, actor.email, 'recruitment_period.updated', 'membership_recruitment_period', id, JSON.stringify(input)], connection);
  });
  return (await listRecruitmentPeriods()).find(period => period.id === id)!;
}

export class RecruitmentUnavailableError extends Error {
  readonly code = 'MEMBERSHIP_RECRUITMENT_UNAVAILABLE';
  constructor(readonly availability: RecruitmentAvailability) {
    const message = availability.state === 'SCHEDULED'
      ? 'Membership applications are not open yet.'
      : availability.state === 'PAUSED'
        ? 'Membership applications are temporarily paused.'
        : 'The membership application period is closed.';
    super(message);
    this.name = 'RecruitmentUnavailableError';
  }
}

export async function assertRecruitmentOpen() {
  const availability = await getRecruitmentAvailability();
  if (availability.state !== 'OPEN' || !availability.period) throw new RecruitmentUnavailableError(availability);
  return availability.period;
}

import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from './database';

type DbRow = RowDataPacket & Record<string, unknown>;

export type TicketSecurityEvent = {
  id: string;
  eventId: string;
  eventTitle: string;
  ticketCode?: string;
  emailMasked?: string;
  riskScore: number;
  flags: string[];
  action: string;
  blocked: boolean;
  reason?: string;
  createdAt: string;
};

export async function listTicketSecurityEvents(filters: { eventId?: string; action?: string; blocked?: string; limit?: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.eventId) { where.push('tse.event_id=?'); params.push(filters.eventId); }
  if (filters.action) { where.push('tse.action=?'); params.push(filters.action); }
  if (filters.blocked === 'true' || filters.blocked === 'false') { where.push('tse.blocked=?'); params.push(filters.blocked === 'true' ? 1 : 0); }
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
  const rows = await queryRows<DbRow>(
    `SELECT tse.*, e.title_en AS event_title, t.ticket_code
      FROM ticket_security_events tse
      JOIN events e ON e.id=tse.event_id
      LEFT JOIN tickets t ON t.id=tse.ticket_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY tse.created_at DESC
      LIMIT ${limit}`,
    params,
  );
  return rows.map(row => {
    let flags: string[] = [];
    try { flags = row.security_flags ? JSON.parse(String(row.security_flags)) as string[] : []; } catch { flags = []; }
    return {
      id: String(row.id),
      eventId: String(row.event_id),
      eventTitle: String(row.event_title),
      ticketCode: row.ticket_code ? String(row.ticket_code) : undefined,
      emailMasked: row.email_masked ? String(row.email_masked) : undefined,
      riskScore: Number(row.risk_score ?? 0),
      flags,
      action: String(row.action),
      blocked: Boolean(row.blocked),
      reason: row.reason ? String(row.reason) : undefined,
      createdAt: new Date(String(row.created_at)).toISOString(),
    } satisfies TicketSecurityEvent;
  });
}

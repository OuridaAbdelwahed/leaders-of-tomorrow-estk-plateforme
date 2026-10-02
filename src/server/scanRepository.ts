import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { ScanResult } from '@/lib/types';
import { execute, queryRows, withTransaction } from './database';
import { parseTicketPayload } from './tickets';
import { safeId, sha256 } from './security';

type DbRow = RowDataPacket & Record<string, unknown>;
type ScanContext = { scannerUserId: string; scannerName: string; superAdmin: boolean; deviceInfo?: string; ipAddress?: string };

const messages: Record<ScanResult, string> = {
  valid: 'Billet validé avec succès.',
  invalid: 'QR code invalide.',
  not_found: 'Billet introuvable.',
  already_used: 'Ce billet a déjà été utilisé.',
  cancelled: 'Ce billet a été annulé.',
  refunded: 'Ce billet a été remboursé.',
  wrong_event: 'Ce billet appartient à un autre événement.',
  expired: 'Ce billet a expiré.',
  not_yet_valid: "Ce billet n'est pas encore valide.",
  unauthorized: "Le scanner n'est pas autorisé pour cet événement.",
  duplicate: 'Tentative de scan en double.',
  error: 'Erreur du serveur ou du réseau.',
};

async function saveLog(connection: PoolConnection, eventId: string, ticketId: string | undefined, scannedValue: string, result: ScanResult, reason: string | undefined, context: ScanContext) {
  const id = safeId('scan');
  const scannedAt = new Date().toISOString();
  await execute(`INSERT INTO scan_logs (id,event_id,ticket_id,scanned_value,scanner_user_id,scan_result,rejection_reason,scanned_at,device_info,ip_address)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [id, eventId, ticketId ?? null, scannedValue.slice(0, 255), context.scannerUserId, result, reason ?? null, scannedAt, context.deviceInfo?.slice(0, 500) ?? null, context.ipAddress?.slice(0, 64) ?? null], connection);
  return { id, scannedAt };
}

async function scannerCanAccessEvent(connection: PoolConnection, eventId: string, context: ScanContext) {
  if (context.superAdmin) return true;
  const rows = await queryRows<DbRow>(`SELECT 1 AS allowed FROM scanner_event_access WHERE user_id=? AND event_id=?
    UNION SELECT 1 AS allowed FROM event_managers WHERE user_id=? AND event_id=? LIMIT 1`, [context.scannerUserId, eventId, context.scannerUserId, eventId], connection);
  return Boolean(rows.length);
}

export async function validateTicketScan(eventId: string, payload: string, context: ScanContext) {
  return withTransaction(async connection => {
    const events = await queryRows<DbRow>('SELECT id,title_en,status,starts_at,ends_at FROM events WHERE id=? LIMIT 1 FOR UPDATE', [eventId], connection);
    const selectedEvent = events[0];
    if (!selectedEvent) throw new Error('Selected event not found.');
    const parsed = parseTicketPayload(payload);
    const scannedValue = parsed?.code || payload.trim();

    if (!await scannerCanAccessEvent(connection, eventId, context)) {
      const log = await saveLog(connection, eventId, undefined, scannedValue, 'unauthorized', messages.unauthorized, context);
      return rejection('unauthorized', log.scannedAt);
    }
    if (!parsed?.code || !parsed.token) {
      const log = await saveLog(connection, eventId, undefined, scannedValue, 'invalid', messages.invalid, context);
      return rejection('invalid', log.scannedAt);
    }

    const recent = await queryRows<DbRow>(`SELECT id FROM scan_logs WHERE event_id=? AND scanner_user_id=? AND scanned_value=? AND scanned_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1500 MICROSECOND) LIMIT 1 FOR UPDATE`, [eventId, context.scannerUserId, parsed.code], connection);
    if (recent.length) {
      const log = await saveLog(connection, eventId, undefined, parsed.code, 'duplicate', messages.duplicate, context);
      return rejection('duplicate', log.scannedAt);
    }

    const tickets = await queryRows<DbRow>(`SELECT t.*, e.title_en AS event_name, e.status AS event_status, e.starts_at AS event_starts_at,
      e.ends_at AS event_ends_at, tt.name_en AS ticket_type FROM tickets t JOIN events e ON e.id=t.event_id
      JOIN ticket_types tt ON tt.id=t.ticket_type_id WHERE t.ticket_code=? LIMIT 1 FOR UPDATE`, [parsed.code], connection);
    const ticket = tickets[0];
    if (!ticket) {
      const log = await saveLog(connection, eventId, undefined, parsed.code, 'not_found', messages.not_found, context);
      return rejection('not_found', log.scannedAt);
    }
    if (String(ticket.qr_token_hash) !== sha256(parsed.token)) {
      const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, 'invalid', messages.invalid, context);
      return rejection('invalid', log.scannedAt);
    }
    if (String(ticket.event_id) !== eventId) {
      const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, 'wrong_event', messages.wrong_event, context);
      return rejection('wrong_event', log.scannedAt);
    }

    const status = String(ticket.status);
    const statusResult: Partial<Record<string, ScanResult>> = { USED: 'already_used', CANCELLED: 'cancelled', REFUNDED: 'refunded', DELETED: 'invalid', EXPIRED: 'expired', WAITLIST: 'not_yet_valid' };
    if (status !== 'ACTIVE') {
      const result = statusResult[status] ?? 'invalid';
      const message = status === 'DELETED' ? 'Ce billet a été supprimé.' : messages[result];
      const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, result, message, context);
      return rejection(result, log.scannedAt, message);
    }
    if (String(selectedEvent.status) === 'CANCELLED') {
      const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, 'cancelled', messages.cancelled, context);
      return rejection('cancelled', log.scannedAt);
    }

    const now = Date.now();
    const validFrom = ticket.valid_from || ticket.event_starts_at;
    const validUntil = ticket.valid_until || ticket.event_ends_at;
    if (validFrom && new Date(String(validFrom)).getTime() > now) {
      const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, 'not_yet_valid', messages.not_yet_valid, context);
      return rejection('not_yet_valid', log.scannedAt);
    }
    if (validUntil && new Date(String(validUntil)).getTime() < now) {
      await execute("UPDATE tickets SET status='EXPIRED' WHERE id=?", [ticket.id], connection);
      const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, 'expired', messages.expired, context);
      return rejection('expired', log.scannedAt);
    }

    const validatedAt = new Date().toISOString();
    const update = await execute("UPDATE tickets SET status='USED',used_at=?,used_by_user_id=? WHERE id=? AND status='ACTIVE'", [validatedAt, context.scannerUserId, ticket.id], connection);
    if (update.affectedRows !== 1) {
      const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, 'duplicate', messages.duplicate, context);
      return rejection('duplicate', log.scannedAt);
    }
    const log = await saveLog(connection, eventId, String(ticket.id), parsed.code, 'valid', undefined, context);
    return {
      success: true, result: 'valid' as const, message: messages.valid,
      ticket: {
        ticketCode: String(ticket.ticket_code), participantName: String(ticket.participant_name), ticketType: String(ticket.ticket_type),
        eventName: String(ticket.event_name), validatedAt, validationStatus: 'USED',
      },
      scan: { id: log.id, scannedAt: log.scannedAt },
    };
  });
}

function rejection(result: ScanResult, scannedAt: string, message = messages[result]) {
  return { success: false, result, message, rejectionReason: message, scan: { scannedAt } };
}

export type ScanLogFilters = { result?: string; scannerUserId?: string; ticketTypeId?: string; from?: string; to?: string; ticketCode?: string; participantName?: string; page?: number; pageSize?: number };

function scanWhere(eventId: string, filters: ScanLogFilters) {
  const parts = ['sl.event_id=?'];
  const values: unknown[] = [eventId];
  if (filters.result) { parts.push('sl.scan_result=?'); values.push(filters.result); }
  if (filters.scannerUserId) { parts.push('sl.scanner_user_id=?'); values.push(filters.scannerUserId); }
  if (filters.ticketTypeId) { parts.push('t.ticket_type_id=?'); values.push(filters.ticketTypeId); }
  if (filters.from) { parts.push('sl.scanned_at>=?'); values.push(filters.from); }
  if (filters.to) { parts.push('sl.scanned_at<=?'); values.push(/^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? `${filters.to} 23:59:59.999` : filters.to); }
  if (filters.ticketCode) { parts.push('t.ticket_code LIKE ?'); values.push(`%${filters.ticketCode}%`); }
  if (filters.participantName) { parts.push('t.participant_name LIKE ?'); values.push(`%${filters.participantName}%`); }
  return { sql: parts.join(' AND '), values };
}

export async function listScanLogs(eventId: string, filters: ScanLogFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(10_000, Math.max(10, Number(filters.pageSize) || 25));
  const where = scanWhere(eventId, filters);
  const [counts, rows] = await Promise.all([
    queryRows<DbRow>(`SELECT COUNT(*) AS total FROM scan_logs sl LEFT JOIN tickets t ON t.id=sl.ticket_id WHERE ${where.sql}`, where.values),
    queryRows<DbRow>(`SELECT sl.*,u.full_name AS scanner_name,t.ticket_code,t.participant_name,tt.name_en AS ticket_type
      FROM scan_logs sl JOIN users u ON u.id=sl.scanner_user_id LEFT JOIN tickets t ON t.id=sl.ticket_id
      LEFT JOIN ticket_types tt ON tt.id=t.ticket_type_id WHERE ${where.sql} ORDER BY sl.scanned_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, where.values),
  ]);
  return {
    items: rows.map(mapScanLog), pagination: { page, pageSize, total: Number(counts[0].total), totalPages: Math.max(1, Math.ceil(Number(counts[0].total) / pageSize)) },
  };
}

function mapScanLog(row: DbRow) {
  return {
    id: String(row.id), eventId: String(row.event_id), ticketId: row.ticket_id ? String(row.ticket_id) : undefined,
    scannedValue: String(row.scanned_value), scannerUserId: String(row.scanner_user_id), scannerName: String(row.scanner_name ?? ''),
    scanResult: String(row.scan_result), rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    scannedAt: new Date(String(row.scanned_at)).toISOString(), deviceInfo: row.device_info ? String(row.device_info) : undefined,
    ipAddress: row.ip_address ? String(row.ip_address) : undefined, ticketCode: row.ticket_code ? String(row.ticket_code) : undefined,
    participantName: row.participant_name ? String(row.participant_name) : undefined, ticketType: row.ticket_type ? String(row.ticket_type) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function getScanSummary(eventId: string) {
  const [tickets, scans] = await Promise.all([
    queryRows<DbRow>(`SELECT COUNT(*) AS total_tickets,
      SUM(status='USED') AS unique_validated, SUM(status IN ('ACTIVE','WAITLIST')) AS remaining
      FROM tickets WHERE event_id=? AND status<>'DELETED'`, [eventId]),
    queryRows<DbRow>(`SELECT COUNT(*) AS total_scans, SUM(scan_result='valid') AS successful,
      SUM(scan_result<>'valid') AS rejected, SUM(scan_result='duplicate') AS duplicates FROM scan_logs WHERE event_id=?`, [eventId]),
  ]);
  const totalTickets = Number(tickets[0].total_tickets ?? 0);
  const uniqueValidatedTickets = Number(tickets[0].unique_validated ?? 0);
  return {
    totalTickets, totalScans: Number(scans[0].total_scans ?? 0), successfulScans: Number(scans[0].successful ?? 0),
    rejectedScans: Number(scans[0].rejected ?? 0), uniqueValidatedTickets, remainingUnscannedTickets: Math.max(0, totalTickets - uniqueValidatedTickets),
    duplicateScanAttempts: Number(scans[0].duplicates ?? 0), validationPercentage: totalTickets ? Number((uniqueValidatedTickets / totalTickets * 100).toFixed(1)) : 0,
  };
}

export async function listAuthorizedScannerEvents(userId: string, superAdmin: boolean) {
  const rows = await queryRows<DbRow>(superAdmin
    ? `SELECT id,slug,title_en,title_ar,starts_at,ends_at,status FROM events WHERE status IN ('PUBLISHED','CLOSED') ORDER BY starts_at DESC`
    : `SELECT DISTINCT e.id,e.slug,e.title_en,e.title_ar,e.starts_at,e.ends_at,e.status FROM events e
       LEFT JOIN scanner_event_access sea ON sea.event_id=e.id LEFT JOIN event_managers em ON em.event_id=e.id
       WHERE (sea.user_id=? OR em.user_id=?) AND e.status IN ('PUBLISHED','CLOSED') ORDER BY e.starts_at DESC`, superAdmin ? [] : [userId, userId]);
  return rows.map(row => ({ id: String(row.id), slug: String(row.slug), title: { en: String(row.title_en), ar: String(row.title_ar) }, startsAt: new Date(String(row.starts_at)).toISOString(), endsAt: new Date(String(row.ends_at)).toISOString(), status: String(row.status) }));
}

export async function canUserAccessEvent(userId: string | undefined, eventId: string, superAdmin: boolean) {
  if (superAdmin) return true;
  if (!userId) return false;
  const rows = await queryRows<DbRow>(`SELECT 1 AS allowed FROM scanner_event_access WHERE user_id=? AND event_id=?
    UNION SELECT 1 AS allowed FROM event_managers WHERE user_id=? AND event_id=? LIMIT 1`, [userId, eventId, userId, eventId]);
  return Boolean(rows.length);
}

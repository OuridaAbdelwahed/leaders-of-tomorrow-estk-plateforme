import { createToken, safeId, sha256 } from './security';
import { execute, queryRows, withTransaction } from './database';
import { createTicketCode, createTicketQrDataUrl, ticketPayload } from './tickets';
import { buildVisitorContext, evaluateSecurityRisk, hashVerificationToken, maskEmail, normalizeEmail, ticketDevicePolicy, type VisitorContext } from './visitorSecurity';
import type { EventRecord, TicketStatus } from '@/lib/types';
import type { RowDataPacket } from 'mysql2/promise';
import { recordPolicyAcceptances } from './legalAcceptanceRepository';

type DbRow = RowDataPacket & Record<string, unknown>;
export type TicketDetail = {
  id: string;
  code: string;
  status: TicketStatus;
  waitlistPosition?: number;
  participantName: string;
  participantEmail?: string;
  participantPhone?: string;
  studentId?: string;
  programCode?: string;
  ticketTypeId: string;
  ticketTypeName: { en: string; ar: string };
  event: {
    id: string;
    slug: string;
    title: { en: string; ar: string };
    location: { en: string; ar: string };
    startsAt: string;
    endsAt: string;
    coverPath?: string;
    category: string;
  };
  usedAt?: string;
};

const iso = (value: unknown) => new Date(String(value)).toISOString();
const optionalIso = (value: unknown) => value ? iso(value) : undefined;

function mapTicket(row: DbRow): TicketDetail {
  return {
    id: String(row.id), code: String(row.ticket_code), status: row.status as TicketStatus,
    waitlistPosition: row.waitlist_position === null ? undefined : Number(row.waitlist_position),
    participantName: String(row.participant_name), participantEmail: row.participant_email ? String(row.participant_email) : undefined,
    participantPhone: row.participant_phone ? String(row.participant_phone) : undefined, studentId: row.participant_student_id ? String(row.participant_student_id) : undefined,
    programCode: row.participant_program ? String(row.participant_program) : undefined, ticketTypeId: String(row.ticket_type_id),
    ticketTypeName: { en: String(row.ticket_type_name_en), ar: String(row.ticket_type_name_ar) }, usedAt: optionalIso(row.used_at),
    event: {
      id: String(row.event_id), slug: String(row.event_slug), title: { en: String(row.event_title_en), ar: String(row.event_title_ar) },
      location: { en: String(row.event_location_en), ar: String(row.event_location_ar) }, startsAt: iso(row.event_starts_at), endsAt: iso(row.event_ends_at),
      coverPath: row.event_cover_path ? String(row.event_cover_path) : undefined, category: String(row.event_category ?? 'General'),
    },
  };
}

const ticketSelect = `SELECT t.*, tt.name_en AS ticket_type_name_en, tt.name_ar AS ticket_type_name_ar,
  e.slug AS event_slug, e.title_en AS event_title_en, e.title_ar AS event_title_ar,
  e.location_en AS event_location_en, e.location_ar AS event_location_ar, e.starts_at AS event_starts_at,
  e.ends_at AS event_ends_at, e.cover_path AS event_cover_path, COALESCE(c.name_en, 'General') AS event_category
  FROM tickets t JOIN ticket_types tt ON tt.id=t.ticket_type_id JOIN events e ON e.id=t.event_id
  LEFT JOIN event_categories c ON c.id=e.category_id`;

export async function getTicketByCodeAndToken(code: string, token: string) {
  const rows = await queryRows<DbRow>(`${ticketSelect} WHERE t.ticket_code=? AND t.qr_token_hash=? LIMIT 1`, [code, sha256(token)]);
  return rows[0] ? mapTicket(rows[0]) : undefined;
}

export async function getTicketByIdOrCodeAndToken(idOrCode: string, token: string) {
  const rows = await queryRows<DbRow>(`${ticketSelect} WHERE (t.id=? OR t.ticket_code=?) AND t.qr_token_hash=? LIMIT 1`, [idOrCode, idOrCode, sha256(token)]);
  return rows[0] ? mapTicket(rows[0]) : undefined;
}

type RegistrationInput = { fullName: string; email: string; phone: string; studentId: string; programCode: string; ticketTypeId?: string; verificationToken?: string; fingerprint?: string; acceptedPolicies:true };
type RegistrationSecurity = { request: Request; deviceToken: string };

async function logTicketSecurityEvent(connection: Parameters<typeof execute>[2], input: {
  eventId: string;
  ticketId?: string;
  verificationId?: string;
  emailMasked?: string;
  context: VisitorContext;
  action: string;
  blocked?: boolean;
  reason?: string;
  riskScore?: number;
  flags?: string[];
}) {
  await execute(
    `INSERT INTO ticket_security_events
      (id,event_id,ticket_id,verification_id,email_masked,device_token_hash,fingerprint_hash,ip_hash,risk_score,security_flags,action,blocked,reason)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      safeId('tse'),
      input.eventId,
      input.ticketId ?? null,
      input.verificationId ?? null,
      input.emailMasked ?? null,
      input.context.deviceTokenHash,
      input.context.fingerprintHash ?? null,
      input.context.ipHash,
      input.riskScore ?? 0,
      JSON.stringify(input.flags ?? []),
      input.action,
      input.blocked ? 1 : 0,
      input.reason ?? null,
    ],
    connection,
  );
}

export async function createRegistration(slug: string, input: RegistrationInput, locale: string, security?: RegistrationSecurity) {
  return withTransaction(async connection => {
    const eventRows = await queryRows<DbRow>(`SELECT e.*, COALESCE(c.name_en, 'General') AS category_name FROM events e LEFT JOIN event_categories c ON c.id=e.category_id WHERE e.slug=? FOR UPDATE`, [slug], connection);
    const event = eventRows[0];
    if (!event || event.status !== 'PUBLISHED') throw new Error('This event is not accepting registrations.');
    const now = new Date();
    if (new Date(String(event.ends_at)) < now) throw new Error('This event has already passed.');
    if (event.registration_deadline_at && new Date(String(event.registration_deadline_at)) < now) throw new Error('The registration deadline has passed.');
    if (!security || !input.verificationToken) throw new Error('Please verify your email before creating a ticket.');

    const emailNormalized = normalizeEmail(input.email);
    const context = buildVisitorContext(security.request, security.deviceToken, input.fingerprint);
    const verificationRows = await queryRows<DbRow>(
      'SELECT * FROM email_verifications WHERE event_id=? AND email_normalized=? AND verification_token_hash=? LIMIT 1 FOR UPDATE',
      [event.id, emailNormalized, hashVerificationToken(input.verificationToken)],
      connection,
    );
    const verification = verificationRows[0];
    if (!verification || String(verification.status) !== 'verified' || verification.consumed_at) {
      await logTicketSecurityEvent(connection, { eventId: String(event.id), emailMasked: maskEmail(emailNormalized), context, action: 'ticket_blocked', blocked: true, reason: 'Email verification is missing or already used.' });
      throw new Error('Please verify your email before creating a ticket.');
    }
    if (verification.verification_expires_at && new Date(String(verification.verification_expires_at)).getTime() < Date.now()) {
      await execute("UPDATE email_verifications SET status='expired' WHERE id=?", [verification.id], connection);
      await logTicketSecurityEvent(connection, { eventId: String(event.id), verificationId: String(verification.id), emailMasked: maskEmail(emailNormalized), context, action: 'ticket_blocked', blocked: true, reason: 'Email verification expired.' });
      throw new Error('Your verification session expired. Please request a new code.');
    }
    if (String(verification.device_token_hash) !== context.deviceTokenHash) {
      await logTicketSecurityEvent(connection, { eventId: String(event.id), verificationId: String(verification.id), emailMasked: maskEmail(emailNormalized), context, action: 'ticket_blocked', blocked: true, reason: 'Device token mismatch.' });
      throw new Error('This verification code must be used from the same browser that requested it.');
    }

    const duplicates = await queryRows<DbRow>(`SELECT id FROM tickets WHERE event_id=? AND status NOT IN ('CANCELLED','REFUNDED','DELETED')
      AND (email_normalized=? OR LOWER(participant_email)=LOWER(?) OR participant_phone=? OR LOWER(participant_student_id)=LOWER(?)) LIMIT 1 FOR UPDATE`,
      [event.id, emailNormalized, input.email, input.phone, input.studentId], connection);
    if (duplicates.length) throw new Error('One ticket already exists for this student ID, phone, or email.');

    const [deviceTickets, fingerprintTickets] = await Promise.all([
      queryRows<DbRow>("SELECT COUNT(*) AS count FROM tickets WHERE event_id=? AND status NOT IN ('CANCELLED','REFUNDED','DELETED') AND device_token_hash=?", [event.id, context.deviceTokenHash], connection),
      context.fingerprintHash
        ? queryRows<DbRow>("SELECT COUNT(*) AS count FROM tickets WHERE event_id=? AND status NOT IN ('CANCELLED','REFUNDED','DELETED') AND fingerprint_hash=?", [event.id, context.fingerprintHash], connection)
        : Promise.resolve([{ count: 0 }] as DbRow[]),
    ]);
    const risk = evaluateSecurityRisk({
      duplicateDeviceTickets: Number(deviceTickets[0]?.count ?? 0),
      duplicateFingerprintTickets: Number(fingerprintTickets[0]?.count ?? 0),
      hasFingerprint: Boolean(context.fingerprintHash),
    });
    if (ticketDevicePolicy() === 'strict' && (risk.duplicateDeviceTickets > 0 || risk.duplicateFingerprintTickets > 0)) {
      await logTicketSecurityEvent(connection, { eventId: String(event.id), verificationId: String(verification.id), emailMasked: maskEmail(emailNormalized), context, action: 'ticket_blocked', blocked: true, reason: 'This browser already created a ticket for this event.', riskScore: risk.score, flags: risk.flags });
      throw new Error('This browser already created a ticket for this event.');
    }

    const ticketTypes = await queryRows<DbRow>(`SELECT * FROM ticket_types WHERE event_id=? AND status='ACTIVE' ${input.ticketTypeId ? 'AND id=?' : ''} ORDER BY price, created_at LIMIT 1 FOR UPDATE`, input.ticketTypeId ? [event.id, input.ticketTypeId] : [event.id], connection);
    const ticketType = ticketTypes[0];
    if (!ticketType) throw new Error('No active ticket type is available for this event.');
    if (ticketType.sale_starts_at && new Date(String(ticketType.sale_starts_at)) > now) throw new Error('Ticket sales have not started yet.');
    if (ticketType.sale_ends_at && new Date(String(ticketType.sale_ends_at)) < now) throw new Error('Ticket sales have ended.');

    const [eventCounts, typeCounts] = await Promise.all([
      queryRows<DbRow>(`SELECT COUNT(*) AS count FROM tickets WHERE event_id=? AND status IN ('ACTIVE','USED')`, [event.id], connection),
      queryRows<DbRow>(`SELECT COUNT(*) AS count FROM tickets WHERE ticket_type_id=? AND status IN ('ACTIVE','USED')`, [ticketType.id], connection),
    ]);
    const eventFull = Number(event.capacity) > 0 && Number(eventCounts[0].count) >= Number(event.capacity);
    const typeFull = ticketType.quantity !== null && Number(typeCounts[0].count) >= Number(ticketType.quantity);
    const status: TicketStatus = eventFull || typeFull ? 'WAITLIST' : 'ACTIVE';
    const waiting = status === 'WAITLIST' ? await queryRows<DbRow>(`SELECT COUNT(*) AS count FROM tickets WHERE event_id=? AND status='WAITLIST'`, [event.id], connection) : [];
    const waitlistPosition = status === 'WAITLIST' ? Number(waiting[0].count) + 1 : undefined;

    const eventShape = { slug: String(event.slug) } as EventRecord;
    const code = createTicketCode(eventShape);
    const token = createToken();
    const id = safeId('tkt');
    const validFrom = now.toISOString();
    const validUntil = ticketType.valid_until ?? event.ends_at;
    await execute(`INSERT INTO tickets (id,event_id,ticket_type_id,participant_name,participant_email,email_normalized,participant_phone,participant_student_id,participant_program,ticket_code,qr_token_hash,status,waitlist_position,valid_from,valid_until,verification_id,device_token_hash,fingerprint_hash,security_risk_score,security_flags,created_ip_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [id, event.id, ticketType.id, input.fullName, input.email, emailNormalized, input.phone, input.studentId, input.programCode, code, sha256(token), status, waitlistPosition ?? null, validFrom, validUntil, verification.id, context.deviceTokenHash, context.fingerprintHash ?? null, risk.score, JSON.stringify(risk.flags), context.ipHash], connection);
    await recordPolicyAcceptances({subjectType:'event_registration',subjectId:id,policySlugs:['event-ticket-terms','code-of-conduct','privacy'],locale,request:security.request,connection});
    await execute("UPDATE email_verifications SET status='consumed', consumed_at=UTC_TIMESTAMP(3) WHERE id=?", [verification.id], connection);
    await logTicketSecurityEvent(connection, { eventId: String(event.id), ticketId: id, verificationId: String(verification.id), emailMasked: maskEmail(emailNormalized), context, action: 'ticket_allowed', riskScore: risk.score, flags: risk.flags });

    const detail = mapTicket({
      id, event_id: event.id, ticket_type_id: ticketType.id, participant_name: input.fullName, participant_email: input.email,
      participant_phone: input.phone, participant_student_id: input.studentId, participant_program: input.programCode, ticket_code: code,
      status, waitlist_position: waitlistPosition ?? null, used_at: null, ticket_type_name_en: ticketType.name_en, ticket_type_name_ar: ticketType.name_ar,
      event_slug: event.slug, event_title_en: event.title_en, event_title_ar: event.title_ar, event_location_en: event.location_en,
      event_location_ar: event.location_ar, event_starts_at: event.starts_at, event_ends_at: event.ends_at, event_cover_path: event.cover_path,
      event_category: event.category_name,
    } as DbRow);
    const qrDataUrl = await createTicketQrDataUrl(code, token);
    return {
      reference: code,
      ticket: {
        id, code, status, waitlistPosition, qrDataUrl,
        ticketUrl: `/${locale}/tickets/${code}?token=${encodeURIComponent(token)}`,
        downloadUrl: `/api/tickets/${code}/download?token=${encodeURIComponent(token)}&locale=${encodeURIComponent(locale)}`,
        participant: { fullName: input.fullName, email: input.email, phone: input.phone, studentId: input.studentId, programCode: input.programCode },
        ticketType: detail.ticketTypeName,
        event: { ...detail.event, title: detail.event.title, location: detail.event.location },
      },
      qrPayload: ticketPayload(code, token),
    };
  });
}

export async function listPublicTicketTypes(eventId: string) {
  const rows = await queryRows<DbRow>(`SELECT id,event_id,name_en,name_ar,description_en,description_ar,price,quantity,status FROM ticket_types WHERE event_id=? AND status='ACTIVE' ORDER BY price,created_at`, [eventId]);
  return rows.map(row => ({ id: String(row.id), eventId: String(row.event_id), name: { en: String(row.name_en), ar: String(row.name_ar) }, description: { en: String(row.description_en ?? ''), ar: String(row.description_ar ?? '') }, price: Number(row.price), quantity: row.quantity === null ? undefined : Number(row.quantity), status: String(row.status) }));
}

export async function listPublicTicketTypesBySlug(slug: string) {
  const events = await queryRows<DbRow>("SELECT id FROM events WHERE slug=? AND status='PUBLISHED' LIMIT 1", [slug]);
  if (!events[0]) throw new Error('Event not found.');
  return listPublicTicketTypes(String(events[0].id));
}

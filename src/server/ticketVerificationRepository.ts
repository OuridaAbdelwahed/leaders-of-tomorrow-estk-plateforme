import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { execute, queryRows, withTransaction } from './database';
import { sendMail } from './mail';
import { ticketVerificationCodeMail } from './mailTemplates';
import { safeId } from './security';
import {
  buildVisitorContext,
  checkRateLimit,
  createOtpCode,
  createOtpHash,
  createVerificationToken,
  hashEmail,
  hashVerificationToken,
  maskEmail,
  normalizeEmail,
  verifyOtpHash,
  verifyTurnstile,
  type VisitorContext,
} from './visitorSecurity';

type DbRow = RowDataPacket & Record<string, unknown>;

type RequestOtpInput = { email: string; fingerprint?: string; turnstileToken?: string; locale?: 'en' | 'ar' };
type VerifyOtpInput = { email: string; verificationToken: string; code: string; fingerprint?: string };

const otpExpiresMinutes = () => Number(process.env.TICKET_OTP_EXPIRES_MINUTES || 10);
const verifiedWindowMinutes = () => Number(process.env.TICKET_VERIFICATION_EXPIRES_MINUTES || 15);
const otpResendCooldownSeconds = () => Number(process.env.TICKET_OTP_RESEND_COOLDOWN_SECONDS || 45);
const otpMaxAttempts = () => Number(process.env.TICKET_OTP_MAX_ATTEMPTS || 5);

async function getPublishedEventForSlug(slug: string, connection?: PoolConnection) {
  const rows = await queryRows<DbRow>(
    "SELECT id,slug,title_en,title_ar,status FROM events WHERE slug=? AND status='PUBLISHED' LIMIT 1",
    [slug],
    connection,
  );
  return rows[0];
}

async function logSecurityEvent(connection: PoolConnection, input: {
  eventId: string;
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
      (id,event_id,verification_id,email_masked,device_token_hash,fingerprint_hash,ip_hash,risk_score,security_flags,action,blocked,reason)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      safeId('tse'),
      input.eventId,
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

export async function requestTicketVerification(slug: string, input: RequestOtpInput, request: Request, deviceToken: string) {
  const email = normalizeEmail(input.email);
  const context = buildVisitorContext(request, deviceToken, input.fingerprint);
  const turnstile = await verifyTurnstile(input.turnstileToken, request);

  return withTransaction(async connection => {
    const event = await getPublishedEventForSlug(slug, connection);
    if (!event) throw new Error('Event not found.');
    const emailMasked = maskEmail(email);

    if (!turnstile.success) {
      await logSecurityEvent(connection, { eventId: String(event.id), emailMasked, context, action: 'turnstile_failed', blocked: true, reason: turnstile.message });
      throw new Error('Security verification failed. Please try again.');
    }

    const rateChecks = [
      await checkRateLimit(connection, 'ticket_otp_email', `email:${String(event.id)}:${email}`, Number(process.env.TICKET_OTP_EMAIL_LIMIT || 4), 60 * 60),
      await checkRateLimit(connection, 'ticket_otp_device', `device:${String(event.id)}:${context.deviceTokenHash}`, Number(process.env.TICKET_OTP_DEVICE_LIMIT || 8), 60 * 60),
      await checkRateLimit(connection, 'ticket_otp_ip', `ip:${String(event.id)}:${context.ipHash}`, Number(process.env.TICKET_OTP_IP_LIMIT || 20), 60 * 60),
    ];
    if (rateChecks.some(value => !value)) {
      await logSecurityEvent(connection, { eventId: String(event.id), emailMasked, context, action: 'rate_limited', blocked: true, reason: 'Too many verification requests.' });
      throw new Error('Too many verification attempts. Please wait before trying again.');
    }

    const existingTicket = await queryRows<DbRow>(
      "SELECT id FROM tickets WHERE event_id=? AND email_normalized=? AND status NOT IN ('CANCELLED','REFUNDED','DELETED') LIMIT 1 FOR UPDATE",
      [event.id, email],
      connection,
    );
    if (existingTicket.length) {
      await logSecurityEvent(connection, { eventId: String(event.id), emailMasked, context, action: 'ticket_blocked', blocked: true, reason: 'A ticket already exists for this email.' });
      throw new Error('A ticket already exists for this email for this event.');
    }

    await execute(
      "UPDATE email_verifications SET status='expired' WHERE event_id=? AND email_normalized=? AND status IN ('pending','verified') AND consumed_at IS NULL",
      [event.id, email],
      connection,
    );

    const verificationId = safeId('ver');
    const verificationToken = createVerificationToken();
    const code = createOtpCode();
    await execute(
      `INSERT INTO email_verifications
        (id,event_id,email_normalized,email_hash,otp_hash,verification_token_hash,device_token_hash,fingerprint_hash,ip_hash,status,turnstile_success,expires_at)
        VALUES (?,?,?,?,?,?,?,?,?,'pending',?,DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MINUTE))`,
      [
        verificationId,
        event.id,
        email,
        hashEmail(email),
        createOtpHash(String(event.id), email, verificationId, code),
        hashVerificationToken(verificationToken),
        context.deviceTokenHash,
        context.fingerprintHash ?? null,
        context.ipHash,
        1,
        otpExpiresMinutes(),
      ],
      connection,
    );

    const title = input.locale === 'ar' ? String(event.title_ar || event.title_en) : String(event.title_en || event.title_ar);
    const mail = ticketVerificationCodeMail({ eventTitle: title, code, expiresMinutes: otpExpiresMinutes(), locale: input.locale });
    await sendMail({ to: email, ...mail });
    await logSecurityEvent(connection, { eventId: String(event.id), verificationId, emailMasked, context, action: 'otp_requested' });

    return {
      success: true,
      message: 'Verification code sent.',
      verificationToken,
      maskedEmail: emailMasked,
      expiresInSeconds: otpExpiresMinutes() * 60,
      resendCooldownSeconds: otpResendCooldownSeconds(),
      turnstileSkipped: turnstile.skipped,
    };
  });
}

export async function verifyTicketOtp(slug: string, input: VerifyOtpInput, request: Request, deviceToken: string) {
  const email = normalizeEmail(input.email);
  const context = buildVisitorContext(request, deviceToken, input.fingerprint);
  const tokenHash = hashVerificationToken(input.verificationToken);

  return withTransaction(async connection => {
    const event = await getPublishedEventForSlug(slug, connection);
    if (!event) throw new Error('Event not found.');
    const rows = await queryRows<DbRow>(
      'SELECT * FROM email_verifications WHERE event_id=? AND email_normalized=? AND verification_token_hash=? LIMIT 1 FOR UPDATE',
      [event.id, email, tokenHash],
      connection,
    );
    const verification = rows[0];
    if (!verification) throw new Error('Invalid verification code.');

    if (String(verification.status) !== 'pending') throw new Error('This verification request is no longer active.');
    if (new Date(String(verification.expires_at)).getTime() < Date.now()) {
      await execute("UPDATE email_verifications SET status='expired' WHERE id=?", [verification.id], connection);
      throw new Error('The verification code has expired.');
    }

    const attempts = Number(verification.attempts ?? 0);
    if (attempts >= otpMaxAttempts()) {
      await execute("UPDATE email_verifications SET status='blocked' WHERE id=?", [verification.id], connection);
      throw new Error('Too many invalid code attempts. Please request a new code.');
    }

    if (!verifyOtpHash(String(event.id), email, String(verification.id), input.code, String(verification.otp_hash))) {
      const nextAttempts = attempts + 1;
      await execute("UPDATE email_verifications SET attempts=?, status=IF(? >= ?, 'blocked', status) WHERE id=?", [nextAttempts, nextAttempts, otpMaxAttempts(), verification.id], connection);
      await logSecurityEvent(connection, { eventId: String(event.id), verificationId: String(verification.id), emailMasked: maskEmail(email), context, action: 'ticket_blocked', blocked: true, reason: 'Invalid OTP code.' });
      throw new Error('Invalid verification code.');
    }

    await execute(
      "UPDATE email_verifications SET status='verified', verified_at=UTC_TIMESTAMP(3), verification_expires_at=DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MINUTE), device_token_hash=?, fingerprint_hash=?, ip_hash=? WHERE id=?",
      [verifiedWindowMinutes(), context.deviceTokenHash, context.fingerprintHash ?? null, context.ipHash, verification.id],
      connection,
    );
    await logSecurityEvent(connection, { eventId: String(event.id), verificationId: String(verification.id), emailMasked: maskEmail(email), context, action: 'otp_verified' });

    return { success: true, message: 'Email verified. Your ticket is being prepared.' };
  });
}

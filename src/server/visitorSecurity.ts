import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { execute, queryRows } from './database';
import { safeId } from './security';

type DbRow = RowDataPacket & Record<string, unknown>;

export type VisitorContext = {
  deviceToken: string;
  deviceTokenHash: string;
  fingerprint?: string;
  fingerprintHash?: string;
  ipAddress?: string;
  ipHash: string;
  userAgent?: string;
  deviceInfo?: string;
};

export type SecurityRisk = {
  score: number;
  flags: string[];
  duplicateDeviceTickets: number;
  duplicateFingerprintTickets: number;
};

const cookieName = 'lot_visitor_device';

const secret = (name: string) => {
  const value = process.env[name]?.trim() || process.env.SESSION_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} or SESSION_SECRET is required in production.`);
  return `local-${name.toLowerCase()}-change-before-deployment`;
};

const hmac = (secretName: string, value: string) => createHmac('sha256', secret(secretName)).update(value).digest('hex');

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function maskEmail(email: string) {
  const normalized = normalizeEmail(email);
  const [user, domain] = normalized.split('@');
  if (!user || !domain) return normalized;
  const visible = user.length <= 2 ? user[0] ?? '*' : `${user.slice(0, 2)}${'*'.repeat(Math.min(5, user.length - 2))}`;
  return `${visible}@${domain}`;
}

export const createDeviceToken = () => randomBytes(32).toString('base64url');
export const getVisitorDeviceCookieName = () => cookieName;
export const hashDeviceToken = (token: string) => hmac('DEVICE_TOKEN_HASH_SECRET', token);
export const hashFingerprint = (fingerprint: string) => hmac('FINGERPRINT_HASH_SECRET', fingerprint);
export const hashIpAddress = (ipAddress: string) => hmac('IP_HASH_SECRET', ipAddress);
export const hashEmail = (email: string) => hmac('EMAIL_HASH_SECRET', normalizeEmail(email));
export const createVerificationToken = () => randomBytes(32).toString('base64url');
export const hashVerificationToken = (token: string) => hmac('VERIFICATION_TOKEN_HASH_SECRET', token);

export function createOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function createOtpHash(eventId: string, email: string, verificationId: string, code: string) {
  return hmac('OTP_HASH_SECRET', `${eventId}:${normalizeEmail(email)}:${verificationId}:${code.trim()}`);
}

export function verifyOtpHash(eventId: string, email: string, verificationId: string, code: string, storedHash: string) {
  const supplied = Buffer.from(createOtpHash(eventId, email, verificationId, code), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function requestIpAddress(request: Request) {
  const headers = request.headers;
  const cf = headers.get('cf-connecting-ip');
  const real = headers.get('x-real-ip');
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return cf || real || forwarded || 'unknown';
}

export function buildVisitorContext(request: Request, deviceToken: string, fingerprint?: string): VisitorContext {
  const ipAddress = requestIpAddress(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;
  return {
    deviceToken,
    deviceTokenHash: hashDeviceToken(deviceToken),
    fingerprint,
    fingerprintHash: fingerprint?.trim() ? hashFingerprint(fingerprint.trim()) : undefined,
    ipAddress,
    ipHash: hashIpAddress(ipAddress),
    userAgent,
    deviceInfo: userAgent,
  };
}

export async function verifyTurnstile(token: string | undefined, request: Request) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secretKey) {
    return { success: process.env.NODE_ENV !== 'production', skipped: true, message: 'Turnstile is not configured.' };
  }
  if (!token?.trim()) return { success: false, skipped: false, message: 'Security challenge is required.' };

  const body = new URLSearchParams();
  body.set('secret', secretKey);
  body.set('response', token);
  const ip = requestIpAddress(request);
  if (ip !== 'unknown') body.set('remoteip', ip);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8_000),
    });
    const result = await response.json() as { success?: boolean; hostname?: string };
    const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim();
    const allowedHostnames = expectedHostname?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
    if (allowedHostnames.length && result.hostname && !allowedHostnames.includes(result.hostname)) {
      return { success: false, skipped: false, message: 'Security challenge hostname mismatch.' };
    }
    return { success: Boolean(result.success), skipped: false, message: result.success ? undefined : 'Security challenge failed.' };
  } catch {
    return { success: false, skipped: false, message: 'Security challenge could not be verified.' };
  }
}

export async function checkRateLimit(connection: PoolConnection, action: string, scopeKey: string, limit: number, windowSeconds: number) {
  await execute('DELETE FROM rate_limit_events WHERE created_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)', [], connection);
  const rows = await queryRows<DbRow>(
    'SELECT COUNT(*) AS count FROM rate_limit_events WHERE action=? AND scope_key=? AND created_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? SECOND)',
    [action, scopeKey, windowSeconds],
    connection,
  );
  const count = Number(rows[0]?.count ?? 0);
  if (count >= limit) return false;
  await execute('INSERT INTO rate_limit_events (id,scope_key,action) VALUES (?,?,?)', [safeId('rl'), scopeKey, action], connection);
  return true;
}

export function evaluateSecurityRisk(args: { duplicateDeviceTickets: number; duplicateFingerprintTickets: number; hasFingerprint: boolean }): SecurityRisk {
  const flags: string[] = [];
  let score = 0;
  if (args.duplicateDeviceTickets > 0) { flags.push('device_reused_for_event'); score += 50; }
  if (args.duplicateFingerprintTickets > 0) { flags.push('fingerprint_reused_for_event'); score += 30; }
  if (!args.hasFingerprint) { flags.push('fingerprint_missing'); score += 10; }
  return { score: Math.min(score, 100), flags, duplicateDeviceTickets: args.duplicateDeviceTickets, duplicateFingerprintTickets: args.duplicateFingerprintTickets };
}

export function ticketDevicePolicy() {
  return (process.env.TICKET_DEVICE_POLICY || 'strict').trim().toLowerCase();
}

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const createToken = () => randomBytes(32).toString('hex');
export const safeId = (prefix: string) => `${prefix}_${randomBytes(8).toString('hex')}`;
export const reference = () => `LOT-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

type SessionPayload = { sub: string; role: 'member' | 'admin'; exp: number; adminRoleId?: string; name?: string };
const sessionSecret = () => {
  const value = process.env.SESSION_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production.');
  return 'local-session-secret-change-before-deployment';
};

export function signSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(body).digest('hex');
  return `${body}.${signature}`;
}

export function readSession(token: string | undefined): SessionPayload | undefined {
  if (!token) return;
  const [body, supplied] = token.split('.');
  if (!body || !supplied) return;
  const expected = createHmac('sha256', sessionSecret()).update(body).digest('hex');
  const a = Buffer.from(supplied); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return;
  try { const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload; return payload.exp > Date.now() ? payload : undefined; } catch { return; }
}

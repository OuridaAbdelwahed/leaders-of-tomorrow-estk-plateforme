type Entry = { count: number; resetAt: number };
declare global { var lotRateLimits: Map<string, Entry> | undefined; }
const entries = globalThis.lotRateLimits ?? new Map<string, Entry>();
globalThis.lotRateLimits = entries;

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now(); const current = entries.get(key);
  if (!current || current.resetAt <= now) { entries.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, remaining: limit - 1, retryAfter: 0 }; }
  if (current.count >= limit) return { allowed: false, remaining: 0, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1; return { allowed: true, remaining: limit - current.count, retryAfter: 0 };
}

export function requestRateLimitKey(request: Request, scope: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}

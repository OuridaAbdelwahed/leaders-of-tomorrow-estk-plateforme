const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type MutationTrustResult = { ok: true } | { ok: false; reason: string };

function normalizedOrigin(value: string | null | undefined) {
  if (!value) return;
  try { return new URL(value).origin.toLowerCase(); } catch { return; }
}

export function configuredMutationOrigins(requestUrl: string) {
  const origins = new Set<string>();
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://leadersoftomorrowestk.com';
  const configuredOrigin = normalizedOrigin(configured.startsWith('http') ? configured : `https://${configured}`);
  if (configuredOrigin) origins.add(configuredOrigin);

  try {
    const request = new URL(requestUrl);
    if (['localhost', '127.0.0.1', '[::1]'].includes(request.hostname)) {
      origins.add(request.origin.toLowerCase());
      const port = request.port ? `:${request.port}` : '';
      origins.add(`${request.protocol}//localhost${port}`);
      origins.add(`${request.protocol}//127.0.0.1${port}`);
    }
  } catch {
    // Invalid request URLs are rejected later because no origin can match.
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }
  return origins;
}

export function validateMutationRequest(request: Request, allowedOrigins = configuredMutationOrigins(request.url)): MutationTrustResult {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return { ok: true };

  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site' || fetchSite === 'same-site') {
    return { ok: false, reason: 'Cross-site state-changing requests are not allowed.' };
  }

  const origin = normalizedOrigin(request.headers.get('origin'));
  if (origin) {
    return allowedOrigins.has(origin)
      ? { ok: true }
      : { ok: false, reason: 'Request origin is not trusted.' };
  }

  const referer = normalizedOrigin(request.headers.get('referer'));
  if (referer) {
    return allowedOrigins.has(referer)
      ? { ok: true }
      : { ok: false, reason: 'Request referrer is not trusted.' };
  }

  if (fetchSite === 'same-origin') return { ok: true };
  return { ok: false, reason: 'A verifiable same-origin request is required.' };
}

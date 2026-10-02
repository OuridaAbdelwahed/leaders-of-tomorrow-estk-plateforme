import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateMutationRequest } from '@/server/requestSecurity';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const trust = validateMutationRequest(request);
    if (!trust.ok) {
      return NextResponse.json(
        { error: 'Request rejected by the cross-site request protection policy.' },
        {
          status: 403,
          headers: {
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
          },
        },
      );
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', request.headers.get('x-request-id') || crypto.randomUUID());
  const locale = request.nextUrl.pathname.split('/')[1];
  if (locale === 'en' || locale === 'ar') requestHeaders.set('x-site-locale', locale);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (locale === 'en' || locale === 'ar') response.headers.set('content-language', locale);
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/:locale(en|ar)/:path*'],
};

import type { NextConfig } from 'next';

const production = process.env.NODE_ENV === 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"} https://challenges.cloudflare.com https://*.paypal.com https://*.paypalobjects.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.paypal.com https://*.paypalobjects.com https://www.mastercard.com",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://api-m.sandbox.paypal.com https://api-m.paypal.com https://*.paypal.com",
  "frame-src https://challenges.cloudflare.com https://*.paypal.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.paypal.com",
  "frame-ancestors 'none'",
  ...(production ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(self), usb=(), browsing-topics=()' },
  ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  outputFileTracingIncludes: {
    '/*': ['./src/content/legal/**/*'],
  },
  serverExternalPackages: ['mammoth','pdfjs-dist','tesseract.js','@tesseract.js-data/ara','@tesseract.js-data/eng','@tesseract.js-data/fra'],
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }] },
    ];
  },
};

export default nextConfig;

import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/en', '/ar', '/en/events/', '/ar/events/', '/en/gallery', '/ar/gallery', '/en/contact', '/ar/contact'],
      disallow: [
        '/api/',
        '/*/login',
        '/*/member',
        '/*/tickets/',
        '/*/events/*/register',
        '/*/console',
        '/*?*token=',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL.origin,
  };
}

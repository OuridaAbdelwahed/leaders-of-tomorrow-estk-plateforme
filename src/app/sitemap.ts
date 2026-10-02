import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_LOCALES } from '@/lib/site';
import { ensureStoreReady, store } from '@/server/store';
import { legalPolicies } from '@/lib/legal';

export const dynamic = 'force-dynamic';

const publicPages = [
  { path: '', changeFrequency: 'weekly' as const, priority: 1 },
  { path: 'events', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: 'gallery', changeFrequency: 'weekly' as const, priority: 0.75 },
  { path: 'contact', changeFrequency: 'yearly' as const, priority: 0.6 },
  { path: 'join', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: 'legal', changeFrequency: 'monthly' as const, priority: 0.55 },
  ...legalPolicies.map(policy => ({ path: `legal/${policy.slug}`, changeFrequency: 'yearly' as const, priority: 0.35 })),
];

function languageAlternates(path: string) {
  const suffix = path ? `/${path}` : '';
  return {
    en: absoluteUrl(`/en${suffix}`),
    ar: absoluteUrl(`/ar${suffix}`),
    'x-default': absoluteUrl(`/en${suffix}`),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = publicPages.flatMap(page => SITE_LOCALES.map(locale => ({
    url: absoluteUrl(`/${locale}${page.path ? `/${page.path}` : ''}`),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: { languages: languageAlternates(page.path) },
  })));

  try {
    await ensureStoreReady();
    for (const event of store.events.filter(item => item.status === 'PUBLISHED')) {
      const path = `events/${event.slug}`;
      for (const locale of SITE_LOCALES) {
        entries.push({
          url: absoluteUrl(`/${locale}/${path}`),
          changeFrequency: new Date(event.endsAt) >= new Date() ? 'daily' : 'monthly',
          priority: new Date(event.endsAt) >= new Date() ? 0.85 : 0.55,
          alternates: { languages: languageAlternates(path) },
        });
      }
    }
  } catch {
    // Keep the static sitemap available during temporary database outages.
  }

  return entries;
}

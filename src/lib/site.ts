import type { Metadata } from 'next';

export const SITE_NAME = 'Leaders of Tomorrow ESTK';
export const SITE_SHORT_NAME = 'Leaders of Tomorrow';
export const SITE_DESCRIPTION = 'A student-led leadership community at EST Khenifra helping young people build practical skills, meaningful connections, and local impact.';
export const SITE_DESCRIPTION_AR = 'مجتمع طلابي للقيادة في المدرسة العليا للتكنولوجيا بخنيفرة، يساعد الشباب على بناء مهارات عملية وروابط هادفة وأثر محلي.';
export const SITE_LOCALES = ['en', 'ar'] as const;
export type SiteLocale = typeof SITE_LOCALES[number];

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://leadersoftomorrowestk.com';

export const SITE_URL = new URL(configuredSiteUrl.startsWith('http') ? configuredSiteUrl : `https://${configuredSiteUrl}`);
export const DEFAULT_SOCIAL_IMAGE = '/media/landing/club-cover.jpeg';
export const CLUB_EMAIL = 'contact@leadersoftomorrowestk.com';
export const CLUB_SOCIALS = [
  'https://www.instagram.com/club_leadersoftomorrow_estk/',
  'https://www.tiktok.com/@leaders_of_tomorrow_club',
  'https://www.linkedin.com/company/club-leaders-of-tomorrow-',
] as const;

export function isSiteLocale(value: string): value is SiteLocale {
  return SITE_LOCALES.includes(value as SiteLocale);
}

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}

export function localizedPath(locale: SiteLocale | string, path = '') {
  const suffix = path ? `/${path.replace(/^\/+|\/+$/g, '')}` : '';
  return `/${locale}${suffix}`;
}

type LocalizedMetadataInput = {
  locale: SiteLocale | string;
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: 'website' | 'article';
};

export function localizedMetadata({
  locale,
  title,
  description,
  path = '',
  image = DEFAULT_SOCIAL_IMAGE,
  keywords = [],
  noIndex = false,
  type = 'website',
}: LocalizedMetadataInput): Metadata {
  const safeLocale: SiteLocale = locale === 'ar' ? 'ar' : 'en';
  const canonicalPath = localizedPath(safeLocale, path);
  const languagePath = path ? `/${path.replace(/^\/+|\/+$/g, '')}` : '';
  const canonical = absoluteUrl(canonicalPath);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: {
        en: absoluteUrl(`/en${languagePath}`),
        ar: absoluteUrl(`/ar${languagePath}`),
        'x-default': absoluteUrl(`/en${languagePath}`),
      },
    },
    openGraph: {
      type,
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      locale: safeLocale === 'ar' ? 'ar_MA' : 'en_US',
      alternateLocale: safeLocale === 'ar' ? ['en_US'] : ['ar_MA'],
      images: [{ url: absoluteUrl(image), alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(image)],
    },
    robots: noIndex ? {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    } : {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export function privateMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
    referrer: 'no-referrer',
  };
}

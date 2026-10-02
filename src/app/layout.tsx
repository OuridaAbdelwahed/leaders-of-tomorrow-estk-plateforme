import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { AppThemeProvider } from '@/theme/AppThemeProvider';
import { DEFAULT_SOCIAL_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'education',
  classification: 'Student leadership and community education',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/favicon_16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon_32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon_192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/brand/favicon.ico',
    apple: '/brand/favicon_180x180.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, alt: 'Leaders of Tomorrow ESTK student community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get('x-site-locale') === 'ar' ? 'ar' : 'en';
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <AppRouterCacheProvider>
          <AppThemeProvider>{children}</AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

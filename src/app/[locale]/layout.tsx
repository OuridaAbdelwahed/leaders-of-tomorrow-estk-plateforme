import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/PublicShell';
import { JsonLd } from '@/components/JsonLd';
import { absoluteUrl, CLUB_EMAIL, CLUB_SOCIALS, SITE_DESCRIPTION, SITE_DESCRIPTION_AR, SITE_NAME, SITE_URL } from '@/lib/site';
import { ensureStoreReady, store } from '@/server/store';
import { readSession } from '@/server/security';
import { getPublicSponsors } from '@/server/sponsorshipRepository';
import { hasCurrentMembership } from '@/features/membership/access';

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!['en', 'ar'].includes(locale)) {
    if (locale === process.env.ADMIN_PORTAL_SLUG) return children;
    notFound();
  }
  await ensureStoreReady();
  const session = readSession((await cookies()).get('lot_member_session')?.value);
  const signedInMember = session?.role === 'member' ? store.members.find(member => member.id === session.sub && hasCurrentMembership(member)) : undefined;
  const initialMember = signedInMember ? Object.fromEntries(Object.entries(signedInMember).filter(([key]) => key !== 'passwordHash')) as Omit<typeof signedInMember, 'passwordHash'> : null;
  const partnerMarks = (await getPublicSponsors({ limit: 100 }))
    .map((sponsor) => [sponsor.logo, sponsor.companyName, sponsor.slug] as [string, string, string]);
  const ar = locale === 'ar';
  const organization = {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'Organization'],
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    alternateName: ar ? 'نادي قادة الغد' : 'Leaders of Tomorrow Club',
    url: SITE_URL.toString(),
    logo: absoluteUrl('/brand/logo-colored.png'),
    image: absoluteUrl('/media/landing/club-cover.jpeg'),
    email: CLUB_EMAIL,
    address: { '@type': 'PostalAddress', addressLocality: 'Khenifra', addressCountry: 'MA' },
    sameAs: CLUB_SOCIALS,
    description: ar ? SITE_DESCRIPTION_AR : SITE_DESCRIPTION,
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL.toString(),
    name: SITE_NAME,
    description: ar ? SITE_DESCRIPTION_AR : SITE_DESCRIPTION,
    inLanguage: ar ? 'ar-MA' : 'en',
    publisher: { '@id': `${SITE_URL}#organization` },
  };
  return <>
    <JsonLd data={[organization, website]} />
    <PublicShell locale={locale} partnerMarks={partnerMarks} initialMember={initialMember}>{children}</PublicShell>
  </>;
}

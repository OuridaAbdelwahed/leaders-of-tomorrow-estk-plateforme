import type { Metadata } from 'next';
import { PartnerApplicationPage } from '@/components/sponsorship/PartnerApplicationPage';
import { localizedMetadata } from '@/lib/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata({
    locale,
    path: 'sponsors',
    title: locale === 'ar' ? 'كن شريكًا' : 'Partner With Us',
    description: locale === 'ar'
      ? 'أرسل طلب شراكة إلى فريق قادة الغد.'
      : 'Submit a partnership request to the Leaders of Tomorrow team.',
  });
}

export default async function PartnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PartnerApplicationPage locale={locale} />;
}

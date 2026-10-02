import { ShieldOutlined } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { GalleryExperience } from '@/components/GalleryExperience';
import { ContactExperience } from '@/components/ContactExperience';
import { PageHero } from '@/components/PageHero';
import { ensureStoreReady, store } from '@/server/store';
import { localizedMetadata } from '@/lib/site';

export const dynamic = 'force-dynamic';

const removedSections = new Set(['about', 'founders', 'people', 'news', 'stories', 'projects', 'impact', 'partners']);

const copy: Record<string, { en: [string, string, string]; ar: [string, string, string] }> = {
  gallery: {
    en: ['GALLERY', 'Moments worth remembering.', 'Explore real club activities, shared achievements, and the people behind every experience.'],
    ar: ['المعرض', 'لحظات تستحق أن نتذكرها.', 'استكشف أنشطة النادي الحقيقية، والإنجازات المشتركة، والأشخاص وراء كل تجربة.'],
  },
  contact: {
    en: ['CONTACT', 'Start a useful conversation.', 'Choose the context and we will route your message to the right person without exposing private addresses.'],
    ar: ['تواصل معنا', 'ابدأ محادثة مفيدة.', 'اختر موضوع الرسالة وسنوجهها إلى الشخص المناسب دون كشف عناوين خاصة.'],
  },
  privacy: {
    en: ['LEGAL & TRUST', 'Privacy in plain language.', 'We collect only what our programs need, protect private files, and give people clear choices about their data.'],
    ar: ['القانون والثقة', 'الخصوصية بلغة واضحة.', 'نجمع فقط ما تحتاجه برامجنا، ونحمي الملفات الخاصة، ونمنح الأشخاص خيارات واضحة بشأن بياناتهم.'],
  },
  terms: {
    en: ['LEGAL & TRUST', 'Clear expectations, shared respect.', 'These terms explain acceptable use, content ownership, event participation, and account responsibilities.'],
    ar: ['القانون والثقة', 'توقعات واضحة واحترام متبادل.', 'توضح هذه الشروط الاستخدام المقبول وملكية المحتوى والمشاركة في الفعاليات ومسؤوليات الحساب.'],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; section: string }> }): Promise<Metadata> {
  const { locale, section } = await params;
  const sectionCopy = copy[section];
  if (!sectionCopy || removedSections.has(section)) return {};
  const [, title, description] = locale === 'ar' ? sectionCopy.ar : sectionCopy.en;
  return localizedMetadata({
    locale,
    path: section,
    title,
    description,
    keywords: section === 'gallery'
      ? ['Leaders of Tomorrow gallery', 'EST Khenifra activities', 'student club Morocco']
      : section === 'contact'
        ? ['contact Leaders of Tomorrow ESTK', 'student club Khenifra contact']
        : [],
  });
}

export default async function SectionPage({ params }: { params: Promise<{ locale: string; section: string }> }) {
  await ensureStoreReady();
  const { locale, section } = await params;
  if (section === 'privacy' || section === 'terms') redirect(`/${locale}/legal/${section}`);
  if (removedSections.has(section)) notFound();
  const sectionCopy = copy[section];
  if (!sectionCopy) notFound();
  const ar = locale === 'ar';
  const [eyebrow, title, intro] = ar ? sectionCopy.ar : sectionCopy.en;

  if (section === 'gallery') return <GalleryExperience locale={locale} items={store.gallery} />;
  if (section === 'contact') return <ContactExperience locale={locale} />;

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} intro={intro} />
      <Box className="section"><Box className="container">
        {(section === 'privacy' || section === 'terms') && <Box sx={{ maxWidth: 800 }}><Stack spacing={4}>{[ar ? 'ما الذي يغطيه هذا القسم' : 'What this covers', ar ? 'كيف نحميك' : 'How we protect you', ar ? 'خياراتك وحقوقك' : 'Your choices and rights'].map((heading, index) => <Box key={heading}><Stack direction="row" spacing={1} alignItems="center"><ShieldOutlined color="primary" /><Typography component="h2" variant="h4">{heading}</Typography></Stack><Typography color="text.secondary" sx={{ mt: 1 }}>{ar ? 'يتم التعامل مع البيانات وفق غرض واضح، وبأقل قدر لازم، مع وصول مقيد وفترات احتفاظ محددة. يمكن طلب التصحيح أو الحذف عبر قناة الخصوصية.' : 'Data is handled for a stated purpose, kept to the minimum needed, protected with restricted access, and retained for a defined period. Correction or deletion requests can be sent through the privacy channel.'}</Typography>{index === 2 && <Typography variant="caption" color="text.secondary">Last reviewed: 18 July 2026</Typography>}</Box>)}</Stack></Box>}
      </Box></Box>
    </>
  );
}

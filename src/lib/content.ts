import type { Localized } from './types';

export const t = (value: Localized, locale: string) => locale === 'ar' ? value.ar : value.en;

// Approved editorial content. Operational event/member/ticket data is loaded from MariaDB.
export const founders = [
  { name: 'Rim Adafal', image: '/media/people/president.jpeg', program: { en: 'Business & Management', ar: 'التدبير وإدارة الأعمال' }, role: { en: 'President', ar: 'الرئيسة' }, statement: { en: 'Leadership begins when potential becomes service.', ar: 'تبدأ القيادة حين تتحول الإمكانات إلى خدمة.' }, accent: '#EAB526' },
  { name: 'Doha Benstila', image: '/media/people/vice.jpeg', program: { en: 'Digital Engineering', ar: 'الهندسة الرقمية' }, role: { en: 'Vice President', ar: 'نائبة الرئيسة' }, statement: { en: 'We build the confidence to take the first step.', ar: 'نبني الثقة اللازمة لاتخاذ الخطوة الأولى.' }, accent: '#70B7C8' },
  { name: 'Ourida Abdelwahed', image: '/media/people/designer.png', program: { en: 'Creative Technology', ar: 'التكنولوجيا الإبداعية' }, role: { en: 'Design Lead', ar: 'مسؤولة التصميم' }, statement: { en: 'Good ideas deserve a clear, human form.', ar: 'الأفكار الجيدة تستحق شكلاً واضحاً وإنسانياً.' }, accent: '#D78FA5' },
];

export const socialReels = [
  { id: 'DVoh14PCC_w', href: 'https://www.instagram.com/reel/DVoh14PCC_w/', image: '/media/gallery/g_20260303_233215_12fdb324.png' },
  { id: 'DVjVPfCCH4A', href: 'https://www.instagram.com/reel/DVjVPfCCH4A/', image: '/media/gallery/media_20260226_024441_a4c0e8ef.jpeg' },
];

export const projects = [
  { title: { en: 'Campus Skills Sprint', ar: 'سباق مهارات الحرم' }, metric: '320+', label: { en: 'students reached', ar: 'طالباً وطالبة' } },
  { title: { en: 'Warm Winter', ar: 'شتاء دافئ' }, metric: '14', label: { en: 'local partners', ar: 'شريكاً محلياً' } },
  { title: { en: 'Peer Mentor Circle', ar: 'حلقة التوجيه بين الطلبة' }, metric: '86%', label: { en: 'completion rate', ar: 'نسبة الإتمام' } },
];

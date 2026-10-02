import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type LegalPolicyDefinition = {
  slug: string;
  file: string;
  title: { en: string; ar: string };
  shortTitle: { en: string; ar: string };
  summary: { en: string; ar: string };
  audience: { en: string; ar: string };
  category: 'platform' | 'membership' | 'events' | 'finance' | 'partnerships' | 'community';
  mandatorySections: number[];
};

export type LegalSection = { number: number; title: string; blocks: string[] };
export type LegalDocument = {
  definition: LegalPolicyDefinition;
  title: string;
  owner: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const LEGAL_EFFECTIVE_DATE = '29 July 2026';
export const LEGAL_LAST_UPDATED = '29 July 2026';
export const LEGAL_CONTACT = 'contact@leadersoftomorrowestk.com';

export const legalPolicies: LegalPolicyDefinition[] = [
  { slug:'terms', file:'terms.txt', title:{en:'Terms of Service',ar:'شروط الخدمة'}, shortTitle:{en:'Terms',ar:'الشروط'}, summary:{en:'Rules governing every account, service, event, ticket, donation, and platform interaction.',ar:'القواعد المنظمة للحسابات والخدمات والفعاليات والتذاكر والتبرعات واستخدام المنصة.'}, audience:{en:'All visitors and users',ar:'جميع الزوار والمستخدمين'}, category:'platform', mandatorySections:[3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,22,26,27] },
  { slug:'privacy', file:'privacy.txt', title:{en:'Privacy Policy',ar:'سياسة الخصوصية'}, shortTitle:{en:'Privacy',ar:'الخصوصية'}, summary:{en:'What data we collect, why we use it, how long we keep it, and the rights available to you.',ar:'البيانات التي نجمعها وأسباب استخدامها ومدة الاحتفاظ بها والحقوق المتاحة لك.'}, audience:{en:'Visitors, applicants, members, and participants',ar:'الزوار والمتقدمون والأعضاء والمشاركون'}, category:'platform', mandatorySections:[4,5,6,7,12,13,14,16,20,22,23,24,25,28,29,30,31] },
  { slug:'cookies', file:'cookies.txt', title:{en:'Cookie Policy',ar:'سياسة ملفات تعريف الارتباط'}, shortTitle:{en:'Cookies',ar:'ملفات الارتباط'}, summary:{en:'Essential, security, preference, analytics, event, membership, and AI session technologies.',ar:'ملفات الارتباط الأساسية والأمنية والتفضيلات والتحليلات والفعاليات والعضوية وجلسات الذكاء الاصطناعي.'}, audience:{en:'All platform visitors',ar:'جميع زوار المنصة'}, category:'platform', mandatorySections:[5,6,7,10,11,12,13,14,15,16,17] },
  { slug:'ai-usage', file:'ai-usage.txt', title:{en:'Artificial Intelligence Usage Policy',ar:'سياسة استخدام الذكاء الاصطناعي'}, shortTitle:{en:'AI usage',ar:'استخدام الذكاء الاصطناعي'}, summary:{en:'Responsible AI use, human oversight, academic integrity, privacy, security, and prohibited conduct.',ar:'الاستخدام المسؤول للذكاء الاصطناعي والإشراف البشري والنزاهة الأكاديمية والخصوصية والأمن والمحظورات.'}, audience:{en:'Members, users, staff, trainers, and developers',ar:'الأعضاء والمستخدمون والمسؤولون والمدربون والمطورون'}, category:'platform', mandatorySections:[5,6,7,8,9,10,11,12,14,15,16,17,19,20,23] },
  { slug:'membership-agreement', file:'membership-agreement.txt', title:{en:'Membership Agreement',ar:'اتفاقية العضوية'}, shortTitle:{en:'Membership',ar:'العضوية'}, summary:{en:'Eligibility, contribution, member rights, responsibilities, badge use, attendance, suspension, and renewal.',ar:'الأهلية وواجب الانخراط وحقوق الأعضاء ومسؤولياتهم واستعمال البطاقة والحضور والتوقيف والتجديد.'}, audience:{en:'Membership applicants and approved members',ar:'طالبو العضوية والأعضاء المقبولون'}, category:'membership', mandatorySections:[3,5,7,9,10,11,16,17,18,19,20,21,24,25] },
  { slug:'internal-regulations', file:'internal-regulations.txt', title:{en:'Internal Regulations',ar:'النظام الداخلي'}, shortTitle:{en:'Club rules',ar:'نظام النادي'}, summary:{en:'The Club’s official governance, participation, leadership, conduct, finance, and discipline rules.',ar:'القواعد الرسمية لتسيير النادي والمشاركة والقيادة والسلوك والشؤون المالية والانضباط.'}, audience:{en:'All members and Club representatives',ar:'جميع الأعضاء وممثلي النادي'}, category:'membership', mandatorySections:[6,7,9,13,14,16,17,18,19,20,21,23,27,28,29,30,31,32,33,36,37,39,40,42,44,45,46,47,48,49,50] },
  { slug:'code-of-conduct', file:'code-of-conduct.txt', title:{en:'Code of Conduct',ar:'مدونة السلوك'}, shortTitle:{en:'Conduct',ar:'السلوك'}, summary:{en:'Respect, inclusion, professionalism, integrity, safety, reporting, investigations, and discipline.',ar:'الاحترام والإدماج والمهنية والنزاهة والسلامة والإبلاغ والتحقيق والتدابير التأديبية.'}, audience:{en:'Members, guests, volunteers, partners, and event participants',ar:'الأعضاء والضيوف والمتطوعون والشركاء والمشاركون'}, category:'community', mandatorySections:[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,25] },
  { slug:'event-ticket-terms', file:'event-ticket-terms.txt', title:{en:'Event Ticket Terms & Conditions',ar:'شروط وأحكام تذاكر الفعاليات'}, shortTitle:{en:'Ticket terms',ar:'شروط التذاكر'}, summary:{en:'Registration, eligibility, ticket security, one-ticket rule, check-in, cancellation, media, and safety.',ar:'التسجيل والأهلية وأمن التذاكر وقاعدة التذكرة الواحدة والدخول والإلغاء والتصوير والسلامة.'}, audience:{en:'Event registrants and attendees',ar:'المسجلون في الفعاليات والحاضرون'}, category:'events', mandatorySections:[4,5,6,7,8,9,11,12,13,14,16,17,18,19,20,21,22,23,25,26] },
  { slug:'refunds-donations', file:'refunds-donations.txt', title:{en:'Refund & Donation Policy',ar:'سياسة الاسترداد والتبرعات'}, shortTitle:{en:'Refunds & donations',ar:'الاسترداد والتبرعات'}, summary:{en:'Voluntary donations, membership contributions, secure payments, refunds, chargebacks, and fund use.',ar:'التبرعات الاختيارية وواجبات الانخراط وأمن الأداء والاسترداد والاعتراضات واستعمال الأموال.'}, audience:{en:'Members, donors, and payers',ar:'الأعضاء والمتبرعون والدافعون'}, category:'finance', mandatorySections:[4,5,6,7,8,9,10,11,12,13,16,17,18,19,22] },
  { slug:'copyright', file:'copyright.txt', title:{en:'Copyright & Intellectual Property Policy',ar:'سياسة حقوق النشر والملكية الفكرية'}, shortTitle:{en:'Copyright & IP',ar:'حقوق النشر'}, summary:{en:'Ownership and permitted use of branding, software, educational materials, media, badges, and user content.',ar:'ملكية واستعمال العلامة والبرمجيات والمواد التعليمية والوسائط والشارات ومحتوى المستخدمين.'}, audience:{en:'Users, contributors, members, sponsors, and partners',ar:'المستخدمون والمساهمون والأعضاء والرعاة والشركاء'}, category:'community', mandatorySections:[4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,26] },
  { slug:'sponsorship-partnership', file:'sponsorship-partnership.txt', title:{en:'Sponsorship & Partnership Policy',ar:'سياسة الرعاية والشراكات'}, shortTitle:{en:'Partnerships',ar:'الشراكات'}, summary:{en:'Ethical approvals, sponsor rights, responsibilities, branding, funding, data protection, and termination.',ar:'الموافقة الأخلاقية وحقوق الرعاة ومسؤولياتهم والعلامة والتمويل وحماية البيانات وإنهاء التعاون.'}, audience:{en:'Prospective and current sponsors and partners',ar:'الرعاة والشركاء الحاليون والمحتملون'}, category:'partnerships', mandatorySections:[4,8,9,10,11,12,13,14,15,16,20,21,22,23,24,25,26,27,28,31] },
];

export function getLegalPolicy(slug: string) { return legalPolicies.find(policy => policy.slug === slug); }

function parseDocument(raw: string, definition: LegalPolicyDefinition, locale: 'en'|'ar'): LegalDocument {
  const normalized = raw.replace(/\r/g,'').trim();
  const lines = normalized.split('\n');
  const title = lines[0]?.trim() || definition.title[locale];
  const owner = lines[1]?.trim() || (locale === 'ar' ? 'نادي قادة الغد' : 'Leaders of Tomorrow Club');
  const version = normalized.match(locale === 'ar' ? /الإصدار:\s*([^\n]+)/ : /Version:?\s*([^\n]+)/i)?.[1]?.trim() || '1.0';
  const effectiveDate = normalized.match(locale === 'ar' ? /تاريخ السريان:\s*([^\n]+)/ : /Effective Date:\s*([^\n]+)/i)?.[1]?.trim() || (locale === 'ar' ? '29 يوليو 2026' : LEGAL_EFFECTIVE_DATE);
  const lastUpdated = normalized.match(locale === 'ar' ? /آخر تحديث:\s*([^\n]+)/ : /Last Updated:\s*([^\n]+)/i)?.[1]?.trim() || (locale === 'ar' ? '29 يوليو 2026' : LEGAL_LAST_UPDATED);
  const matches = [...normalized.matchAll(/^(?:([0-9]+)\.\s+(.+)|المادة\s+([0-9]+))$/gm)];
  const sections = matches.map((match,index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index+1]?.index ?? normalized.length;
    const number=Number(match[1]??match[3]);const sectionTitle=match[2]?.trim()||(locale==='ar'?`المادة ${number}`:`Article ${number}`);
    return { number, title:sectionTitle, blocks:normalized.slice(start,end).trim().split(/\n\s*\n/).map(block=>block.trim()).filter(Boolean) };
  });
  return { definition, title, owner, version, effectiveDate, lastUpdated, sections };
}

export async function loadLegalDocument(slug: string, locale: string) {
  const definition = getLegalPolicy(slug);
  if (!definition) return undefined;
  const language: 'en'|'ar' = locale === 'ar' ? 'ar' : 'en';
  const file = path.join(process.cwd(),'src','content','legal',language,definition.file);
  const raw = await readFile(file,'utf8');
  return parseDocument(raw,definition,language);
}

import type { ChatLanguage } from './types';

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const ARABIC_TEXT = /[\u0600-\u06ff]/;
const FRENCH_MARKERS = new Set(['bonjour','adhesion','adhérer','membre','billet','événement','evenement','comment','rejoindre','règlement','reglement','merci']);
const DARIJA_MARKERS = new Set(['kifach','bghit','wach','n9dr','ndkhol','ntsjjel','dyal','fin','chno','3afak','salam']);

export function detectChatLanguage(input: string): ChatLanguage {
  const lowered = input.toLowerCase();
  const tokens = lowered.normalize('NFKC').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (ARABIC_TEXT.test(input)) {
    const darijaArabic = ['بغيت','واش','كيفاش','شنو','فين','ديال','نقدر'];
    return darijaArabic.some(term => input.includes(term)) ? 'darija' : 'ar';
  }
  if (tokens.some(token => DARIJA_MARKERS.has(token)) || /[3579]/.test(lowered)) return 'darija';
  if (tokens.some(token => FRENCH_MARKERS.has(token)) || /[àâçéèêëîïôùûüÿœ]/i.test(input)) return 'fr';
  return 'en';
}

export function normalizeChatText(input: string, language?: ChatLanguage) {
  const detected = language ?? detectChatLanguage(input);
  let value = input.normalize('NFKC').toLowerCase().replace(/[’‘`´]/g, "'");
  if (detected === 'ar' || ARABIC_TEXT.test(value)) {
    value = value.replace(ARABIC_DIACRITICS, '').replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  } else {
    value = value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }
  if (detected === 'darija') {
    value = value.replace(/\bkifach\b/g, 'كيفاش').replace(/\bn9dr\b/g, 'نقدر').replace(/\bndkhol\b/g, 'ندخل').replace(/\bbghit\b/g, 'بغيت').replace(/\bwach\b/g, 'واش').replace(/kh/g, 'خ').replace(/gh/g, 'غ').replace(/ch/g, 'ش').replace(/3/g, 'ع').replace(/7/g, 'ح').replace(/9/g, 'ق').replace(/5/g, 'خ');
  }
  return value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[^\p{L}\p{N}']+/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function maskSensitiveChatText(input: string) {
  let masked = input;
  const patterns = [
    /\b(?:otp|password|mot de passe|كلمة السر|code)\s*[:=]?\s*[A-Za-z0-9!@#$%^&*_-]{4,}\b/gi,
    /\b(?:Bearer\s+)?[A-Za-z0-9_-]{24,}\b/g,
    /\b\d{13,19}\b/g,
  ];
  for (const pattern of patterns) masked = masked.replace(pattern, '[REDACTED]');
  return { text: masked, masked: masked !== input };
}

export function fuzzySimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const a = [...left]; const b = [...right];
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0]; previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (a[row - 1] === b[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

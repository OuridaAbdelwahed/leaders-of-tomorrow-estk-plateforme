import { describe, expect, it } from 'vitest';
import { detectChatLanguage, fuzzySimilarity, maskSensitiveChatText, normalizeChatText } from './normalization';

describe('chatbot normalization', () => {
  it('normalizes French accents and punctuation', () => expect(normalizeChatText('  Adhésion, au CLUB! ', 'fr')).toBe('adhesion au club'));
  it('normalizes Arabic variants and diacritics', () => expect(normalizeChatText('إِلَى النَّادِي', 'ar')).toBe('الي النادي'));
  it('supports cautious Darija Arabizi substitutions', () => expect(normalizeChatText('kifach n9dr ndkhol l club?', 'darija')).toContain('نقدر'));
  it('detects four supported language families', () => { expect(detectChatLanguage('How do I join?')).toBe('en'); expect(detectChatLanguage('Comment devenir membre ?')).toBe('fr'); expect(detectChatLanguage('كيف أصبح عضوا؟')).toBe('ar'); expect(detectChatLanguage('kifach nwli membre')).toBe('darija'); });
  it('scores fuzzy phrases and masks secrets', () => { expect(fuzzySimilarity('membership','membershp')).toBeGreaterThan(.8); expect(maskSensitiveChatText('password: Secret123!').masked).toBe(true); });
});

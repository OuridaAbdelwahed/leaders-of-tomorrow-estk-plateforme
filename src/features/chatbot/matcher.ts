import { fuzzySimilarity, normalizeChatText } from './normalization';
import type { ChatActorRole, ChatIntent, ChatLanguage, ChatRuntimeCatalog } from './types';

export type MatchInput = { message: string; language: ChatLanguage; role: ChatActorRole; catalog: ChatRuntimeCatalog };
export type MatchCandidate = { intent: ChatIntent; score: number; exact: boolean; breakdown: Record<string, number>; warnings: string[] };
export type IntentMatchResult = { selected?: MatchCandidate; candidates: MatchCandidate[]; ambiguous: boolean; normalized: string };
export interface IntentMatcher { match(input: MatchInput): Promise<IntentMatchResult> }

function expandSynonyms(value: string, language: ChatLanguage, catalog: ChatRuntimeCatalog) {
  const additions = catalog.synonyms.filter(item => item.active && item.language === language && value.includes(item.normalizedTerm)).map(item => item.normalizedSynonym);
  return additions.length ? `${value} ${additions.join(' ')}` : value;
}

function scoreIntent(intent: ChatIntent, normalized: string, language: ChatLanguage, catalog: ChatRuntimeCatalog): MatchCandidate {
  const breakdown: Record<string, number> = {}; const warnings: string[] = [];
  const patterns = catalog.patterns.filter(item => item.active && item.intentId === intent.id && item.language === language);
  const keywords = catalog.keywords.filter(item => item.active && item.intentId === intent.id && item.language === language);
  let exact = false; let patternScore = 0;
  for (const pattern of patterns) {
    if (normalized === pattern.normalizedPattern) { exact = true; patternScore = Math.max(patternScore, pattern.patternType === 'EXACT' ? 1 : .96); continue; }
    if (normalized.includes(pattern.normalizedPattern) && pattern.normalizedPattern.length >= 5) patternScore = Math.max(patternScore, Math.min(.9, .72 + pattern.weight * .04));
    const similarity = fuzzySimilarity(normalized, pattern.normalizedPattern);
    if (similarity >= .58) patternScore = Math.max(patternScore, similarity * Math.min(.82, .62 + pattern.weight * .04));
  }
  breakdown.pattern = patternScore;
  let keywordScore = 0; let negativePenalty = 0; let missingRequired = false;
  for (const keyword of keywords) {
    const present = normalized.includes(keyword.normalizedKeyword);
    if (keyword.negative && present) negativePenalty += Math.min(.6, keyword.weight * .18);
    else if (keyword.required && !present) missingRequired = true;
    else if (present) keywordScore += Math.min(.22, keyword.weight * .06);
  }
  if (missingRequired) { keywordScore *= .25; warnings.push('missing_required_keyword'); }
  breakdown.keywords = Math.min(.65, keywordScore); breakdown.negative = -negativePenalty;
  breakdown.language = patterns.length || keywords.length ? .03 : 0;
  breakdown.priority = Math.max(-.02, Math.min(.03, intent.priority / 1000));
  const score = Math.max(0, Math.min(1, Math.max(patternScore, keywordScore) + breakdown.language + breakdown.priority - negativePenalty));
  return { intent, score, exact, breakdown, warnings };
}

export class RuleBasedIntentMatcher implements IntentMatcher {
  async match(input: MatchInput) {
    const normalized = expandSynonyms(normalizeChatText(input.message, input.language), input.language, input.catalog);
    const candidates = input.catalog.intents.filter(intent => intent.active).map(intent => scoreIntent(intent, normalized, input.language, input.catalog)).sort((a,b) => b.score - a.score || b.intent.priority - a.intent.priority);
    const selected = candidates[0]?.score >= (candidates[0]?.intent.minimumConfidence ?? 1) ? candidates[0] : undefined;
    const shortQuery = normalized.split(' ').length <= 2;
    const ambiguous = Boolean(selected && candidates[1] && !selected.exact && (selected.score - candidates[1].score < (shortQuery ? .12 : .06)) && candidates[1].score >= candidates[1].intent.minimumConfidence);
    return { selected, candidates: candidates.slice(0, 12), ambiguous, normalized };
  }
}

export class FuzzyIntentMatcher extends RuleBasedIntentMatcher {}
export class CompositeIntentMatcher extends RuleBasedIntentMatcher {}

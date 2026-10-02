export const CHAT_LANGUAGES = ['ar', 'fr', 'en', 'darija'] as const;
export type ChatLanguage = typeof CHAT_LANGUAGES[number];
export type ChatActorRole = 'guest' | 'member' | 'admin' | 'super_admin';
export type ChatHandlerType = 'STATIC' | 'DATABASE' | 'SERVICE' | 'NAVIGATION' | 'CLARIFICATION' | 'AUTHENTICATION' | 'HANDOFF';

export type ChatActionKey =
  | 'membership_application' | 'member_login' | 'events' | 'my_tickets' | 'my_badge'
  | 'my_invitations' | 'my_notifications' | 'member_profile' | 'sponsors'
  | 'student_offers' | 'become_sponsor' | 'gallery' | 'news' | 'legal' | 'contact' | 'human_support';

export type ChatAction = {
  type: 'navigate' | 'send_message' | 'open_modal';
  actionKey: ChatActionKey;
  payload?: Record<string, string>;
};

export type ChatSuggestion = { id?: string; label: string; message: string };

export type ChatUIComponent =
  | { type: 'action_button'; id: string; label: string; icon?: string; variant: 'primary' | 'secondary' | 'outline' | 'danger'; animation?: 'none' | 'pulse' | 'shimmer' | 'bounce'; action: ChatAction }
  | { type: 'quick_actions'; title?: string; actions: Array<{ id: string; label: string; action: ChatAction }> }
  | { type: 'info_card'; title: string; body: string; icon?: string; tone?: 'default' | 'info' | 'success' | 'warning' }
  | { type: 'step_list'; title: string; steps: string[] }
  | { type: 'alert_card'; title: string; message: string; severity: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'event_card'; id: string; slug: string; title: string; summary?: string; location: string; startsAt: string; coverPath?: string; availability?: string; action?: ChatAction }
  | { type: 'event_carousel'; title: string; events: Array<Extract<ChatUIComponent, { type: 'event_card' }>> }
  | { type: 'ticket_card'; id: string; eventTitle: string; startsAt: string; status: string; ticketType?: string; action?: ChatAction }
  | { type: 'ticket_list'; title: string; tickets: Array<Extract<ChatUIComponent, { type: 'ticket_card' }>> }
  | { type: 'membership_status'; status: string; reference?: string; submittedAt?: string; steps: Array<{ label: string; complete: boolean }> }
  | { type: 'badge_preview'; title: string; badgeName: string; imagePath?: string; status: string; action?: ChatAction }
  | { type: 'invitation_card'; id: string; eventTitle: string; startsAt: string; location?: string; status: string }
  | { type: 'invitation_list'; title: string; invitations: Array<Extract<ChatUIComponent, { type: 'invitation_card' }>> }
  | { type: 'notification_list'; title: string; notifications: Array<{ id: string; title: string; message: string; createdAt: string; unread: boolean }> }
  | { type: 'sponsor_card'; id: string; name: string; logoPath: string; level: string; slug: string }
  | { type: 'sponsor_list'; title: string; sponsors: Array<Extract<ChatUIComponent, { type: 'sponsor_card' }>> }
  | { type: 'coupon_card'; id: string; title: string; sponsorName: string; discount: string; expirationDate: string; locked: boolean; action?: ChatAction }
  | { type: 'contact_card'; title: string; email: string; socialLabels?: string[]; action?: ChatAction }
  | { type: 'support_handoff'; title: string; message: string; requiresAuthentication: boolean; action: ChatAction }
  | { type: 'status_timeline'; title: string; items: Array<{ label: string; date?: string; status: string }> }
  | { type: 'empty_state'; title: string; message: string; action?: ChatAction }
  | { type: 'login_required'; title: string; message: string; action: ChatAction }
  | { type: 'page_link_card'; title: string; description?: string; action: ChatAction }
  | { type: 'knowledge_results'; title: string; results: Array<{ id:string; sourceType:string; title:string; snippet:string; action?:ChatAction }> };

export type ChatbotResponse = {
  version: '1.0';
  conversationId: string;
  messageId: string;
  intent: string;
  confidence: number;
  language: ChatLanguage;
  message: string;
  components: ChatUIComponent[];
  suggestions?: ChatSuggestion[];
  requiresAuthentication?: boolean;
  handoffAvailable?: boolean;
  metadata?: { responseSource?: 'static' | 'database' | 'service'; processingTimeMs?: number };
};

export type ChatIntent = {
  id: string; intentKey: string; category: string; description: string; handlerType: ChatHandlerType;
  handlerKey?: string; requiresAuthentication: boolean; allowedRoles: ChatActorRole[];
  minimumConfidence: number; priority: number; notes?: string; active: boolean;
};

export type ChatPattern = { id: string; intentId: string; language: ChatLanguage; pattern: string; normalizedPattern: string; patternType: 'EXACT' | 'SAMPLE' | 'FUZZY'; weight: number; active: boolean };
export type ChatKeyword = { id: string; intentId: string; language: ChatLanguage; keyword: string; normalizedKeyword: string; weight: number; required: boolean; negative: boolean; active: boolean };
export type ChatSynonym = { id: string; language: ChatLanguage; term: string; normalizedTerm: string; synonym: string; normalizedSynonym: string; active: boolean };
export type ChatTemplate = { id: string; intentId: string; language: ChatLanguage; message: string; responseSource: 'STATIC' | 'DATABASE' | 'SERVICE'; version: number; active: boolean };
export type ChatComponentRecord = { id: string; intentId: string; language?: ChatLanguage; componentType: string; componentConfig: unknown; displayOrder: number; active: boolean };
export type ChatRuntimeCatalog = { intents: ChatIntent[]; patterns: ChatPattern[]; keywords: ChatKeyword[]; synonyms: ChatSynonym[]; responses: ChatTemplate[]; components: ChatComponentRecord[]; suggestions: Array<ChatSuggestion & { id: string; intentId: string; language: ChatLanguage; displayOrder: number }> };

export type ChatActor = { role: ChatActorRole; memberId?: string; adminIdentity?: string; guestSessionHash?: string; memberEmail?: string };

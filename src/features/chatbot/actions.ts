import type { ChatActionKey } from './types';

export const CHAT_ACTION_ROUTES: Record<Exclude<ChatActionKey, 'human_support'>, string> = {
  membership_application: '/join', member_login: '/login', events: '/events', my_tickets: '/member', my_badge: '/member',
  my_invitations: '/member', my_notifications: '/member', member_profile: '/member', sponsors: '/sponsors',
  student_offers: '/student-discounts', become_sponsor: '/sponsors', contact: '/contact',
  gallery: '/gallery', news: '/news', legal: '/legal',
};

export function resolveChatActionRoute(actionKey: ChatActionKey, locale: string) {
  if (actionKey === 'human_support') return;
  const safeLocale = locale === 'ar' ? 'ar' : 'en';
  return `/${safeLocale}${CHAT_ACTION_ROUTES[actionKey]}`;
}

import { z } from 'zod';
import { CHAT_LANGUAGES } from './types';

export const chatLanguageSchema = z.enum(CHAT_LANGUAGES);
export const chatActionKeySchema = z.enum(['membership_application','member_login','events','my_tickets','my_badge','my_invitations','my_notifications','member_profile','sponsors','student_offers','become_sponsor','gallery','news','legal','contact','human_support']);
export const chatActionSchema = z.object({ type: z.enum(['navigate','send_message','open_modal']), actionKey: chatActionKeySchema, payload: z.record(z.string(), z.string().max(200)).optional() }).strict();

const actionButton = z.object({ type:z.literal('action_button'), id:z.string().max(100), label:z.string().max(180), icon:z.string().max(50).optional(), variant:z.enum(['primary','secondary','outline','danger']), animation:z.enum(['none','pulse','shimmer','bounce']).optional(), action:chatActionSchema }).strict();
const eventCard = z.object({ type:z.literal('event_card'), id:z.string().max(64), slug:z.string().max(190), title:z.string().max(240), summary:z.string().max(1000).optional(), location:z.string().max(300), startsAt:z.iso.datetime(), coverPath:z.string().max(6_000_000).optional(), availability:z.string().max(120).optional(), action:chatActionSchema.optional() }).strict();
const ticketCard = z.object({ type:z.literal('ticket_card'), id:z.string().max(64), eventTitle:z.string().max(240), startsAt:z.iso.datetime(), status:z.string().max(80), ticketType:z.string().max(180).optional(), action:chatActionSchema.optional() }).strict();
const invitationCard = z.object({ type:z.literal('invitation_card'), id:z.string().max(64), eventTitle:z.string().max(240), startsAt:z.iso.datetime(), location:z.string().max(300).optional(), status:z.string().max(80) }).strict();
const sponsorCard = z.object({ type:z.literal('sponsor_card'), id:z.string().max(64), name:z.string().max(180), logoPath:z.string().max(6_000_000), level:z.string().max(40), slug:z.string().max(190) }).strict();

export const chatComponentSchema = z.discriminatedUnion('type', [
  actionButton,
  z.object({type:z.literal('quick_actions'),title:z.string().max(180).optional(),actions:z.array(z.object({id:z.string().max(100),label:z.string().max(180),action:chatActionSchema}).strict()).max(8)}).strict(),
  z.object({type:z.literal('info_card'),title:z.string().max(180),body:z.string().max(3000),icon:z.string().max(50).optional(),tone:z.enum(['default','info','success','warning']).optional()}).strict(),
  z.object({type:z.literal('step_list'),title:z.string().max(180),steps:z.array(z.string().max(500)).min(1).max(12)}).strict(),
  z.object({type:z.literal('alert_card'),title:z.string().max(180),message:z.string().max(2000),severity:z.enum(['info','success','warning','error'])}).strict(),
  eventCard,
  z.object({type:z.literal('event_carousel'),title:z.string().max(180),events:z.array(eventCard).max(8)}).strict(),
  ticketCard,
  z.object({type:z.literal('ticket_list'),title:z.string().max(180),tickets:z.array(ticketCard).max(10)}).strict(),
  z.object({type:z.literal('membership_status'),status:z.string().max(80),reference:z.string().max(80).optional(),submittedAt:z.iso.datetime().optional(),steps:z.array(z.object({label:z.string().max(180),complete:z.boolean()}).strict()).max(10)}).strict(),
  z.object({type:z.literal('badge_preview'),title:z.string().max(180),badgeName:z.string().max(120),imagePath:z.string().max(6_000_000).optional(),status:z.string().max(80),action:chatActionSchema.optional()}).strict(),
  invitationCard,
  z.object({type:z.literal('invitation_list'),title:z.string().max(180),invitations:z.array(invitationCard).max(10)}).strict(),
  z.object({type:z.literal('notification_list'),title:z.string().max(180),notifications:z.array(z.object({id:z.string().max(64),title:z.string().max(255),message:z.string().max(2000),createdAt:z.iso.datetime(),unread:z.boolean()}).strict()).max(10)}).strict(),
  sponsorCard,
  z.object({type:z.literal('sponsor_list'),title:z.string().max(180),sponsors:z.array(sponsorCard).max(12)}).strict(),
  z.object({type:z.literal('coupon_card'),id:z.string().max(64),title:z.string().max(180),sponsorName:z.string().max(180),discount:z.string().max(100),expirationDate:z.iso.datetime(),locked:z.boolean(),action:chatActionSchema.optional()}).strict(),
  z.object({type:z.literal('contact_card'),title:z.string().max(180),email:z.email(),socialLabels:z.array(z.string().max(80)).max(8).optional(),action:chatActionSchema.optional()}).strict(),
  z.object({type:z.literal('support_handoff'),title:z.string().max(180),message:z.string().max(1000),requiresAuthentication:z.boolean(),action:chatActionSchema}).strict(),
  z.object({type:z.literal('status_timeline'),title:z.string().max(180),items:z.array(z.object({label:z.string().max(180),date:z.iso.datetime().optional(),status:z.string().max(80)}).strict()).max(12)}).strict(),
  z.object({type:z.literal('empty_state'),title:z.string().max(180),message:z.string().max(1000),action:chatActionSchema.optional()}).strict(),
  z.object({type:z.literal('login_required'),title:z.string().max(180),message:z.string().max(1000),action:chatActionSchema}).strict(),
  z.object({type:z.literal('page_link_card'),title:z.string().max(180),description:z.string().max(1000).optional(),action:chatActionSchema}).strict(),
  z.object({type:z.literal('knowledge_results'),title:z.string().max(180),results:z.array(z.object({id:z.string().max(64),sourceType:z.string().max(60),title:z.string().max(255),snippet:z.string().max(500),action:chatActionSchema.optional()}).strict()).min(1).max(5)}).strict(),
]);

export const chatbotResponseSchema = z.object({
  version:z.literal('1.0'),conversationId:z.string().max(64),messageId:z.string().max(64),intent:z.string().regex(/^[a-z][a-z0-9_]*$/),confidence:z.number().min(0).max(1),language:chatLanguageSchema,message:z.string().min(1).max(10000),components:z.array(chatComponentSchema).max(20),suggestions:z.array(z.object({id:z.string().max(64).optional(),label:z.string().max(160),message:z.string().max(500)}).strict()).max(8).optional(),requiresAuthentication:z.boolean().optional(),handoffAvailable:z.boolean().optional(),metadata:z.object({responseSource:z.enum(['static','database','service']).optional(),processingTimeMs:z.number().int().nonnegative().optional()}).strict().optional(),
}).strict();

export const chatbotMessageInputSchema = z.object({
  conversationId:z.string().trim().max(64).optional(),
  message:z.string().trim().min(1).max(2000),
  language:chatLanguageSchema.optional(),
  history:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(4000)}).strict()).max(12).optional(),
}).strict();
export const chatbotFeedbackInputSchema = z.object({ messageId:z.string().trim().min(1).max(64), rating:z.enum(['HELPFUL','NOT_HELPFUL']), comment:z.string().trim().max(1000).optional() }).strict();
export const chatbotHandoffInputSchema = z.object({ conversationId:z.string().trim().min(1).max(64), category:z.enum(['MEMBERSHIP','TICKETS','ACCOUNT','EVENTS','PARTNERSHIP','OTHER']), reason:z.string().trim().min(10).max(1500) }).strict();

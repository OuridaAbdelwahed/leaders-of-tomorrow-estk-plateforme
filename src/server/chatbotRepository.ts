import type { RowDataPacket } from 'mysql2/promise';
import type { ChatActor, ChatComponentRecord, ChatIntent, ChatLanguage, ChatPattern, ChatRuntimeCatalog, ChatTemplate, ChatbotResponse } from '@/features/chatbot/types';
import { maskSensitiveChatText } from '@/features/chatbot/normalization';
import { execute, queryRows, withTransaction } from './database';
import { reference, safeId, sha256 } from './security';

type DbRow = RowDataPacket & Record<string, unknown>;
export type ChatbotSettings = {
  enabled: boolean; assistantName: string; welcomeMessages: Record<ChatLanguage,string>; maintenanceMessage?: string;
  defaultLanguage: ChatLanguage; supportedLanguages: ChatLanguage[]; maxMessageLength: number; historyLimit: number;
  rateLimitPerMinute: number; guestRateLimitPerHour: number; storeGuestConversations: boolean;
  retentionDays: number; humanHandoffEnabled: boolean; semanticMatchingEnabled: boolean;
};
export type ChatConversationRef = { id: string; persisted: boolean };

declare global {
  var lotChatbotCatalogCache: { value: ChatRuntimeCatalog; expiresAt: number } | undefined;
  var lotChatbotCleanupAt: number | undefined;
}

function json<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}
function iso(value: unknown) { return new Date(String(value)).toISOString(); }
function bool(value: unknown) { return Boolean(Number(value)); }

export async function getChatbotSettings(): Promise<ChatbotSettings> {
  const rows = await queryRows<DbRow>('SELECT * FROM chatbot_settings WHERE id=? LIMIT 1', ['chatbot_default']);
  const row = rows[0];
  if (!row) throw new Error('Chatbot settings are not initialized.');
  const supported = json<ChatLanguage[]>(row.supported_languages, ['ar','fr','en','darija']);
  return {
    enabled: process.env.CHATBOT_ENABLED ? process.env.CHATBOT_ENABLED === 'true' : bool(row.enabled),
    assistantName: String(row.assistant_name),
    welcomeMessages: { ar:String(row.welcome_message_ar), fr:String(row.welcome_message_fr), en:String(row.welcome_message_en), darija:String(row.welcome_message_darija) },
    maintenanceMessage: row.maintenance_message ? String(row.maintenance_message) : undefined,
    defaultLanguage: (process.env.CHATBOT_DEFAULT_LANGUAGE || row.default_language) as ChatLanguage,
    supportedLanguages: process.env.CHATBOT_SUPPORTED_LANGUAGES ? process.env.CHATBOT_SUPPORTED_LANGUAGES.split(',').filter(item => ['ar','fr','en','darija'].includes(item)) as ChatLanguage[] : supported,
    maxMessageLength: Number(process.env.CHATBOT_MAX_MESSAGE_LENGTH || row.max_message_length),
    historyLimit: Number(process.env.CHATBOT_HISTORY_LIMIT || row.history_limit),
    rateLimitPerMinute: Number(process.env.CHATBOT_RATE_LIMIT_PER_MINUTE || row.rate_limit_per_minute),
    guestRateLimitPerHour: Number(process.env.CHATBOT_GUEST_RATE_LIMIT_PER_HOUR || row.guest_rate_limit_per_hour),
    storeGuestConversations: process.env.CHATBOT_STORE_GUEST_CONVERSATIONS ? process.env.CHATBOT_STORE_GUEST_CONVERSATIONS === 'true' : bool(row.store_guest_conversations),
    retentionDays: Number(process.env.CHATBOT_RETENTION_DAYS || row.retention_days),
    humanHandoffEnabled: process.env.CHATBOT_HUMAN_HANDOFF_ENABLED ? process.env.CHATBOT_HUMAN_HANDOFF_ENABLED === 'true' : bool(row.human_handoff_enabled),
    semanticMatchingEnabled: process.env.CHATBOT_SEMANTIC_MATCHING_ENABLED === 'true' && bool(row.semantic_matching_enabled),
  };
}

export async function loadChatbotCatalog(force = false): Promise<ChatRuntimeCatalog> {
  if (!force && globalThis.lotChatbotCatalogCache && globalThis.lotChatbotCatalogCache.expiresAt > Date.now()) return globalThis.lotChatbotCatalogCache.value;
  const [intentRows,patternRows,keywordRows,synonymRows,responseRows,componentRows,suggestionRows] = await Promise.all([
    queryRows<DbRow>('SELECT * FROM chatbot_intents WHERE organization_id=? AND active=1 ORDER BY priority DESC,intent_key', ['leaders_of_tomorrow']),
    queryRows<DbRow>('SELECT * FROM chatbot_patterns WHERE active=1'), queryRows<DbRow>('SELECT * FROM chatbot_keywords WHERE active=1'),
    queryRows<DbRow>('SELECT * FROM chatbot_synonyms WHERE organization_id=? AND active=1', ['leaders_of_tomorrow']),
    queryRows<DbRow>('SELECT * FROM chatbot_responses WHERE active=1 AND (valid_from IS NULL OR valid_from<=UTC_TIMESTAMP(3)) AND (valid_until IS NULL OR valid_until>=UTC_TIMESTAMP(3)) ORDER BY version DESC'),
    queryRows<DbRow>('SELECT * FROM chatbot_components WHERE active=1 ORDER BY display_order,id'),
    queryRows<DbRow>('SELECT * FROM chatbot_suggestions WHERE active=1 ORDER BY display_order,id'),
  ]);
  const value: ChatRuntimeCatalog = {
    intents:intentRows.map(row => ({ id:String(row.id),intentKey:String(row.intent_key),category:String(row.category),description:String(row.description),handlerType:String(row.handler_type) as ChatIntent['handlerType'],handlerKey:row.handler_key?String(row.handler_key):undefined,requiresAuthentication:bool(row.requires_authentication),allowedRoles:json(row.allowed_roles,['guest','member']),minimumConfidence:Number(row.minimum_confidence),priority:Number(row.priority),notes:row.notes?String(row.notes):undefined,active:bool(row.active) })),
    patterns:patternRows.map(row => ({id:String(row.id),intentId:String(row.intent_id),language:String(row.language) as ChatLanguage,pattern:String(row.pattern),normalizedPattern:String(row.normalized_pattern),patternType:String(row.pattern_type) as ChatPattern['patternType'],weight:Number(row.weight),active:bool(row.active)})),
    keywords:keywordRows.map(row => ({id:String(row.id),intentId:String(row.intent_id),language:String(row.language) as ChatLanguage,keyword:String(row.keyword),normalizedKeyword:String(row.normalized_keyword),weight:Number(row.weight),required:bool(row.required),negative:bool(row.negative),active:bool(row.active)})),
    synonyms:synonymRows.map(row => ({id:String(row.id),language:String(row.language) as ChatLanguage,term:String(row.term),normalizedTerm:String(row.normalized_term),synonym:String(row.synonym),normalizedSynonym:String(row.normalized_synonym),active:bool(row.active)})),
    responses:responseRows.map(row => ({id:String(row.id),intentId:String(row.intent_id),language:String(row.language) as ChatLanguage,message:String(row.message),responseSource:String(row.response_source) as ChatTemplate['responseSource'],version:Number(row.version),active:bool(row.active)})),
    components:componentRows.map(row => ({id:String(row.id),intentId:String(row.intent_id),language:row.language?String(row.language) as ChatLanguage:undefined,componentType:String(row.component_type),componentConfig:json(row.component_config,{}),displayOrder:Number(row.display_order),active:bool(row.active)} as ChatComponentRecord)),
    suggestions:suggestionRows.map(row => ({id:String(row.id),intentId:String(row.intent_id),language:String(row.language) as ChatLanguage,label:String(row.label),message:String(row.message),displayOrder:Number(row.display_order)})),
  };
  globalThis.lotChatbotCatalogCache = { value, expiresAt: Date.now() + 60_000 };
  return value;
}

export function invalidateChatbotCatalog() { globalThis.lotChatbotCatalogCache = undefined; }

function actorOwns(row: DbRow, actor: ChatActor) {
  if (actor.memberId) return String(row.member_id || '') === actor.memberId;
  if (actor.adminIdentity) return String(row.admin_identity || '') === actor.adminIdentity;
  return Boolean(actor.guestSessionHash && String(row.guest_session_hash || '') === actor.guestSessionHash);
}

async function opportunisticCleanup(retentionDays: number) {
  if ((globalThis.lotChatbotCleanupAt || 0) > Date.now() - 86_400_000) return;
  globalThis.lotChatbotCleanupAt = Date.now();
  await execute('DELETE FROM chatbot_conversations WHERE last_message_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ? DAY) LIMIT 500', [Math.max(1,retentionDays)]).catch(() => undefined);
}

export async function openChatConversation(input:{id?:string;actor:ChatActor;language:ChatLanguage;settings:ChatbotSettings}):Promise<ChatConversationRef> {
  await opportunisticCleanup(input.settings.retentionDays);
  if (input.id) {
    if (input.id.startsWith('ephemeral_') && !input.settings.storeGuestConversations && input.actor.role === 'guest') return {id:input.id,persisted:false};
    const rows=await queryRows<DbRow>('SELECT * FROM chatbot_conversations WHERE id=? AND status IN (\'OPEN\',\'HANDOFF\') LIMIT 1',[input.id]);
    if (!rows[0] || !actorOwns(rows[0],input.actor)) throw new Error('Conversation expired or unavailable.');
    return {id:input.id,persisted:true};
  }
  if (input.actor.role==='guest'&&!input.settings.storeGuestConversations) return {id:safeId('ephemeral'),persisted:false};
  const id=safeId('chat');
  await execute('INSERT INTO chatbot_conversations (id,member_id,admin_identity,guest_session_hash,language) VALUES (?,?,?,?,?)',[id,input.actor.memberId??null,input.actor.adminIdentity??null,input.actor.guestSessionHash??null,input.language]);
  return {id,persisted:true};
}

export async function addChatUserMessage(conversation:ChatConversationRef,content:string,normalized:string) {
  const id=safeId('cmsg'); if(!conversation.persisted)return id;
  const safe=maskSensitiveChatText(content);
  await execute('INSERT INTO chatbot_messages (id,conversation_id,role,original_content,normalized_content,sensitive_masked) VALUES (?,?,?,?,?,?)',[id,conversation.id,'USER',safe.text,normalized,safe.masked?1:0]);
  await execute('UPDATE chatbot_conversations SET last_message_at=UTC_TIMESTAMP(3) WHERE id=?',[conversation.id]); return id;
}

export async function addChatAssistantMessage(conversation:ChatConversationRef,response:ChatbotResponse,handlerError?:string) {
  if(!conversation.persisted)return;
  await execute('INSERT INTO chatbot_messages (id,conversation_id,role,original_content,intent_key,confidence,response_payload,processing_time_ms,handler_error) VALUES (?,?,?,?,?,?,?,?,?)',[response.messageId,conversation.id,'ASSISTANT',response.message,response.intent,response.confidence,JSON.stringify(response),response.metadata?.processingTimeMs??null,handlerError?.slice(0,500)??null]);
  await execute('UPDATE chatbot_conversations SET language=?,last_message_at=UTC_TIMESTAMP(3) WHERE id=?',[response.language,conversation.id]);
}

export async function recordUnansweredQuestion(input:{conversation:ChatConversationRef;messageId:string;original:string;normalized:string;language:ChatLanguage;proposedIntent?:string;confidence?:number}) {
  if(!input.conversation.persisted)return;
  const hash=sha256(input.normalized);
  await execute(`INSERT INTO chatbot_unanswered_questions (id,conversation_id,message_id,original_question,normalized_question,question_hash,detected_language,proposed_intent,confidence)
    VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE occurrence_count=occurrence_count+1,last_seen_at=UTC_TIMESTAMP(3),proposed_intent=VALUES(proposed_intent),confidence=VALUES(confidence)`,
    [safeId('cuq'),input.conversation.id,input.messageId,input.original,input.normalized,hash,input.language,input.proposedIntent??null,input.confidence??null]);
}

export async function getConversationHistory(id:string,actor:ChatActor,limit:number) {
  const conversations=await queryRows<DbRow>('SELECT * FROM chatbot_conversations WHERE id=? LIMIT 1',[id]);
  if(!conversations[0]||!actorOwns(conversations[0],actor))throw new Error('Conversation not found.');
  const rows=await queryRows<DbRow>('SELECT id,role,original_content,response_payload,created_at FROM chatbot_messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT ?',[id,Math.min(100,limit)]);
  return rows.reverse().map(row=>({id:String(row.id),role:String(row.role),message:String(row.original_content),response:row.response_payload?json(row.response_payload,undefined):undefined,createdAt:iso(row.created_at)}));
}

export async function deleteConversationHistory(id:string,actor:ChatActor) {
  if(id.startsWith('ephemeral_')&&actor.role==='guest')return {deleted:true};
  const rows=await queryRows<DbRow>('SELECT * FROM chatbot_conversations WHERE id=? LIMIT 1',[id]);
  if(!rows[0]||!actorOwns(rows[0],actor))throw new Error('Conversation not found.');
  await execute('DELETE FROM chatbot_conversations WHERE id=?',[id]);
  return {deleted:true};
}

export async function saveChatFeedback(input:{messageId:string;rating:'HELPFUL'|'NOT_HELPFUL';comment?:string;actor:ChatActor}) {
  const rows=await queryRows<DbRow>('SELECT m.id,c.* FROM chatbot_messages m JOIN chatbot_conversations c ON c.id=m.conversation_id WHERE m.id=? AND m.role=\'ASSISTANT\' LIMIT 1',[input.messageId]);
  if(!rows[0]||!actorOwns(rows[0],input.actor))throw new Error('Message not found.');
  await execute(`INSERT INTO chatbot_feedback (id,message_id,member_id,guest_session_hash,rating,comment) VALUES (?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE rating=VALUES(rating),comment=VALUES(comment)`,[safeId('cfb'),input.messageId,input.actor.memberId??null,input.actor.guestSessionHash??null,input.rating,input.comment??null]);
  return {saved:true};
}

export async function createChatHandoff(input:{conversationId:string;category:string;reason:string;actor:ChatActor}) {
  if(!input.actor.memberId)throw new Error('Member sign-in is required for administrator support.');
  const conversations=await queryRows<DbRow>('SELECT * FROM chatbot_conversations WHERE id=? LIMIT 1',[input.conversationId]);
  if(!conversations[0]||!actorOwns(conversations[0],input.actor))throw new Error('Conversation not found.');
  const messages=await queryRows<DbRow>('SELECT role,original_content FROM chatbot_messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 6',[input.conversationId]);
  const summary=messages.reverse().map(row=>`${String(row.role).toLowerCase()}: ${String(row.original_content).slice(0,300)}`).join('\n').slice(0,3000);
  const id=safeId('chf');const handoffReference=reference().replace('LOT-','LOT-HELP-');
  await withTransaction(async connection=>{await execute('INSERT INTO chatbot_handoffs (id,reference,conversation_id,member_id,category,reason,summary) VALUES (?,?,?,?,?,?,?)',[id,handoffReference,input.conversationId,input.actor.memberId,input.category,input.reason,summary],connection);await execute("UPDATE chatbot_conversations SET status='HANDOFF' WHERE id=?",[input.conversationId],connection);await execute('INSERT INTO notifications (id,member_id,type,title,message) VALUES (?,?,?,?,?)',[safeId('ntf'),input.actor.memberId,'CHATBOT_HANDOFF','Support request created',`Your support request ${handoffReference} has been created.`],connection);});
  return {id,reference:handoffReference,status:'OPEN'};
}

import { NextResponse } from 'next/server';
import { getChatbotSettings } from '@/server/chatbotRepository';

export async function GET(){try{const settings=await getChatbotSettings();return NextResponse.json({enabled:settings.enabled,assistantName:settings.assistantName,welcomeMessages:settings.welcomeMessages,defaultLanguage:settings.defaultLanguage,supportedLanguages:settings.supportedLanguages,maxMessageLength:settings.maxMessageLength,humanHandoffEnabled:settings.humanHandoffEnabled},{headers:{'cache-control':'private, no-store'}});}catch{return NextResponse.json({enabled:false,error:'Assistant configuration is unavailable.'},{status:503});}}

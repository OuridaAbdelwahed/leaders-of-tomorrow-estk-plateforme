import { NextResponse } from 'next/server';
import { resolveChatActor } from '@/server/chatbotAuth';
import { deleteConversationHistory, getChatbotSettings, getConversationHistory } from '@/server/chatbotRepository';
import { validateMutationRequest } from '@/server/requestSecurity';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const {actor}=await resolveChatActor();const settings=await getChatbotSettings();return NextResponse.json({items:await getConversationHistory(id,actor,settings.historyLimit)});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Conversation not found.'},{status:404});}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});try{const {id}=await params;const {actor}=await resolveChatActor();return NextResponse.json(await deleteConversationHistory(id,actor));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Conversation not found.'},{status:404});}}

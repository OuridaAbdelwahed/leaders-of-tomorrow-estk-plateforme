import { NextResponse } from 'next/server';
import { chatbotHandoffInputSchema } from '@/features/chatbot/schema';
import { resolveChatActor } from '@/server/chatbotAuth';
import { createChatHandoff } from '@/server/chatbotRepository';
import { validateMutationRequest } from '@/server/requestSecurity';
export async function POST(request:Request){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});try{const input=chatbotHandoffInputSchema.parse(await request.json());const {actor}=await resolveChatActor();return NextResponse.json(await createChatHandoff({...input,actor}),{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to create support request.'},{status:400});}}

import { NextResponse } from 'next/server';
import { chatbotFeedbackInputSchema } from '@/features/chatbot/schema';
import { resolveChatActor } from '@/server/chatbotAuth';
import { saveChatFeedback } from '@/server/chatbotRepository';
import { validateMutationRequest } from '@/server/requestSecurity';
export async function POST(request:Request){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});try{const input=chatbotFeedbackInputSchema.parse(await request.json());const {actor}=await resolveChatActor();return NextResponse.json(await saveChatFeedback({...input,actor}));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to save feedback.'},{status:400});}}

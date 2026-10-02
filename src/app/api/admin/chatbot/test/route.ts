import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chatLanguageSchema } from '@/features/chatbot/schema';
import { getAdminSession } from '@/server/adminAuth';
import { debugChatMatch } from '@/server/chatbotService';
import { validateMutationRequest } from '@/server/requestSecurity';
const schema=z.object({message:z.string().trim().min(1).max(2000),language:chatLanguageSchema.optional(),role:z.enum(['guest','member','admin','super_admin']).default('guest')}).strict();
export async function POST(request:Request){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const admin=await getAdminSession();if(!admin?.superAdmin)return NextResponse.json({error:'Super administrator access required.'},{status:403});try{return NextResponse.json(await debugChatMatch(schema.parse(await request.json())));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Test failed.'},{status:400});}}

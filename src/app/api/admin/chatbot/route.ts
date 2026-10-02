import { NextResponse } from 'next/server';
import { getAdminSession } from '@/server/adminAuth';
import { getChatbotAdminOverview, updateChatbotSettings } from '@/server/chatbotAdminRepository';
import { validateMutationRequest } from '@/server/requestSecurity';
const auth=async()=>{const admin=await getAdminSession();return admin?.superAdmin?admin:undefined;};
export async function GET(){const admin=await auth();if(!admin)return NextResponse.json({error:'Super administrator access required.'},{status:403});return NextResponse.json(await getChatbotAdminOverview());}
export async function PATCH(request:Request){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const admin=await auth();if(!admin)return NextResponse.json({error:'Super administrator access required.'},{status:403});try{return NextResponse.json(await updateChatbotSettings(await request.json(),admin.email));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to update settings.'},{status:400});}}

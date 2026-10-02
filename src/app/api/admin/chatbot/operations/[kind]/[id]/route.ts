import { NextResponse } from 'next/server';
import { getAdminSession } from '@/server/adminAuth';
import { updateChatbotOperation } from '@/server/chatbotAdminRepository';
import { validateMutationRequest } from '@/server/requestSecurity';
export async function PATCH(request:Request,{params}:{params:Promise<{kind:string;id:string}>}){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const admin=await getAdminSession();if(!admin?.superAdmin)return NextResponse.json({error:'Super administrator access required.'},{status:403});const {kind,id}=await params;if(kind!=='unanswered'&&kind!=='handoffs')return NextResponse.json({error:'Unsupported operation.'},{status:404});try{return NextResponse.json(await updateChatbotOperation(kind,id,await request.json(),admin.email));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to update item.'},{status:400});}}

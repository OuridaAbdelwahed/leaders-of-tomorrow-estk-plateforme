import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/server/adminAuth';
import { deleteKnowledgeSource, setKnowledgeSourceActive } from '@/server/chatbotKnowledgeRepository';
import { validateMutationRequest } from '@/server/requestSecurity';

const updateSchema=z.object({active:z.boolean()}).strict();
async function authorize(){const admin=await getAdminSession();return admin?.superAdmin?admin:undefined;}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const admin=await authorize();if(!admin)return NextResponse.json({error:'Super administrator access required.'},{status:403});try{const {id}=await params;const input=updateSchema.parse(await request.json());return NextResponse.json(await setKnowledgeSourceActive(id,input.active,admin.email));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to update knowledge source.'},{status:400});}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const admin=await authorize();if(!admin)return NextResponse.json({error:'Super administrator access required.'},{status:403});try{const {id}=await params;return NextResponse.json(await deleteKnowledgeSource(id));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to delete knowledge source.'},{status:400});}}


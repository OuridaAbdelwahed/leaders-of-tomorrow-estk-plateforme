import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chatLanguageSchema } from '@/features/chatbot/schema';
import { getAdminSession } from '@/server/adminAuth';
import { deidentifyConversation, extractKnowledgeFile, KNOWLEDGE_FILE_TYPES } from '@/server/chatbotDocumentExtractor';
import { createImportedKnowledge, KNOWLEDGE_SOURCE_TYPES, listKnowledgeSources, syncPlatformKnowledge } from '@/server/chatbotKnowledgeRepository';
import { checkRateLimit, requestRateLimitKey } from '@/server/rateLimit';
import { validateMutationRequest } from '@/server/requestSecurity';

export const runtime='nodejs';
export const maxDuration=300;
const rawSchema=z.object({sourceType:z.enum(['RAW_TEXT','CONVERSATION']),title:z.string().trim().min(3).max(255),language:chatLanguageSchema,text:z.string().trim().min(20).max(2_000_000),active:z.boolean().default(false)}).strict();

async function auth(){const admin=await getAdminSession();return admin?.superAdmin?admin:undefined;}
function limited(request:Request){return checkRateLimit(requestRateLimitKey(request,'chatbot-knowledge-admin'),20,60_000);}

export async function GET(){const admin=await auth();if(!admin)return NextResponse.json({error:'Super administrator access required.'},{status:403});return NextResponse.json(await listKnowledgeSources());}

export async function POST(request:Request){
  const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});
  const admin=await auth();if(!admin)return NextResponse.json({error:'Super administrator access required.'},{status:403});
  const rate=limited(request);if(!rate.allowed)return NextResponse.json({error:'Too many training operations. Please wait before retrying.'},{status:429,headers:{'Retry-After':String(rate.retryAfter)}});
  try{
    const contentType=request.headers.get('content-type')||'';
    if(contentType.includes('application/json')){
      const body=await request.json() as Record<string,unknown>;
      if(body.action==='SYNC_PLATFORM')return NextResponse.json(await syncPlatformKnowledge(admin.email));
      const input=rawSchema.parse(body);const text=input.sourceType==='CONVERSATION'?deidentifyConversation(input.text):input.text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      return NextResponse.json(await createImportedKnowledge({sourceType:input.sourceType,title:input.title,language:input.language,text,active:input.active,createdBy:admin.email,originLabel:'Admin text entry',extractionMethod:input.sourceType==='CONVERSATION'?'CONVERSATION_TEXT':'RAW_TEXT'}),{status:201});
    }
    const form=await request.formData();const sourceType=String(form.get('sourceType')||'');const language=chatLanguageSchema.parse(form.get('language'));const title=String(form.get('title')||'').trim();const active=String(form.get('active'))==='true';const file=form.get('file');
    if(!KNOWLEDGE_FILE_TYPES.includes(sourceType as never)||!KNOWLEDGE_SOURCE_TYPES.includes(sourceType as never))throw new Error('Unsupported training source type.');
    if(title.length<3||title.length>255)throw new Error('Title must contain between 3 and 255 characters.');if(!(file instanceof File))throw new Error('A document or export file is required.');
    const extracted=await extractKnowledgeFile(file,sourceType as typeof KNOWLEDGE_FILE_TYPES[number],language);
    const result=await createImportedKnowledge({sourceType:sourceType as typeof KNOWLEDGE_SOURCE_TYPES[number],title,language,text:extracted.text,active,createdBy:admin.email,originLabel:'Administrator upload',originalFilename:file.name,mimeType:extracted.mimeType,byteSize:extracted.byteSize,checksum:extracted.checksum,extractionMethod:extracted.method,metadata:{warnings:extracted.warnings,deidentified:extracted.method==='CONVERSATION_EXPORT'}});
    return NextResponse.json({...result,warnings:extracted.warnings},{status:201});
  }catch(error){const message=error instanceof z.ZodError?error.issues[0]?.message:error instanceof Error?error.message:'Unable to train this source.';return NextResponse.json({error:message},{status:400});}
}


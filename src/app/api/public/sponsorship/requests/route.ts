import { NextResponse } from 'next/server';
import { validateMutationRequest } from '@/server/requestSecurity';
import { checkRateLimit, requestRateLimitKey } from '@/server/rateLimit';
import { submitPartnershipRequest } from '@/server/sponsorshipRepository';
import { recordPolicyAcceptances } from '@/server/legalAcceptanceRepository';

export async function POST(request: Request) {
  try { const trust=validateMutationRequest(request); if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403}); const rate=checkRateLimit(requestRateLimitKey(request,'partnership-request'),3,60*60_000); if(!rate.allowed)return NextResponse.json({error:'Too many requests. Please try again later.'},{status:429,headers:{'Retry-After':String(rate.retryAfter)}}); const body=await request.json();const result=await submitPartnershipRequest(body);await recordPolicyAcceptances({subjectType:'partnership_request',subjectId:result.id,policySlugs:['sponsorship-partnership','privacy','copyright'],locale:body.locale==='ar'?'ar':'en',request});return NextResponse.json(result,{status:201}); }
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to submit request.'},{status:400});}
}

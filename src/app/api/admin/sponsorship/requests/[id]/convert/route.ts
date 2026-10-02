import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { validateMutationRequest } from '@/server/requestSecurity';
import { convertPartnershipRequest } from '@/server/sponsorshipRepository';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const auth=await requireAdminPermission('sponsorship.manage');if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});try{const {id}=await params;return NextResponse.json(await convertPartnershipRequest(id,auth.admin.email));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to convert request.'},{status:400});}}

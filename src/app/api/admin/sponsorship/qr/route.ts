import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { validateMutationRequest } from '@/server/requestSecurity';
import { generateSponsorQr } from '@/server/sponsorshipRepository';
export async function POST(request:Request){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const auth=await requireAdminPermission('sponsorship.manage');if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});try{return NextResponse.json(await generateSponsorQr(await request.json(),auth.admin.email),{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to generate QR code.'},{status:400});}}

import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { validateMutationRequest } from '@/server/requestSecurity';
import { getSponsorshipSettings,updateSponsorshipSettings } from '@/server/sponsorshipRepository';
export async function GET(){const auth=await requireAdminPermission('sponsorship.view');if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});return NextResponse.json(await getSponsorshipSettings());}
export async function PATCH(request:Request){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const auth=await requireAdminPermission('sponsorship.manage');if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});try{return NextResponse.json(await updateSponsorshipSettings(await request.json(),auth.admin.id,auth.admin.email));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to update settings.'},{status:400});}}

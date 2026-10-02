import { NextResponse } from 'next/server';
import type { AdminPermission } from '@/lib/types';
import { requireAdminPermission } from '@/server/adminAuth';
import { validateMutationRequest } from '@/server/requestSecurity';
import { sponsorshipErrorMessage } from '@/features/sponsorship/schemas';
import { createCampaign,createCoupon,createInvoice,createSponsor } from '@/server/sponsorshipRepository';
const permission=(resource:string):AdminPermission=>resource==='invoices'?'sponsorship.finance':'sponsorship.manage';
export async function POST(request:Request,{params}:{params:Promise<{resource:string}>}){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const {resource}=await params;const auth=await requireAdminPermission(permission(resource));if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});try{const body=await request.json();const actor=auth.admin.email;const result=resource==='sponsors'?await createSponsor(body,actor):resource==='campaigns'?await createCampaign(body,actor):resource==='coupons'?await createCoupon(body,actor):resource==='invoices'?await createInvoice(body,actor):undefined;if(!result)return NextResponse.json({error:'Unsupported sponsorship resource.'},{status:404});return NextResponse.json(result,{status:201});}catch(error){return NextResponse.json({error:sponsorshipErrorMessage(error,'Unable to create resource.')},{status:400});}}

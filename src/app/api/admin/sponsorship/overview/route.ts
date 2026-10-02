import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { getSponsorshipOverview } from '@/server/sponsorshipRepository';
export async function GET(request:Request){const auth=await requireAdminPermission('sponsorship.view');if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});try{const url=new URL(request.url);return NextResponse.json(await getSponsorshipOverview(url.searchParams.get('from')||undefined,url.searchParams.get('to')||undefined),{headers:{'Cache-Control':'private, no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load sponsorship dashboard.'},{status:500});}}

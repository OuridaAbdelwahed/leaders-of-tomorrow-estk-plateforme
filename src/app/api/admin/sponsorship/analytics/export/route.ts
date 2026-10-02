import { NextResponse } from 'next/server';
import { requireAdminPermission } from '@/server/adminAuth';
import { getSponsorshipOverview,sponsorshipAnalyticsCsv } from '@/server/sponsorshipRepository';
export async function GET(request:Request){const auth=await requireAdminPermission('sponsorship.view');if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});const url=new URL(request.url);const csv=sponsorshipAnalyticsCsv(await getSponsorshipOverview(url.searchParams.get('from')||undefined,url.searchParams.get('to')||undefined));return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="sponsorship-analytics-${new Date().toISOString().slice(0,10)}.csv"`}});}

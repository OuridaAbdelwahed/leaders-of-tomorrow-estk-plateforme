import { NextResponse } from 'next/server';
import { resolveQrScan } from '@/server/sponsorshipRepository';
import { checkRateLimit, requestRateLimitKey } from '@/server/rateLimit';
export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){const rate=checkRateLimit(requestRateLimitKey(request,'qr-scan'),30,60_000);if(!rate.allowed)return NextResponse.json({error:'Too many scans.'},{status:429});const {token}=await params;const destination=await resolveQrScan(token,request);return destination?NextResponse.redirect(destination,302):NextResponse.json({error:'QR code not found.'},{status:404});}

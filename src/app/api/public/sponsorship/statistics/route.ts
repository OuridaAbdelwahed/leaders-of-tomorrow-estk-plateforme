import { NextResponse } from 'next/server';
import { getSponsorshipAudienceStats } from '@/server/sponsorshipRepository';
export async function GET(){try{return NextResponse.json(await getSponsorshipAudienceStats(),{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=900'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load statistics.'},{status:500});}}

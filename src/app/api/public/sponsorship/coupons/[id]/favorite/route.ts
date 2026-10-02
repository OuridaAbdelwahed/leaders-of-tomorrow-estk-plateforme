import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSession } from '@/server/security';
import { validateMutationRequest } from '@/server/requestSecurity';
import { toggleCouponFavorite } from '@/server/sponsorshipRepository';
import { ensureStoreReady, store } from '@/server/store';
import { hasCurrentMembership } from '@/features/membership/access';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const trust=validateMutationRequest(request);if(!trust.ok)return NextResponse.json({error:trust.reason},{status:403});const session=readSession((await cookies()).get('lot_member_session')?.value);if(session?.role!=='member')return NextResponse.json({error:'Member sign-in required.'},{status:401});await ensureStoreReady();const member=store.members.find(item=>item.id===session.sub);if(!member||!hasCurrentMembership(member))return NextResponse.json({error:'Your membership period is not active.',code:'MEMBERSHIP_INACTIVE'},{status:403});try{const {id}=await params;const body=await request.json();return NextResponse.json(await toggleCouponFavorite(id,session.sub,Boolean(body.favorite)));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to update favorite.'},{status:400});}}

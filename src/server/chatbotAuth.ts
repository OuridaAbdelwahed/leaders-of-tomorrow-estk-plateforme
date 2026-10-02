import { cookies } from 'next/headers';
import type { ChatActor } from '@/features/chatbot/types';
import { getAdminSession } from './adminAuth';
import { createToken, readSession, sha256 } from './security';
import { ensureStoreReady, store } from './store';
import { hasCurrentMembership } from '@/features/membership/access';

export async function resolveChatActor():Promise<{actor:ChatActor;guestToken?:string}>{
  const jar=await cookies();const session=readSession(jar.get('lot_member_session')?.value);await ensureStoreReady();
  if(session?.role==='member'){const member=store.members.find(item=>item.id===session.sub&&hasCurrentMembership(item));if(member)return {actor:{role:'member',memberId:member.id,memberEmail:member.email}};}
  const admin=await getAdminSession();if(admin)return {actor:{role:admin.superAdmin?'super_admin':'admin',adminIdentity:admin.email}};
  const existing=jar.get('lot_chat_guest')?.value;const guestToken=existing||createToken();return {actor:{role:'guest',guestSessionHash:sha256(guestToken)},guestToken:existing?undefined:guestToken};
}

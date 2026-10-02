import { createHash } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { execute } from './database';

const VERSION='1.0';

function requestIpHash(request:Request){const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();const ip=forwarded||request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip');return ip?createHash('sha256').update(`${process.env.IP_HASH_SALT||'leaders-of-tomorrow'}:${ip}`).digest('hex'):null;}

export async function recordPolicyAcceptances(input:{subjectType:'membership_application'|'event_registration'|'partnership_request';subjectId:string;policySlugs:string[];locale:string;request:Request;connection?:PoolConnection}){
  const ipHash=requestIpHash(input.request);for(const slug of input.policySlugs)await execute('INSERT INTO legal_policy_acceptances (subject_type,subject_id,policy_slug,policy_version,locale,ip_hash) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE locale=VALUES(locale),ip_hash=VALUES(ip_hash),accepted_at=CURRENT_TIMESTAMP(3)',[input.subjectType,input.subjectId,slug,VERSION,input.locale==='ar'?'ar':'en',ipHash],input.connection);
}

import { describe, expect, it } from 'vitest';
import { CompositeIntentMatcher } from './matcher';
import type { ChatIntent, ChatRuntimeCatalog } from './types';

const intent=(id:string,minimumConfidence=.5,priority=0):ChatIntent=>({id,intentKey:id,category:'test',description:'',handlerType:'STATIC',handlerKey:'static',requiresAuthentication:false,allowedRoles:['guest','member'],minimumConfidence,priority,active:true});
const catalog:ChatRuntimeCatalog={intents:[intent('join',.5,20),intent('events'),intent('leave')],patterns:[
  {id:'p1',intentId:'join',language:'en',pattern:'how can i join',normalizedPattern:'how can i join',patternType:'EXACT',weight:1,active:true},
  {id:'p2',intentId:'events',language:'en',pattern:'upcoming events',normalizedPattern:'upcoming events',patternType:'EXACT',weight:1,active:true},
  {id:'p3',intentId:'leave',language:'en',pattern:'leave the club',normalizedPattern:'leave the club',patternType:'SAMPLE',weight:1,active:true},
],keywords:[
  {id:'k1',intentId:'join',language:'en',keyword:'join',normalizedKeyword:'join',weight:1,required:false,negative:false,active:true},
  {id:'k2',intentId:'join',language:'en',keyword:'leave',normalizedKeyword:'leave',weight:3,required:false,negative:true,active:true},
],synonyms:[{id:'s1',language:'en',term:'enroll',normalizedTerm:'enroll',synonym:'join',normalizedSynonym:'join',active:true}],responses:[],components:[],suggestions:[]};

describe('deterministic intent matcher',()=>{
  const matcher=new CompositeIntentMatcher();
  it('prefers an exact approved phrase',async()=>expect((await matcher.match({message:'How can I join?',language:'en',role:'guest',catalog})).selected?.intent.intentKey).toBe('join'));
  it('uses fuzzy similarity for small typing mistakes',async()=>expect((await matcher.match({message:'upcoming event',language:'en',role:'guest',catalog})).candidates[0].intent.intentKey).toBe('events'));
  it('expands database synonyms',async()=>expect((await matcher.match({message:'enroll',language:'en',role:'guest',catalog})).normalized).toContain('join'));
  it('applies negative keyword penalties',async()=>{const result=await matcher.match({message:'leave the club',language:'en',role:'guest',catalog});expect(result.candidates.find(item=>item.intent.intentKey==='join')?.breakdown.negative).toBeLessThan(0);});
  it('returns no selected intent below its threshold',async()=>expect((await matcher.match({message:'weather tomorrow',language:'en',role:'guest',catalog})).selected).toBeUndefined());
});

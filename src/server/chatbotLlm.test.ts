import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatIntent } from '@/features/chatbot/types';
import { generateGroundedChatAnswer, routeChatIntentWithLlm } from './chatbotLlm';

const actor={role:'guest' as const,guestSessionHash:'stable-guest'};
const intent:ChatIntent={id:'intent-events',intentKey:'events_upcoming',category:'events',description:'Show live upcoming events',handlerType:'DATABASE',handlerKey:'events_upcoming',requiresAuthentication:false,allowedRoles:['guest','member'],minimumConfidence:.5,priority:100,active:true};

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

describe('chatbot LLM orchestration',()=>{
  it('stays disabled when no server API key is configured',async()=>{
    vi.stubEnv('OPENAI_API_KEY','');
    await expect(generateGroundedChatAnswer({question:'Hello',language:'en',actor,intentKey:'unknown',knowledge:[]})).resolves.toBeUndefined();
  });

  it('uses structured routing to select a live platform handler',async()=>{
    vi.stubEnv('OPENAI_API_KEY','test-key');
    const fetchMock=vi.fn(async(_url:string,init?:RequestInit)=>{
      const body=JSON.parse(String(init?.body));
      expect(body.store).toBe(false);
      expect(body.text.format.type).toBe('json_schema');
      return {ok:true,status:200,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({mode:'intent',intentKey:'events_upcoming',confidence:.94})}]}]})} as Response;
    });
    vi.stubGlobal('fetch',fetchMock);
    const result=await routeChatIntentWithLlm({question:'What is happening this weekend?',language:'en',actor,intents:[intent]});
    expect(result).toEqual({mode:'intent',intentKey:'events_upcoming',confidence:.94});
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('generates a natural answer from verified data while keeping storage disabled',async()=>{
    vi.stubEnv('OPENAI_API_KEY','test-key');
    vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
      const body=JSON.parse(String(init?.body));
      expect(body.store).toBe(false);
      expect(JSON.stringify(body)).toContain('Verified handler answer');
      return {ok:true,status:200,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'Two published workshops are coming up this month.'}]}]})} as Response;
    }));
    const result=await generateGroundedChatAnswer({question:'Anything coming up?',language:'en',actor,intentKey:'events_upcoming',verifiedAnswer:'I found 2 published events.',verifiedComponents:'[{"type":"event_carousel"}]',knowledge:[]});
    expect(result?.answer).toBe('Two published workshops are coming up this month.');
  });
});

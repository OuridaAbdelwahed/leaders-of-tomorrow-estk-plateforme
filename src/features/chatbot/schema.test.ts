import { describe, expect, it } from 'vitest';
import { chatComponentSchema, chatbotResponseSchema } from './schema';

describe('chatbot response security', () => {
  it('accepts allowlisted actions', () => expect(chatComponentSchema.safeParse({type:'action_button',id:'join',label:'Join',variant:'primary',action:{type:'navigate',actionKey:'membership_application'}}).success).toBe(true));
  it('rejects arbitrary routes and unknown component fields', () => expect(chatComponentSchema.safeParse({type:'action_button',id:'bad',label:'Bad',variant:'primary',url:'https://evil.test',action:{type:'navigate',actionKey:'arbitrary_route'}}).success).toBe(false));
  it('validates complete structured responses', () => expect(chatbotResponseSchema.safeParse({version:'1.0',conversationId:'c',messageId:'m',intent:'club_about',confidence:.9,language:'en',message:'Safe text',components:[]}).success).toBe(true));
});

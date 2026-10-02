import { describe, expect, it } from 'vitest';
import { chunkKnowledgeText, isLegalKnowledgeQuery } from './chatbotKnowledgeRepository';

describe('chatbot knowledge chunking',()=>{
  it('creates bounded, normalized chunks without losing content',()=>{
    const text=Array.from({length:40},(_,index)=>`Section ${index+1}. Leaders learn through practical events and community projects.`).join('\n\n');
    const chunks=chunkKnowledgeText(text,'en',180,30);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk=>chunk.content.length<=180)).toBe(true);
    expect(chunks.every(chunk=>chunk.normalized.length>0&&chunk.tokenCount>0)).toBe(true);
    expect(chunks[0].index).toBe(0);
  });

  it('caps pathological documents at one thousand chunks',()=>{
    const chunks=chunkKnowledgeText('x'.repeat(1_500_000),'en',1000,100);
    expect(chunks).toHaveLength(1000);
  });

  it('recognizes legal questions without treating normal platform requests as policy searches',()=>{
    expect(isLegalKnowledgeQuery('What does the privacy policy say about my data?','en')).toBe(true);
    expect(isLegalKnowledgeQuery('ما هي شروط العضوية وسياسة الخصوصية؟','ar')).toBe(true);
    expect(isLegalKnowledgeQuery('Show me the next student event','en')).toBe(false);
  });
});

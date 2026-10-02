import { describe, expect, it } from 'vitest';
import { deidentifyConversation } from './chatbotDocumentExtractor';

describe('conversation privacy filter',()=>{
  it('removes sender labels and common direct identifiers',()=>{
    const result=deidentifyConversation('[12/04/2026, 10:30] Sara Benali: Contact me at sara@example.com or +212 612-345-678. https://example.com/profile');
    expect(result).not.toContain('Sara Benali');
    expect(result).not.toContain('sara@example.com');
    expect(result).not.toContain('+212');
    expect(result).not.toContain('example.com');
    expect(result).toContain('[email removed]');
    expect(result).toContain('[phone removed]');
  });
});


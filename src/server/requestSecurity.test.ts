import { describe, expect, it } from 'vitest';
import { configuredMutationOrigins, validateMutationRequest } from './requestSecurity';

const allowed = new Set(['https://leadersoftomorrowestk.com']);

function request(method: string, headers: Record<string, string> = {}) {
  return new Request('https://leadersoftomorrowestk.com/api/member/invitations/example', { method, headers });
}

describe('state-changing request protection', () => {
  it('allows safe methods without an origin', () => {
    expect(validateMutationRequest(request('GET'), allowed)).toEqual({ ok: true });
  });

  it('allows an exact trusted origin', () => {
    expect(validateMutationRequest(request('POST', { origin: 'https://leadersoftomorrowestk.com' }), allowed)).toEqual({ ok: true });
  });

  it('rejects cross-site and sibling-subdomain requests', () => {
    expect(validateMutationRequest(request('POST', { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }), allowed).ok).toBe(false);
    expect(validateMutationRequest(request('PATCH', { origin: 'https://attacker.leadersoftomorrowestk.com', 'sec-fetch-site': 'same-site' }), allowed).ok).toBe(false);
  });

  it('rejects unverifiable mutation requests', () => {
    expect(validateMutationRequest(request('DELETE'), allowed).ok).toBe(false);
  });

  it('accepts a browser-confirmed same-origin request when Origin is absent', () => {
    expect(validateMutationRequest(request('POST', { 'sec-fetch-site': 'same-origin' }), allowed)).toEqual({ ok: true });
  });

  it('supports local production smoke tests without trusting arbitrary hosts', () => {
    expect(configuredMutationOrigins('http://127.0.0.1:4173/api/example')).toContain('http://127.0.0.1:4173');
    expect(configuredMutationOrigins('http://localhost:4173/api/example')).toContain('http://127.0.0.1:4173');
    expect(configuredMutationOrigins('https://evil.example/api/example')).not.toContain('https://evil.example');
  });
});

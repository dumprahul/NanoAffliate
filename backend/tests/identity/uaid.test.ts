import { describe, expect, it } from 'vitest';
import { generateUAID } from '../../src/identity/uaid.js';

const baseInput = {
  registry: 'hol',
  name: 'nanoaffiliate-attention-oracle',
  version: '1.0.0',
  protocol: 'hcs-10',
  nativeId: 'hedera:testnet:0.0.5432',
  skills: [21],
};

describe('generateUAID', () => {
  it('is deterministic for identical input', () => {
    expect(generateUAID(baseInput)).toBe(generateUAID(baseInput));
  });

  it('is order-independent for skills', () => {
    const a = generateUAID({ ...baseInput, skills: [4, 21] });
    const b = generateUAID({ ...baseInput, skills: [21, 4] });
    expect(a).toBe(b);
  });

  it('hashes the same regardless of name/protocol/registry casing (only the hash segment, per §11.3 — the display suffix keeps caller casing)', () => {
    const a = generateUAID(baseInput);
    const b = generateUAID({ ...baseInput, name: baseInput.name.toUpperCase(), protocol: 'HCS-10', registry: 'HOL' });
    const hashSegment = (uaid: string) => uaid.split(';')[0];
    expect(hashSegment(a)).toBe(hashSegment(b));
  });

  it('changes when any canonical field changes', () => {
    const a = generateUAID(baseInput);
    const b = generateUAID({ ...baseInput, nativeId: 'hedera:testnet:0.0.9999' });
    expect(a).not.toBe(b);
  });

  it('produces the documented uaid:aid: format with registry/proto/nativeId suffix', () => {
    const uaid = generateUAID(baseInput);
    expect(uaid).toMatch(/^uaid:aid:[1-9A-HJ-NP-Za-km-z]+;registry=hol;proto=hcs-10;nativeId=hedera:testnet:0\.0\.5432$/);
  });
});

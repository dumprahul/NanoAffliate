import { describe, expect, it } from 'vitest';

// Separate file so this env value doesn't leak into verify.test.ts (each
// vitest test file gets its own fresh module registry, so config/env.ts
// re-reads process.env when re-imported here).
process.env.HCS_TOPIC_IDENTITY_REGISTRY = '';

const { isUaidRegistered } = await import('../../src/identity/verify.js');

describe('isUaidRegistered without a configured registry topic', () => {
  it('fails closed (returns false) rather than throwing or silently skipping verification', async () => {
    await expect(isUaidRegistered('uaid:aid:anything')).resolves.toBe(false);
  });
});

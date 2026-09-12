import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Must be set before src/config/env.ts is first imported (dotenv won't
// override an already-set process.env value), so this has to run at
// module-eval time, before the dynamic import below.
process.env.HCS_TOPIC_IDENTITY_REGISTRY = '0.0.999999';
process.env.HEDERA_NETWORK = 'testnet';

const { isUaidRegistered, clearUaidVerificationCache } = await import('../../src/identity/verify.js');

function encodeMessage(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

describe('isUaidRegistered', () => {
  beforeEach(() => {
    clearUaidVerificationCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when the uaid appears in a registry message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          messages: [{ message: encodeMessage({ type: 'identity_profile', uaid: 'uaid:aid:abc' }) }],
          links: { next: null },
        }),
      }),
    );
    await expect(isUaidRegistered('uaid:aid:abc')).resolves.toBe(true);
  });

  it('returns false when the uaid never appears in the registry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [], links: { next: null } }),
      }),
    );
    await expect(isUaidRegistered('uaid:aid:missing')).resolves.toBe(false);
  });

  it('ignores non-identity_profile messages on the same topic', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          messages: [
            { message: encodeMessage({ type: 'click', session_id: 'x' }) },
            { message: encodeMessage({ type: 'identity_profile', uaid: 'uaid:aid:real' }) },
          ],
          links: { next: null },
        }),
      }),
    );
    await expect(isUaidRegistered('uaid:aid:real')).resolves.toBe(true);
    await expect(isUaidRegistered('uaid:aid:spoofed-from-a-click-message')).resolves.toBe(false);
  });

  it('caches a result and does not re-fetch on a repeat call for the same uaid', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ message: encodeMessage({ type: 'identity_profile', uaid: 'uaid:aid:cached' }) }],
        links: { next: null },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await isUaidRegistered('uaid:aid:cached');
    await isUaidRegistered('uaid:aid:cached');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows Mirror Node pagination (links.next) to find a match on a later page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [], links: { next: '/api/v1/topics/0.0.999999/messages?page=2' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ message: encodeMessage({ type: 'identity_profile', uaid: 'uaid:aid:page2' }) }],
          links: { next: null },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    await expect(isUaidRegistered('uaid:aid:page2')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

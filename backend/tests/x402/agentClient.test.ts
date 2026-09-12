import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/identity/verify.js', () => ({
  isUaidRegistered: vi.fn(),
}));

const { isUaidRegistered } = await import('../../src/identity/verify.js');
const { callX402JsonEndpoint, UnverifiedProviderError } = await import('../../src/x402/agentClient.js');

function base64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function mock402Response(paymentRequired: unknown) {
  return new Response('{}', {
    status: 402,
    headers: { 'PAYMENT-REQUIRED': base64(paymentRequired) },
  });
}

const paymentRequiredWithUaid = {
  x402Version: 2,
  error: 'Payment required',
  resource: { url: 'http://localhost/verify-attention' },
  accepts: [
    {
      scheme: 'exact',
      network: 'hedera:testnet',
      asset: '0.0.0',
      amount: '50000',
      payTo: '0.0.1111',
      maxTimeoutSeconds: 300,
      extra: { provider_uaid: 'uaid:aid:not-registered', feePayer: '0.0.9999' },
    },
  ],
};

const paymentRequiredWithoutUaid = {
  x402Version: 2,
  error: 'Payment required',
  resource: { url: 'http://localhost/verify-attention' },
  accepts: [
    {
      scheme: 'exact',
      network: 'hedera:testnet',
      asset: '0.0.0',
      amount: '50000',
      payTo: '0.0.1111',
      maxTimeoutSeconds: 300,
      extra: { feePayer: '0.0.9999' },
    },
  ],
};

describe('callX402JsonEndpoint — pre-payment identity verification (architecture §11.5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(isUaidRegistered).mockReset();
  });

  it('refuses to pay (throws before ever building a payment) when the declared provider_uaid is unverified', async () => {
    vi.mocked(isUaidRegistered).mockResolvedValue(false);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mock402Response(paymentRequiredWithUaid)),
    );

    await expect(callX402JsonEndpoint('http://localhost/verify-attention', { hello: 'world' })).rejects.toThrow(
      UnverifiedProviderError,
    );
    expect(isUaidRegistered).toHaveBeenCalledWith('uaid:aid:not-registered');
    // fetch should only have been called once (the unpaid probe) — never got
    // far enough to retry with a signed payment.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('never calls the verification check when the challenge declares no provider_uaid at all', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mock402Response(paymentRequiredWithoutUaid)),
    );

    // Will fail further down the line trying to actually build/sign a real
    // payment (no live facilitator here) — we only care that it got past the
    // identity check without calling it, i.e. verification is opt-in based
    // on whether the challenge declares a UAID, not a hard requirement.
    await callX402JsonEndpoint('http://localhost/verify-attention', {}).catch(() => undefined);
    expect(isUaidRegistered).not.toHaveBeenCalled();
  });
});

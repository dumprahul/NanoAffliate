import type { RoutesConfig } from '@x402/core/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { paymentMiddlewareFromConfig } from '@x402/express';
import { ExactHederaScheme } from '@x402/hedera/exact/server';
import { HBAR_ASSET_ID } from '@x402/hedera';
import { env } from '../config/env.js';

const network = `hedera:${env.hederaNetwork}` as const;

/**
 * x402-gated middleware for the Attention Trust Oracle — architecture §8.
 * Any request to a configured route must arrive with a valid X-PAYMENT
 * header (a signed Hedera transfer to the Oracle's account) or gets a 402.
 * Blocky402 (or any x402 facilitator at FACILITATOR_URL) verifies + settles.
 */
export function createOracleX402Middleware() {
  const facilitatorClient = new HTTPFacilitatorClient({ url: env.facilitatorUrl });

  const routes: RoutesConfig = {
    '/verify-attention': {
      description: 'Scores one 5-second attention interval of a reader session',
      accepts: {
        scheme: 'exact',
        network,
        payTo: env.oracle.accountId,
        price: { asset: HBAR_ASSET_ID, amount: env.oraclePricePerCallTinybar },
        // architecture §11.5 stretch tier: embed the Oracle's UAID in the 402
        // challenge itself (not just the 200 response) so the Agent can
        // resolve it against the identity-registry topic BEFORE paying,
        // not just after. See x402/agentClient.ts.
        extra: env.oracle.uaid ? { provider_uaid: env.oracle.uaid } : undefined,
      },
    },
  };

  return paymentMiddlewareFromConfig(routes, facilitatorClient, [
    { network, server: new ExactHederaScheme() },
  ]);
}

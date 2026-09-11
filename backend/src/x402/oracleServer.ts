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
      },
    },
  };

  return paymentMiddlewareFromConfig(routes, facilitatorClient, [
    { network, server: new ExactHederaScheme() },
  ]);
}

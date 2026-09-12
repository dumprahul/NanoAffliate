import { x402Client, x402HTTPClient } from '@x402/core/client';
import type { PaymentRequired } from '@x402/core/types';
import { ExactHederaScheme } from '@x402/hedera/exact/client';
import { createClientHederaSigner } from '@x402/hedera';
import { env } from '../config/env.js';
import { parsePrivateKey } from '../hedera/client.js';
import { isUaidRegistered } from '../identity/verify.js';

const network = `hedera:${env.hederaNetwork}` as const;

let httpClient: x402HTTPClient | undefined;

function getHttpClient(): x402HTTPClient {
  if (httpClient) return httpClient;
  const signer = createClientHederaSigner(env.agent.accountId, parsePrivateKey(env.agent.privateKey), {
    network,
  });
  // Spend controls off: HBAR isn't in the client's recognized default-asset
  // table, and the payment amount is dictated by our own Oracle's declared
  // PaymentRequirements (not attacker-influenced), so there's nothing here
  // for a USD cap to protect against.
  const client = new x402Client().setSpendControls(false).register(network, new ExactHederaScheme(signer));
  httpClient = new x402HTTPClient(client);
  return httpClient;
}

export interface X402CallResult {
  status: number;
  body: unknown;
  paid: boolean;
  paymentTxId?: string;
}

export class UnverifiedProviderError extends Error {
  constructor(uaid: string) {
    super(`Refusing to pay: provider UAID ${uaid} is not registered on the identity-registry topic`);
    this.name = 'UnverifiedProviderError';
  }
}

/**
 * Calls an x402-gated JSON endpoint as the Agent (architecture §6.4 step 1):
 * first request unpaid, and on a 402 challenge, sign a Hedera transfer to
 * the Oracle's account and retry with the X-PAYMENT header attached.
 *
 * architecture §11.5 (stretch tier): before ever signing that payment, if
 * the 402 challenge declares a `provider_uaid`, resolve it against the
 * identity-registry topic (via Mirror Node) and refuse to pay an unverified
 * provider. This turns HCS-14 identity into an actual pre-payment trust
 * check instead of a label nobody looks at. If no `provider_uaid` is
 * declared at all (e.g. identity bootstrap hasn't been run yet), this
 * check is skipped rather than bricking payments entirely — it hardens an
 * already-working system, it isn't a hard dependency for one to run.
 */
export async function callX402JsonEndpoint(url: string, jsonBody: unknown): Promise<X402CallResult> {
  const http = getHttpClient();
  const body = JSON.stringify(jsonBody);
  const headers = { 'Content-Type': 'application/json' };

  const firstResponse = await fetch(url, { method: 'POST', headers, body });
  const first = await http.processResponse(firstResponse);

  if (first.status !== 402) {
    return { status: first.status, body: first.body, paid: false };
  }

  const paymentRequired = first.header as PaymentRequired;

  const providerUaid = paymentRequired.accepts
    .map((option) => option.extra?.provider_uaid)
    .find((value): value is string => typeof value === 'string');

  if (providerUaid) {
    const verified = await isUaidRegistered(providerUaid);
    if (!verified) {
      throw new UnverifiedProviderError(providerUaid);
    }
  }

  const paymentPayload = await http.createPaymentPayload(paymentRequired);
  const paymentHeaders = http.encodePaymentSignatureHeader(paymentPayload);

  const secondResponse = await fetch(url, {
    method: 'POST',
    headers: { ...headers, ...paymentHeaders },
    body,
  });
  const second = await http.processResponse(secondResponse);

  const settleResponse = second.paymentStatus === 'settled' ? (second.header as { transaction?: string }) : undefined;

  return {
    status: second.status,
    body: second.body,
    paid: second.paymentStatus === 'settled',
    paymentTxId: settleResponse?.transaction,
  };
}

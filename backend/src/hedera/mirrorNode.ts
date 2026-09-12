import { env } from '../config/env.js';

export const MIRROR_NODE_BASE =
  env.hederaNetwork === 'mainnet'
    ? 'https://mainnet-public.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';

/** Live escrow balance check before a payout — architecture §6.4 step 2, reads Mirror Node directly. */
export async function getHbarBalanceTinybar(accountId: string): Promise<bigint> {
  const res = await fetch(`${MIRROR_NODE_BASE}/api/v1/accounts/${accountId}`);
  if (!res.ok) {
    throw new Error(`Mirror Node balance lookup failed for ${accountId}: ${res.status}`);
  }
  const data = (await res.json()) as { balance?: { balance?: number } };
  const tinybar = data.balance?.balance;
  if (tinybar === undefined) {
    throw new Error(`Mirror Node returned no balance for ${accountId}`);
  }
  return BigInt(tinybar);
}

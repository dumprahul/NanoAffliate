import { AccountId, Client, PrivateKey } from '@hiero-ledger/sdk';
import { env } from '../config/env.js';

function parsePrivateKey(raw: string): PrivateKey {
  const stripped = raw.startsWith('0x') ? raw.slice(2) : raw;
  try {
    return PrivateKey.fromStringECDSA(stripped);
  } catch {
    return PrivateKey.fromStringDer(stripped);
  }
}

function buildClient(accountId: string, privateKey: string): Client {
  const client = env.hederaNetwork === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(AccountId.fromString(accountId), parsePrivateKey(privateKey));
  return client;
}

let oracleClient: Client | undefined;
let agentClient: Client | undefined;

/** The Oracle's own Hedera client — used only to receive x402 payments, never to spend. */
export function getOracleClient(): Client {
  if (!oracleClient) {
    oracleClient = buildClient(env.oracle.accountId, env.oracle.privateKey);
  }
  return oracleClient;
}

/**
 * The Agent's Hedera client — signs & submits every other transaction in the
 * system (topic creation, HCS messages, escrow payouts) — architecture §16.
 */
export function getAgentClient(): Client {
  if (!agentClient) {
    agentClient = buildClient(env.agent.accountId, env.agent.privateKey);
  }
  return agentClient;
}

export function getAgentPrivateKey(): PrivateKey {
  return parsePrivateKey(env.agent.privateKey);
}

export function getAgentPublicKey() {
  return getAgentPrivateKey().publicKey;
}

export { parsePrivateKey };

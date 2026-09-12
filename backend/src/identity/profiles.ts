import { generateUAID } from './uaid.js';
import { env } from '../config/env.js';

/** architecture §11.3 — the two UAIDs that matter, generated once and stored in env. */
export function oracleUaidInput() {
  return {
    registry: 'hol',
    name: 'nanoaffiliate-attention-oracle',
    version: '1.0.0',
    protocol: 'hcs-10',
    nativeId: `hedera:${env.hederaNetwork}:${env.oracle.accountId}`,
    skills: [21],
  };
}

export function agentUaidInput() {
  return {
    registry: 'hol',
    name: 'nanoaffiliate-attention-verifier-agent',
    version: '1.0.0',
    protocol: 'hcs-10',
    nativeId: `hedera:${env.hederaNetwork}:${env.agent.accountId}`,
    skills: [4, 21],
  };
}

export function computeOracleUaid(): string {
  return generateUAID(oracleUaidInput());
}

export function computeAgentUaid(): string {
  return generateUAID(agentUaidInput());
}

/** HCS-11 profile document — architecture §11.4. */
export function buildIdentityProfile(opts: {
  uaid: string;
  displayName: string;
  endpoint: string;
  capabilities: string[];
  skills: number[];
}) {
  return {
    type: 'identity_profile',
    uaid: opts.uaid,
    display_name: opts.displayName,
    endpoint: opts.endpoint,
    capabilities: opts.capabilities,
    skills: opts.skills,
  };
}

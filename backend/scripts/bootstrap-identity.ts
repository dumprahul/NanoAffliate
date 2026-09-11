/**
 * Build order step 8 (architecture/README.md §19): generate HCS-14 UAIDs for
 * the Oracle and Agent, create the global identity-registry topic if it
 * doesn't exist yet, and write both HCS-11 profiles to it.
 *
 * Run once at deploy time: `npm run bootstrap:identity`
 * Prints the values to copy into `.env` (HCS_TOPIC_IDENTITY_REGISTRY,
 * ORACLE_UAID, AGENT_UAID) — it does not write your .env file for you.
 */
import { env } from '../src/config/env.js';
import { createTopic, submitHcsMessage } from '../src/hedera/hcs.js';
import {
  agentUaidInput,
  buildIdentityProfile,
  computeAgentUaid,
  computeOracleUaid,
  oracleUaidInput,
} from '../src/identity/profiles.js';

async function main() {
  const oracleUaid = computeOracleUaid();
  const agentUaid = computeAgentUaid();

  console.log('Computed UAIDs (deterministic — same input always produces these):');
  console.log('  ORACLE_UAID=', oracleUaid);
  console.log('  AGENT_UAID=', agentUaid);

  let topicId = env.hcsTopicIdentityRegistry;
  if (!topicId) {
    console.log('\nNo HCS_TOPIC_IDENTITY_REGISTRY set — creating one now...');
    topicId = await createTopic('nanoaffiliate:identity-registry');
    console.log('  HCS_TOPIC_IDENTITY_REGISTRY=', topicId);
  } else {
    console.log(`\nUsing existing identity-registry topic: ${topicId}`);
  }

  const oracleProfile = buildIdentityProfile({
    uaid: oracleUaid,
    displayName: 'NanoAffiliate Attention Trust Oracle',
    endpoint: `${env.baseUrl}/verify-attention`,
    capabilities: ['attention-verification', 'x402-payment-gated'],
    skills: oracleUaidInput().skills,
  });
  const agentProfile = buildIdentityProfile({
    uaid: agentUaid,
    displayName: 'NanoAffiliate Attention Verifier Agent',
    endpoint: env.baseUrl,
    capabilities: ['x402-payment-consumer', 'hedera-transaction-signer'],
    skills: agentUaidInput().skills,
  });

  const oracleResult = await submitHcsMessage(topicId, oracleProfile);
  console.log('Published Oracle HCS-11 profile — seq#', oracleResult.sequenceNumber);

  const agentResult = await submitHcsMessage(topicId, agentProfile);
  console.log('Published Agent HCS-11 profile — seq#', agentResult.sequenceNumber);

  console.log('\nCopy these into backend/.env if not already set:');
  console.log(`HCS_TOPIC_IDENTITY_REGISTRY=${topicId}`);
  console.log(`ORACLE_UAID=${oracleUaid}`);
  console.log(`AGENT_UAID=${agentUaid}`);
}

main().catch((err) => {
  console.error('bootstrap-identity failed:', err);
  process.exit(1);
});

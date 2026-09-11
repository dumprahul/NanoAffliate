import 'dotenv/config';

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  port: Number(optional('PORT') ?? 3000),
  nodeEnv: optional('NODE_ENV') ?? 'development',
  hederaNetwork: optional('HEDERA_NETWORK') ?? 'testnet',

  oracle: {
    accountId: optional('ORACLE_HEDERA_ACCOUNT_ID'),
    privateKey: optional('ORACLE_HEDERA_PRIVATE_KEY'),
    uaid: optional('ORACLE_UAID'),
  },
  agent: {
    accountId: optional('AGENT_HEDERA_ACCOUNT_ID'),
    privateKey: optional('AGENT_HEDERA_PRIVATE_KEY'),
    uaid: optional('AGENT_UAID'),
  },

  facilitatorUrl: optional('FACILITATOR_URL') ?? 'https://api.testnet.blocky402.com',
  hcsTopicIdentityRegistry: optional('HCS_TOPIC_IDENTITY_REGISTRY'),

  supabase: {
    url: optional('SUPABASE_URL'),
    serviceKey: optional('SUPABASE_SERVICE_KEY'),
  },

  redisUrl: optional('REDIS_URL') ?? 'redis://localhost:6379',

  worldId: {
    appId: optional('WORLD_ID_APP_ID'),
    actionId: optional('WORLD_ID_ACTION_ID'),
  },
};

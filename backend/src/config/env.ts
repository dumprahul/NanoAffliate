import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  port: Number(optional('PORT') ?? 3000),
  nodeEnv: optional('NODE_ENV') ?? 'development',
  hederaNetwork: (optional('HEDERA_NETWORK') ?? 'testnet') as 'testnet' | 'mainnet',
  baseUrl: optional('BASE_URL') ?? `http://localhost:${Number(optional('PORT') ?? 3000)}`,

  oracle: {
    get accountId() {
      return required('ORACLE_HEDERA_ACCOUNT_ID');
    },
    get privateKey() {
      return required('ORACLE_HEDERA_PRIVATE_KEY');
    },
    uaid: optional('ORACLE_UAID'),
  },
  agent: {
    get accountId() {
      return required('AGENT_HEDERA_ACCOUNT_ID');
    },
    get privateKey() {
      return required('AGENT_HEDERA_PRIVATE_KEY');
    },
    uaid: optional('AGENT_UAID'),
  },

  facilitatorUrl: optional('FACILITATOR_URL') ?? 'https://api.testnet.blocky402.com',
  hcsTopicIdentityRegistry: optional('HCS_TOPIC_IDENTITY_REGISTRY'),
  oraclePricePerCallTinybar: optional('ORACLE_PRICE_PER_CALL_TINYBAR') ?? '50000',

  redisUrl: optional('REDIS_URL') ?? 'redis://localhost:6379',

  worldId: {
    get appId() {
      return required('WORLD_ID_APP_ID');
    },
    get rpId() {
      return required('WORLD_ID_RP_ID');
    },
    get signerKey() {
      return required('WORLD_ID_SIGNER_KEY');
    },
    /** Lets routes/world.ts fail fast with one clear error instead of three separate ones. */
    get configured() {
      return Boolean(optional('WORLD_ID_APP_ID') && optional('WORLD_ID_RP_ID') && optional('WORLD_ID_SIGNER_KEY'));
    },
  },
};

// Supabase needs plain values (not getters) since the client is constructed once at import time.
export const supabaseEnv = {
  get url() {
    return required('SUPABASE_URL');
  },
  get serviceKey() {
    return required('SUPABASE_SERVICE_KEY');
  },
};

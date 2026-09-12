import { env } from '../config/env.js';
import { MIRROR_NODE_BASE } from '../hedera/mirrorNode.js';

interface IdentityProfileMessage {
  type: string;
  uaid: string;
  display_name?: string;
  endpoint?: string;
  capabilities?: string[];
  skills?: number[];
}

interface CacheEntry {
  verified: boolean;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function decodeMessage(base64: string): IdentityProfileMessage | undefined {
  try {
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}

/**
 * architecture §11.5 (stretch tier) — turns the Oracle's declared UAID into
 * an actual pre-payment trust check: resolves it against the global
 * identity-registry HCS topic via Mirror Node, rather than trusting
 * whatever's at the configured Oracle URL just because it *looks* like a
 * well-formed UAID. Fails closed (unverified) if the registry topic isn't
 * configured or the UAID never shows up in it.
 *
 * Results are cached in-process for CACHE_TTL_MS — profiles are published
 * once at bootstrap and essentially never change, so there's no reason to
 * re-scan the topic on every single tick (this runs before every payment).
 */
export async function isUaidRegistered(uaid: string): Promise<boolean> {
  const cached = cache.get(uaid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.verified;
  }

  const verified = await scanRegistryForUaid(uaid);
  cache.set(uaid, { verified, expiresAt: Date.now() + CACHE_TTL_MS });
  return verified;
}

async function scanRegistryForUaid(uaid: string): Promise<boolean> {
  const topicId = env.hcsTopicIdentityRegistry;
  if (!topicId) return false;

  let url: string | null = `${MIRROR_NODE_BASE}/api/v1/topics/${topicId}/messages?limit=100&order=asc`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = (await res.json()) as {
      messages?: { message: string }[];
      links?: { next?: string | null };
    };

    for (const raw of data.messages ?? []) {
      const decoded = decodeMessage(raw.message);
      if (decoded?.type === 'identity_profile' && decoded.uaid === uaid) {
        return true;
      }
    }

    url = data.links?.next ? `${MIRROR_NODE_BASE}${data.links.next}` : null;
  }

  return false;
}

/** Test/ops escape hatch — clears the in-process verification cache. */
export function clearUaidVerificationCache(): void {
  cache.clear();
}

import { randomBytes } from 'node:crypto';
import { redis } from './redis.js';

const WINDOW_MS = 10 * 60 * 1000;

/** Records one session's arrival for the link's diversity aggregate — architecture §12.1. */
export async function recordDiversityEntry(linkId: string, ipAsn: string, fingerprintHash: string): Promise<void> {
  const key = `diversity:${linkId}`;
  // The trailing nonce guarantees a unique sorted-set member even when two
  // arrivals land in the same millisecond — without it, ZADD would silently
  // collapse them into one entry (identical members just update the score),
  // undercounting genuinely distinct visits.
  const nonce = randomBytes(4).toString('hex');
  const member = `${ipAsn}|${fingerprintHash}|${Date.now()}|${nonce}`;
  await redis.zadd(key, Date.now(), member);
  await redis.zremrangebyscore(key, '-inf', Date.now() - WINDOW_MS);
}

/**
 * Diversity score in [0, 1] for the Oracle's check #5 — architecture §8.
 * Higher = more distinct IP-ASN/fingerprint pairs hitting this link recently,
 * which is what a coordinated bot farm on a narrow range fails to produce.
 */
export async function getDiversityScore(linkId: string): Promise<number> {
  const key = `diversity:${linkId}`;
  const tenMinAgo = Date.now() - WINDOW_MS;
  await redis.zremrangebyscore(key, '-inf', tenMinAgo);
  const recentEntries = await redis.zrangebyscore(key, tenMinAgo, '+inf');

  if (recentEntries.length === 0) return 1; // no other traffic to compare against — don't penalize a lone session
  const distinctPairs = new Set(recentEntries.map((entry) => entry.split('|').slice(0, 2).join('|')));
  return Math.min(1, distinctPairs.size / recentEntries.length + (distinctPairs.size > 1 ? 0.2 : 0));
}

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { redis } from '../../src/lib/redis.js';
import { getDiversityScore, recordDiversityEntry } from '../../src/lib/diversity.js';

// Integration test against a real local Redis (see backend/README.md — brew install redis).
describe('diversity aggregate', () => {
  const linkId = `test-link-${randomUUID()}`;

  beforeEach(async () => {
    await redis.del(`diversity:${linkId}`);
  });

  afterAll(async () => {
    await redis.del(`diversity:${linkId}`);
    await redis.quit();
  });

  it('gives a lone session the benefit of the doubt (score = 1)', async () => {
    const score = await getDiversityScore(linkId);
    expect(score).toBe(1);
  });

  it('scores higher when sessions come from distinct IP/fingerprint pairs', async () => {
    for (let i = 0; i < 5; i++) {
      await recordDiversityEntry(linkId, `1.2.3.${i}`, `fp-${i}`);
    }
    const diverse = await getDiversityScore(linkId);

    await redis.del(`diversity:${linkId}`);
    for (let i = 0; i < 5; i++) {
      await recordDiversityEntry(linkId, '1.2.3.4', 'same-fingerprint');
    }
    const narrow = await getDiversityScore(linkId);

    expect(diverse).toBeGreaterThan(narrow);
  });
});

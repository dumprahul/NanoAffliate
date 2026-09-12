import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../src/db/creators.js', () => ({
  createCreator: vi.fn(async (input: { hederaAccountId: string }) => ({
    id: 'creator-1',
    hedera_account_id: input.hederaAccountId,
    uaid: null,
    cold_start_started_at: new Date().toISOString(),
    cumulative_attention_events: 0,
    trust_penalty_multiplier: 1,
  })),
}));

const { creatorsRouter } = await import('../../src/routes/creators.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(creatorsRouter);
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && typeof err === 'object' && 'issues' in err) {
      res.status(400).json({ error: 'validation_error' });
      return;
    }
    res.status(500).json({ error: 'internal_error' });
  });
  return app;
}

describe('POST /creators', () => {
  it('creates a creator for a valid hedera_account_id', async () => {
    const app = buildApp();
    const res = await request(app).post('/creators').send({ hedera_account_id: '0.0.1234' });
    expect(res.status).toBe(201);
    expect(res.body.creator.hedera_account_id).toBe('0.0.1234');
  });

  it('rejects a request missing hedera_account_id', async () => {
    const app = buildApp();
    const res = await request(app).post('/creators').send({});
    expect(res.status).toBe(400);
  });
});

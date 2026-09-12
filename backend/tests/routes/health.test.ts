import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { healthRouter } from '../../src/routes/health.js';

describe('GET /health', () => {
  it('returns ok status', async () => {
    const app = express();
    app.use(healthRouter);

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'nanoaffiliate-backend' });
  });
});

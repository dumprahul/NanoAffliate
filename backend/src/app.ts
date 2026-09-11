import cors from 'cors';
import express from 'express';
import { healthRouter } from './routes/health.js';
import { oracleRouter } from './routes/oracle.js';
import { redirectRouter } from './routes/redirect.js';
import { signalsRouter } from './routes/signals.js';
import { webhooksRouter } from './routes/webhooks.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);
  app.use(redirectRouter);
  app.use(oracleRouter);
  app.use(signalsRouter);
  app.use(webhooksRouter);

  return app;
}

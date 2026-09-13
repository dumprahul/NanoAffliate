import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}
import { healthRouter } from './routes/health.js';
import { sellersRouter } from './routes/sellers.js';
import { creatorsRouter } from './routes/creators.js';
import { linksRouter } from './routes/links.js';
import { oracleRouter } from './routes/oracle.js';
import { redirectRouter } from './routes/redirect.js';
import { signalsRouter } from './routes/signals.js';
import { sessionLifecycleRouter } from './routes/sessionLifecycle.js';
import { conversionsRouter } from './routes/conversions.js';
import { webhooksRouter } from './routes/webhooks.js';
import { dashboardRouter } from './routes/dashboard.js';
import { worldRouter } from './routes/world.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(
    express.json({
      // Keeps the exact bytes the sender signed, for webhook HMAC verification
      // (routes/webhooks.ts) — a re-serialized JSON.stringify(req.body) would
      // mismatch on key ordering/whitespace and reject legitimate signatures.
      verify: (req: Request, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    }),
  );

  app.use(healthRouter);
  app.use(redirectRouter);
  app.use(sellersRouter);
  app.use(creatorsRouter);
  app.use(linksRouter);
  app.use(oracleRouter);
  app.use(signalsRouter);
  app.use(sessionLifecycleRouter);
  app.use(conversionsRouter);
  app.use(webhooksRouter);
  app.use(dashboardRouter);
  app.use(worldRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err && typeof err === 'object' && 'issues' in err) {
      res.status(400).json({ error: 'validation_error', details: (err as { issues: unknown }).issues });
      return;
    }
    console.error(err);
    const message =
      err instanceof Error
        ? err.message
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
    res.status(500).json({ error: 'internal_error', message });
  });

  return app;
}

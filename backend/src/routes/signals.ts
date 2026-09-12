import { Router } from 'express';
import { z } from 'zod';
import { enqueueAndAwaitTick } from '../queue/tickQueue.js';
import { getSessionById } from '../db/sessions.js';

export const signalsRouter = Router();

const reportSignalsSchema = z.object({
  session_id: z.string().uuid(),
  signals: z.object({
    tabActive: z.boolean(),
    lastInteractionMsAgo: z.number().nonnegative(),
    scrollVelocityCurve: z.array(z.number()).max(50),
    deviceFingerprintHash: z.string(),
    webdriverFlag: z.boolean().optional(),
    pluginsLength: z.number().nonnegative().optional(),
    mouseMovementCurve: z.array(z.number()).max(50).optional(),
  }),
});

/**
 * Client tick signal ingestion — architecture §6.4. Enqueues a BullMQ
 * "score-this-session" job (Agent -> Oracle -> payout) and awaits its result
 * so the attention page can show the live decision.
 */
signalsRouter.post('/report-signals', async (req, res, next) => {
  try {
    const body = reportSignalsSchema.parse(req.body);
    const session = await getSessionById(body.session_id);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    if (session.status !== 'active') {
      res.status(409).json({ error: `session is ${session.status}, not active` });
      return;
    }
    const result = await enqueueAndAwaitTick(body.session_id, body.signals);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

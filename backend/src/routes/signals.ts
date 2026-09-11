import { Router } from 'express';

/**
 * Client tick signal ingestion — architecture/README.md §6.4.
 * POST /report-signals enqueues a "score-this-session" BullMQ job.
 *
 * TODO: wire to the tick queue (build order step 6-7).
 */
export const signalsRouter = Router();

signalsRouter.post('/report-signals', (_req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

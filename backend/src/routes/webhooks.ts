import { Router } from 'express';

/**
 * Seller purchase-confirmation + Selfie Check callback webhooks —
 * architecture/README.md §6.6 and §10.
 *
 * TODO: wire /webhooks/purchase-confirmed and /webhooks/selfie-check-result.
 */
export const webhooksRouter = Router();

webhooksRouter.post('/webhooks/purchase-confirmed', (_req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

webhooksRouter.post('/webhooks/selfie-check-result', (_req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

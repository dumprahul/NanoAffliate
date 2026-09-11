import { Router } from 'express';

/**
 * Attention Trust Oracle — architecture/README.md §8.
 * POST /verify-attention is x402-gated (paymentMiddleware) before this
 * handler ever runs. Middleware wiring is build order step 3.
 *
 * TODO: add x402 paymentMiddleware, then call scoreSession() + logTickToHCS().
 */
export const oracleRouter = Router();

oracleRouter.post('/verify-attention', (_req, res) => {
  res.status(501).json({ error: 'not implemented' });
});

import { Router } from 'express';
import { z } from 'zod';
import { createOracleX402Middleware } from '../x402/oracleServer.js';
import { runOracleScoring } from '../services/scoring.js';

export const oracleRouter = Router();

const signalsSchema = z.object({
  session_id: z.string().uuid(),
  signals: z.object({
    tabActive: z.boolean(),
    lastInteractionMsAgo: z.number().nonnegative(),
    scrollVelocityCurve: z.array(z.number()),
    deviceFingerprintHash: z.string(),
    webdriverFlag: z.boolean().optional(),
    pluginsLength: z.number().nonnegative().optional(),
    mouseMovementCurve: z.array(z.number()).optional(),
  }),
});

/**
 * Attention Trust Oracle — architecture §8. x402 middleware runs first and
 * short-circuits with a 402 unless a valid Hedera payment is attached.
 *
 * Mounted with `.use(middleware)` (no path arg) rather than
 * `.use('/verify-attention', middleware)`: Express strips a `.use(path, …)`
 * prefix from `req.path` inside that middleware, so the x402 resource
 * server's internal route matcher would see `/` instead of
 * `/verify-attention`, fail to match its configured route, and let requests
 * through completely unprotected. Since this router is itself mounted at
 * the app root, `req.path` here is already the full `/verify-attention`.
 */
oracleRouter.use(createOracleX402Middleware());

oracleRouter.post('/verify-attention', async (req, res, next) => {
  try {
    const body = signalsSchema.parse(req.body);
    const result = await runOracleScoring(body.session_id, body.signals);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

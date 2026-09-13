import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getSessionContext } from '../db/sessions.js';
import { getSellerById } from '../db/sellers.js';
import { createConversion, markConversionScheduled } from '../db/conversions.js';
import { createScheduledBonusTransfer } from '../hedera/payments.js';
import { scheduleBonusRelease } from '../queue/bonusQueue.js';
import { addProductSpend, isUnderProductBudget } from '../db/products.js';

export const webhooksRouter = Router();

const BONUS_DELAY_MS = 5 * 60 * 1000;

const purchaseConfirmedSchema = z.object({
  session_id: z.string().uuid(),
  seller_id: z.string().uuid(),
  order_id: z.string().min(1),
});

function verifySignature(secret: string, rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const givenBuf = Buffer.from(signatureHeader, 'hex');
  return expectedBuf.length === givenBuf.length && timingSafeEqual(expectedBuf, givenBuf);
}

/**
 * Purchase confirmation, Path B — architecture §6.6. Used for the
 * seller-controlled checkout demo. The bonus is wrapped in a Scheduled
 * Transaction with a short delay, giving fraud checks a window to
 * flag-and-cancel before funds move.
 */
webhooksRouter.post('/webhooks/purchase-confirmed', async (req, res, next) => {
  try {
    const body = purchaseConfirmedSchema.parse(req.body);
    const seller = await getSellerById(body.seller_id);
    if (!seller || !seller.webhook_secret) {
      res.status(404).json({ error: 'seller not found' });
      return;
    }
    const signature = req.get('x-signature');
    if (!req.rawBody || !verifySignature(seller.webhook_secret, req.rawBody, signature)) {
      res.status(401).json({ error: 'invalid signature' });
      return;
    }

    const context = await getSessionContext(body.session_id);
    if (!context) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    const { link, creator, product } = context;
    if (!seller.escrow_hedera_account_id || link.rate_purchase_bonus <= 0) {
      res.status(422).json({ error: 'no escrow account or zero purchase bonus configured' });
      return;
    }
    if (!(await isUnderProductBudget(product.id, link.rate_purchase_bonus))) {
      res.status(422).json({ error: 'product escrow budget exhausted' });
      return;
    }

    const conversion = await createConversion({
      sessionId: body.session_id,
      confirmationType: 'webhook_verified',
      sellerWebhookPayload: req.body,
    });

    const { scheduleId } = await createScheduledBonusTransfer(
      seller.escrow_hedera_account_id,
      creator.hedera_account_id,
      link.rate_purchase_bonus,
      BONUS_DELAY_MS,
    );
    // Reserved at schedule-creation, not at actual on-chain execution — the
    // schedule is expected to fire (waitForExpiry), and this keeps the
    // budget check-then-reserve on the same request/response cycle as the
    // other two payout paths instead of needing a callback from the bonus queue.
    await addProductSpend(product.id, link.rate_purchase_bonus);
    await markConversionScheduled(conversion.id, scheduleId);
    await scheduleBonusRelease({ conversionId: conversion.id, scheduleId }, BONUS_DELAY_MS);

    res.status(202).json({ conversion, schedule_id: scheduleId, releases_in_ms: BONUS_DELAY_MS });
  } catch (err) {
    next(err);
  }
});

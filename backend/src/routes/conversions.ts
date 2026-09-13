import { Router } from 'express';
import { z } from 'zod';
import { getSessionContext } from '../db/sessions.js';
import { createConversion, markConversionPaid } from '../db/conversions.js';
import { submitHcsMessage } from '../hedera/hcs.js';
import { payCreatorFromEscrow } from '../hedera/payments.js';
import { addProductSpend, isUnderProductBudget } from '../db/products.js';

export const conversionsRouter = Router();

const selfReportSchema = z.object({
  session_id: z.string().uuid(),
  order_id: z.string().min(1),
});

/** Purchase confirmation, Path A — architecture §6.6. No conversion API exists for third-party sellers. */
conversionsRouter.post('/conversions/self-report', async (req, res, next) => {
  try {
    const body = selfReportSchema.parse(req.body);
    const context = await getSessionContext(body.session_id);
    if (!context) {
      res.status(404).json({ error: 'session not found' });
      return;
    }
    const { link, creator, seller, product } = context;

    const conversion = await createConversion({
      sessionId: body.session_id,
      confirmationType: 'self_reported',
      orderIdSelfReported: body.order_id,
    });

    let bonusPayoutTxId: string | undefined;
    if (
      seller.escrow_hedera_account_id &&
      link.rate_purchase_bonus > 0 &&
      (await isUnderProductBudget(product.id, link.rate_purchase_bonus))
    ) {
      bonusPayoutTxId = await payCreatorFromEscrow(
        seller.escrow_hedera_account_id,
        creator.hedera_account_id,
        link.rate_purchase_bonus,
      );
      await addProductSpend(product.id, link.rate_purchase_bonus);
      await markConversionPaid(conversion.id, bonusPayoutTxId);
    }

    await submitHcsMessage(link.hcs_topic_id, {
      type: 'conversion',
      session_id: body.session_id,
      confirmation_type: 'self_reported',
      bonus_payout_tx_id: bonusPayoutTxId ?? null,
    });

    res.status(201).json({
      conversion: bonusPayoutTxId
        ? { ...conversion, status: 'paid' as const, bonus_payout_tx_id: bonusPayoutTxId }
        : conversion,
      bonus_payout_tx_id: bonusPayoutTxId ?? null,
      label: 'self-reported — unverified',
    });
  } catch (err) {
    next(err);
  }
});

import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { createEscrowAccount } from '../hedera/payments.js';
import { createSeller, getSellerById, updateEscrowBalanceCached } from '../db/sellers.js';
import { createProduct, getProductById } from '../db/products.js';
import { getHbarBalanceTinybar } from '../hedera/mirrorNode.js';

export const sellersRouter = Router();

const createSellerSchema = z.object({
  hedera_account_id: z.string().min(3),
});

/** Seller onboarding — architecture §6.1 steps 1-3. Creates the seller row and its escrow account. */
sellersRouter.post('/sellers', async (req, res, next) => {
  try {
    const body = createSellerSchema.parse(req.body);
    const escrowHederaAccountId = await createEscrowAccount();
    const webhookSecret = randomBytes(24).toString('hex');
    const seller = await createSeller({
      hederaAccountId: body.hedera_account_id,
      escrowHederaAccountId,
      webhookSecret,
    });
    res.status(201).json({
      seller,
      fund_this_account: escrowHederaAccountId,
      webhook_secret: webhookSecret,
      note: 'Send HBAR from your own wallet to fund_this_account before creating links. Store webhook_secret to sign /webhooks/purchase-confirmed requests.',
    });
  } catch (err) {
    next(err);
  }
});

/** architecture §6.1 step 5 — reads the escrow balance from Mirror Node and refreshes the cache. */
sellersRouter.get('/sellers/:id/escrow-balance', async (req, res, next) => {
  try {
    const seller = await getSellerById(req.params.id);
    if (!seller || !seller.escrow_hedera_account_id) {
      res.status(404).json({ error: 'seller or escrow account not found' });
      return;
    }
    const tinybar = await getHbarBalanceTinybar(seller.escrow_hedera_account_id);
    const hbar = Number(tinybar) / 1e8;
    await updateEscrowBalanceCached(seller.id, hbar);
    res.json({ escrow_hedera_account_id: seller.escrow_hedera_account_id, balance_hbar: hbar });
  } catch (err) {
    next(err);
  }
});

const createProductSchema = z.object({
  source_url: z.string().url(),
  title: z.string().min(1),
  image_url: z.string().url().optional(),
  price_display: z.string().optional(),
  affiliate_tag: z.string().min(1),
  escrow_budget_hbar: z.number().positive().optional(),
});

/** architecture §6.1 step 2 — manual product entry, no PA-API dependency (out of scope, §20). */
sellersRouter.post('/sellers/:id/products', async (req, res, next) => {
  try {
    const seller = await getSellerById(req.params.id);
    if (!seller) {
      res.status(404).json({ error: 'seller not found' });
      return;
    }
    const body = createProductSchema.parse(req.body);
    const product = await createProduct({
      sellerId: seller.id,
      sourceUrl: body.source_url,
      title: body.title,
      imageUrl: body.image_url,
      priceDisplay: body.price_display,
      affiliateTag: body.affiliate_tag,
      escrowBudgetHbar: body.escrow_budget_hbar,
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

/** Read-only budget snapshot for the Products dashboard — remaining vs. spent, if a cap is set. */
sellersRouter.get('/products/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'product not found' });
      return;
    }
    const remaining =
      product.escrow_budget_hbar === null ? null : Math.max(product.escrow_budget_hbar - product.escrow_spent_hbar, 0);
    res.json({ product, escrow_remaining_hbar: remaining });
  } catch (err) {
    next(err);
  }
});

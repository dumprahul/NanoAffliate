import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { createTopic, submitHcsMessage } from '../hedera/hcs.js';
import { createLink } from '../db/links.js';
import { getCreatorById } from '../db/creators.js';
import { getProductById } from '../db/products.js';
import { getSellerById } from '../db/sellers.js';
import { env } from '../config/env.js';

export const linksRouter = Router();

const createLinkSchema = z.object({
  creator_id: z.string().uuid(),
  product_id: z.string().uuid(),
  rate_unverified_per_tick: z.number().positive(),
  rate_verified_per_tick: z.number().positive(),
  rate_purchase_bonus: z.number().nonnegative().default(0),
});

/** Creator link creation — architecture §6.2. Every link IS its own HCS topic (§5). */
linksRouter.post('/links', async (req, res, next) => {
  try {
    const body = createLinkSchema.parse(req.body);

    const [creator, product] = await Promise.all([getCreatorById(body.creator_id), getProductById(body.product_id)]);
    if (!creator) {
      res.status(404).json({ error: 'creator not found' });
      return;
    }
    if (!product) {
      res.status(404).json({ error: 'product not found' });
      return;
    }
    const seller = await getSellerById(product.seller_id);
    if (!seller) {
      res.status(404).json({ error: 'seller not found for this product' });
      return;
    }

    const topicId = await createTopic(`nanoaffiliate:${body.creator_id}:${body.product_id}`.slice(0, 100));

    await submitHcsMessage(topicId, {
      type: 'link_created',
      creator_id: body.creator_id,
      product_title: product.title,
      seller_id: seller.id,
      affiliate_tag: product.affiliate_tag,
      rate_unverified_per_tick: body.rate_unverified_per_tick,
      rate_verified_per_tick: body.rate_verified_per_tick,
      created_at: new Date().toISOString(),
    });

    const slug = randomBytes(6).toString('hex');
    const link = await createLink({
      creatorId: body.creator_id,
      productId: body.product_id,
      slug,
      hcsTopicId: topicId,
      rateUnverifiedPerTick: body.rate_unverified_per_tick,
      rateVerifiedPerTick: body.rate_verified_per_tick,
      ratePurchaseBonus: body.rate_purchase_bonus,
    });

    res.status(201).json({
      link,
      shareable_url: `${env.baseUrl}/t/${topicId}`,
      explorer_url: `https://hashscan.io/${env.hederaNetwork}/topic/${topicId}`,
    });
  } catch (err) {
    next(err);
  }
});

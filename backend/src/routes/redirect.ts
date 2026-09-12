import { createHash } from 'node:crypto';
import { Router, type Request } from 'express';
import { getLinkByTopicId } from '../db/links.js';
import { getProductById } from '../db/products.js';
import { createSession } from '../db/sessions.js';
import { submitHcsMessage } from '../hedera/hcs.js';
import { recordDiversityEntry } from '../lib/diversity.js';
import { renderAttentionPage } from '../web/attentionPage.js';

export const redirectRouter = Router();

function fingerprintFromRequest(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const ua = req.get('user-agent') ?? 'unknown';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex');
}

/** Link Redirect Service — architecture §6.3. The link's own topic ID is the URL. */
redirectRouter.get('/t/:topicId', async (req, res, next) => {
  try {
    const link = await getLinkByTopicId(req.params.topicId);
    if (!link) {
      res.status(404).json({ error: 'link not found' });
      return;
    }
    const product = await getProductById(link.product_id);
    if (!product) {
      res.status(404).json({ error: 'product not found for this link' });
      return;
    }

    const readerFingerprintHash = fingerprintFromRequest(req);
    const entryRef = typeof req.query.ref === 'string' ? req.query.ref : undefined;
    const session = await createSession({ linkId: link.id, readerFingerprintHash, entryRef });

    await recordDiversityEntry(link.id, req.ip ?? 'unknown', readerFingerprintHash);

    await submitHcsMessage(link.hcs_topic_id, {
      type: 'click',
      session_id: session.id,
      timestamp: new Date().toISOString(),
    });

    const purchaseUrl = `${product.source_url}${product.source_url.includes('?') ? '&' : '?'}tag=${encodeURIComponent(product.affiliate_tag)}`;

    res.type('html').send(
      renderAttentionPage({
        sessionId: session.id,
        productTitle: product.title,
        productImageUrl: product.image_url,
        priceDisplay: product.price_display,
        purchaseUrl,
      }),
    );
  } catch (err) {
    next(err);
  }
});

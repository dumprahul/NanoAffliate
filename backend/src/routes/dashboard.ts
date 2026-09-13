import { Router } from 'express';
import { listSellers } from '../db/sellers.js';
import { listProductsWithSellers } from '../db/products.js';
import { listCreators } from '../db/creators.js';
import { listLinksByCreator } from '../db/links.js';
import { listPayoutEvents } from '../db/payoutEvents.js';

/**
 * Read-only listing endpoints backing the creator dashboard (Products,
 * Links, Payouts pages). Every write path (creating sellers/products/links,
 * reporting conversions) already exists in the other route files — these
 * are purely the "list what's there" views the UI needs that had no reason
 * to exist before there was a dashboard to render them in.
 */
export const dashboardRouter = Router();

dashboardRouter.get('/sellers', async (_req, res, next) => {
  try {
    const sellers = await listSellers();
    res.json({ sellers });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/products', async (_req, res, next) => {
  try {
    const products = await listProductsWithSellers();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/creators', async (_req, res, next) => {
  try {
    const creators = await listCreators();
    res.json({ creators });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/links', async (req, res, next) => {
  try {
    const creatorId = typeof req.query.creator_id === 'string' ? req.query.creator_id : undefined;
    if (!creatorId) {
      res.status(400).json({ error: 'creator_id query param is required' });
      return;
    }
    const links = await listLinksByCreator(creatorId);
    res.json({ links });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/payouts', async (_req, res, next) => {
  try {
    const payouts = await listPayoutEvents();
    res.json({ payouts });
  } catch (err) {
    next(err);
  }
});

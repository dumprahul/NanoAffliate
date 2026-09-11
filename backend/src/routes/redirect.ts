import { Router } from 'express';

/**
 * Link Redirect Service — architecture/README.md §6.3.
 * GET /t/:topicId resolves a link's HCS topic ID to its product,
 * creates a session, logs a `click` message to the link's own topic,
 * and redirects to the attention page.
 *
 * TODO: wire to Supabase `links` table + HCS click logging (build order step 5).
 */
export const redirectRouter = Router();

redirectRouter.get('/t/:topicId', (req, res) => {
  res.status(501).json({ error: 'not implemented', topicId: req.params.topicId });
});

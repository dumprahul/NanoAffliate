import { Router } from 'express';
import { z } from 'zod';
import { signRequest } from '@worldcoin/idkit-core/signing';
import { env } from '../config/env.js';
import { getSessionById, setSessionVerified } from '../db/sessions.js';
import { getLinkById } from '../db/links.js';
import { submitHcsMessage } from '../hedera/hcs.js';

export const worldRouter = Router();

const HARD_CAP_MS = 2 * 60 * 60 * 1000; // matches queue/scheduler.ts's session hard cap

/**
 * World ID Selfie Check escalation — architecture §11 roadmap item, now built.
 * Triggered from the attention page (src/web/attentionPage.ts) when the
 * Oracle's `require_selfie_check` decision fires (scoreSession.ts, after 6
 * consecutive borderline ticks), or voluntarily by a reader wanting the
 * higher `rate_verified_per_tick` rate before being asked.
 *
 * Mirrors frontend/app/api/world/{rp-signature,verify}/route.ts exactly —
 * this is the same World app, but signed/verified here because sessions and
 * their `is_verified` flag live on this backend, not the Next.js frontend.
 */

const rpSignatureSchema = z.object({ session_id: z.string().uuid() });

worldRouter.post('/world/rp-signature', async (req, res, next) => {
  try {
    if (!env.worldId.configured) {
      res.status(500).json({ error: 'World ID is not configured on this backend.' });
      return;
    }
    const body = rpSignatureSchema.parse(req.body);
    const session = await getSessionById(body.session_id);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }

    // Scoped to this session — a signature (and the resulting proof) can't be
    // replayed against a different session's verification.
    const action = `selfie:${body.session_id}`;
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: env.worldId.signerKey,
      action,
    });

    res.json({
      app_id: env.worldId.appId,
      rp_id: env.worldId.rpId,
      action,
      signature: sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

const verifySchema = z.object({
  session_id: z.string().uuid(),
  // World's proof payload — shape varies by protocol version, verified opaquely by World itself.
  idkitResponse: z.record(z.string(), z.unknown()),
});

worldRouter.post('/world/verify', async (req, res, next) => {
  try {
    if (!env.worldId.configured) {
      res.status(500).json({ error: 'World ID is not configured on this backend.' });
      return;
    }
    const body = verifySchema.parse(req.body);
    const session = await getSessionById(body.session_id);
    if (!session) {
      res.status(404).json({ error: 'session not found' });
      return;
    }

    const worldRes = await fetch(`https://developer.world.org/api/v4/verify/${env.worldId.rpId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body.idkitResponse),
    });
    const worldBody: unknown = await worldRes.json().catch(() => null);

    if (!worldRes.ok) {
      const record = (worldBody && typeof worldBody === 'object' ? worldBody : {}) as Record<string, unknown>;
      const detail = ['detail', 'message', 'error', 'code']
        .map((k) => record[k])
        .find((v) => typeof v === 'string');
      res.status(400).json({ verified: false, error: detail ?? `World rejected the proof (${worldRes.status})` });
      return;
    }

    // Verified for the rest of this session — sessions are hard-capped at 2h
    // (queue/scheduler.ts) regardless, so there's no case where this outlives
    // the session it was requested for.
    const verifiedUntil = new Date(Date.now() + HARD_CAP_MS).toISOString();
    await setSessionVerified(body.session_id, verifiedUntil);

    const link = await getLinkById(session.link_id);
    if (link) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responses = (body.idkitResponse as any).responses;
      const nullifier = Array.isArray(responses) ? (responses[0]?.nullifier ?? null) : null;
      await submitHcsMessage(link.hcs_topic_id, {
        type: 'selfie_check_passed',
        session_id: body.session_id,
        nullifier,
      });
    }

    res.json({ verified: true, verified_until: verifiedUntil });
  } catch (err) {
    next(err);
  }
});

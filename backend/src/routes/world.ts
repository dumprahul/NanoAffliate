import { Router } from 'express';
import { z } from 'zod';
import { signRequest } from '@worldcoin/idkit-core/signing';
import { env } from '../config/env.js';
import { getSessionById, setSessionVerified } from '../db/sessions.js';
import { getLinkById } from '../db/links.js';
import { submitHcsMessage } from '../hedera/hcs.js';
import { getCreatorByWorldNullifier } from '../db/creators.js';

export const worldRouter = Router();

const HARD_CAP_MS = 2 * 60 * 60 * 1000; // matches queue/scheduler.ts's session hard cap

/**
 * World ID Selfie Check, two uses of the same primitive:
 *  1. Reader-side escalation (§11 roadmap item, now built) — /world/rp-signature
 *     and /world/verify, triggered from the attention page when the Oracle's
 *     `require_selfie_check` decision fires, or voluntarily for the higher rate.
 *  2. Creator login (frontend/app/login) — /world/login-signature and
 *     /world/login-verify. Looks the proof's nullifier up against
 *     creators.world_nullifier so the same verified human always lands on the
 *     same creator row, from any browser/device — real auth, not just a
 *     localStorage flag.
 *
 * Both live here (not in the Next.js frontend, which has its own copy of the
 * rp-signature/verify pair for the standalone /selfie test page) because
 * sessions and creators both live in this backend's Supabase access layer.
 */

interface WorldVerifyOutcome {
  ok: true;
  nullifier: string | null;
}
interface WorldVerifyFailure {
  ok: false;
  status: number;
  error: string;
}

/** Calls World's own verify endpoint and pulls the nullifier out of the (legacy v3) response shape. */
async function verifyWithWorld(idkitResponse: Record<string, unknown>): Promise<WorldVerifyOutcome | WorldVerifyFailure> {
  const worldRes = await fetch(`https://developer.world.org/api/v4/verify/${env.worldId.rpId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(idkitResponse),
  });
  const worldBody: unknown = await worldRes.json().catch(() => null);

  if (!worldRes.ok) {
    const record = (worldBody && typeof worldBody === 'object' ? worldBody : {}) as Record<string, unknown>;
    const detail = ['detail', 'message', 'error', 'code'].map((k) => record[k]).find((v) => typeof v === 'string');
    return { ok: false, status: worldRes.status, error: detail ?? `World rejected the proof (${worldRes.status})` };
  }

  const responses = (idkitResponse as { responses?: unknown }).responses;
  const nullifier =
    Array.isArray(responses) && responses[0] && typeof responses[0] === 'object'
      ? ((responses[0] as { nullifier?: unknown }).nullifier ?? null)
      : null;
  return { ok: true, nullifier: typeof nullifier === 'string' ? nullifier : null };
}

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

    const outcome = await verifyWithWorld(body.idkitResponse);
    if (!outcome.ok) {
      res.status(400).json({ verified: false, error: outcome.error });
      return;
    }

    // Verified for the rest of this session — sessions are hard-capped at 2h
    // (queue/scheduler.ts) regardless, so there's no case where this outlives
    // the session it was requested for.
    const verifiedUntil = new Date(Date.now() + HARD_CAP_MS).toISOString();
    await setSessionVerified(body.session_id, verifiedUntil);

    const link = await getLinkById(session.link_id);
    if (link) {
      await submitHcsMessage(link.hcs_topic_id, {
        type: 'selfie_check_passed',
        session_id: body.session_id,
        nullifier: outcome.nullifier,
      });
    }

    res.json({ verified: true, verified_until: verifiedUntil });
  } catch (err) {
    next(err);
  }
});

const LOGIN_ACTION = 'nanoaffiliate-creator-login';

/** Signs the login-flow's RP request — no session involved, this proves "a unique human," not "this reader." */
worldRouter.post('/world/login-signature', async (_req, res, next) => {
  try {
    if (!env.worldId.configured) {
      res.status(500).json({ error: 'World ID is not configured on this backend.' });
      return;
    }
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: env.worldId.signerKey,
      action: LOGIN_ACTION,
    });
    res.json({
      app_id: env.worldId.appId,
      rp_id: env.worldId.rpId,
      action: LOGIN_ACTION,
      signature: sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

const loginVerifySchema = z.object({
  idkitResponse: z.record(z.string(), z.unknown()),
});

/**
 * Verifies a login proof and looks up the creator by nullifier. Returns
 * `creator: null` when this is the first time this person has logged in —
 * the frontend then collects a payout wallet and calls POST /creators with
 * this same nullifier to finish onboarding.
 */
worldRouter.post('/world/login-verify', async (req, res, next) => {
  try {
    if (!env.worldId.configured) {
      res.status(500).json({ error: 'World ID is not configured on this backend.' });
      return;
    }
    const body = loginVerifySchema.parse(req.body);
    const outcome = await verifyWithWorld(body.idkitResponse);
    if (!outcome.ok) {
      res.status(400).json({ verified: false, error: outcome.error });
      return;
    }
    if (!outcome.nullifier) {
      res.status(400).json({ verified: false, error: 'World returned no nullifier for this proof.' });
      return;
    }

    const creator = await getCreatorByWorldNullifier(outcome.nullifier);
    res.json({ verified: true, nullifier: outcome.nullifier, creator });
  } catch (err) {
    next(err);
  }
});

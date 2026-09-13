import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";

/**
 * Signs an RP (Relying Party) request for World ID — https://docs.world.org/world-id/idkit/integrate.
 * MUST stay server-side: this is the one place `SIGNER_KEY` (from frontend/.env.local,
 * deliberately NOT `NEXT_PUBLIC_*`) is read. World's own docs are explicit: "Never
 * generate RP signatures on the client and never expose your RP signing key."
 *
 * `APP_ID` and `RP_ID` are public identifiers (safe to hand to the client), but are
 * still only read here and returned in the response — the client never needs its own
 * copy of them, so there's nothing else to keep in sync.
 */
export const runtime = "nodejs";

// Fixed for now — this is the standalone Selfie Check test route (`/selfie`), not yet
// wired into a real attention session. Once that happens, `action` should become
// per-session (e.g. `selfie-check:${sessionId}`) so a proof can't be replayed across
// sessions.
const ACTION = "nanoaffiliate-selfie-check";

export async function POST() {
  const signingKeyHex = process.env.SIGNER_KEY;
  const appId = process.env.APP_ID;
  const rpId = process.env.RP_ID;

  if (!signingKeyHex || !appId || !rpId) {
    return NextResponse.json(
      { error: "World ID isn't configured — set APP_ID, RP_ID and SIGNER_KEY in frontend/.env.local." },
      { status: 500 },
    );
  }

  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex,
      action: ACTION,
    });

    return NextResponse.json({
      app_id: appId,
      rp_id: rpId,
      action: ACTION,
      signature: sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not sign the World ID request." },
      { status: 500 },
    );
  }
}

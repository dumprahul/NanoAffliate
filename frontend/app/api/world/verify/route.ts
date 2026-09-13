import { NextResponse } from "next/server";
import type { IDKitResult, ResponseItemV3 } from "@worldcoin/idkit-core";

/**
 * Verifies a completed World ID proof against World's own endpoint —
 * https://docs.world.org/world-id/idkit/integrate, "Server-Side Verification".
 * `selfieCheckLegacy` only ever returns protocol_version "3.0" proofs, whose
 * `nullifier` lives nested in `responses[0]`, not at the top level — the one
 * shape mistake every first integration makes (confirmed against a real,
 * completed proof in /testworld's own reference implementation).
 */
export const runtime = "nodejs";

interface VerifyRequestBody {
  idkitResponse: IDKitResult;
}

function isV3Response(result: IDKitResult): result is IDKitResult & { responses: ResponseItemV3[] } {
  return result.protocol_version === "3.0";
}

export async function POST(request: Request) {
  const rpId = process.env.RP_ID;
  if (!rpId) {
    return NextResponse.json(
      { error: "World ID isn't configured — set RP_ID in frontend/.env.local." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as VerifyRequestBody | null;
  if (!body?.idkitResponse) {
    return NextResponse.json({ error: "idkitResponse is required" }, { status: 400 });
  }

  let worldRes: Response;
  try {
    worldRes = await fetch(`https://developer.world.org/api/v4/verify/${rpId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body.idkitResponse),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach World's verify endpoint." }, { status: 502 });
  }

  const worldBody: unknown = await worldRes.json().catch(() => null);

  if (!worldRes.ok) {
    // World's rejection detail (environment_mismatch, expired_signature, etc.) lives
    // in one of these fields depending on the failure — surface whichever is present
    // rather than collapsing everything to "verification failed".
    const record = (worldBody && typeof worldBody === "object" ? worldBody : {}) as Record<string, unknown>;
    const detail = ["detail", "message", "error", "code"].map((k) => record[k]).find((v) => typeof v === "string");
    return NextResponse.json(
      { verified: false, error: detail ?? `World rejected the proof (${worldRes.status})`, raw: worldBody },
      { status: 400 },
    );
  }

  const nullifier = isV3Response(body.idkitResponse) ? (body.idkitResponse.responses[0]?.nullifier ?? null) : null;

  return NextResponse.json({
    verified: true,
    nullifier,
    protocol_version: body.idkitResponse.protocol_version,
    raw: worldBody,
  });
}

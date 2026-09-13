"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Check, ScanFace, X } from "lucide-react";
import QRCode from "qrcode";
import type { IDKitInviteCodeRequest } from "@worldcoin/idkit-core";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";

const EASE = [0.16, 1, 0.3, 1] as const;

type Status = "idle" | "signing" | "awaiting-scan" | "verifying" | "verified" | "error";

interface VerifyResult {
  nullifier: string | null;
  protocol_version: string;
}

export default function SelfiePage() {
  return (
    <ClientOnly>
      <SelfiePageContent />
    </ClientOnly>
  );
}

function SelfiePageContent() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectorUri, setConnectorUri] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped on every start()/cancel() — lets an in-flight attempt's async
  // continuation notice it's been superseded (cancelled, or a new attempt
  // started) and skip its own state updates instead of racing the reset.
  const attemptRef = useRef(0);

  async function start() {
    const attempt = ++attemptRef.current;
    setStatus("signing");
    setError(null);
    setResult(null);

    try {
      // Step 1 — sign the request server-side. The signing key never reaches this page.
      const sigRes = await fetch("/api/world/rp-signature", { method: "POST" });
      const sigBody = await sigRes.json();
      if (!sigRes.ok) throw new Error(sigBody.error ?? "Could not get an RP signature.");

      // Step 2 — build the real IDKit request, loaded on demand (heavy WASM bridge SDK).
      const { IDKit, selfieCheckLegacy } = await import("@worldcoin/idkit-core");

      const request = await IDKit.requestWithInviteCode({
        app_id: sigBody.app_id,
        action: sigBody.action,
        allow_legacy_proofs: true,
        environment: "production", // a real phone's real World App always generates production proofs
        rp_context: {
          rp_id: sigBody.rp_id,
          nonce: sigBody.nonce,
          created_at: sigBody.created_at,
          expires_at: sigBody.expires_at,
          signature: sigBody.signature,
        },
      }).preset(selfieCheckLegacy({ signal: crypto.randomUUID() }));

      if (attempt !== attemptRef.current) return; // superseded while we were signing/building

      setConnectorUri(request.connectorURI);
      setExpiresAt((request as IDKitInviteCodeRequest).expiresAt);
      setQrDataUrl(await QRCode.toDataURL(request.connectorURI, { width: 240, margin: 1 }));
      setStatus("awaiting-scan");

      // Step 3 — poll until the user completes (or rejects) the check in World App.
      abortRef.current = new AbortController();
      const completion = await request.pollUntilCompletion({ signal: abortRef.current.signal });

      if (attempt !== attemptRef.current) return; // cancelled — cancel() already reset the UI

      if (!completion.success) {
        setError(`World App reported: ${completion.error}`);
        setStatus("error");
        return;
      }

      // Step 4 — verify the proof server-side.
      setStatus("verifying");
      const verifyRes = await fetch("/api/world/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idkitResponse: completion.result }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok || !verifyBody.verified) {
        throw new Error(verifyBody.error ?? "World rejected the proof.");
      }

      if (attempt !== attemptRef.current) return;
      setResult({ nullifier: verifyBody.nullifier, protocol_version: verifyBody.protocol_version });
      setStatus("verified");
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function cancel() {
    attemptRef.current++; // supersede this attempt so its pollUntilCompletion continuation is a no-op
    abortRef.current?.abort();
    setStatus("idle");
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setQrDataUrl(null);
    setConnectorUri(null);
    setResult(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="label text-center">World ID</p>
        <h1 className="display mt-2 text-center text-[26px]">Selfie Check</h1>
        <p className="mt-3 text-center text-[13px] leading-[1.6] text-subtle">
          A real, biometric liveness check via World App — no Orb required. Verified readers earn
          NanoAffiliate&apos;s higher attention rate.
        </p>

        <div className="mt-8 border border-line-soft bg-surface p-6">
          <AnimatePresence mode="wait">
            {status === "idle" && (
              <Phase key="idle">
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <ScanFace size={32} strokeWidth={1.25} className="text-ink-2" />
                  <PrimaryButton as="button" onClick={start} className="w-full justify-center">
                    Start Selfie Check
                  </PrimaryButton>
                </div>
              </Phase>
            )}

            {status === "signing" && (
              <Phase key="signing">
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Ping />
                  <p className="text-[12.5px] text-ink-2">Requesting a signed request…</p>
                </div>
              </Phase>
            )}

            {status === "awaiting-scan" && qrDataUrl && connectorUri && (
              <Phase key="scan">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="border border-line-soft bg-bg p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} width={200} height={200} alt="World App QR code" />
                  </div>
                  <p className="text-[12.5px] text-ink-2">Scan with World App, or open directly:</p>
                  <a
                    href={connectorUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline inline-flex items-center gap-1.5 break-all text-[12px] text-muted"
                  >
                    Open in World App
                    <ArrowUpRight size={11} strokeWidth={1.75} />
                  </a>
                  {expiresAt && (
                    <p className="text-[11px] text-subtle">
                      Code expires {new Date(expiresAt * 1000).toLocaleTimeString()}
                    </p>
                  )}
                  <SecondaryButton as="button" onClick={cancel} className="w-full justify-center">
                    Cancel
                  </SecondaryButton>
                </div>
              </Phase>
            )}

            {status === "verifying" && (
              <Phase key="verifying">
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Ping />
                  <p className="text-[12.5px] text-ink-2">Proof received — verifying with World…</p>
                </div>
              </Phase>
            )}

            {status === "verified" && result && (
              <Phase key="verified">
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg">
                    <Check size={22} strokeWidth={1.75} className="text-accent" />
                  </div>
                  <p className="text-[14px] text-ink">Selfie Check passed</p>
                  <div className="w-full border border-line-soft bg-bg px-4 py-3 text-left">
                    <Row label="protocol" value={result.protocol_version} />
                    <Row label="nullifier" value={result.nullifier ?? "—"} />
                  </div>
                  <p className="text-[11px] leading-[1.6] text-subtle">
                    This is a standalone test of the flow — it doesn&apos;t yet mark any reading
                    session as verified.
                  </p>
                  <SecondaryButton as="button" onClick={reset} className="w-full justify-center">
                    Run again
                  </SecondaryButton>
                </div>
              </Phase>
            )}

            {status === "error" && (
              <Phase key="error">
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50">
                    <X size={20} strokeWidth={1.5} className="text-red-600" />
                  </div>
                  <p className="text-[13.5px] text-ink">Selfie Check didn&apos;t complete</p>
                  <p className="max-w-xs text-[12px] leading-[1.6] text-subtle">{error}</p>
                  <SecondaryButton as="button" onClick={reset} className="w-full justify-center">
                    Try again
                  </SecondaryButton>
                </div>
              </Phase>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-[11px] leading-[1.6] text-subtle">
          Selfie Check is an access-gated World preview feature — if this app hasn&apos;t been
          granted access yet, World App may report the credential as unavailable. That&apos;s a
          real result from World, not a bug here.
        </p>
      </div>
    </div>
  );
}

function Phase({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Ping() {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-line"
          initial={{ scale: 0.5, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: i * 0.5 }}
        />
      ))}
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-bg">
        <ScanFace size={16} strokeWidth={1.5} className="text-ink-2" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 font-mono text-[11px]">
      <span className="text-subtle">{label}</span>
      <span className="truncate text-ink-2">{value}</span>
    </div>
  );
}

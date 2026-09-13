"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, ScanFace, X } from "lucide-react";
import QRCode from "qrcode";
import type { IDKitInviteCodeRequest } from "@worldcoin/idkit-core";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { WalletConnectButton } from "@/components/ui/WalletConnectButton";
import { WaveCanvas } from "@/components/WaveCanvas";
import { useCreatorIdentity } from "@/lib/identity";
import { ApiError, createCreator, worldLoginSignature, worldLoginVerify } from "@/lib/api";
import Image from "next/image";

const EASE = [0.16, 1, 0.3, 1] as const;

type Status = "idle" | "signing" | "awaiting-scan" | "verifying" | "need-wallet" | "done" | "error";

export default function LoginPage() {
  return (
    <ClientOnly>
      <LoginPageContent />
    </ClientOnly>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const { setCreator } = useCreatorIdentity();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectorUri, setConnectorUri] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [nullifier, setNullifier] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(0);

  async function start() {
    const attempt = ++attemptRef.current;
    setStatus("signing");
    setError(null);

    try {
      const sig = await worldLoginSignature();

      const { IDKit, selfieCheckLegacy } = await import("@worldcoin/idkit-core");
      const request = await IDKit.requestWithInviteCode({
        app_id: sig.app_id as `app_${string}`,
        action: sig.action,
        allow_legacy_proofs: true,
        environment: "production",
        rp_context: {
          rp_id: sig.rp_id,
          nonce: sig.nonce,
          created_at: sig.created_at,
          expires_at: sig.expires_at,
          signature: sig.signature,
        },
      }).preset(selfieCheckLegacy({ signal: crypto.randomUUID() }));

      if (attempt !== attemptRef.current) return;
      setConnectorUri(request.connectorURI);
      setExpiresAt((request as IDKitInviteCodeRequest).expiresAt);
      setQrDataUrl(await QRCode.toDataURL(request.connectorURI, { width: 220, margin: 1 }));
      setStatus("awaiting-scan");

      abortRef.current = new AbortController();
      const completion = await request.pollUntilCompletion({ signal: abortRef.current.signal });
      if (attempt !== attemptRef.current) return;

      if (!completion.success) {
        setError(`World App reported: ${completion.error}`);
        setStatus("error");
        return;
      }

      setStatus("verifying");
      const verifyBody = await worldLoginVerify(completion.result);
      if (attempt !== attemptRef.current) return;

      setNullifier(verifyBody.nullifier);

      if (verifyBody.creator) {
        setCreator({ id: verifyBody.creator.id, hedera_account_id: verifyBody.creator.hedera_account_id });
        setStatus("done");
        setTimeout(() => router.push("/products"), 700);
      } else {
        // First time this person has verified — no creator row yet, need a payout wallet to create one.
        setStatus("need-wallet");
      }
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  async function finishOnboarding(hederaAccountId: string) {
    if (!nullifier) return;
    setStatus("verifying");
    setError(null);
    try {
      const creator = await createCreator({ hedera_account_id: hederaAccountId, world_nullifier: nullifier });
      setCreator({ id: creator.id, hedera_account_id: creator.hedera_account_id });
      setStatus("done");
      setTimeout(() => router.push("/products"), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not finish creating your account.");
      setStatus("error");
    }
  }

  function cancel() {
    attemptRef.current++;
    abortRef.current?.abort();
    setStatus("idle");
  }

  function reset() {
    attemptRef.current++;
    setStatus("idle");
    setError(null);
    setQrDataUrl(null);
    setConnectorUri(null);
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Left — the actual login: World ID Selfie Check */}
      <div className="flex w-full flex-col justify-center px-8 py-10 sm:px-14 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Image src="/brand/nanoaffiliate-logo.png" alt="NanoAffiliate" width={360} height={120} className="h-16 w-auto" priority />

          <div className="mt-16">
            <h1 className="display text-[42px] sm:text-[46px]">
              Log in to
              <br />
              <span className="text-muted">NanoAffiliate</span>
            </h1>
            <p className="mt-5 text-[13.5px] leading-[1.6] text-subtle">
              No email, no password — prove you&apos;re a unique human with a real biometric
              Selfie Check via World App, then connect the wallet your payouts go to.
            </p>
          </div>

          <div className="mt-10 border border-line-soft bg-surface p-6">
            <AnimatePresence mode="wait">
              {status === "idle" && (
                <Phase key="idle">
                  <button
                    type="button"
                    onClick={start}
                    className="flex w-full items-center justify-between gap-3 bg-ink px-5 py-3.5 text-[13.5px] font-medium text-bg transition-colors hover:bg-ink-2"
                  >
                    <span className="flex items-center gap-2.5">
                      <ScanFace size={16} strokeWidth={1.75} />
                      Continue with World ID
                    </span>
                    <ArrowRight size={15} strokeWidth={1.75} />
                  </button>
                </Phase>
              )}

              {(status === "signing" || status === "verifying") && (
                <Phase key="loading">
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Ping />
                    <p className="text-[12.5px] text-ink-2">
                      {status === "signing" ? "Requesting a signed request…" : "Verifying with World…"}
                    </p>
                  </div>
                </Phase>
              )}

              {status === "awaiting-scan" && qrDataUrl && connectorUri && (
                <Phase key="scan">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="border border-line-soft bg-bg p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} width={188} height={188} alt="World App QR code" />
                    </div>
                    <p className="text-[12px] text-ink-2">Scan with World App, or open directly:</p>
                    <a
                      href={connectorUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline inline-flex items-center gap-1.5 text-[12px] text-muted"
                    >
                      Open in World App
                      <ArrowUpRight size={11} strokeWidth={1.75} />
                    </a>
                    {expiresAt && (
                      <p className="text-[11px] text-subtle">
                        Code expires {new Date(expiresAt * 1000).toLocaleTimeString()}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={cancel}
                      className="mt-1 w-full border border-line-soft py-2.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-2"
                    >
                      Cancel
                    </button>
                  </div>
                </Phase>
              )}

              {status === "need-wallet" && (
                <Phase key="need-wallet">
                  <div className="flex flex-col items-center gap-4 py-2 text-center">
                    <Check size={20} strokeWidth={1.75} className="text-accent" />
                    <p className="text-[13px] text-ink">Selfie Check passed — you&apos;re new here.</p>
                    <p className="text-[12px] leading-[1.6] text-subtle">
                      Connect the wallet your attention-tick and purchase-bonus payouts should go
                      to, and we&apos;ll finish setting up your account.
                    </p>
                    <WalletConnectButton label="Connect payout wallet" onConnected={finishOnboarding} />
                  </div>
                </Phase>
              )}

              {status === "done" && (
                <Phase key="done">
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg">
                      <Check size={20} strokeWidth={1.75} className="text-accent" />
                    </div>
                    <p className="text-[13px] text-ink">Logged in — taking you to your dashboard…</p>
                  </div>
                </Phase>
              )}

              {status === "error" && (
                <Phase key="error">
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50">
                      <X size={18} strokeWidth={1.5} className="text-red-600" />
                    </div>
                    <p className="text-[12.5px] leading-[1.6] text-subtle">{error}</p>
                    <button
                      type="button"
                      onClick={reset}
                      className="w-full border border-line-soft py-2.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-2"
                    >
                      Try again
                    </button>
                  </div>
                </Phase>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-6 text-center text-[11px] leading-[1.6] text-subtle">
            Selfie Check is an access-gated World preview feature — if this app hasn&apos;t been
            granted access yet, World App may report the credential as unavailable.
          </p>
        </div>
      </div>

      {/* Right — illustration panel */}
      <div className="relative hidden overflow-hidden border-l border-line-soft bg-bg lg:flex lg:w-1/2 lg:flex-col">
        <div className="absolute inset-0">
          <WaveCanvas />
        </div>

        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <div className="flex items-start justify-between">
            <div>
              <p className="label">Global reach</p>
              <h2 className="display mt-2 max-w-[16ch] text-[26px]">More creators. A bigger tomorrow.</h2>
            </div>
            <div className="text-right">
              <p className="label">Trusted by</p>
              <p className="tnum mt-2 text-[26px] text-ink">10,000+</p>
              <p className="text-[11.5px] text-subtle">creators worldwide</p>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="label">Built for</p>
              <h2 className="display mt-2 max-w-[16ch] text-[24px]">A more open creator economy.</h2>
            </div>
            <div className="flex flex-col items-end gap-3 text-right">
              <Callout label="Real-time analytics" />
              <Callout label="Secure payouts" />
            </div>
          </div>
        </div>

        <div className="hatch h-3" />
        <div className="flex items-center justify-between border-t border-line-soft px-10 py-4 text-[11px] text-subtle xl:px-14">
          <span>© {new Date().getFullYear()} NanoAffiliate. All rights reserved.</span>
          <div className="flex gap-5">
            <span>Privacy Policy</span>
            <span>Terms &amp; Conditions</span>
            <span>Contact</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Callout({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label">{label}</span>
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
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
    <div className="relative flex h-12 w-12 items-center justify-center">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-line"
          initial={{ scale: 0.5, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: i * 0.5 }}
        />
      ))}
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg">
        <ScanFace size={14} strokeWidth={1.5} className="text-ink-2" />
      </div>
    </div>
  );
}

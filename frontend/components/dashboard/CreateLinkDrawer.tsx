"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Copy, Link2, X } from "lucide-react";
import type { ProductWithSeller } from "@/lib/types";
import { PrimaryButton, SecondaryButton } from "../ui/Button";
import { VideoLoop } from "../ui/VideoLoop";

const EASE = [0.16, 1, 0.3, 1] as const;

type Rates = {
  rate_unverified_per_tick: string;
  rate_verified_per_tick: string;
  rate_purchase_bonus: string;
};

const DEFAULT_RATES: Rates = {
  rate_unverified_per_tick: "0.001",
  rate_verified_per_tick: "0.002",
  rate_purchase_bonus: "0.05",
};

/** Mirrors the real backend sequence for POST /links, purely for the minting animation's pacing. */
const MINT_STAGES = [
  "Creating HCS topic…",
  "Writing link_created manifest…",
  "Assigning topic ID…",
];

type Status = "idle" | "submitting" | "done";

/**
 * Mirrors the real POST /links request body 1:1 (architecture §6.2 /
 * routes/links.ts on the backend). Submission is a local stub — no fetch
 * call yet — since the API isn't wired up. Wiring this up later is just
 * replacing handleSubmit's setTimeout chain with the real request.
 */
export function CreateLinkDrawer({
  product,
  onClose,
}: {
  product: ProductWithSeller;
  onClose: () => void;
}) {
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState(0);
  const [visible, setVisible] = useState(true);

  const update = (field: keyof Rates) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setRates((r) => ({ ...r, [field]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setStage(0);
  }

  // Stub — backend isn't wired up yet. Real call:
  // POST /links { creator_id, product_id: product.id, ...rates }
  useEffect(() => {
    if (status !== "submitting") return;
    if (stage >= MINT_STAGES.length) {
      const t = setTimeout(() => setStatus("done"), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage((s) => s + 1), 550);
    return () => clearTimeout(t);
  }, [status, stage]);

  // AnimatePresence's onExitComplete (below) calls the real onClose once the
  // exit animation finishes — this just starts that animation.
  function handleClose() {
    setVisible(false);
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            aria-label="Close"
            onClick={handleClose}
            className="absolute inset-0 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          />
          <motion.div
            className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-bg"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <p className="label">Create link</p>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="text-ink-2 transition-colors hover:text-ink"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {status === "done" ? (
                  <PhaseWrap key="done">
                    <SuccessState product={product} onClose={handleClose} />
                  </PhaseWrap>
                ) : status === "submitting" ? (
                  <PhaseWrap key="submitting">
                    <MintingState stage={stage} />
                  </PhaseWrap>
                ) : (
                  <PhaseWrap key="form">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                      <div>
                        <p className="text-[13px] text-muted">Minting a link for</p>
                        <p className="mt-1 text-[15px] leading-snug text-ink">
                          {product.title}
                        </p>
                      </div>

                      <RateField
                        label="Unverified rate"
                        hint="per 5s tick, unverified reader"
                        value={rates.rate_unverified_per_tick}
                        onChange={update("rate_unverified_per_tick")}
                      />
                      <RateField
                        label="Verified rate"
                        hint="per 5s tick, Selfie-Check verified"
                        value={rates.rate_verified_per_tick}
                        onChange={update("rate_verified_per_tick")}
                      />
                      <RateField
                        label="Purchase bonus"
                        hint="one-time, on confirmed conversion"
                        value={rates.rate_purchase_bonus}
                        onChange={update("rate_purchase_bonus")}
                      />

                      <div className="border border-line-soft bg-surface px-4 py-3">
                        <p className="text-[11.5px] leading-[1.6] text-subtle">
                          This creates a dedicated HCS topic and writes the{" "}
                          <span className="font-mono text-ink-2">link_created</span>{" "}
                          manifest as its first message. The topic ID becomes the
                          shareable link.
                        </p>
                      </div>

                      <PrimaryButton as="button" type="submit" className="w-full justify-center">
                        Create link
                      </PrimaryButton>
                    </form>
                  </PhaseWrap>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PhaseWrap({ children }: { children: React.ReactNode }) {
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

function RateField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
      <span className="ml-2 text-[11.5px] text-subtle">{hint}</span>
      <div className="mt-2 flex items-center border border-line-soft focus-within:border-line">
        <input
          type="number"
          step="0.0001"
          min="0"
          value={value}
          onChange={onChange}
          className="w-full bg-transparent px-3 py-2.5 font-mono text-[13px] text-ink focus:outline-none"
        />
        <span className="px-3 font-mono text-[12px] text-subtle">ℏ</span>
      </div>
    </label>
  );
}

/** Restrained radar-ping animation while the (mocked) mint is "in flight". */
function MintingState({ stage }: { stage: number }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-line"
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.6,
            }}
          />
        ))}
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface">
          <Link2 size={20} strokeWidth={1.5} className="text-ink-2" />
        </div>
      </div>

      <p className="mt-8 text-[13.5px] text-ink">Minting your link on Hedera</p>

      <div className="mt-4 flex flex-col items-start gap-2">
        {MINT_STAGES.map((label, i) => {
          const complete = i < stage;
          const active = i === stage;
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: complete || active ? 1 : 0.35, x: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-center gap-2 text-[12px]"
            >
              {complete ? (
                <Check size={12} strokeWidth={2.5} className="shrink-0 text-accent" />
              ) : (
                <span
                  className={`h-[7px] w-[7px] shrink-0 rounded-full border border-line-soft ${
                    active ? "bg-ink" : "bg-transparent"
                  }`}
                />
              )}
              <span className={complete ? "text-muted line-through" : "text-ink-2"}>
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SuccessState({
  product,
  onClose,
}: {
  product: ProductWithSeller;
  onClose: () => void;
}) {
  const [previewTopic] = useState(
    () => `0.0.${Math.floor(1_000_0000 + Math.random() * 9_000_0000)}`,
  );
  const [copied, setCopied] = useState(false);
  const shareUrl = `nanoaffiliate.io/t/${previewTopic}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — nothing user-blocking to fall back to
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="overflow-hidden border border-line bg-surface"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <Check size={13} strokeWidth={2.5} className="text-accent" />
            HCS topic created
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="label">Hedera testnet</span>
          </span>
        </div>
        <VideoLoop src="topic-created" warm className="w-full" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: EASE }}
      >
        <p className="text-[13px] text-muted">Link ready for</p>
        <p className="mt-1 text-[15px] leading-snug text-ink">{product.title}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.22, ease: EASE }}
        className="border border-line bg-surface"
      >
        <div className="border-b border-line-soft px-4 py-2.5">
          <p className="label">Shareable link (preview)</p>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="truncate font-mono text-[12.5px] text-ink">{shareUrl}</p>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy link"
            className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            {copied ? (
              <>
                <Check size={12} strokeWidth={2.5} className="text-accent" />
                Copied
              </>
            ) : (
              <>
                <Copy size={12} strokeWidth={1.75} />
                Copy
              </>
            )}
          </button>
        </div>
      </motion.div>

      <motion.a
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.28, ease: EASE }}
        href={`https://hashscan.io/testnet/topic/${previewTopic}`}
        target="_blank"
        rel="noopener noreferrer"
        className="link-underline inline-flex w-fit items-center gap-1.5 text-[12.5px] text-muted"
      >
        View on HashScan (once minted)
        <ArrowUpRight size={12} strokeWidth={1.75} />
      </motion.a>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.34, ease: EASE }}
        className="border border-line-soft bg-surface px-4 py-3"
      >
        <p className="text-[11.5px] leading-[1.6] text-subtle">
          Preview only — not connected to the API yet. The capture above shows a
          real topic being minted on testnet.
        </p>
      </motion.div>

      <SecondaryButton as="button" onClick={onClose} className="w-full justify-center">
        Done
      </SecondaryButton>
    </div>
  );
}

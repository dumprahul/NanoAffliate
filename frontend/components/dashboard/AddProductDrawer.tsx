"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import Link from "next/link";
import { ApiError, createProduct, listSellers } from "@/lib/api";
import { PrimaryButton } from "../ui/Button";
import type { Product, Seller } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AddProductDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (product: Product) => void;
}) {
  const [visible, setVisible] = useState(true);
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [sellerId, setSellerId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [affiliateTag, setAffiliateTag] = useState("");
  const [escrowBudget, setEscrowBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSellers()
      .then((list) => {
        setSellers(list);
        if (list[0]) setSellerId(list[0].id);
      })
      .catch(() => setSellers([]));
  }, []);

  function handleClose() {
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sellerId) return;
    setBusy(true);
    setError(null);
    try {
      const product = await createProduct(sellerId, {
        source_url: sourceUrl.trim(),
        title: title.trim(),
        image_url: imageUrl.trim() || undefined,
        price_display: priceDisplay.trim() || undefined,
        affiliate_tag: affiliateTag.trim(),
        escrow_budget_hbar: escrowBudget.trim() ? Number(escrowBudget) : undefined,
      });
      onCreated(product);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create product.");
    } finally {
      setBusy(false);
    }
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
              <p className="label">Add product</p>
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
              {sellers !== null && sellers.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[13px] text-ink-2">
                    No sellers onboarded yet — a product needs a seller to belong to.
                  </p>
                  <Link href="/settings" className="link-underline text-[12.5px] font-medium text-ink-2">
                    Onboard a seller in Settings →
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <Field label="Seller">
                    <select
                      required
                      value={sellerId}
                      onChange={(e) => setSellerId(e.target.value)}
                      className="w-full border border-line-soft bg-transparent px-3 py-2.5 font-mono text-[12.5px] text-ink focus:border-line focus:outline-none"
                    >
                      {sellers === null && <option>Loading…</option>}
                      {sellers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.hedera_account_id}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Product title">
                    <TextInput required value={title} onChange={setTitle} placeholder="Chairsu KL-49 Round Side Table" />
                  </Field>

                  <Field label="Source URL" hint="the real product page — buyers land here after your affiliate tag is appended">
                    <TextInput
                      required
                      type="url"
                      value={sourceUrl}
                      onChange={setSourceUrl}
                      placeholder="https://www.amazon.com/dp/…"
                    />
                  </Field>

                  <Field label="Affiliate tag">
                    <TextInput required value={affiliateTag} onChange={setAffiliateTag} placeholder="chairsu-kl49-21" />
                  </Field>

                  <Field label="Price display" hint="optional, free text">
                    <TextInput value={priceDisplay} onChange={setPriceDisplay} placeholder="$110.99" />
                  </Field>

                  <Field label="Image URL" hint="optional">
                    <TextInput type="url" value={imageUrl} onChange={setImageUrl} placeholder="https://…" />
                  </Field>

                  <Field
                    label="Escrow budget"
                    hint="optional per-product spend cap, in ℏ — leave blank for unlimited"
                  >
                    <div className="flex items-center border border-line-soft focus-within:border-line">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={escrowBudget}
                        onChange={(e) => setEscrowBudget(e.target.value)}
                        className="w-full bg-transparent px-3 py-2.5 font-mono text-[13px] text-ink focus:outline-none"
                      />
                      <span className="px-3 font-mono text-[12px] text-subtle">ℏ</span>
                    </div>
                  </Field>

                  {error && <p className="text-[12px] text-red-600">{error}</p>}

                  <PrimaryButton as="button" type="submit" disabled={busy || !sellerId} className="w-full justify-center">
                    {busy ? "Creating…" : "Add product"}
                  </PrimaryButton>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
      {hint && <span className="ml-2 text-[11px] text-subtle">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextInput({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-line-soft bg-transparent px-3 py-2.5 text-[13px] text-ink focus:border-line focus:outline-none"
    />
  );
}

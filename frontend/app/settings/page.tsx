"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { useCreatorIdentity } from "@/lib/identity";
import { ApiError, createSeller, getEscrowBalance, listSellers } from "@/lib/api";
import { createCreator } from "@/lib/api";
import { hashscanAccountUrl, timeAgo } from "@/lib/format";
import type { Seller } from "@/lib/types";

export default function SettingsPage() {
  return (
    <ClientOnly>
      <SettingsPageContent />
    </ClientOnly>
  );
}

function SettingsPageContent() {
  return (
    <div className="flex h-screen flex-col bg-bg">
      <Topbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-10">
            <div>
              <p className="label">Settings</p>
              <h1 className="display mt-2 text-[26px]">Identity &amp; sellers</h1>
              <p className="mt-2 text-[13px] text-subtle">
                There&apos;s no login here — every id below is a real row in the backend, and this
                browser just remembers which ones are yours.
              </p>
            </div>

            <CreatorIdentitySection />
            <SellersSection />
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line-soft">
      <div className="border-b border-line-soft px-5 py-3">
        <p className="label">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function CreatorIdentitySection() {
  const { creator, setCreator, clearCreator } = useCreatorIdentity();
  const [hederaAccountId, setHederaAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createCreator({ hedera_account_id: hederaAccountId.trim() });
      setCreator({ id: created.id, hedera_account_id: created.hedera_account_id });
      setHederaAccountId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create identity.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Your creator identity">
      {creator ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted">Links you create are minted for</p>
            <p className="mt-1 font-mono text-[14px] text-ink">{creator.hedera_account_id}</p>
            <p className="mt-0.5 font-mono text-[11px] text-subtle">creator id: {creator.id}</p>
          </div>
          <SecondaryButton as="button" onClick={clearCreator} className="shrink-0">
            Forget identity
          </SecondaryButton>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <p className="text-[12.5px] text-subtle">
            Enter the Hedera testnet account ID that should receive your attention-tick and
            purchase-bonus payouts. This calls <span className="font-mono text-ink-2">POST /creators</span>{" "}
            once and remembers the returned id in this browser.
          </p>
          <div className="flex items-center gap-3">
            <input
              required
              value={hederaAccountId}
              onChange={(e) => setHederaAccountId(e.target.value)}
              placeholder="0.0.xxxxxxx"
              className="w-full max-w-xs border border-line-soft bg-transparent px-3 py-2.5 font-mono text-[13px] text-ink focus:border-line focus:outline-none"
            />
            <PrimaryButton as="button" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create identity"}
            </PrimaryButton>
          </div>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </form>
      )}
    </SectionCard>
  );
}

function SellersSection() {
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [justCreated, setJustCreated] = useState<{
    seller: Seller;
    fund_this_account: string;
    webhook_secret: string;
  } | null>(null);

  async function refresh() {
    try {
      setSellers(await listSellers());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sellers.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SectionCard title="Sellers on the marketplace">
      {error && (
        <p className="mb-4 border border-line-soft bg-surface px-3 py-2 text-[12px] text-red-600">
          {error}
        </p>
      )}

      {justCreated && (
        <div className="mb-5 border border-ink bg-surface px-4 py-3">
          <p className="text-[12.5px] font-medium text-ink">
            Seller onboarded — fund its escrow account before creating links against it.
          </p>
          <dl className="mt-2 space-y-1.5 font-mono text-[11.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">fund_this_account</dt>
              <dd className="text-ink-2">{justCreated.fund_this_account}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">webhook_secret</dt>
              <dd className="truncate text-ink-2">{justCreated.webhook_secret}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] leading-[1.6] text-subtle">
            Shown once. Send testnet HBAR from your own wallet to fund_this_account, and store
            webhook_secret if you&apos;ll sign /webhooks/purchase-confirmed requests for this seller.
          </p>
        </div>
      )}

      <div className="flex flex-col divide-y divide-line-soft">
        {sellers === null ? (
          <p className="py-3 text-[12.5px] text-subtle">Loading…</p>
        ) : sellers.length === 0 ? (
          <p className="py-3 text-[12.5px] text-subtle">No sellers yet.</p>
        ) : (
          sellers.map((s) => <SellerRow key={s.id} seller={s} />)
        )}
      </div>

      <div className="mt-5 border-t border-line-soft pt-5">
        {showOnboard ? (
          <OnboardSellerForm
            onCancel={() => setShowOnboard(false)}
            onCreated={async (result) => {
              setJustCreated(result);
              setShowOnboard(false);
              await refresh();
            }}
          />
        ) : (
          <SecondaryButton as="button" onClick={() => setShowOnboard(true)}>
            + Onboard a seller
          </SecondaryButton>
        )}
      </div>
    </SectionCard>
  );
}

function SellerRow({ seller }: { seller: Seller }) {
  const [balance, setBalance] = useState<number | null>(seller.escrow_balance_cached);
  const [checking, setChecking] = useState(false);

  async function checkBalance() {
    if (!seller.escrow_hedera_account_id) return;
    setChecking(true);
    try {
      const res = await getEscrowBalance(seller.id);
      setBalance(res.balance_hbar);
    } catch {
      // leave last-known balance displayed
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <a
          href={hashscanAccountUrl(seller.hedera_account_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="link-underline inline-flex items-center gap-1.5 font-mono text-[12.5px] text-ink"
        >
          {seller.hedera_account_id}
          <ArrowUpRight size={11} strokeWidth={1.75} />
        </a>
        <p className="mt-0.5 text-[11px] text-subtle">
          escrow{" "}
          <span className="font-mono text-ink-2">
            {seller.escrow_hedera_account_id ?? "none"}
          </span>{" "}
          · onboarded {timeAgo(seller.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="tnum text-[12.5px] text-ink-2">
          {balance !== null ? `${balance.toFixed(4)} ℏ` : "unfunded"}
        </span>
        {seller.escrow_hedera_account_id && (
          <button
            type="button"
            onClick={checkBalance}
            aria-label="Refresh balance"
            className="text-ink-2 transition-colors hover:text-ink"
          >
            <RefreshCw size={13} strokeWidth={1.75} className={checking ? "animate-spin" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}

function OnboardSellerForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (result: { seller: Seller; fund_this_account: string; webhook_secret: string }) => void;
}) {
  const [hederaAccountId, setHederaAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createSeller({ hedera_account_id: hederaAccountId.trim() });
      onCreated(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not onboard seller.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-[12.5px] text-subtle">
        This calls <span className="font-mono text-ink-2">POST /sellers</span>, which also mints a
        real Hedera testnet escrow account for this seller.
      </p>
      <div className="flex items-center gap-3">
        <input
          required
          value={hederaAccountId}
          onChange={(e) => setHederaAccountId(e.target.value)}
          placeholder="Seller's Hedera account ID (0.0.xxxxxxx)"
          className="w-full max-w-xs border border-line-soft bg-transparent px-3 py-2.5 font-mono text-[13px] text-ink focus:border-line focus:outline-none"
        />
        <PrimaryButton as="button" type="submit" disabled={busy}>
          {busy ? "Onboarding…" : "Onboard"}
        </PrimaryButton>
        <SecondaryButton as="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </div>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </form>
  );
}

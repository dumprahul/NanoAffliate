"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw, Send } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { WalletConnectButton } from "@/components/ui/WalletConnectButton";
import { useCreatorIdentity } from "@/lib/identity";
import { walletTransferHbar } from "@/lib/wallet";
import { ApiError, createSeller, getEscrowBalance, listSellers } from "@/lib/api";
import { hashscanAccountUrl, hashscanTxUrl, timeAgo } from "@/lib/format";
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
                browser just remembers which ones are yours. Connect a Hedera wallet (HashPack, via{" "}
                <a
                  href="https://github.com/hashgraph/hedera-wallet-connect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline"
                >
                  WalletConnect
                </a>
                ) instead of typing account IDs by hand.
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
  const { creator, clearCreator } = useCreatorIdentity();

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
            Log out
          </SecondaryButton>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-[12.5px] text-subtle">
            Not logged in — creator identity now requires a real World ID Selfie Check, not a
            typed-in account ID.
          </p>
          <PrimaryButton href="/login" className="shrink-0">
            Log in
          </PrimaryButton>
        </div>
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
            Seller onboarded — fund its escrow account below before creating links against it.
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
            Shown once — store webhook_secret if you&apos;ll sign /webhooks/purchase-confirmed
            requests for this seller.
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
  const [funding, setFunding] = useState(false);

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
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
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
            <>
              <button
                type="button"
                onClick={checkBalance}
                aria-label="Refresh balance"
                className="text-ink-2 transition-colors hover:text-ink"
              >
                <RefreshCw size={13} strokeWidth={1.75} className={checking ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setFunding((f) => !f)}
                className="link-underline text-[11.5px] font-medium text-ink-2"
              >
                {funding ? "Cancel" : "Fund"}
              </button>
            </>
          )}
        </div>
      </div>

      {funding && seller.escrow_hedera_account_id && (
        <FundEscrowForm
          escrowAccountId={seller.escrow_hedera_account_id}
          onFunded={() => {
            setFunding(false);
            checkBalance();
          }}
        />
      )}
    </div>
  );
}

function FundEscrowForm({
  escrowAccountId,
  onFunded,
}: {
  escrowAccountId: string;
  onFunded: () => void;
}) {
  const [amount, setAmount] = useState("1");
  const [walletAccountId, setWalletAccountId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  async function send() {
    if (!walletAccountId) return;
    setSending(true);
    setError(null);
    try {
      const id = await walletTransferHbar(walletAccountId, escrowAccountId, Number(amount));
      setTxId(id);
      onFunded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed or was rejected in your wallet.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 border border-line-soft bg-surface p-4">
      <p className="mb-3 text-[11.5px] leading-[1.6] text-subtle">
        Connect the wallet you want to fund from, then sign a real HBAR transfer straight to{" "}
        <span className="font-mono text-ink-2">{escrowAccountId}</span> — signed by your wallet,
        not the backend.
      </p>

      <WalletConnectButton label="Connect wallet to fund" onConnected={setWalletAccountId} />

      {walletAccountId && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center border border-line-soft focus-within:border-line">
            <input
              type="number"
              step="0.0001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 bg-transparent px-3 py-2 font-mono text-[13px] text-ink focus:outline-none"
            />
            <span className="px-3 font-mono text-[12px] text-subtle">ℏ</span>
          </div>
          <PrimaryButton as="button" onClick={send} disabled={sending}>
            <Send size={13} strokeWidth={1.75} />
            {sending ? "Confirm in wallet…" : "Send"}
          </PrimaryButton>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      {txId && (
        <p className="mt-2 text-[12px] text-ink-2">
          Sent —{" "}
          <a href={hashscanTxUrl(txId)} target="_blank" rel="noopener noreferrer" className="link-underline">
            view on HashScan
          </a>
        </p>
      )}
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
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hederaAccountId.trim()) return;
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
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] text-subtle">
        This calls <span className="font-mono text-ink-2">POST /sellers</span>, which also mints a
        real Hedera testnet escrow account for this seller.
      </p>

      <WalletConnectButton label="Connect wallet" onConnected={setHederaAccountId} />

      {!manual && !hederaAccountId ? (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="link-underline w-fit text-[11.5px] font-medium text-ink-2"
        >
          Or enter an account ID manually
        </button>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {(manual || hederaAccountId) && (
          <input
            required
            value={hederaAccountId}
            onChange={(e) => setHederaAccountId(e.target.value)}
            placeholder="Seller's Hedera account ID (0.0.xxxxxxx)"
            className="w-full max-w-xs border border-line-soft bg-transparent px-3 py-2.5 font-mono text-[13px] text-ink focus:border-line focus:outline-none"
          />
        )}
        <PrimaryButton as="button" type="submit" disabled={busy || !hederaAccountId}>
          {busy ? "Onboarding…" : "Onboard"}
        </PrimaryButton>
        <SecondaryButton as="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </form>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

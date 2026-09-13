"use client";

import { Wallet, X } from "lucide-react";
import { useHederaWallet } from "@/lib/wallet";
import { PrimaryButton } from "./Button";

/**
 * Real HashPack/WalletConnect connection button. `onConnected` fires once,
 * right after a fresh connect resolves with a real account id — callers use
 * it to skip manual "type your account ID" entry entirely.
 */
export function WalletConnectButton({
  onConnected,
  label = "Connect wallet",
}: {
  onConnected?: (accountId: string) => void;
  label?: string;
}) {
  const { accountId, status, error, connect, disconnect, walletConfigured } = useHederaWallet();

  async function handleClick() {
    const id = await connect();
    if (id) onConnected?.(id);
  }

  if (!walletConfigured) {
    return (
      <p className="text-[11.5px] leading-[1.6] text-subtle">
        Wallet connect isn&apos;t configured on this deployment (missing{" "}
        <span className="font-mono text-ink-2">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</span>) — use
        manual entry below instead.
      </p>
    );
  }

  if (accountId) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 border border-line-soft bg-surface px-3 py-2 font-mono text-[12.5px] text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {accountId}
        </span>
        <button
          type="button"
          onClick={disconnect}
          aria-label="Disconnect wallet"
          className="text-ink-2 transition-colors hover:text-ink"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <PrimaryButton as="button" onClick={handleClick} disabled={status === "connecting"} className="w-fit">
        <Wallet size={14} strokeWidth={1.75} />
        {status === "connecting" ? "Opening wallet…" : label}
      </PrimaryButton>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

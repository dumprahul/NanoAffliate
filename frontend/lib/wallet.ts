"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Real Hedera wallet connection via WalletConnect (HashPack, Kabila, etc.) —
 * https://github.com/hashgraph/hedera-wallet-connect. Uses the legacy
 * `DAppConnector` path rather than Reown AppKit: this app is Hedera-native
 * (account IDs like 0.0.x, native HBAR transfers) with no EVM/wagmi surface,
 * so AppKit's EVM adapter machinery would be dead weight.
 *
 * The connector and its heavy dependency tree are only ever imported inside
 * these functions (dynamic `import()`), not at module top level — this
 * code only runs in the browser, on demand, when a user actually clicks
 * "Connect wallet."
 */

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const METADATA = {
  name: "NanoAffiliate",
  description: "Paid by the second, not by the month",
  url: typeof window !== "undefined" ? window.location.origin : "https://nanoaffiliate.app",
  icons: [typeof window !== "undefined" ? `${window.location.origin}/favicon.ico` : ""],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connectorPromise: Promise<any> | null = null;

/** Lazily creates (once) and initializes the DAppConnector singleton, restoring any existing session. */
async function getConnector() {
  if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error(
      "Wallet connect isn't configured yet — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (get a free project id at cloud.walletconnect.com).",
    );
  }
  if (!connectorPromise) {
    connectorPromise = (async () => {
      const [{ DAppConnector, HederaSessionEvent, HederaJsonRpcMethod, HederaChainId }, { LedgerId }] =
        await Promise.all([import("@hashgraph/hedera-wallet-connect"), import("@hiero-ledger/sdk")]);

      const connector = new DAppConnector(
        METADATA,
        LedgerId.TESTNET,
        WALLETCONNECT_PROJECT_ID,
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
        [HederaChainId.Testnet],
      );
      await connector.init({ logger: "error" });
      return connector;
    })().catch((err) => {
      connectorPromise = null; // allow retrying after a failed init instead of caching the failure forever
      throw err;
    });
  }
  return connectorPromise;
}

function latestAccountId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connector: any,
): string | null {
  const signer = connector.signers[connector.signers.length - 1];
  return signer ? signer.getAccountId().toString() : null;
}

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

export function useHederaWallet() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Silently restore a session that WalletConnect itself already persisted
  // (its own storage, separate from our localStorage identity) — no
  // "Connect" click needed on a repeat visit if the wallet is still paired.
  useEffect(() => {
    if (!WALLETCONNECT_PROJECT_ID) return;
    let cancelled = false;
    getConnector()
      .then((connector) => {
        if (cancelled) return;
        const id = latestAccountId(connector);
        if (id) {
          setAccountId(id);
          setStatus("connected");
        }
      })
      .catch(() => {
        // No prior session, or init failed — connect() will surface any real error on click
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    setStatus("connecting");
    setError(null);
    try {
      const connector = await getConnector();
      await connector.openModal();
      const id = latestAccountId(connector);
      setAccountId(id);
      setStatus(id ? "connected" : "idle");
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect wallet.");
      setStatus("error");
      return null;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const connector = await getConnector();
      await connector.disconnectAll();
    } catch {
      // nothing to disconnect (never connected, or connector failed to init) — fine either way
    }
    setAccountId(null);
    setStatus("idle");
  }, []);

  return {
    accountId,
    status,
    error,
    connect,
    disconnect,
    walletConfigured: Boolean(WALLETCONNECT_PROJECT_ID),
  };
}

/**
 * Signs and executes a real HBAR transfer with the connected wallet's own
 * key — used to fund a seller's escrow account. Unlike backend payouts
 * (signed by the Agent's key), this transaction is authorized by whoever
 * connected their wallet, in their own wallet app (HashPack, etc.).
 */
export async function walletTransferHbar(
  fromAccountId: string,
  toAccountId: string,
  amountHbar: number,
): Promise<string> {
  const [connector, { TransferTransaction, Hbar, AccountId }, { transactionToBase64String }] = await Promise.all([
    getConnector(),
    import("@hiero-ledger/sdk"),
    import("@hashgraph/hedera-wallet-connect"),
  ]);

  const transaction = new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(fromAccountId), new Hbar(-amountHbar))
    .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amountHbar))
    .setTransactionMemo("nanoaffiliate:fund-escrow");

  const result = await connector.signAndExecuteTransaction({
    signerAccountId: `hedera:testnet:${fromAccountId}`,
    transactionList: transactionToBase64String(transaction),
  });

  return result?.transactionId ?? JSON.stringify(result);
}

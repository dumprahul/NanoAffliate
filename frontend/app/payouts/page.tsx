"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { PayoutsHeader, type RangeKey } from "@/components/dashboard/PayoutsHeader";
import { PayoutStatCards } from "@/components/dashboard/PayoutStatCards";
import { PayoutsToolbar, type PayoutSortKey } from "@/components/dashboard/PayoutsToolbar";
import { PayoutsTable } from "@/components/dashboard/PayoutsTable";
import { ApiError, listPayouts } from "@/lib/api";
import { exportPayoutsCsv } from "@/lib/exportCsv";
import type { PayoutEvent, PayoutKind, PayoutStatus } from "@/lib/types";
import { ClientOnly } from "@/components/ui/ClientOnly";

const RANGE_DAYS: Record<RangeKey, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };

export default function PayoutsPage() {
  return (
    <ClientOnly>
      <PayoutsPageContent />
    </ClientOnly>
  );
}

function PayoutsPageContent() {
  const [payouts, setPayouts] = useState<PayoutEvent[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("90D");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PayoutKind | "all">("all");
  const [status, setStatus] = useState<PayoutStatus | "all">("all");
  const [sort, setSort] = useState<PayoutSortKey>("newest");

  useEffect(() => {
    listPayouts()
      .then(setPayouts)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load payouts."));
  }, []);

  const inRange = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    return (payouts ?? []).filter((e) => new Date(e.created_at).getTime() >= cutoff);
  }, [payouts, range]);

  const filtered = useMemo(() => {
    let list = inRange;
    if (type !== "all") list = list.filter((e) => e.kind === type);
    if (status !== "all") list = list.filter((e) => e.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.tx_id?.toLowerCase().includes(q) ||
          e.from_account.toLowerCase().includes(q) ||
          e.to_account.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q) ||
          e.kind.toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
        break;
      case "amount-desc":
        sorted.sort((a, b) => b.amount_hbar - a.amount_hbar);
        break;
      case "amount-asc":
        sorted.sort((a, b) => a.amount_hbar - b.amount_hbar);
        break;
    }
    return sorted;
  }, [inRange, type, status, search, sort]);

  const stats = useMemo(() => {
    const completed = inRange.filter((e) => e.status === "completed");
    const pending = inRange.filter((e) => e.status === "pending");
    const cancelled = inRange.filter((e) => e.status === "cancelled");
    const totalHbar = completed.reduce((sum, e) => sum + e.amount_hbar, 0);
    const pendingHbar = pending.reduce((sum, e) => sum + e.amount_hbar, 0);
    const total = inRange.length || 1;
    return {
      totalHbar,
      completedCount: completed.length,
      successRate: (completed.length / total) * 100,
      pendingCount: pending.length,
      pendingHbar,
      cancelledCount: cancelled.length,
      cancelledRate: (cancelled.length / total) * 100,
    };
  }, [inRange]);

  return (
    <div className="flex h-screen flex-col bg-bg">
      <Topbar />

      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <PayoutsHeader range={range} onRangeChange={setRange} />
          <PayoutStatCards stats={stats} />
          <PayoutsToolbar
            search={search}
            onSearchChange={setSearch}
            type={type}
            onTypeChange={setType}
            status={status}
            onStatusChange={setStatus}
            sort={sort}
            onSortChange={setSort}
            onExport={() => exportPayoutsCsv(filtered)}
          />
          {loadError ? (
            <div className="mx-6 flex h-40 flex-col items-center justify-center gap-2 border border-dashed border-line-soft">
              <p className="text-[13px] text-red-600">{loadError}</p>
            </div>
          ) : payouts === null ? (
            <div className="mx-6 flex h-40 items-center justify-center border border-dashed border-line-soft">
              <p className="text-[13px] text-subtle">Loading payouts…</p>
            </div>
          ) : (
            <PayoutsTable events={filtered} />
          )}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { PayoutStatCards } from "@/components/dashboard/PayoutStatCards";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import { RankedBarList, type RankedRow } from "@/components/dashboard/RankedBarList";
import { EscrowBudgetBar } from "@/components/dashboard/EscrowBudgetBar";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { ApiError, listPayouts, listProducts } from "@/lib/api";
import { formatHbar, hashscanTopicUrl } from "@/lib/format";
import type { PayoutEvent, PayoutKind, ProductWithSeller } from "@/lib/types";

type RangeKey = "7D" | "30D" | "90D" | "1Y";
const RANGES: RangeKey[] = ["7D", "30D", "90D", "1Y"];
const RANGE_DAYS: Record<RangeKey, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };
const REFRESH_MS = 12_000;

const KIND_LABEL: Record<PayoutKind, string> = {
  tick_payout: "Attention payouts",
  conversion_bonus: "Conversion bonuses",
  pending_payout: "Pending retries",
};

export default function AnalyticsPage() {
  return (
    <ClientOnly>
      <AnalyticsPageContent />
    </ClientOnly>
  );
}

function AnalyticsPageContent() {
  const [payouts, setPayouts] = useState<PayoutEvent[] | null>(null);
  const [products, setProducts] = useState<ProductWithSeller[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [range, setRange] = useState<RangeKey>("30D");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [p, prod] = await Promise.all([listPayouts(), listProducts()]);
        if (cancelled) return;
        setPayouts(p);
        setProducts(prod);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load analytics.");
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const inRange = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    return (payouts ?? []).filter((e) => new Date(e.created_at).getTime() >= cutoff);
  }, [payouts, range]);

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

  const activeLinkCount = useMemo(
    () => new Set(inRange.map((e) => e.link_topic_id)).size,
    [inRange],
  );

  // Bucket size scales with range so the chart stays readable: daily for
  // 7D/30D, weekly for 90D, monthly for 1Y — all computed from real
  // payout timestamps, no synthetic points.
  const series = useMemo(() => {
    const bucketDays = range === "1Y" ? 30 : range === "90D" ? 7 : 1;
    const bucketMs = bucketDays * 86_400_000;
    const now = Date.now();
    const bucketCount = Math.ceil((RANGE_DAYS[range] * 86_400_000) / bucketMs);
    const totals = new Array(bucketCount).fill(0);

    for (const e of inRange) {
      if (e.status !== "completed") continue;
      const age = now - new Date(e.created_at).getTime();
      const idx = bucketCount - 1 - Math.floor(age / bucketMs);
      if (idx >= 0 && idx < bucketCount) totals[idx] += e.amount_hbar;
    }

    return totals.map((value, i) => {
      const bucketStart = new Date(now - (bucketCount - 1 - i) * bucketMs);
      const label =
        bucketDays === 30
          ? bucketStart.toLocaleDateString("en-US", { month: "short" })
          : bucketStart.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      return { label, value };
    });
  }, [inRange, range]);

  const kindBreakdown = useMemo<RankedRow[]>(() => {
    const totals = new Map<PayoutKind, number>();
    for (const e of inRange) totals.set(e.kind, (totals.get(e.kind) ?? 0) + e.amount_hbar);
    return (Object.keys(KIND_LABEL) as PayoutKind[])
      .filter((k) => (totals.get(k) ?? 0) > 0)
      .map((k) => ({ key: k, label: KIND_LABEL[k], value: totals.get(k) ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [inRange]);

  const topLinks = useMemo<RankedRow[]>(() => {
    const totals = new Map<string, { value: number; count: number }>();
    for (const e of inRange) {
      const cur = totals.get(e.link_topic_id) ?? { value: 0, count: 0 };
      cur.value += e.amount_hbar;
      cur.count += 1;
      totals.set(e.link_topic_id, cur);
    }
    return [...totals.entries()]
      .map(([topicId, agg]) => ({
        key: topicId,
        label: topicId,
        sublabel: `${agg.count} event${agg.count === 1 ? "" : "s"}`,
        value: agg.value,
        href: hashscanTopicUrl(topicId),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [inRange]);

  const budgetedProducts = useMemo(
    () => (products ?? []).filter((p) => p.escrow_budget_hbar !== null),
    [products],
  );

  return (
    <div className="flex h-screen flex-col bg-bg">
      <Topbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft px-6 py-6 lg:px-8">
            <div>
              <p className="label">Analytics</p>
              <h1 className="display mt-2 text-[30px]">Analytics</h1>
              <p className="mt-2 flex items-center gap-2 text-[12px] text-subtle">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Live · refreshes every {REFRESH_MS / 1000}s
                {lastUpdated && <span>· updated {lastUpdated.toLocaleTimeString()}</span>}
              </p>
            </div>
            <div className="flex border border-line">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 text-[12.5px] font-medium transition-colors duration-200 ${
                    r === range ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"
                  } ${r !== "1Y" ? "border-r border-line" : ""}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="m-6 flex h-40 items-center justify-center border border-dashed border-line-soft">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          ) : payouts === null ? (
            <div className="m-6 flex h-40 items-center justify-center border border-dashed border-line-soft">
              <p className="text-[13px] text-subtle">Loading analytics…</p>
            </div>
          ) : (
            <>
              <PayoutStatCards stats={stats} />

              <div className="grid grid-cols-1 gap-px bg-line-soft xl:grid-cols-3">
                <div className="col-span-1 bg-bg p-6 xl:col-span-2">
                  <div className="mb-4 flex items-baseline justify-between">
                    <p className="label">Completed payout volume</p>
                    <span className="tnum text-[11.5px] text-subtle">
                      {activeLinkCount} active link{activeLinkCount === 1 ? "" : "s"} in range
                    </span>
                  </div>
                  <TimeSeriesChart points={series} formatValue={formatHbar} />
                </div>

                <div className="bg-bg p-6">
                  <p className="label mb-4">By event type</p>
                  <RankedBarList rows={kindBreakdown} formatValue={formatHbar} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px bg-line-soft xl:grid-cols-2">
                <div className="bg-bg p-6">
                  <p className="label mb-4">Top earning links</p>
                  <RankedBarList
                    rows={topLinks}
                    formatValue={formatHbar}
                    emptyLabel="No payouts in this range yet."
                  />
                </div>

                <div className="bg-bg p-6">
                  <div className="mb-4 flex items-baseline justify-between">
                    <p className="label">Per-product escrow budgets</p>
                    <span className="tnum text-[11.5px] text-subtle">
                      {budgetedProducts.length} with a cap set
                    </span>
                  </div>
                  {budgetedProducts.length === 0 ? (
                    <p className="py-6 text-center text-[12.5px] text-subtle">
                      No products have a per-product escrow budget set.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {budgetedProducts.map((p) => (
                        <div key={p.id}>
                          <p className="truncate text-[12px] text-ink-2">{p.title}</p>
                          <div className="mt-1.5">
                            <EscrowBudgetBar
                              budgetHbar={p.escrow_budget_hbar}
                              spentHbar={p.escrow_spent_hbar}
                              compact
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-line-soft px-6 py-4 lg:px-8">
                <p className="text-[11px] leading-[1.6] text-subtle">
                  Every number here is computed live from{" "}
                  <span className="font-mono text-ink-2">GET /payouts</span> and{" "}
                  <span className="font-mono text-ink-2">GET /products</span> — no cached
                  aggregates, no synthetic data.
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

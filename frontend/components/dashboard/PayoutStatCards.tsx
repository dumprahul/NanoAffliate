import { ArrowUpRight } from "lucide-react";
import { formatHbar, formatUsdFromHbar } from "@/lib/format";

export interface PayoutStats {
  totalHbar: number;
  completedCount: number;
  successRate: number;
  pendingCount: number;
  pendingHbar: number;
  cancelledCount: number;
  cancelledRate: number;
}

export function PayoutStatCards({ stats }: { stats: PayoutStats }) {
  return (
    <div className="grid grid-cols-2 border-b border-line-soft lg:grid-cols-4">
      <Card
        label="Total payouts"
        value={formatUsdFromHbar(stats.totalHbar)}
        sub={
          <span className="flex items-center gap-1 text-ink-2">
            <ArrowUpRight size={11} strokeWidth={2} className="text-accent" />
            <span className="tnum">{formatHbar(stats.totalHbar)}</span> · in range
          </span>
        }
        className="border-r border-line-soft"
      />
      <Card
        label="Completed"
        value={String(stats.completedCount)}
        sub={<span>{stats.successRate.toFixed(1)}% success rate</span>}
        className="border-r-0 lg:border-r lg:border-line-soft"
      />
      <Card
        label="Pending"
        value={String(stats.pendingCount)}
        sub={
          <span className="tnum">
            {formatUsdFromHbar(stats.pendingHbar)} · {formatHbar(stats.pendingHbar)} queued
          </span>
        }
        className="border-r border-t border-line-soft lg:border-t-0"
      />
      <Card
        label="Cancelled"
        value={String(stats.cancelledCount)}
        sub={<span>{stats.cancelledRate.toFixed(1)}% of all events</span>}
        className="border-t border-line-soft lg:border-t-0"
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  className = "",
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-6 py-5 ${className}`}>
      <p className="label">{label}</p>
      <p className="tnum mt-2 text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
        {value}
      </p>
      <p className="mt-2.5 text-[11.5px] text-muted">{sub}</p>
    </div>
  );
}

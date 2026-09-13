"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Copy,
  Gift,
  MoreHorizontal,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  formatDateTime,
  formatHbar,
  formatUsdFromHbar,
  hashscanAccountUrl,
  hashscanTxUrl,
} from "@/lib/format";
import type { PayoutEvent, PayoutKind, PayoutStatus } from "@/lib/types";
import { HbarLogo } from "./HbarLogo";

const KIND_META: Record<PayoutKind, { label: string; Icon: typeof Zap }> = {
  tick_payout: { label: "Attention payout", Icon: Zap },
  conversion_bonus: { label: "Conversion bonus", Icon: Gift },
  pending_payout: { label: "Pending retry", Icon: RotateCcw },
};

const STATUS_META: Record<PayoutStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-[#E7F5EC] text-[#1A7A42]" },
  pending: { label: "Pending", className: "bg-[#FCF3D9] text-[#946600]" },
  cancelled: { label: "Cancelled", className: "bg-[#FBE7E7] text-[#B3261E]" },
};

export function PayoutsTable({ events }: { events: PayoutEvent[] }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyTxId(event: PayoutEvent) {
    if (!event.tx_id) return;
    try {
      await navigator.clipboard.writeText(event.tx_id);
      setCopiedId(event.id);
      setTimeout(() => setCopiedId((c) => (c === event.id ? null : c)), 1500);
    } catch {
      // clipboard API unavailable — silently no-op, nothing user-blocking to fall back to
    }
    setOpenMenu(null);
  }

  if (events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center border-t border-line-soft">
        <p className="text-[13px] text-subtle">No payouts match these filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-line-soft">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-surface">
            <Th>Activity</Th>
            <Th>Amount</Th>
            <Th>Type</Th>
            <Th>From</Th>
            <Th>Status</Th>
            <Th>Time</Th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {events.map((event) => {
            const kind = KIND_META[event.kind];
            const status = STATUS_META[event.status];
            const { date, time } = formatDateTime(event.created_at);
            return (
              <tr key={event.id} className="group transition-colors hover:bg-surface">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <HbarLogo overlay={kind.Icon} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink">{kind.label}</p>
                      <p className="truncate text-[11.5px] font-normal text-subtle">
                        {event.detail}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="tnum text-[14px] font-semibold text-ink">
                    {formatUsdFromHbar(event.amount_hbar)}
                  </p>
                  <p className="tnum text-[11.5px] font-normal text-muted">
                    {formatHbar(event.amount_hbar)}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-[12.5px] font-normal text-ink-2">
                  {event.kind === "tick_payout"
                    ? "Attention"
                    : event.kind === "conversion_bonus"
                      ? "Bonus"
                      : "Retry"}
                </td>
                <td className="px-5 py-3.5">
                  <a
                    href={hashscanAccountUrl(event.from_account)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline inline-flex items-center gap-1 font-mono text-[12px] font-normal text-ink-2"
                  >
                    {event.from_account}
                    <ArrowUpRight size={11} strokeWidth={1.75} />
                  </a>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="tnum text-[12.5px] font-medium text-ink-2">{date}</p>
                  <p className="tnum text-[11px] font-normal text-subtle">{time}</p>
                </td>
                <td className="relative px-3 py-3.5">
                  <button
                    type="button"
                    aria-label="Row actions"
                    onClick={() => setOpenMenu((m) => (m === event.id ? null : event.id))}
                    className="flex h-7 w-7 items-center justify-center text-subtle opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                  >
                    <MoreHorizontal size={15} strokeWidth={1.75} />
                  </button>

                  {openMenu === event.id && (
                    <>
                      <button
                        aria-label="Close menu"
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setOpenMenu(null)}
                      />
                      <div className="absolute right-3 top-11 z-20 w-56 border border-line bg-bg shadow-[0_8px_30px_rgba(17,17,17,0.12)]">
                        <button
                          type="button"
                          disabled={!event.tx_id}
                          onClick={() => copyTxId(event)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] text-ink-2 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-transparent"
                        >
                          <Copy size={13} strokeWidth={1.75} />
                          {copiedId === event.id ? "Copied" : "Copy transaction ID"}
                        </button>
                        {event.tx_id ? (
                          <a
                            href={hashscanTxUrl(event.tx_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpenMenu(null)}
                            className="flex items-center gap-2.5 border-t border-line-soft px-3.5 py-2.5 text-[12.5px] text-ink-2 transition-colors hover:bg-surface-2"
                          >
                            <ArrowUpRight size={13} strokeWidth={1.75} />
                            View on HashScan
                          </a>
                        ) : (
                          <div className="border-t border-line-soft px-3.5 py-2.5 text-[11.5px] text-subtle">
                            No transaction yet — still {event.status}.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="label px-5 py-3 font-semibold">{children}</th>;
}

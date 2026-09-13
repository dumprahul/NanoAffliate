import { Download, Search } from "lucide-react";
import type { PayoutKind, PayoutStatus } from "@/lib/types";

export type PayoutSortKey = "newest" | "oldest" | "amount-desc" | "amount-asc";

const TYPE_OPTIONS: { value: PayoutKind | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "tick_payout", label: "Attention payout" },
  { value: "conversion_bonus", label: "Conversion bonus" },
  { value: "pending_payout", label: "Pending retry" },
];

const STATUS_OPTIONS: { value: PayoutStatus | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS: { value: PayoutSortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount-desc", label: "Amount: high to low" },
  { value: "amount-asc", label: "Amount: low to high" },
];

export function PayoutsToolbar({
  search,
  onSearchChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  onExport,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  type: PayoutKind | "all";
  onTypeChange: (v: PayoutKind | "all") => void;
  status: PayoutStatus | "all";
  onStatusChange: (v: PayoutStatus | "all") => void;
  sort: PayoutSortKey;
  onSortChange: (v: PayoutSortKey) => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-4 lg:px-8">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 border border-line-soft px-3 py-2.5">
        <Search size={14} strokeWidth={1.75} className="shrink-0 text-subtle" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          type="text"
          placeholder="Search by transaction, account, or type…"
          className="w-full bg-transparent text-[13px] text-ink placeholder:text-subtle focus:outline-none"
        />
      </div>

      <Select value={type} onChange={onTypeChange} options={TYPE_OPTIONS} />
      <Select value={status} onChange={onStatusChange} options={STATUS_OPTIONS} />
      <Select value={sort} onChange={onSortChange} options={SORT_OPTIONS} />

      <button
        type="button"
        onClick={onExport}
        className="flex items-center gap-2 bg-ink px-4 py-2.5 text-[13px] font-medium text-bg transition-colors duration-[450ms] ease-[var(--ease-expo)] hover:bg-ink-2"
      >
        <Download size={14} strokeWidth={1.75} />
        Export
      </button>
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="border border-line-soft bg-bg px-3 py-2.5 text-[13px] text-ink-2 focus:border-line focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

import type { Seller } from "@/lib/types";
import type { SortKey } from "./sort";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
];

export function FilterRail({
  sellers,
  countBySeller,
  totalCount,
  selectedSellerId,
  onSelectSeller,
  sort,
  onSortChange,
}: {
  sellers: Seller[];
  countBySeller: Record<string, number>;
  totalCount: number;
  selectedSellerId: string | null;
  onSelectSeller: (id: string | null) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}) {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col gap-8 border-r border-line-soft px-5 py-6 md:flex">
      <div>
        <p className="label mb-3">Sort by</p>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="w-full border border-line-soft bg-bg px-3 py-2 text-[13px] text-ink focus:border-line focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="label mb-3">Seller</p>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onSelectSeller(null)}
            className={`flex items-center justify-between py-1.5 text-left text-[13px] transition-colors ${
              selectedSellerId === null ? "text-ink" : "text-muted hover:text-ink-2"
            }`}
          >
            All sellers
            <span className="tnum text-[11.5px] text-subtle">{totalCount}</span>
          </button>
          {sellers.map((seller) => (
            <button
              key={seller.id}
              type="button"
              onClick={() => onSelectSeller(seller.id)}
              className={`flex items-center justify-between py-1.5 text-left font-mono text-[12px] transition-colors ${
                selectedSellerId === seller.id ? "text-ink" : "text-muted hover:text-ink-2"
              }`}
            >
              {seller.hedera_account_id}
              <span className="tnum text-[11px] text-subtle">
                {countBySeller[seller.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

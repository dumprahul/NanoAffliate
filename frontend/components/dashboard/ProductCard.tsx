import { timeAgo } from "@/lib/format";
import type { ProductWithSeller } from "@/lib/types";
import { ProductThumb } from "./ProductThumb";
import { EscrowBudgetBar } from "./EscrowBudgetBar";

export function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: ProductWithSeller;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex flex-col border text-left transition-colors duration-300 ${
        selected ? "border-ink bg-surface" : "border-line-soft bg-bg hover:border-line"
      }`}
    >
      <ProductThumb title={product.title} imageUrl={product.image_url} className="h-36 w-full" />

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-[13.5px] leading-snug text-ink">{product.title}</p>
        <p className="tnum mt-2 text-[15px] tracking-[-0.02em] text-ink">
          {product.price_display ?? "—"}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
          <span className="font-mono text-[10.5px] text-subtle">
            {product.seller.hedera_account_id}
          </span>
          <span className="text-[10.5px] text-subtle">{timeAgo(product.created_at)}</span>
        </div>

        {product.escrow_budget_hbar !== null && (
          <div className="mt-2.5">
            <EscrowBudgetBar
              budgetHbar={product.escrow_budget_hbar}
              spentHbar={product.escrow_spent_hbar}
              compact
            />
          </div>
        )}
      </div>
    </button>
  );
}

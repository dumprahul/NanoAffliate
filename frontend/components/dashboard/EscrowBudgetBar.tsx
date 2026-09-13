/** Per-product escrow spending cap — backend/src/db/products.ts isUnderProductBudget/addProductSpend. */
export function EscrowBudgetBar({
  budgetHbar,
  spentHbar,
  compact = false,
}: {
  budgetHbar: number | null;
  spentHbar: number;
  compact?: boolean;
}) {
  if (budgetHbar === null) {
    return compact ? null : (
      <p className="text-[11.5px] text-subtle">No per-product escrow budget set — unlimited.</p>
    );
  }

  const pct = budgetHbar > 0 ? Math.min((spentHbar / budgetHbar) * 100, 100) : 100;
  const exhausted = spentHbar >= budgetHbar;

  return (
    <div>
      <div className={`flex items-baseline justify-between ${compact ? "text-[10.5px]" : "text-[12px]"}`}>
        <span className={exhausted ? "font-medium text-red-600" : "text-ink-2"}>
          {spentHbar.toFixed(4)} / {budgetHbar.toFixed(4)} ℏ spent
        </span>
        {!compact && (
          <span className="text-subtle">{exhausted ? "budget exhausted" : `${(100 - pct).toFixed(0)}% left`}</span>
        )}
      </div>
      <div className={`mt-1.5 w-full overflow-hidden bg-surface-2 ${compact ? "h-[3px]" : "h-1"}`}>
        <div
          className={`h-full ${exhausted ? "bg-red-500" : "bg-ink"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface RankedRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  href?: string;
}

/** Proportional horizontal bars — used for kind/status breakdowns and top-earning links. */
export function RankedBarList({
  rows,
  formatValue,
  emptyLabel = "Nothing here yet.",
}: {
  rows: RankedRow[];
  formatValue: (v: number) => string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[12.5px] text-subtle">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((r) => r.value), 0.0001);

  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((row) => {
        const pct = Math.max((row.value / max) * 100, 2);
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[12.5px] text-ink-2">{row.label}</span>
              <span className="tnum shrink-0 text-[12px] text-ink">{formatValue(row.value)}</span>
            </div>
            {row.sublabel && <p className="mt-0.5 text-[10.5px] text-subtle">{row.sublabel}</p>}
            <div className="mt-1.5 h-1 w-full overflow-hidden bg-surface-2">
              <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
            </div>
          </>
        );
        return row.href ? (
          <a key={row.key} href={row.href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-70">
            {content}
          </a>
        ) : (
          <div key={row.key}>{content}</div>
        );
      })}
    </div>
  );
}

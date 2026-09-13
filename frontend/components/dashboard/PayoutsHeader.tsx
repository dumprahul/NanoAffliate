"use client";

import { TerrainCanvas } from "../TerrainCanvas";

export type RangeKey = "7D" | "30D" | "90D" | "1Y";
const RANGES: RangeKey[] = ["7D", "30D", "90D", "1Y"];

export function PayoutsHeader({
  range,
  onRangeChange,
}: {
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
}) {
  return (
    <div className="relative overflow-hidden border-b border-line-soft">
      {/* Same procedural halftone terrain as the landing page hero — one
          visual signature, reused rather than reinvented per surface. */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] opacity-70 md:block"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 30%)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 30%)",
        }}
      >
        <TerrainCanvas />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-4 px-6 py-6 lg:px-8">
        <div>
          <p className="label">Payouts</p>
          <h1 className="display mt-2 text-[30px]">Payouts</h1>
          <p className="mt-2 max-w-[46ch] text-[13.5px] leading-[1.6] text-muted">
            Track every attention payout, conversion bonus and queued retry in
            one place.
          </p>
        </div>

        <div className="flex border border-line">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`px-4 py-2 text-[12.5px] font-medium transition-colors duration-200 ${
                r === range
                  ? "bg-ink text-bg"
                  : "text-ink-2 hover:bg-surface-2"
              } ${r !== "1Y" ? "border-r border-line" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

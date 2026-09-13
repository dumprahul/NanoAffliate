import type { LucideIcon } from "lucide-react";

/**
 * Hedera's ℏ mark as a small colored token badge — every payout in this
 * system settles in HBAR (single network, single asset), so unlike a
 * multi-chain dashboard this badge never varies by row. The kind of event
 * (attention payout / bonus / retry) is instead shown as a small overlay
 * glyph in the corner, echoing how multi-asset dashboards overlay a
 * transfer/swap icon on the token logo.
 */
export function HbarLogo({
  overlay: Overlay,
  size = 32,
}: {
  overlay?: LucideIcon;
  size?: number;
}) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full text-white shadow-[0_1px_2px_rgba(17,17,17,0.15)]"
        style={{ background: "linear-gradient(135deg, #6B4CE6 0%, #3F2E9C 100%)" }}
      >
        <span className="font-serif text-[15px] leading-none" style={{ fontSize: size * 0.5 }}>
          ℏ
        </span>
      </span>
      {Overlay && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg bg-ink text-bg">
          <Overlay size={9} strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}

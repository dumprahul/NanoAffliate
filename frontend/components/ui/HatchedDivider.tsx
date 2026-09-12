/**
 * Signature separator — a thin band of diagonal hatch lines between
 * major sections. Pure CSS, no image.
 */
export function HatchedDivider({ height = 10 }: { height?: number }) {
  return (
    <div
      aria-hidden
      className="hatch w-full border-y border-line"
      style={{ height }}
    />
  );
}

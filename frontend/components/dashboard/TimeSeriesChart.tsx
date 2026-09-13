"use client";

/** Data-driven area chart — real daily totals, not the landing page's decorative static Charts.tsx. */
const INK = "#111111";
const SOFT = "#B8B7B3";
const SURF = "#E4E3DF";
const ACCENT = "#5B7FDB";

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function TimeSeriesChart({
  points,
  formatValue,
}: {
  points: { label: string; value: number }[];
  formatValue: (v: number) => string;
}) {
  const W = 640;
  const H = 160;
  const pad = 20;

  if (points.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center text-[12.5px] text-subtle">
        No activity yet in this range.
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 0.0001) * 1.15;
  const step = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;

  const pts: [number, number][] = points.map((p, i) => [
    pad + i * step,
    H - pad - (p.value / max) * (H - pad * 2),
  ]);

  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]} ${H - pad} L ${pts[0][0]} ${H - pad} Z`;

  const labelEvery = Math.max(1, Math.ceil(points.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="h-auto w-full" role="img" aria-label="Payout volume over time">
      <defs>
        <linearGradient id="ts-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.16" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((frac) => (
        <line
          key={frac}
          x1={pad}
          x2={W - pad}
          y1={pad + frac * (H - pad * 2)}
          y2={pad + frac * (H - pad * 2)}
          stroke={SURF}
          strokeWidth={0.75}
        />
      ))}

      <path d={areaPath} fill="url(#ts-fill)" />
      <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={1.6} />

      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3 : 1.6} fill={i === pts.length - 1 ? ACCENT : INK} />
      ))}

      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={SOFT} strokeWidth={0.9} />
      {points.map((p, i) =>
        i % labelEvery === 0 || i === points.length - 1 ? (
          <text
            key={i}
            x={pad + i * step}
            y={H + 14}
            textAnchor="middle"
            fontSize="8.5"
            fill="#8A8986"
            fontFamily="var(--font-sans)"
            letterSpacing="0.02em"
          >
            {p.label}
          </text>
        ) : null,
      )}

      <title>{points.map((p) => `${p.label}: ${formatValue(p.value)}`).join("\n")}</title>
    </svg>
  );
}

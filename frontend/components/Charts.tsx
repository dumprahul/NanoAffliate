/**
 * Monochrome data surfaces. Palette is restricted to ink → gray → ivory,
 * with the muted blue reserved for a single point of emphasis per chart.
 */

const INK = "#111111";
const SOFT = "#B8B7B3";
const SURF = "#E4E3DF";
const ACCENT = "#5B7FDB";

/* ---------------- bar chart ---------------- */

const BAR_DATA = [38, 26, 52, 41, 63, 47, 78, 58, 86, 71, 94, 118];
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function BarChart() {
  const W = 320;
  const H = 108;
  const pad = 14;
  const max = Math.max(...BAR_DATA);
  const slot = (W - pad * 2) / BAR_DATA.length;
  const barW = slot * 0.52;

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="h-auto w-full" aria-hidden>
      {BAR_DATA.map((value, i) => {
        const h = (value / max) * (H - pad);
        const x = pad + i * slot + (slot - barW) / 2;
        const y = H - h;
        const isLast = i === BAR_DATA.length - 1;
        const solid = i % 4 === 2 || isLast;
        return (
          <g key={i}>
            {/* whisker — technical max marker */}
            {i % 3 === 0 && (
              <line
                x1={x + barW / 2}
                y1={y - 7}
                x2={x + barW / 2}
                y2={y - 1}
                stroke={SOFT}
                strokeWidth={0.8}
              />
            )}
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={isLast ? ACCENT : solid ? INK : SURF}
              stroke={solid || isLast ? "none" : SOFT}
              strokeWidth={0.8}
            />
          </g>
        );
      })}
      <line x1={pad} y1={H} x2={W - pad} y2={H} stroke={SOFT} strokeWidth={0.9} />
      {MONTHS.map((m, i) => (
        <text
          key={i}
          x={pad + i * slot + slot / 2}
          y={H + 12}
          textAnchor="middle"
          fontSize="7.5"
          fill="#8A8986"
          fontFamily="var(--font-sans)"
          letterSpacing="0.04em"
        >
          {m}
        </text>
      ))}
    </svg>
  );
}

/* ---------------- area chart ---------------- */

const AREA_DATA = [26, 31, 29, 38, 44, 41, 52, 58, 55, 67, 74, 88];

function smoothPath(pts: [number, number][]) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function AreaChart() {
  const W = 320;
  const H = 108;
  const pad = 14;
  const max = Math.max(...AREA_DATA) * 1.12;
  const step = (W - pad * 2) / (AREA_DATA.length - 1);

  const pts: [number, number][] = AREA_DATA.map((v, i) => [
    pad + i * step,
    H - (v / max) * (H - pad),
  ]);

  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="areaFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111111" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#111111" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal guides */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          y1={H - g * (H - pad)}
          x2={W - pad}
          y2={H - g * (H - pad)}
          stroke={SURF}
          strokeWidth={0.8}
        />
      ))}

      <path d={area} fill="url(#areaFade)" />
      <path d={line} fill="none" stroke={INK} strokeWidth={1.3} />

      <line x1={pad} y1={H} x2={W - pad} y2={H} stroke={SOFT} strokeWidth={0.9} />

      <circle cx={lastX} cy={lastY} r={3.2} fill={ACCENT} />
      <circle cx={lastX} cy={lastY} r={6} fill={ACCENT} fillOpacity={0.14} />

      {MONTHS.map((m, i) => (
        <text
          key={i}
          x={pad + i * step}
          y={H + 12}
          textAnchor="middle"
          fontSize="7.5"
          fill="#8A8986"
          fontFamily="var(--font-sans)"
          letterSpacing="0.04em"
        >
          {m}
        </text>
      ))}
    </svg>
  );
}

/* ---------------- activity heatmap ---------------- */

const ROWS = 7; // days
const COLS = 96; // 15-minute buckets across the day

/** deterministic pseudo-random so server and client render identically */
function rand(r: number, c: number, salt: number) {
  const n = Math.sin(r * 12.9898 + c * 78.233 + salt * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function cellValue(r: number, c: number) {
  // attention clusters around the middle of the day
  const curve = Math.exp(-(((c - 58) / 26) ** 2));
  return Math.min(1, rand(r, c, 1) * 0.5 + curve * 0.55);
}

export function ActivityHeatmap() {
  const cell = 10;
  const gap = 2.6;
  const W = COLS * (cell + gap);
  const H = ROWS * (cell + gap);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden>
      {Array.from({ length: ROWS }).map((_, r) =>
        Array.from({ length: COLS }).map((_, c) => {
          const v = cellValue(r, c);
          // accent stays genuinely rare — a handful of cells across the grid
          const accent = v > 0.74 && rand(r, c, 9) > 0.988;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * (cell + gap)}
              y={r * (cell + gap)}
              width={cell}
              height={cell}
              fill={accent ? ACCENT : INK}
              fillOpacity={accent ? 0.9 : 0.05 + v * 0.66}
            />
          );
        }),
      )}
    </svg>
  );
}

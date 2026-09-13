/**
 * Thin-line isometric system diagrams — technical journal aesthetic.
 * True isometric projection: +x right-down, +y left-down, +z up.
 */

const K = 0.8660254; // cos(30°)
const S = 15; // unit scale

const p = (x: number, y: number, z: number): [number, number] => [
  (x - y) * K * S,
  ((x + y) * 0.5 - z) * S,
];

const poly = (pts: [number, number][]) =>
  pts.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(" ");

const STROKE = "#9B9A96";
const SW = 0.9;
const FILL_TOP = "#F8F7F3";
const FILL_RIGHT = "#ECEBE7";
const FILL_LEFT = "#E3E2DE";

function Box({
  x = 0,
  y = 0,
  z = 0,
  w = 1,
  d = 1,
  h = 1,
  top = FILL_TOP,
}: {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
  d?: number;
  h?: number;
  top?: string;
}) {
  const topFace = poly([
    p(x, y, z + h),
    p(x + w, y, z + h),
    p(x + w, y + d, z + h),
    p(x, y + d, z + h),
  ]);
  const leftFace = poly([
    p(x, y + d, z),
    p(x + w, y + d, z),
    p(x + w, y + d, z + h),
    p(x, y + d, z + h),
  ]);
  const rightFace = poly([
    p(x + w, y, z),
    p(x + w, y + d, z),
    p(x + w, y + d, z + h),
    p(x + w, y, z + h),
  ]);
  return (
    <g>
      <polygon points={leftFace} fill={FILL_LEFT} stroke={STROKE} strokeWidth={SW} />
      <polygon points={rightFace} fill={FILL_RIGHT} stroke={STROKE} strokeWidth={SW} />
      <polygon points={topFace} fill={top} stroke={STROKE} strokeWidth={SW} />
    </g>
  );
}

function Line({
  from,
  to,
  dashed = false,
}: {
  from: [number, number, number];
  to: [number, number, number];
  dashed?: boolean;
}) {
  const [x1, y1] = p(...from);
  const [x2, y2] = p(...to);
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={STROKE}
      strokeWidth={SW}
      strokeDasharray={dashed ? "2.5 2.5" : undefined}
    />
  );
}

function Node({ at, accent = false }: { at: [number, number, number]; accent?: boolean }) {
  const [cx, cy] = p(...at);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={accent ? 2.4 : 1.9}
      fill={accent ? "#5B7FDB" : "#F8F7F3"}
      stroke={accent ? "#5B7FDB" : STROKE}
      strokeWidth={SW}
    />
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="-62 -64 124 118"
      className="h-[132px] w-full"
      aria-hidden
      shapeRendering="geometricPrecision"
    >
      {children}
    </svg>
  );
}

/** 01 — layered measurement: attention sampled in stacked intervals */
export function IsoStack() {
  return (
    <Frame>
      <Box x={-1.35} y={-1.35} z={0} w={2.7} d={2.7} h={0.26} />
      <Box x={-1.35} y={-1.35} z={1.05} w={2.7} d={2.7} h={0.26} />
      <Box x={-1.35} y={-1.35} z={2.1} w={2.7} d={2.7} h={0.26} />
      <Box x={-0.45} y={-0.45} z={2.5} w={0.9} d={0.9} h={0.9} top="#E7ECF9" />
      <Node at={[1.35, -1.35, 2.36]} accent />
    </Frame>
  );
}

/** 02 — signal graph: independent checks feeding one verdict */
export function IsoNodes() {
  return (
    <Frame>
      <Line from={[-1.1, 1.3, 0.95]} to={[1.5, 0.2, 1.85]} dashed />
      <Line from={[1.1, -1.6, 1.85]} to={[1.5, 0.2, 1.85]} dashed />
      <Box x={-1.8} y={0.6} z={0} w={1.35} d={1.35} h={0.95} />
      <Box x={0.45} y={-2.3} z={0} w={1.35} d={1.35} h={1.85} />
      <Box x={0.85} y={-0.45} z={0} w={1.35} d={1.35} h={1.85} top="#E7ECF9" />
      <Node at={[1.5, 0.2, 1.85]} accent />
    </Frame>
  );
}

/** 03 — settlement: value converging into a single on-chain transfer */
export function IsoConverge() {
  return (
    <Frame>
      <Box x={-1.9} y={-1.9} z={-0.3} w={3.8} d={3.8} h={0.22} />
      <Line from={[-1.1, -1.1, 0]} to={[0, 0, 1.1]} dashed />
      <Line from={[1.1, -1.1, 0]} to={[0, 0, 1.1]} dashed />
      <Line from={[-1.1, 1.1, 0]} to={[0, 0, 1.1]} dashed />
      <Box x={-1.75} y={-1.75} z={-0.08} w={1.05} d={1.05} h={0.8} />
      <Box x={0.7} y={-1.75} z={-0.08} w={1.05} d={1.05} h={0.8} />
      <Box x={-1.75} y={0.7} z={-0.08} w={1.05} d={1.05} h={0.8} />
      <Box x={-0.55} y={-0.55} z={1.05} w={1.1} d={1.1} h={1.1} top="#E7ECF9" />
      <Node at={[0, 0, 2.35]} accent />
    </Frame>
  );
}

/** 04 — public ledger: an append-only ring anyone can read */
export function IsoOrbit() {
  const r = 2.6;
  return (
    <Frame>
      <ellipse
        cx={0}
        cy={0}
        rx={r * 1.2247 * S}
        ry={r * 0.7071 * S}
        fill="none"
        stroke={STROKE}
        strokeWidth={SW}
        strokeDasharray="3 3"
      />
      <Box x={-1.1} y={-1.1} z={0} w={2.2} d={2.2} h={0.26} />
      <Box x={-0.6} y={-0.6} z={0.35} w={1.2} d={1.2} h={1.2} top="#E7ECF9" />
      <Node at={[r * 0.71, -r * 0.71, 0]} accent />
      <Node at={[-r * 0.71, r * 0.71, 0]} />
      <Node at={[r * 0.71, r * 0.71, 0]} />
      <Node at={[-r * 0.71, -r * 0.71, 0]} />
    </Frame>
  );
}

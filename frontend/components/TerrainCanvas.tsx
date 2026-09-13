"use client";

import { useEffect, useRef } from "react";

/* ---------- deterministic noise ---------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iy: number, seed: number) {
  let h =
    Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);

function noise1(x: number, seed: number) {
  const i = Math.floor(x);
  const f = fade(x - i);
  const a = hash2(i, 0, seed);
  const b = hash2(i + 1, 0, seed);
  return a + (b - a) * f;
}

function noise2(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

function fbm(x: number, seed: number, octaves = 5) {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise1(x * freq, seed + i * 97);
    amp *= 0.5;
    freq *= 2;
  }
  return v;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const gauss = (x: number, center: number, width: number) =>
  Math.exp(-(((x - center) / width) ** 2));

/* ---------- terrain layers ---------- */

type Layer = {
  seed: number;
  /** 0..1 — how tall this ridge sits in the frame */
  scale: number;
  /** vertical offset as a fraction of height */
  offset: number;
  /** dot fade rate below the ridge surface */
  falloff: number;
  color: [number, number, number];
  maxAlpha: number;
  detail: number;
};

const LAYERS: Layer[] = [
  // far ridge — lighter, sits higher and further left
  {
    seed: 1207,
    scale: 0.44,
    offset: 0.1,
    falloff: 0.15,
    color: [111, 111, 111],
    maxAlpha: 0.55,
    detail: 7.5,
  },
  // main massif — the dominant dark peak
  {
    seed: 5501,
    scale: 0.72,
    offset: 0.0,
    falloff: 0.3,
    color: [17, 17, 17],
    maxAlpha: 1,
    detail: 5.2,
  },
];

/** Ridge envelope: a dominant peak right-of-centre with subordinate shoulders. */
function envelope(nx: number) {
  return (
    gauss(nx, 0.66, 0.3) * 1.0 +
    gauss(nx, 0.37, 0.2) * 0.46 +
    gauss(nx, 0.92, 0.17) * 0.6
  );
}

function surfaceAt(nx: number, layer: Layer) {
  const env = Math.min(1.05, envelope(nx + layer.offset * 0.4));
  const craggy = 0.62 + 0.52 * fbm(nx * layer.detail + layer.seed * 0.01, layer.seed);
  return Math.max(0, env * craggy);
}

export function TerrainCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = parent.getBoundingClientRect();
      const W = Math.max(1, Math.floor(rect.width));
      const H = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cell = W < 520 ? 3.1 : 2.55;
      const rnd = mulberry32(20260913);
      const accents: Array<[number, number, number]> = [];

      for (const layer of LAYERS) {
        ctx.fillStyle = `rgb(${layer.color[0]},${layer.color[1]},${layer.color[2]})`;

        for (let x = 0; x <= W; x += cell) {
          const nx = x / W;

          // ridge line for this column
          const s = surfaceAt(nx, layer);
          const surfaceY = H - s * H * layer.scale - layer.offset * H * 0.18;

          // dissolve toward the left edge so the mass reads as right-weighted
          const fadeX = smoothstep(0.04, 0.46, nx);
          if (fadeX <= 0.001) continue;

          for (let y = surfaceY; y <= H; y += cell) {
            const depth = (y - surfaceY) / H;

            // densest along the ridge, dissolving downward
            let d = Math.exp(-depth / layer.falloff);

            // fade before the bottom edge
            d *= 1 - smoothstep(0.62, 1.02, y / H);
            d *= fadeX;
            d *= 0.42 + 0.72 * s;

            // cloudy variation so it never looks mechanical
            d *= 0.52 + 0.95 * noise2(x * 0.026, y * 0.026, layer.seed);

            if (d <= 0.012) continue;

            const a = Math.min(1, d) * layer.maxAlpha;
            if (rnd() > a * 1.18) continue;

            const size = 0.75 + Math.min(1, d) * 1.05;
            ctx.globalAlpha = Math.min(1, 0.32 + a * 0.85);
            ctx.fillRect(x, y, size, size);

            // rare blue indicator, only in the dense band
            if (layer.maxAlpha === 1 && d > 0.72 && rnd() > 0.994) {
              accents.push([x, y, size]);
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // restrained accent pass
      ctx.fillStyle = "#5B7FDB";
      for (const [x, y, size] of accents) {
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, size + 0.35, size + 0.35);
      }
      ctx.globalAlpha = 1;
    };

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`block h-full w-full ${className}`}
    />
  );
}

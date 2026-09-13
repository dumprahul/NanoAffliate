"use client";

import { useEffect, useRef } from "react";

/* ---------- deterministic noise — same technique as TerrainCanvas.tsx ---------- */

function hash2(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);

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

function noise1(x: number, seed: number) {
  const i = Math.floor(x);
  const f = fade(x - i);
  const a = hash2(i, 0, seed);
  const b = hash2(i + 1, 0, seed);
  return a + (b - a) * f;
}

function fbm1(x: number, seed: number, octaves = 4) {
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

/** Two crossing diagonal wave bands — dark ink and mid-grey, dithered like TerrainCanvas. */
type Band = {
  seed: number;
  /** vertical center of the band as a fraction of height, at x=0 */
  baseY: number;
  /** how much the band's center rises/falls across the frame */
  rise: number;
  /** wave cycles across the frame width */
  cycles: number;
  thickness: number;
  color: [number, number, number];
  maxAlpha: number;
};

const BANDS: Band[] = [
  { seed: 3301, baseY: 0.28, rise: 0.5, cycles: 1.15, thickness: 0.24, color: [17, 17, 17], maxAlpha: 1 },
  { seed: 8802, baseY: 0.62, rise: -0.48, cycles: 1.15, thickness: 0.22, color: [90, 90, 90], maxAlpha: 0.65 },
];

function centerAt(nx: number, band: Band) {
  const wave = Math.sin(nx * Math.PI * band.cycles - Math.PI / 2) * 0.5 + 0.5;
  return band.baseY + (wave - 0.5) * band.rise + 0.05 * (fbm1(nx * 3 + band.seed * 0.01, band.seed) - 0.5);
}

export function WaveCanvas({ className = "" }: { className?: string }) {
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

      const cell = W < 420 ? 2.6 : 2.2;
      const accents: Array<[number, number, number]> = [];

      for (const band of BANDS) {
        ctx.fillStyle = `rgb(${band.color[0]},${band.color[1]},${band.color[2]})`;

        for (let x = 0; x <= W; x += cell) {
          const nx = x / W;
          const centerY = centerAt(nx, band) * H;
          const halfBand = band.thickness * H * 0.5;
          const yStart = Math.max(0, centerY - halfBand * 1.6);
          const yEnd = Math.min(H, centerY + halfBand * 1.6);

          for (let y = yStart; y <= yEnd; y += cell) {
            const distFromCenter = Math.abs(y - centerY) / halfBand;
            let d = Math.exp(-(distFromCenter * distFromCenter) * 1.4);

            // cloudy dissolve so the edge never reads as a hard line
            d *= 0.5 + 0.85 * noise2(x * 0.03, y * 0.03, band.seed);

            if (d <= 0.02) continue;

            const a = Math.min(1, d) * band.maxAlpha;
            ctx.globalAlpha = Math.min(1, 0.28 + a * 0.85);
            const size = 0.7 + Math.min(1, d) * 1.15;
            ctx.fillRect(x, y, size, size);

            if (band.maxAlpha === 1 && d > 0.8 && hash2(Math.floor(x), Math.floor(y), 77) > 0.9975) {
              accents.push([x, y, size]);
            }
          }
        }
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#5B7FDB";
      for (const [x, y, size] of accents) {
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, size + 0.4, size + 0.4);
      }
      ctx.globalAlpha = 1;
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`block h-full w-full ${className}`} />;
}

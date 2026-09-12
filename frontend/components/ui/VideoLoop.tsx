"use client";

import { useEffect, useRef } from "react";

/**
 * Autoplaying, looping, muted product-capture video. Source files are
 * pre-cropped/encoded MP4s in public/animations/ (converted from the
 * original screen-recording GIFs — see the conversion notes in
 * public/animations/README.md).
 */
export function VideoLoop({
  src,
  className = "",
  warm = false,
  blend = false,
  maskFadeLeft,
}: {
  src: string;
  className?: string;
  /** Nudges the cool-white capture background a touch closer to the site's warm ivory. */
  warm?: boolean;
  /** mix-blend-mode: multiply — dissolves the capture's near-white background
   *  into whatever's behind it, leaving only the dark line art visible. Use
   *  for ambient/full-bleed placements (no bordered "screen" framing). */
  blend?: boolean;
  /**
   * Left-edge fade, as a CSS length/percent where the fade completes (e.g. "12%").
   * MUST live on this same element as `blend` — a mask-image on an ancestor
   * forces the browser to composite this element in an isolated buffer
   * against a transparent backdrop first, so mix-blend-mode never actually
   * reaches the real page background behind it (you get a flat, unblended
   * white rectangle with only its edges opacity-faded, not color-blended).
   */
  maskFadeLeft?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // Pause off-screen loops so five looping videos don't all burn cycles
  // when scrolled out of view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      style={{
        ...(warm ? { filter: "sepia(6%) saturate(94%) brightness(0.99)" } : undefined),
        ...(blend ? { mixBlendMode: "multiply" } : undefined),
        ...(maskFadeLeft
          ? {
              maskImage: `linear-gradient(to right, transparent, black ${maskFadeLeft})`,
              WebkitMaskImage: `linear-gradient(to right, transparent, black ${maskFadeLeft})`,
            }
          : undefined),
      }}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    >
      <source src={`/animations/${src}.mp4`} type="video/mp4" />
    </video>
  );
}

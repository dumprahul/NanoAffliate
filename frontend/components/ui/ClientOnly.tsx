"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Defers rendering until after mount. These dashboard pages are statically
 * prerendered at build time but read `Date.now()` at render (relative
 * timestamps, range filters) — the gap between build time and whenever a
 * real visitor's browser hydrates the page could be arbitrarily large,
 * guaranteeing a server/client text mismatch sooner or later. Rendering
 * nothing until mount sidesteps the whole class of bug: there's no
 * server-rendered time-dependent output left to disagree with.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

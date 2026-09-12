"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Restrained entrance: fade + slight upward movement, staggered by index.
 * No bounce, no scale, no elastic easing.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
  once = true,
  /** Above-the-fold content should animate immediately rather than wait on
   *  an intersection callback, which can flash empty on first paint. */
  onMount = false,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
  onMount?: boolean;
}) {
  const transition = { duration: 0.75, delay, ease: EASE };

  if (onMount) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

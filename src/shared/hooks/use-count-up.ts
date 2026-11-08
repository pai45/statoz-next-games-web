"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const countUpMs = 600;

/**
 * Eases a figure up from zero once, on mount — the profile's telemetry cells
 * and the leaderboard's scores both land this way.
 *
 * The state held is how far the run has got, not the figure itself, so a value
 * with nothing to count to — a zero, or a viewer who asked for less motion —
 * simply renders its target and never schedules a frame. The page-wide reduced
 * motion rule only flattens CSS, so a number ticking in JavaScript would
 * otherwise be the one thing that ignored it.
 */
export function useCountUp(target: number | undefined, durationMs = countUpMs): number {
  const reduced = usePrefersReducedMotion();
  const animate = target !== undefined && target > 0 && !reduced;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!animate) return;

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      setProgress(t);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animate, durationMs, target]);

  if (!animate) return target ?? 0;
  // easeOutCubic, so the figure decelerates into its final value.
  return Math.round(target * (1 - Math.pow(1 - progress, 3)));
}

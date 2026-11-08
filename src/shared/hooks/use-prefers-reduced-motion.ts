"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the viewer asked for less motion.
 *
 * The global damper in `globals.css` only neuters CSS animations and
 * transitions — a rAF loop runs straight through it — so anything animated from
 * JavaScript has to ask for itself. The games do, and so does the profile's
 * counting telemetry, which is why the question is answered here rather than
 * inside any one feature.
 */

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(reduceMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reduceMotionQuery).matches,
    () => false,
  );
}

"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * A claim on the screen, for the moments a feature earns.
 *
 * A quiz sealing a card and a pick locking in both play a full-screen beat, and
 * both also tick the daily streak — which has a celebration of its own. Without
 * a claim the two land together and the later one simply covers the earlier.
 * An overlay holds the screen while it is mounted, and anything that can wait
 * asks whether it is free.
 */

let holders = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Claims the screen. Call the returned function to release it. */
export function holdFullScreenMoment(): () => void {
  holders += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    notify();
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Holds the screen for as long as the calling component is mounted. */
export function useFullScreenMoment(): void {
  useEffect(() => holdFullScreenMoment(), []);
}

/** True while some feature's own moment is playing. */
export function useFullScreenMomentActive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => holders > 0,
    () => false,
  );
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * A shared one-second clock.
 *
 * A countdown has to re-render every second, and a component that ticks its own
 * `Date.now()` into state from an effect both fights the compiler and disagrees
 * with the server render. This is one interval behind a store instead: it
 * reports `null` until the client subscribes, so the first paint matches the
 * server, and every countdown on the page ticks on the same beat.
 */

let current: number | null = null;
let timer: number | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer == null) {
    current = Date.now();
    timer = window.setInterval(() => {
      current = Date.now();
      for (const notify of listeners) notify();
    }, 1000);
  }
  // The first subscriber arrives after hydration, so publishing the clock now
  // is what moves every reader off the server's placeholder.
  listener();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

/** Milliseconds since the epoch, or null before the client has hydrated. */
export function useClock(): number | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

"use client";

import { useSyncExternalStore } from "react";

import { formatBoardCountdown } from "../components/rank-parts";

/**
 * How long the live board has left to run, ticking against a real clock.
 *
 * The app pins a frozen `'04h 12m'` into the pill because there is no board
 * behind it to expire. There is none here either, but a stopped clock is worse
 * than an honest one, so this counts down to the next local rollover — which is
 * when a daily board would turn over — and says nothing at all until the
 * browser has a clock to read. A server has no local midnight to count to.
 */

const listeners = new Set<() => void>();
let timer: number | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (timer === null) {
    timer = window.setInterval(() => {
      for (const listener of listeners) listener();
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

/** Whole seconds, so the snapshot is stable within a tick. */
function getSnapshot(): number | null {
  return Math.floor(Date.now() / 1000);
}

function getServerSnapshot(): number | null {
  return null;
}

function msUntilRollover(nowSeconds: number): number {
  const now = new Date(nowSeconds * 1000);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/** The formatted time left, or null before the browser has taken over. */
export function useBoardCountdown(): string | null {
  const second = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (second === null) return null;
  return formatBoardCountdown(msUntilRollover(second));
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * A clock that ticks once a second, and is null until it first reads.
 *
 * Every daily mode needs it: the countdown to the next puzzle, the timer on the
 * open one, and the local date rolling over under a tab left up overnight. The
 * app drives all of them from a one-second `Timer`; this is that, as a hook.
 *
 * The clock is an external system rather than React state, so it is read the
 * way external systems are read. Subscribing takes the first reading, which
 * React picks up when it re-checks the snapshot — no effect writes state, and
 * the screen does not wait a second for its first tick.
 *
 * Null before that first reading, because a server render has no clock and a
 * day key derived from a stand-in would name a day the archive does not hold.
 */

/** The sentinel for "not read yet", and the whole of the server's answer. */
const unread = new Date(0);

let current: Date = unread;

function subscribe(onChange: () => void): () => void {
  current = new Date();
  const id = window.setInterval(() => {
    current = new Date();
    onChange();
  }, 1000);
  return () => window.clearInterval(id);
}

function getSnapshot(): Date {
  return current;
}

function getServerSnapshot(): Date {
  return unread;
}

export function useClock(): Date | null {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return now === unread ? null : now;
}

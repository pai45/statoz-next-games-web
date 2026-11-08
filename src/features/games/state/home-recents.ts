"use client";

import { useSyncExternalStore } from "react";
import { homeRecentsKey, parseHomeRecents, withRecentGame, type RecentGame } from "./home-recents-model";

const changed = "statoz:home-recents";
const empty: readonly RecentGame[] = Object.freeze([]);
let cachedRaw: string | null | undefined;
let cached: readonly RecentGame[] = empty;

function read() {
  try { return window.localStorage.getItem(homeRecentsKey); } catch { return null; }
}
function snapshot(): readonly RecentGame[] {
  const raw = read();
  if (raw !== cachedRaw) { cachedRaw = raw; cached = parseHomeRecents(raw); }
  return cached;
}
function subscribe(notify: () => void) {
  const refresh = (event: StorageEvent) => {
    if (event.key === homeRecentsKey || event.key === null) { cachedRaw = undefined; notify(); }
  };
  window.addEventListener("storage", refresh);
  window.addEventListener(changed, notify);
  return () => { window.removeEventListener("storage", refresh); window.removeEventListener(changed, notify); };
}
export function useHomeRecents() { return useSyncExternalStore(subscribe, snapshot, () => empty); }

/** Called by the mounted game host, so prefetching a link never counts as play. */
export function recordHomeGame(gameId: unknown, now = Date.now()) {
  const entries = withRecentGame(snapshot(), gameId, now);
  try {
    window.localStorage.setItem(homeRecentsKey, JSON.stringify({ version: 1, entries }));
    window.dispatchEvent(new Event(changed));
  } catch { /* Unavailable storage leaves the featured catalog usable. */ }
}

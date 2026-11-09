"use client";

import { useSyncExternalStore } from "react";

/** Holes in the upstream course list (data/config/game.cfg num_levels). */
export const openGolfHoles = 20;

export type OpenGolfProgress = {
  /** Best stroke count per hole, or null when the hole has not been cleared. */
  bests: readonly (number | null)[];
  cleared: number;
  total: number;
  aces: number;
  /** First hole without a best (the engine unlocks holes in order); null when all are cleared. */
  next: number | null;
};

/** Same key BundledGame writes for the account-scoped bundle save. */
export function openGolfSaveKey(account: string | null): string {
  return "statoz.next.games-web.bundle.open-golf." + encodeURIComponent(account || "guest");
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Reads the engine's storage.json, carried in the bundle save under "open-golf.storage". */
export function parseOpenGolfProgress(raw: string | null): OpenGolfProgress {
  let storage: Record<string, unknown> = {};
  try {
    const save = record(JSON.parse(raw ?? "null"));
    const stored = save?.schemaVersion === 1 ? record(save.stores)?.["open-golf.storage"] : null;
    if (typeof stored === "string") storage = record(JSON.parse(stored)) ?? {};
  } catch {
    // Unreadable saves stay untouched; the game reports them when it opens.
  }
  const bests = Array.from({ length: openGolfHoles }, (_, hole) => {
    const value = storage[`stroke_count_level_${hole}`];
    return typeof value === "number" && Number.isFinite(value) && value >= 1 ? Math.round(value) : null;
  });
  const scored = bests.filter((best): best is number => best !== null);
  const next = bests.findIndex((best) => best === null);
  return {
    bests,
    cleared: scored.length,
    total: scored.reduce((sum, best) => sum + best, 0),
    aces: scored.filter((best) => best === 1).length,
    next: next < 0 ? null : next,
  };
}

const cache = new Map<string, OpenGolfProgress>();

function readProgress(account: string | null): OpenGolfProgress {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(openGolfSaveKey(account));
  } catch {
    // Storage can be denied; the lobby then shows a fresh course.
  }
  const cacheKey = `${account ?? ""}\u0000${raw ?? ""}`;
  let progress = cache.get(cacheKey);
  if (!progress) {
    progress = parseOpenGolfProgress(raw);
    cache.clear();
    cache.set(cacheKey, progress);
  }
  return progress;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Saved course progress for the account, or null before hydration. */
export function useOpenGolfProgress(account: string | null): OpenGolfProgress | null {
  return useSyncExternalStore(subscribe, () => readProgress(account), () => null);
}

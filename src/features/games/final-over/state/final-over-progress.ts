"use client";

import { useSyncExternalStore } from "react";

import { defaultKitId } from "../data/kits";
import { tierXpMultipliers, type FinalOverTier } from "../tuning";

/**
 * Career totals for Final Over, kept in browser storage.
 *
 * Same shape as `penalty-shootout/state/shootout-progress.ts`, which is itself
 * the shape `features/packs/state/claimed-packs.ts` established: a versioned
 * key, a frozen default that doubles as the server snapshot, and a cached
 * parse so `useSyncExternalStore` can compare by reference.
 *
 * Flutter persists the same blob under `pd_final_over_stats_v1` through
 * `SecureGameStorage`, with the lobby's kit and tier selections riding along —
 * one blob, one write.
 */

const storageKey = "statoz.next.games-web.finalover.v1";

export type FinalOverStats = {
  chases: number;
  wins: number;
  bestScore: number;
  bestStars: number;
  sixes: number;
  fours: number;
  bestCombo: number;
  hintsSeen: boolean;
  kitId: string;
  tier: FinalOverTier;
  xp: number;
};

const nothingPlayed: FinalOverStats = Object.freeze({
  chases: 0,
  wins: 0,
  bestScore: 0,
  bestStars: 0,
  sixes: 0,
  fours: 0,
  bestCombo: 0,
  hintsSeen: false,
  kitId: defaultKitId,
  tier: "rookie",
  xp: 0,
});

/**
 * `useSyncExternalStore` compares snapshots by reference, so the parsed value
 * is cached and only replaced when the stored text actually changes. Returning
 * a fresh object every read would re-render forever.
 */
let cachedRaw: string | null = null;
let cachedValue: FinalOverStats = nothingPlayed;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // A private window refusing storage is not an error worth surfacing.
    return null;
  }
}

function positiveInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function coerce(value: unknown): FinalOverStats {
  if (typeof value !== "object" || value === null) return nothingPlayed;
  const record = value as Record<string, unknown>;
  const tier = record.tier;
  return {
    chases: positiveInteger(record.chases),
    wins: positiveInteger(record.wins),
    bestScore: positiveInteger(record.bestScore),
    bestStars: Math.min(3, positiveInteger(record.bestStars)),
    sixes: positiveInteger(record.sixes),
    fours: positiveInteger(record.fours),
    bestCombo: Math.min(3, positiveInteger(record.bestCombo)),
    hintsSeen: record.hintsSeen === true,
    kitId: typeof record.kitId === "string" ? record.kitId : defaultKitId,
    tier: tier === "pro" || tier === "elite" ? tier : "rookie",
    xp: positiveInteger(record.xp),
  };
}

function getSnapshot(): FinalOverStats {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (raw === null) {
    cachedValue = nothingPlayed;
    return cachedValue;
  }
  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    cachedValue = nothingPlayed;
  }
  return cachedValue;
}

function getServerSnapshot(): FinalOverStats {
  return nothingPlayed;
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab writing the same key should move this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: FinalOverStats): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/* ---- What a chase is worth ----------------------------------------------- */

export type FinalOverOutcome = {
  won: boolean;
  runs: number;
  wickets: number;
  stars: number;
  objectiveCompleted: boolean;
  ballsToSpare: number;
  tier: FinalOverTier;
  sixes: number;
  fours: number;
  bestCombo: number;
};

/**
 * Deliberately generous on effort and stingy on repetition: you are paid for
 * runs you actually scored, for the stars the engine awarded, and for finishing
 * early — not for pressing PLAY. Losing still pays, because a three-over chase
 * lost by two runs was a better game than one won by ten, and the player should
 * not resent having played it.
 */
export function calculateFinalOverXp(outcome: FinalOverOutcome): number {
  let xp = outcome.won ? 30 : 10;
  xp += outcome.runs;
  xp += outcome.stars * 8;
  if (outcome.objectiveCompleted) xp += 15;
  if (outcome.won) xp += outcome.ballsToSpare * 4;
  if (outcome.won && outcome.wickets === 0) xp += 10;
  return Math.round(xp * tierXpMultipliers[outcome.tier]);
}

/** A letter grade for the result plate — the stars said louder. */
export function gradeFor(
  won: boolean,
  stars: number,
  ballsToSpare: number,
): string {
  if (!won) return stars >= 2 ? "C" : "D";
  if (stars >= 3 && ballsToSpare >= 2) return "S";
  if (stars >= 3) return "A";
  if (stars >= 2) return "B";
  return "C";
}

export function losses(stats: FinalOverStats): number {
  return Math.max(0, stats.chases - stats.wins);
}

export function winRate(stats: FinalOverStats): string {
  return stats.chases === 0
    ? "—"
    : `${Math.round((stats.wins / stats.chases) * 100)}%`;
}

/* ---- Reading and writing -------------------------------------------------- */

const neverChanges = () => () => {};

/** False on the server and through the first client render, true afterwards. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

export function useFinalOverStats(): FinalOverStats {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads without subscribing — for the beat a chase is created. */
export function readFinalOverStats(): FinalOverStats {
  if (typeof window === "undefined") return nothingPlayed;
  return getSnapshot();
}

/** Settles one chase into the career totals, and returns the XP it paid. */
export function recordFinalOver(outcome: FinalOverOutcome): number {
  const current = readFinalOverStats();
  const gained = calculateFinalOverXp(outcome);
  write({
    ...current,
    chases: current.chases + 1,
    wins: current.wins + (outcome.won ? 1 : 0),
    bestScore: Math.max(current.bestScore, outcome.runs),
    bestStars: Math.max(current.bestStars, outcome.stars),
    sixes: current.sixes + outcome.sixes,
    fours: current.fours + outcome.fours,
    bestCombo: Math.max(current.bestCombo, outcome.bestCombo),
    hintsSeen: true,
    xp: current.xp + gained,
  });
  return gained;
}

/** The lobby's selections ride along with the stats — one blob, one write. */
export function saveLobbySelection(tier: FinalOverTier, kitId: string): void {
  const current = readFinalOverStats();
  if (current.tier === tier && current.kitId === kitId) return;
  write({ ...current, tier, kitId });
}

export function resetFinalOverProgress(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to the default.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

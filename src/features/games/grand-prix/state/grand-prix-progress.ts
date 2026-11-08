"use client";

import { useSyncExternalStore } from "react";

import {
  grandPrixCircuitFromName,
  type GrandPrixCircuitId,
} from "../types";

/**
 * The lifetime racing record, kept in browser storage.
 *
 * The shape `hoop-duel-progress.ts` established: a versioned key, a frozen
 * default that doubles as the server snapshot, a cached parse so
 * `useSyncExternalStore` can compare by reference, and a `storage` listener so
 * a second tab moves this one.
 *
 * Flutter persists the same blob as `GrandPrixStats` through
 * `SecureGameStorage`, with the lobby's circuit and distance riding along — one
 * blob, one write. The livery does not ride along here: it is a Shop cosmetic
 * on the web, so the equipped livery is read from the economy instead of being
 * duplicated into the game's own record.
 */

const storageKey = "statoz.next.games-web.grandprix.v1";

export type GrandPrixStats = {
  races: number;
  wins: number;
  podiums: number;
  /** The best finish ever; zero means nothing has been finished yet. */
  bestPosition: number;
  currentStreak: number;
  bestStreak: number;
  /**
   * The personal best per circuit and distance. A sprint best is keyed by the
   * circuit alone — the legacy key — and a longer race appends its lap count
   * (`emeraldPark@3L`), so two distances never race each other.
   */
  bestLapMsByCircuit: Record<string, number>;
  lastCircuit: GrandPrixCircuitId;
  lastLaps: number;
  xp: number;
};

/** A record with nothing on it — also the server snapshot. */
export const emptyGrandPrixStats: GrandPrixStats = Object.freeze({
  races: 0,
  wins: 0,
  podiums: 0,
  bestPosition: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestLapMsByCircuit: Object.freeze({}) as Record<string, number>,
  lastCircuit: "emeraldPark" as GrandPrixCircuitId,
  lastLaps: 1,
  xp: 0,
});

let cachedRaw: string | null = null;
let cachedValue: GrandPrixStats = emptyGrandPrixStats;

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

function coerceBests(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null) return {};
  const bests: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const time = positiveInteger(raw);
    if (time > 0) bests[key] = time;
  }
  return bests;
}

function coerce(value: unknown): GrandPrixStats {
  if (typeof value !== "object" || value === null) return emptyGrandPrixStats;
  const record = value as Record<string, unknown>;
  const laps = positiveInteger(record.lastLaps);
  return {
    races: positiveInteger(record.races),
    wins: positiveInteger(record.wins),
    podiums: positiveInteger(record.podiums),
    bestPosition: positiveInteger(record.bestPosition),
    currentStreak: positiveInteger(record.currentStreak),
    bestStreak: positiveInteger(record.bestStreak),
    bestLapMsByCircuit: coerceBests(record.bestLapMsByCircuit),
    lastCircuit: grandPrixCircuitFromName(
      typeof record.lastCircuit === "string" ? record.lastCircuit : null,
    ),
    lastLaps: laps >= 1 && laps <= 9 ? laps : 1,
    xp: positiveInteger(record.xp),
  };
}

function getSnapshot(): GrandPrixStats {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (raw === null) {
    cachedValue = emptyGrandPrixStats;
    return cachedValue;
  }
  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    cachedValue = emptyGrandPrixStats;
  }
  return cachedValue;
}

function getServerSnapshot(): GrandPrixStats {
  return emptyGrandPrixStats;
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: GrandPrixStats): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/* ---- Personal bests -------------------------------------------------------- */

function bestKey(circuit: GrandPrixCircuitId, laps: number): string {
  return laps <= 1 ? circuit : `${circuit}@${laps}L`;
}

export function bestLapMs(
  stats: GrandPrixStats,
  circuit: GrandPrixCircuitId,
  laps = 1,
): number | null {
  return stats.bestLapMsByCircuit[bestKey(circuit, laps)] ?? null;
}

/** Whether a time beats — or sets — the stored best for this circuit and distance. */
export function isPersonalBest(
  stats: GrandPrixStats,
  circuit: GrandPrixCircuitId,
  lapTimeMs: number,
  laps = 1,
): boolean {
  const best = bestLapMs(stats, circuit, laps);
  return best === null || lapTimeMs < best;
}

/* ---- Reading and writing --------------------------------------------------- */

const neverChanges = () => () => {};

/** False on the server and through the first client render, true afterwards. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

export function useGrandPrixStats(): GrandPrixStats {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads without subscribing — for the beat a race is built. */
export function readGrandPrixStats(): GrandPrixStats {
  if (typeof window === "undefined") return emptyGrandPrixStats;
  return getSnapshot();
}

export type RaceRecord = {
  position: number;
  lapTimeMs: number;
  circuit: GrandPrixCircuitId;
  laps: number;
  xp: number;
};

/**
 * One finished race folded into a record — `GrandPrixStats.recordResult`, and
 * pure, so the differential harness can drive a whole season through the code
 * the game actually runs rather than through a copy of it.
 */
export function recordInto(
  current: GrandPrixStats,
  options: RaceRecord,
): GrandPrixStats {
  const { position, lapTimeMs, circuit, laps, xp } = options;
  const won = position === 1;
  const streak = won ? current.currentStreak + 1 : 0;
  const bests = { ...current.bestLapMsByCircuit };
  if (lapTimeMs > 0 && isPersonalBest(current, circuit, lapTimeMs, laps)) {
    bests[bestKey(circuit, laps)] = lapTimeMs;
  }

  return {
    ...current,
    races: current.races + 1,
    wins: current.wins + (won ? 1 : 0),
    podiums: current.podiums + (position <= 3 ? 1 : 0),
    bestPosition:
      current.bestPosition === 0 || position < current.bestPosition
        ? position
        : current.bestPosition,
    currentStreak: streak,
    bestStreak: Math.max(current.bestStreak, streak),
    bestLapMsByCircuit: bests,
    lastCircuit: circuit,
    lastLaps: laps,
    xp: current.xp + xp,
  };
}

/**
 * Settles one finished race into browser storage.
 *
 * A race walked out of never reaches here: leaving mid-race discards the
 * attempt, exactly as it does in the app. A retirement does reach here — it is
 * a race started and classified last — but it sets no lap and so can never be
 * a personal best.
 */
export function recordGrandPrixRace(options: RaceRecord): void {
  write(recordInto(readGrandPrixStats(), options));
}

/** The lobby's circuit selection persists the moment it is made. */
export function saveCircuit(circuit: GrandPrixCircuitId): void {
  const current = readGrandPrixStats();
  if (current.lastCircuit === circuit) return;
  write({ ...current, lastCircuit: circuit });
}

/** The lobby's race distance, likewise. */
export function saveLaps(laps: number): void {
  const current = readGrandPrixStats();
  if (current.lastLaps === laps) return;
  write({ ...current, lastLaps: laps });
}

export function resetGrandPrixProgress(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to the default.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

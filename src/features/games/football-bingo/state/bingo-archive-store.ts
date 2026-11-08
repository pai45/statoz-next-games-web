"use client";

import { useSyncExternalStore } from "react";

import { contentVersion, startingLifelines } from "../constants";
import { hydrateArchive } from "../engine/archive";
import type { BingoArchive, BingoProgress } from "../types";

/**
 * Where the season lives — the web port of the Football Bingo half of
 * `SecureGameStorage`.
 *
 * The app keeps a per-day archive: which grid a day was dealt, what has been
 * solved, how many lifelines are left, and how long the player has spent. The
 * same record is kept here under one versioned key, read through
 * `useSyncExternalStore` so a second tab and the game itself never disagree.
 *
 * Hydration is deliberately not a read: it opens every day that has come round
 * since the last visit, which means both the browser clock and a write. It is
 * called from an effect, never during render.
 */

const storageKey = "statoz.next.games-web.footballbingo.v1";

/**
 * `useSyncExternalStore` compares snapshots by reference, so the parse is
 * cached and only replaced when the stored text changes. Null means storage has
 * not been read into a season yet — the screens show their loading frame, as
 * the app does while its cubit loads.
 */
let cachedRaw: string | null = null;
let cachedValue: BingoArchive | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // A private window refusing storage is not an error worth surfacing.
    return null;
  }
}

function integer(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.floor(value)
    : fallback;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function coerceProgress(value: unknown): BingoProgress {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    puzzleId: typeof record.puzzleId === "string" ? record.puzzleId : "",
    startedAt: integer(record.startedAt, 0),
    solvedCellIds: stringList(record.solvedCellIds),
    currentIndex: integer(record.currentIndex, 0),
    lifelines: integer(record.lifelines, startingLifelines),
    completed: record.completed === true,
    cellOrderIds: stringList(record.cellOrderIds),
    elapsedSeconds: Math.max(0, integer(record.elapsedSeconds, 0)),
  };
}

function coerce(value: unknown): BingoArchive | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const days =
    typeof record.progressByDay === "object" && record.progressByDay !== null
      ? (record.progressByDay as Record<string, unknown>)
      : {};

  const progressByDay: Record<string, BingoProgress> = {};
  for (const [dayKey, progress] of Object.entries(days)) {
    progressByDay[dayKey] = coerceProgress(progress);
  }

  return {
    contentVersion: integer(record.contentVersion, 1),
    firstUnlockDayKey:
      typeof record.firstUnlockDayKey === "string" ? record.firstUnlockDayKey : "",
    progressByDay,
  };
}

/** What is in storage right now, unhydrated. Null when there is nothing usable. */
function storedArchive(): BingoArchive | null {
  const raw = readRaw();
  if (raw === null) return null;
  try {
    return coerce(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getSnapshot(): BingoArchive | null {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = storedArchive();
  return cachedValue;
}

function getServerSnapshot(): BingoArchive | null {
  return null;
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

function write(next: BingoArchive): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
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

/**
 * The season as stored. Null until `openSeason` has run, which is what the
 * loading frame waits on.
 */
export function useBingoArchive(): BingoArchive | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Opens every day that has come round, repairs anything a content change
 * invalidated, and writes the result back.
 *
 * Safe to call again — on mount, and each time the local date rolls over while
 * the game is left open. It writes only when the season actually moved, so a
 * repeat call does not wake every subscriber.
 */
export function openSeason(now: Date): BingoArchive {
  const current = storedArchive();
  const next = hydrateArchive(current, now);
  if (
    current === null ||
    current.contentVersion !== next.contentVersion ||
    JSON.stringify(current) !== JSON.stringify(next)
  ) {
    write(next);
  }
  return next;
}

/** Replaces one day's progress and persists the season. */
export function saveProgress(dayKey: string, progress: BingoProgress): void {
  const current = storedArchive();
  if (current === null) return;
  write({
    ...current,
    contentVersion,
    progressByDay: { ...current.progressByDay, [dayKey]: progress },
  });
}

/** Clears the season. Used by the demo reset, not by the game. */
export function resetBingoArchive(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to an unopened season.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

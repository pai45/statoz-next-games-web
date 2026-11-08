"use client";

import { useSyncExternalStore } from "react";

import {
  calculateBasketballXP,
  summaryMargin,
  summaryWon,
  type BasketballDifficulty,
  type BasketballMatchSummary,
} from "../types";

/**
 * Career totals for Hoop Duel, kept in browser storage.
 *
 * The same shape `final-over/state/final-over-progress.ts` established: a
 * versioned key, a frozen default that doubles as the server snapshot, and a
 * cached parse so `useSyncExternalStore` can compare by reference.
 *
 * Flutter persists the same blob through `SecureGameStorage` as
 * `BasketballStats`, with the lobby's difficulty selection riding along — one
 * blob, one write. The jersey does not ride along here: the web has no Shop, so
 * the player always wears STATOZ.
 */

const storageKey = "statoz.next.games-web.hoopduel.v1";

export type HoopDuelStats = {
  games: number;
  wins: number;
  losses: number;
  otGames: number;
  currentStreak: number;
  bestStreak: number;
  mostPoints: number;
  bestMargin: number;
  totalDunks: number;
  totalBlocks: number;
  totalPerfects: number;
  /** Whether the first-match control hints have already done their job. */
  hintsSeen: boolean;
  difficulty: BasketballDifficulty;
  xp: number;
};

const nothingPlayed: HoopDuelStats = Object.freeze({
  games: 0,
  wins: 0,
  losses: 0,
  otGames: 0,
  currentStreak: 0,
  bestStreak: 0,
  mostPoints: 0,
  bestMargin: 0,
  totalDunks: 0,
  totalBlocks: 0,
  totalPerfects: 0,
  hintsSeen: false,
  difficulty: "pro",
  xp: 0,
});

let cachedRaw: string | null = null;
let cachedValue: HoopDuelStats = nothingPlayed;

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

function coerce(value: unknown): HoopDuelStats {
  if (typeof value !== "object" || value === null) return nothingPlayed;
  const record = value as Record<string, unknown>;
  const difficulty = record.difficulty;
  return {
    games: positiveInteger(record.games),
    wins: positiveInteger(record.wins),
    losses: positiveInteger(record.losses),
    otGames: positiveInteger(record.otGames),
    currentStreak: positiveInteger(record.currentStreak),
    bestStreak: positiveInteger(record.bestStreak),
    mostPoints: positiveInteger(record.mostPoints),
    bestMargin: positiveInteger(record.bestMargin),
    totalDunks: positiveInteger(record.totalDunks),
    totalBlocks: positiveInteger(record.totalBlocks),
    totalPerfects: positiveInteger(record.totalPerfects),
    hintsSeen: record.hintsSeen === true,
    difficulty:
      difficulty === "rookie" || difficulty === "allStar" ? difficulty : "pro",
    xp: positiveInteger(record.xp),
  };
}

function getSnapshot(): HoopDuelStats {
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

function getServerSnapshot(): HoopDuelStats {
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

function write(next: HoopDuelStats): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
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

export function useHoopDuelStats(): HoopDuelStats {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads without subscribing — for the beat a match is created. */
export function readHoopDuelStats(): HoopDuelStats {
  if (typeof window === "undefined") return nothingPlayed;
  return getSnapshot();
}

/**
 * Settles one finished match into the career totals, and returns the XP it
 * paid. An abandoned match never reaches here: walking off the court costs you
 * the attempt, exactly as it does in Flutter.
 */
export function recordHoopDuel(summary: BasketballMatchSummary): number {
  const current = readHoopDuelStats();
  const won = summaryWon(summary);
  const margin = summaryMargin(summary);
  const gained = calculateBasketballXP({
    won,
    margin,
    overtime: summary.overtime,
  });
  const streak = won ? current.currentStreak + 1 : 0;

  write({
    ...current,
    games: current.games + 1,
    wins: current.wins + (won ? 1 : 0),
    losses: current.losses + (won ? 0 : 1),
    otGames: current.otGames + (summary.overtime ? 1 : 0),
    currentStreak: streak,
    bestStreak: Math.max(current.bestStreak, streak),
    mostPoints: Math.max(current.mostPoints, summary.playerScore),
    bestMargin: won ? Math.max(current.bestMargin, margin) : current.bestMargin,
    totalDunks: current.totalDunks + summary.box.dunks,
    totalBlocks: current.totalBlocks + summary.box.blocks,
    totalPerfects: current.totalPerfects + summary.box.perfectReleases,
    difficulty: summary.difficulty,
    xp: current.xp + gained,
  });
  return gained;
}

/** The lobby's difficulty selection persists the moment it is made. */
export function saveDifficulty(difficulty: BasketballDifficulty): void {
  const current = readHoopDuelStats();
  if (current.difficulty === difficulty) return;
  write({ ...current, difficulty });
}

/** The control hints have served their purpose after one full half. */
export function markHintsSeen(): void {
  const current = readHoopDuelStats();
  if (current.hintsSeen) return;
  write({ ...current, hintsSeen: true });
}

export function winRate(stats: HoopDuelStats): string {
  return stats.games === 0
    ? "—"
    : `${Math.round((stats.wins / stats.games) * 100)}%`;
}

export function resetHoopDuelProgress(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to the default.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

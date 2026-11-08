"use client";

import { useMemo, useSyncExternalStore } from "react";

import { recordStreakActivity } from "@/features/streaks/activity";

import { maxAttempts } from "../constants";
import type {
  GuessPlayerArchive,
  GuessPlayerDayRecord,
  GuessPlayerHintType,
  GuessPlayerResultStatus,
} from "../types";
import { effectiveWon, isCompleted } from "../engine/archive";
import type { GuessPlayerSport } from "../engine/deck";

/**
 * Where the daily mysteries live — the Guess Player half of the app's
 * `SecureGameStorage`.
 *
 * The app keeps one archive per sport and a separate set of settlement ids, so
 * reopening a debrief cannot pay twice. Both are kept here under one versioned
 * key: a single blob means a half-finished write can never leave two sports
 * disagreeing about the same day, and the read goes through
 * `useSyncExternalStore` so a second tab moves this one.
 *
 * XP is not stored. Every record carries the XP its day paid, so the track's
 * total is the sum of what is here — the same rule the quiz ladder follows, and
 * one that cannot drift out of step with the archive the way a second stored
 * total could.
 */

const storageKey = "statoz.next.games-web.guessplayer.v1";

export type GuessPlayerStore = {
  /** Mirrors the app's `GuessPlayerDayRecord.schemaVersion`. */
  version: number;
  bySport: Partial<Record<GuessPlayerSport, GuessPlayerArchive>>;
  /** `guess-player:<sport>:<day>` for every day already credited. */
  settled: string[];
};

const empty: GuessPlayerStore = Object.freeze({
  version: 2,
  bySport: Object.freeze({}) as Partial<
    Record<GuessPlayerSport, GuessPlayerArchive>
  >,
  settled: Object.freeze([]) as unknown as string[],
});

/** An untouched sport, and the frozen value every empty read shares. */
export const emptyArchive: GuessPlayerArchive = Object.freeze({
  resultsByDay: Object.freeze({}) as Record<string, GuessPlayerDayRecord>,
});

/* ---- Reading storage ------------------------------------------------------- */

let cachedRaw: string | null = null;
let cachedValue: GuessPlayerStore = empty;

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

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

const statuses: GuessPlayerResultStatus[] = [
  "inProgress",
  "won",
  "lost",
  "gaveUp",
  "expired",
  "legacy",
];

const hintTypes: GuessPlayerHintType[] = ["position", "affiliation"];

/**
 * One stored day, narrowed back to a record.
 *
 * A value with no `status` came from the v1 contract, which stored a win flag
 * and a heart count and nothing else. It is migrated the way the app migrates
 * it — marked legacy, its whole route counted as revealed — so an old save
 * still shows up in the archive instead of vanishing.
 */
function coerceRecord(dayKey: string, value: unknown): GuessPlayerDayRecord {
  const raw =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  if (raw.status === undefined || raw.status === null) {
    const won = raw.won === true;
    return {
      dayKey,
      puzzleId: "",
      playerId: won ? "legacy-won" : "legacy-lost",
      targetPlayerName: text(raw.targetPlayerName),
      status: "legacy",
      guessedPlayerIds: [],
      revealedClueCount: 6,
      attemptsRemaining: integer(raw.heartsRemaining, 0),
      score: 0,
      xpEarned: 0,
      elapsedMs: 0,
      startedAtEpochMs: 0,
      completedAtEpochMs: 0,
      revealedHintTypes: [],
      legacy: true,
    };
  }

  const status = statuses.find((candidate) => candidate === raw.status) ?? "legacy";

  return {
    dayKey,
    puzzleId: text(raw.puzzleId),
    playerId: text(raw.playerId),
    targetPlayerName: text(raw.targetPlayerName),
    status,
    guessedPlayerIds: stringList(raw.guessedPlayerIds),
    revealedClueCount: integer(raw.revealedClueCount, 1),
    attemptsRemaining: integer(raw.attemptsRemaining, 0),
    score: integer(raw.score, 0),
    xpEarned: integer(raw.xpEarned, 0),
    elapsedMs: integer(raw.elapsedMs, 0),
    startedAtEpochMs: integer(raw.startedAtEpochMs, 0),
    completedAtEpochMs: integer(raw.completedAtEpochMs, 0),
    revealedHintTypes: stringList(raw.revealedHintTypes).filter(
      (entry): entry is GuessPlayerHintType =>
        hintTypes.some((type) => type === entry),
    ),
    legacy: raw.legacy === true,
  };
}

/** One sport's archive, narrowed back from whatever was stored. */
export function coerceArchive(value: unknown): GuessPlayerArchive {
  if (typeof value !== "object" || value === null) return emptyArchive;
  const raw = (value as { resultsByDay?: unknown }).resultsByDay;
  if (typeof raw !== "object" || raw === null) return emptyArchive;

  const resultsByDay: Record<string, GuessPlayerDayRecord> = {};
  for (const [dayKey, record] of Object.entries(raw as Record<string, unknown>)) {
    resultsByDay[dayKey] = coerceRecord(dayKey, record);
  }
  return { resultsByDay };
}

function coerce(value: unknown): GuessPlayerStore {
  if (typeof value !== "object" || value === null) return empty;
  const raw = value as Record<string, unknown>;
  const sports =
    typeof raw.bySport === "object" && raw.bySport !== null
      ? (raw.bySport as Record<string, unknown>)
      : {};

  const bySport: Partial<Record<GuessPlayerSport, GuessPlayerArchive>> = {};
  for (const sport of ["football", "cricket", "basketball"] as const) {
    if (sports[sport] !== undefined) {
      bySport[sport] = coerceArchive(sports[sport]);
    }
  }

  return {
    version: integer(raw.version, 2),
    bySport,
    settled: stringList(raw.settled),
  };
}

function getSnapshot(): GuessPlayerStore {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (raw === null) {
    cachedValue = empty;
    return cachedValue;
  }
  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    cachedValue = empty;
  }
  return cachedValue;
}

function getServerSnapshot(): GuessPlayerStore {
  return empty;
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

function write(next: GuessPlayerStore): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/* ---- Reading --------------------------------------------------------------- */

const neverChanges = () => () => {};

/** False on the server and through the first client render, true afterwards. */
export function useIsGuessPlayerHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

export function useGuessPlayerStore(): GuessPlayerStore {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function readGuessPlayerStore(): GuessPlayerStore {
  return getSnapshot();
}

export function archiveFor(
  store: GuessPlayerStore,
  sport: GuessPlayerSport,
): GuessPlayerArchive {
  return store.bySport[sport] ?? emptyArchive;
}

/** The app's settlement identity: one per sport per day. */
export function settlementIdFor(
  sport: GuessPlayerSport,
  dayKey: string,
): string {
  return `guess-player:${sport}:${dayKey}`;
}

export function isSettled(
  store: GuessPlayerStore,
  sport: GuessPlayerSport,
  dayKey: string,
): boolean {
  return store.settled.includes(settlementIdFor(sport, dayKey));
}

/* ---- Writing --------------------------------------------------------------- */

/** Replaces one sport's archive. */
export function saveArchive(
  sport: GuessPlayerSport,
  archive: GuessPlayerArchive,
): void {
  const current = getSnapshot();
  write({
    ...current,
    version: 2,
    bySport: { ...current.bySport, [sport]: archive },
  });
}

/**
 * Marks a finished day as credited, and reports whether this call was the one
 * that did it — which is what lets the debrief run its count-up exactly once,
 * however many times it is reopened.
 */
export function settleDay(sport: GuessPlayerSport, dayKey: string): boolean {
  const current = getSnapshot();
  const id = settlementIdFor(sport, dayKey);
  if (current.settled.includes(id)) return false;
  write({ ...current, settled: [...current.settled, id] });
  const [year, month, day] = dayKey.split("-").map(Number);
  recordStreakActivity("guessPlayer", new Date(year, month - 1, day, 12));
  return true;
}

export function resetGuessPlayer(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to an untouched archive.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/* ---- What the rest of the app reads ---------------------------------------- */

export type GuessPlayerStats = {
  /** XP the mode has paid, summed from the days that paid it. */
  xp: number;
  /** Days solved, across every sport. */
  solved: number;
  /** Days finished, however they finished. */
  played: number;
  /** The longest solved run still standing in any one sport. */
  bestStreak: number;
};

export function guessPlayerStatsFrom(store: GuessPlayerStore): GuessPlayerStats {
  let xp = 0;
  let solved = 0;
  let played = 0;
  let bestStreak = 0;

  for (const archive of Object.values(store.bySport)) {
    if (archive === undefined) continue;
    let run = 0;
    const days = Object.keys(archive.resultsByDay).sort();
    for (const dayKey of days) {
      const record = archive.resultsByDay[dayKey];
      xp += record.xpEarned;
      if (effectiveWon(record)) {
        solved += 1;
        run += 1;
        bestStreak = Math.max(bestStreak, run);
      } else if (isCompleted(record) || record.status === "legacy") {
        run = 0;
      }
      if (isCompleted(record) || record.status === "legacy") played += 1;
    }
  }

  return { xp, solved, played, bestStreak };
}

/**
 * The mode's contribution to the profile, for `useGameCareer`.
 *
 * Memoised on the store, because a fresh object every render would keep every
 * consumer re-rendering forever.
 */
export function useGuessPlayerStats(): GuessPlayerStats {
  const store = useGuessPlayerStore();
  return useMemo(() => guessPlayerStatsFrom(store), [store]);
}

/** The free guesses a day starts with, re-exported where the dock reads it. */
export { maxAttempts };

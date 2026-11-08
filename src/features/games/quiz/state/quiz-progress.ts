"use client";

import { useMemo, useSyncExternalStore } from "react";

import type { Sport } from "@/domain/sports";

import {
  modeRewards,
  questionsPerSet,
  quizModes,
  setCount,
} from "../constants";
import type { QuizMode, QuizProgress, SetOutcome } from "../types";

import { emptyProgress, modeProgressOf, recordRun, starCount } from "./ladder";

/**
 * Which quiz sets this browser has cleared, and how well.
 *
 * One record for every sport, on the versioned-key, frozen-default,
 * cached-parse shape every store in the app uses: `useSyncExternalStore`
 * compares snapshots by reference, so the parse is cached and only replaced
 * when the stored text actually changes.
 *
 * The app persists the same thing per sport through `SecureGameStorage`, one
 * key each. One blob is simpler here and means a half-finished write can never
 * leave two sports disagreeing about the same run.
 */

const storageKey = "statoz.next.games-web.quiz.v1";

type QuizRecord = Partial<Record<Sport, QuizProgress>>;

/** What an untouched browser looks like — and what the server always sees. */
const nothingPlayed: QuizRecord = Object.freeze({});

let cachedRaw: string | null = null;
let cachedValue: QuizRecord = nothingPlayed;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // A private window refusing storage is not an error worth surfacing.
    return null;
  }
}

function wholeNumber(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(Math.floor(value), max);
}

/** Narrows whatever was stored back to the record we expect, set by set. */
function coerce(value: unknown): QuizRecord {
  if (typeof value !== "object" || value === null) return nothingPlayed;
  const record = value as Record<string, unknown>;
  const out: QuizRecord = {};

  for (const [sport, rawProgress] of Object.entries(record)) {
    if (typeof rawProgress !== "object" || rawProgress === null) continue;
    const rawByMode = (rawProgress as { byMode?: unknown }).byMode;
    if (typeof rawByMode !== "object" || rawByMode === null) continue;
    const byMode: QuizProgress["byMode"] = {};

    for (const mode of quizModes) {
      const rawMode = (rawByMode as Record<string, unknown>)[mode];
      if (typeof rawMode !== "object" || rawMode === null) continue;
      const rawSets = (rawMode as { sets?: unknown }).sets;
      if (typeof rawSets !== "object" || rawSets === null) continue;

      const sets: QuizProgress["byMode"][QuizMode] = { sets: {} };
      for (const [key, rawSet] of Object.entries(
        rawSets as Record<string, unknown>,
      )) {
        const number = Number(key);
        if (!Number.isInteger(number) || number < 1 || number > setCount) {
          continue;
        }
        if (typeof rawSet !== "object" || rawSet === null) continue;
        const set = rawSet as Record<string, unknown>;
        sets.sets[number] = {
          completed: set.completed === true,
          bestCorrect: wholeNumber(set.bestCorrect, questionsPerSet),
          attempts: wholeNumber(set.attempts, Number.MAX_SAFE_INTEGER),
        };
      }
      if (Object.keys(sets.sets).length > 0) byMode[mode] = sets;
    }

    if (Object.keys(byMode).length > 0) out[sport as Sport] = { byMode };
  }

  return out;
}

function getSnapshot(): QuizRecord {
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

function getServerSnapshot(): QuizRecord {
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

function write(next: QuizRecord): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/* ---- Reading -------------------------------------------------------------- */

const neverChanges = () => () => {};

/** False on the server and through the first client render, true afterwards. */
export function useIsQuizHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

export function useQuizRecord(): QuizRecord {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function progressForSport(
  record: QuizRecord,
  sport: Sport,
): QuizProgress {
  return record[sport] ?? emptyProgress;
}

/* ---- Writing -------------------------------------------------------------- */

/**
 * Folds a finished run in and reports what it changed.
 *
 * The outcome comes back from the same fold that produced the new record, so
 * the reveal's "SET N+1 UNLOCKED" beat can never disagree with what was saved.
 */
export function recordSetResult(
  sport: Sport,
  mode: QuizMode,
  setNumber: number,
  correct: number,
): SetOutcome {
  const record = getSnapshot();
  const { progress, outcome } = recordRun(
    progressForSport(record, sport),
    mode,
    setNumber,
    correct,
  );
  write({ ...record, [sport]: progress });
  return outcome;
}

export function resetQuizProgress(): void {
  write(nothingPlayed);
}

/* ---- What the rest of the app reads --------------------------------------- */

export type QuizStats = {
  /** Sets cleared across every sport and mode. */
  setsCleared: number;
  /** Mastery stars banked everywhere. */
  stars: number;
  /**
   * XP the quiz has paid out, rebuilt from what is stored.
   *
   * The app banks quiz XP into one global total as it is earned. The web keeps
   * XP where it was earned, and the only durable record a set leaves is its
   * best score — so a mode's track carries the XP its best runs were worth.
   * That moves for the same reason banked XP would, and it cannot drift out of
   * step with the ladder the way a second stored total could.
   */
  xp: number;
};

export function quizStatsFrom(record: QuizRecord): QuizStats {
  let setsCleared = 0;
  let stars = 0;
  let xp = 0;

  for (const progress of Object.values(record)) {
    if (!progress) continue;
    for (const mode of quizModes) {
      const modeProgress = modeProgressOf(progress, mode);
      stars += starCount(modeProgress);
      for (const set of Object.values(modeProgress.sets)) {
        if (set.completed) setsCleared += 1;
        xp += set.bestCorrect * modeRewards[mode];
      }
    }
  }

  return { setsCleared, stars, xp };
}

/**
 * The quiz's contribution to the profile, for `useGameCareer`.
 *
 * Memoised on the record, because the summary is rebuilt from it and a fresh
 * object every render would keep every consumer re-rendering forever.
 */
export function useQuizStats(): QuizStats {
  const record = useQuizRecord();
  return useMemo(() => quizStatsFrom(record), [record]);
}

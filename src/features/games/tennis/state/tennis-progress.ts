"use client";

import { useSyncExternalStore } from "react";

import type { MatchSnapshot } from "../engine/tennis-game";
import {
  calculateTennisReward,
  defaultTennisSettings,
  quickMatchSignature,
  type TennisArchetype,
  type TennisMatchSummary,
  type TennisReward,
  type TennisSettings,
} from "../types";

/**
 * What this browser has done on the tennis court, and the match it left
 * unfinished.
 *
 * Flutter keeps all of this in a `TennisProfile` behind secure storage, wired to
 * a cubit. None of that exists on the web, so the parts the live screens
 * actually read live here, in the shape the packs feature and the shootout
 * already established: one key, a cached snapshot so `useSyncExternalStore`
 * never re-renders on an unchanged read, a frozen server snapshot, and
 * cross-tab sync.
 *
 * Only the quick-match slice of `TennisProfile` is here. The fields the dead V2
 * hub owned — tournaments, lesson completion, endless-rally and target-practice
 * bests — are not, because nothing can set or show them.
 */

const storageKey = "statoz.next.games-web.tennis.v1";

/** How many settled match ids are remembered, as the double-payout guard. */
const settledLimit = 256;

export type TennisProgress = {
  /** The athlete the starter pack dealt, mirrored so the lobby can name them. */
  selectedPlayerId: string | null;
  lastOpponentId: string | null;
  settings: TennisSettings;

  setsPlayed: number;
  setsWon: number;
  currentWinStreak: number;
  bestWinStreak: number;
  totalAces: number;
  longestRally: number;
  cleanHolds: number;
  breaksConverted: number;
  breakPointsSaved: number;
  netPointsWon: number;
  serveVolleyNetPoints: number;
  comebackSets: number;
  tiebreakNerveWins: number;
  stylesWon: TennisArchetype[];
  achievements: string[];
  masteryXp: Record<string, number>;

  /** Farming guard: the same rivalry, repeated, stops paying the bonus. */
  lastQuickSignature: string | null;
  quickRepeatCount: number;
  settledMatchIds: string[];

  /** The point the player walked away from, if they walked away mid-match. */
  resume: MatchSnapshot | null;
};

/** The snapshot before anything is known — and the one the server always sees. */
const nothingPlayed: TennisProgress = Object.freeze({
  selectedPlayerId: null,
  lastOpponentId: null,
  settings: defaultTennisSettings,
  setsPlayed: 0,
  setsWon: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  totalAces: 0,
  longestRally: 0,
  cleanHolds: 0,
  breaksConverted: 0,
  breakPointsSaved: 0,
  netPointsWon: 0,
  serveVolleyNetPoints: 0,
  comebackSets: 0,
  tiebreakNerveWins: 0,
  stylesWon: [],
  achievements: [],
  masteryXp: {},
  lastQuickSignature: null,
  quickRepeatCount: 0,
  settledMatchIds: [],
  resume: null,
});

let cachedRaw: string | null = null;
let cachedValue: TennisProgress = nothingPlayed;

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // A private window can refuse storage outright. Nothing is recorded, then.
    return null;
  }
}

function count(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function coerce(value: unknown): TennisProgress {
  if (!value || typeof value !== "object") return nothingPlayed;
  const record = value as Record<string, unknown>;

  const storedSettings =
    record.settings && typeof record.settings === "object"
      ? (record.settings as Partial<TennisSettings>)
      : {};

  return {
    selectedPlayerId:
      typeof record.selectedPlayerId === "string" ? record.selectedPlayerId : null,
    lastOpponentId:
      typeof record.lastOpponentId === "string" ? record.lastOpponentId : null,
    settings: { ...defaultTennisSettings, ...storedSettings },
    setsPlayed: count(record, "setsPlayed"),
    setsWon: count(record, "setsWon"),
    currentWinStreak: count(record, "currentWinStreak"),
    bestWinStreak: count(record, "bestWinStreak"),
    totalAces: count(record, "totalAces"),
    longestRally: count(record, "longestRally"),
    cleanHolds: count(record, "cleanHolds"),
    breaksConverted: count(record, "breaksConverted"),
    breakPointsSaved: count(record, "breakPointsSaved"),
    netPointsWon: count(record, "netPointsWon"),
    serveVolleyNetPoints: count(record, "serveVolleyNetPoints"),
    comebackSets: count(record, "comebackSets"),
    tiebreakNerveWins: count(record, "tiebreakNerveWins"),
    stylesWon: stringList(record.stylesWon) as TennisArchetype[],
    achievements: stringList(record.achievements),
    masteryXp:
      record.masteryXp && typeof record.masteryXp === "object"
        ? (record.masteryXp as Record<string, number>)
        : {},
    lastQuickSignature:
      typeof record.lastQuickSignature === "string" ? record.lastQuickSignature : null,
    quickRepeatCount: count(record, "quickRepeatCount"),
    settledMatchIds: stringList(record.settledMatchIds).slice(-settledLimit),
    resume:
      record.resume && typeof record.resume === "object"
        ? (record.resume as MatchSnapshot)
        : null,
  };
}

function getSnapshot(): TennisProgress {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  if (!raw) {
    cachedValue = nothingPlayed;
    return cachedValue;
  }
  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    // Unreadable state is treated as no state rather than crashing the route.
    cachedValue = nothingPlayed;
  }
  return cachedValue;
}

function getServerSnapshot(): TennisProgress {
  return nothingPlayed;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // A match settled in another tab should settle this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: TennisProgress): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Out of quota, or storage refused. The match still plays; it is just not
    // remembered, which is better than throwing out of an event handler.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/** Read the stored progress outside React — for settling and for saving. */
export function readTennisProgress(): TennisProgress {
  if (typeof window === "undefined") return nothingPlayed;
  return getSnapshot();
}

export function useTennisProgress(): TennisProgress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Whether the browser has answered yet. Gates anything storage decides. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/* ---- Writes -------------------------------------------------------------- */

export function saveTennisSettings(settings: TennisSettings): void {
  write({ ...readTennisProgress(), settings });
}

/** Remember who is playing whom, so the lobby and the reward guard agree. */
export function saveTennisPairing(playerId: string, opponentId: string): void {
  write({
    ...readTennisProgress(),
    selectedPlayerId: playerId,
    lastOpponentId: opponentId,
  });
}

export function saveResumeSnapshot(snapshot: MatchSnapshot): void {
  write({ ...readTennisProgress(), resume: snapshot });
}

export function clearResumeSnapshot(): void {
  const current = readTennisProgress();
  if (current.resume === null) return;
  write({ ...current, resume: null });
}

/**
 * Pay out a finished set and fold it into the career record.
 *
 * Guarded by `settledMatchIds` so a re-render, a double-fired event, or a
 * reload on the result screen cannot pay twice — the same guard Flutter's
 * `settle` uses, and the same one Final Over applies to its XP.
 */
export function settleTennisMatch(
  summary: TennisMatchSummary,
  archetype: TennisArchetype,
  isServeVolley: boolean,
): TennisReward {
  const current = readTennisProgress();
  if (current.settledMatchIds.includes(summary.matchId)) {
    return { xp: 0, coins: 0, masteryXp: 0, farmed: false };
  }

  const reward = calculateTennisReward(summary, current);
  const stats = summary.stats;
  const isSet = summary.mode === "quickMatch" || summary.mode === "tournament";

  const settled = [...current.settledMatchIds, summary.matchId].slice(-settledLimit);
  const masteryXp = { ...current.masteryXp };
  masteryXp[summary.playerId] = (masteryXp[summary.playerId] ?? 0) + reward.masteryXp;

  const stylesWon = new Set(current.stylesWon);
  if (summary.won && isSet) stylesWon.add(archetype);

  const serveVolleyNetPoints =
    current.serveVolleyNetPoints + (isServeVolley ? stats.netPointsWon : 0);

  const achievements = new Set(current.achievements);
  if (stats.cleanHolds > 0) achievements.add("clean-hold");
  if (stats.breakPointsWon > 0) achievements.add("break-through");
  if (stats.maxBreakPointsSavedInGame >= 3) achievements.add("unbreakable");
  if (current.totalAces + stats.aces >= 5) achievements.add("ace-high");
  if (stats.wonTwentyShotRally) achievements.add("rally-architect");
  if (serveVolleyNetPoints >= 10) achievements.add("net-authority");
  if (stats.comebackFromThreeGames && summary.won) achievements.add("comeback-set");
  if (stats.tiebreakNerve && summary.won) achievements.add("tiebreak-nerve");
  // The sixth archetype, all-court rival, is deliberately not required.
  const baseStyles: TennisArchetype[] = [
    "allRounder",
    "powerBaseliner",
    "speedDefender",
    "serveAndVolley",
    "spinSpecialist",
  ];
  if (baseStyles.every((style) => stylesWon.has(style))) achievements.add("all-styles");

  const signature = quickMatchSignature(summary);
  const quickRepeatCount =
    summary.mode === "quickMatch"
      ? current.lastQuickSignature === signature
        ? current.quickRepeatCount + 1
        : 1
      : current.quickRepeatCount;

  const winStreak = isSet
    ? summary.won
      ? current.currentWinStreak + 1
      : 0
    : current.currentWinStreak;

  write({
    ...current,
    setsPlayed: current.setsPlayed + (isSet ? 1 : 0),
    setsWon: current.setsWon + (isSet && summary.won ? 1 : 0),
    currentWinStreak: winStreak,
    bestWinStreak: Math.max(current.bestWinStreak, winStreak),
    totalAces: current.totalAces + stats.aces,
    longestRally: Math.max(current.longestRally, stats.longestRally),
    cleanHolds: current.cleanHolds + stats.cleanHolds,
    breaksConverted: current.breaksConverted + stats.breakPointsWon,
    breakPointsSaved: current.breakPointsSaved + stats.breakPointsSaved,
    netPointsWon: current.netPointsWon + stats.netPointsWon,
    serveVolleyNetPoints,
    comebackSets:
      current.comebackSets + (stats.comebackFromThreeGames && summary.won ? 1 : 0),
    tiebreakNerveWins:
      current.tiebreakNerveWins + (stats.tiebreakNerve && summary.won ? 1 : 0),
    stylesWon: [...stylesWon],
    achievements: [...achievements],
    masteryXp,
    lastQuickSignature:
      summary.mode === "quickMatch" ? signature : current.lastQuickSignature,
    quickRepeatCount,
    settledMatchIds: settled,
    resume: null,
  });

  return reward;
}

/** Wipe everything this browser remembers about tennis. */
export function resetTennisProgress(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the reset is best-effort.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

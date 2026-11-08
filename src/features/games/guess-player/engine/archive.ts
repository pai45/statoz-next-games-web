import type { PlayerCard } from "@/domain/cards";

import { maxAttempts } from "../constants";
import type {
  GuessPlayerArchive,
  GuessPlayerDayRecord,
  GuessPlayerFeedback,
  GuessPlayerHintType,
  GuessPlayerPuzzle,
  GuessPlayerResultStatus,
} from "../types";

import { compareStrings } from "./compare";
import { dayKeyFor, parseDayKey } from "./day-keys";
import { normalizeGuessPlayerSearch } from "./normalize";

/**
 * The rules half of `GuessPlayerCubit`, as plain functions.
 *
 * Every transition the app makes — a guess, a scan, the restored attempt,
 * giving up, and a day expiring overnight — is a record in and a record out.
 * The screens hold no rule of their own, and the store only decides when a new
 * record is written, which is what lets the whole lot be diffed against the
 * cubit rather than eyeballed against it.
 */

/* ---- Reading a record ------------------------------------------------------ */

export function legacyWon(record: GuessPlayerDayRecord): boolean {
  return record.legacy && record.playerId === "legacy-won";
}

/** Won outright, or migrated from a v1 save that recorded a win. */
export function effectiveWon(record: GuessPlayerDayRecord): boolean {
  return record.status === "won" || legacyWon(record);
}

/**
 * Finished for good.
 *
 * An expired day is deliberately not complete: it was never played, so it
 * counts against neither the win rate nor the archive's total.
 */
export function isCompleted(record: GuessPlayerDayRecord): boolean {
  return record.status !== "inProgress" && record.status !== "expired";
}

/** Whether the debrief can be opened. */
export function canReview(record: GuessPlayerDayRecord): boolean {
  return record.status !== "inProgress" || record.legacy;
}

export function hasHint(
  record: GuessPlayerDayRecord,
  type: GuessPlayerHintType,
): boolean {
  return record.revealedHintTypes.includes(type);
}

/* ---- Archive statistics ---------------------------------------------------- */

export function solvedCount(archive: GuessPlayerArchive): number {
  return Object.values(archive.resultsByDay).filter(effectiveWon).length;
}

export function completedCount(archive: GuessPlayerArchive): number {
  return Object.values(archive.resultsByDay).filter(
    (record) => isCompleted(record) || record.status === "legacy",
  ).length;
}

/** 0–1. Zero when nothing has been finished. */
export function winRate(archive: GuessPlayerArchive): number {
  const played = completedCount(archive);
  return played === 0 ? 0 : solvedCount(archive) / played;
}

/**
 * Guesses spent on an average win.
 *
 * Counted as `7 − attempts remaining`, so a first-guess win reads as one try.
 * Legacy records are left out: v1 stored a heart count that did not mean this.
 */
export function averageAttempts(archive: GuessPlayerArchive): number {
  const scored = Object.values(archive.resultsByDay).filter(
    (record) => record.status === "won" && !record.legacy,
  );
  if (scored.length === 0) return 0;
  const total = scored.reduce(
    (sum, record) => sum + (7 - record.attemptsRemaining),
    0,
  );
  return total / scored.length;
}

/**
 * Consecutive solved days ending today.
 *
 * Today not being solved yet does not break the streak — the walk simply starts
 * at yesterday — so a run survives until a day actually ends unsolved.
 */
export function solveStreak(
  archive: GuessPlayerArchive,
  currentDayKey: string,
): number {
  const parsed = parseDayKey(currentDayKey);
  if (parsed === null) return 0;

  let cursor = parsed;
  const today = archive.resultsByDay[currentDayKey];
  if (today === undefined || !effectiveWon(today)) {
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  let streak = 0;
  for (;;) {
    const record = archive.resultsByDay[dayKeyFor(cursor)];
    if (record === undefined || !effectiveWon(record)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

/* ---- Making and moving a record -------------------------------------------- */

export function freshRecord(
  dayKey: string,
  puzzle: GuessPlayerPuzzle,
  playerName: string,
): GuessPlayerDayRecord {
  return {
    dayKey,
    puzzleId: puzzle.id,
    playerId: puzzle.playerId,
    targetPlayerName: playerName,
    status: "inProgress",
    guessedPlayerIds: [],
    revealedClueCount: 1,
    attemptsRemaining: maxAttempts,
    score: 0,
    xpEarned: 0,
    elapsedMs: 0,
    startedAtEpochMs: 0,
    completedAtEpochMs: 0,
    revealedHintTypes: [],
    legacy: false,
  };
}

/**
 * Closes any day that was left open before today.
 *
 * The app does this on every load: a run you walked away from yesterday cannot
 * be resumed, and an expired day is not a loss — it never counted.
 */
export function expireStaleRecords(
  archive: GuessPlayerArchive,
  currentDayKey: string,
  nowMs: number,
): { archive: GuessPlayerArchive; changed: boolean } {
  let changed = false;
  const results: Record<string, GuessPlayerDayRecord> = {};

  for (const [dayKey, record] of Object.entries(archive.resultsByDay)) {
    if (dayKey < currentDayKey && record.status === "inProgress") {
      results[dayKey] = {
        ...record,
        status: "expired",
        completedAtEpochMs: nowMs,
      };
      changed = true;
    } else {
      results[dayKey] = record;
    }
  }

  return { archive: { resultsByDay: results }, changed };
}

/**
 * The app's `load`: close whatever was left open before today, then make sure
 * today has a record to play.
 *
 * `changed` says whether anything actually moved, so a repeat open — on mount,
 * and again when the local date rolls over with the tab still up — does not
 * write and wake every subscriber for nothing.
 */
export function openArchive(
  archive: GuessPlayerArchive,
  currentDayKey: string,
  puzzle: GuessPlayerPuzzle,
  playerName: string,
  nowMs: number,
): { archive: GuessPlayerArchive; changed: boolean } {
  const expired = expireStaleRecords(archive, currentDayKey, nowMs);
  if (expired.archive.resultsByDay[currentDayKey] !== undefined) {
    return expired;
  }
  return {
    archive: {
      resultsByDay: {
        ...expired.archive.resultsByDay,
        [currentDayKey]: freshRecord(currentDayKey, puzzle, playerName),
      },
    },
    changed: true,
  };
}

/** Stamps the start on a run being opened for the first time. */
export function startRecord(
  record: GuessPlayerDayRecord,
  nowMs: number,
): GuessPlayerDayRecord | null {
  if (record.status !== "inProgress" || record.startedAtEpochMs !== 0) return null;
  return { ...record, startedAtEpochMs: nowMs };
}

export type SubmissionResult = {
  record: GuessPlayerDayRecord;
  feedback: GuessPlayerFeedback;
  /** True the moment a day finishes, so the debrief settles it exactly once. */
  settlementPending: boolean;
};

/**
 * One guess.
 *
 * Null means the submission was refused — the run is over, or the attempts are
 * spent. A repeat of a player already scanned is answered but costs nothing,
 * which is the app's rule and the reason the feedback is carried out separately
 * from the record.
 */
export function submitGuess(
  record: GuessPlayerDayRecord,
  puzzle: GuessPlayerPuzzle,
  guessId: string,
  nowMs: number,
): SubmissionResult | null {
  if (record.status !== "inProgress" || record.attemptsRemaining <= 0) return null;

  if (record.guessedPlayerIds.includes(guessId)) {
    return { record, feedback: "duplicate", settlementPending: false };
  }

  const correct = guessId === puzzle.playerId;
  const guessedPlayerIds = [...record.guessedPlayerIds, guessId];
  const startedAtEpochMs =
    record.startedAtEpochMs === 0 ? nowMs : record.startedAtEpochMs;
  const elapsedMs = Math.max(0, nowMs - startedAtEpochMs);

  if (correct) {
    return {
      record: {
        ...record,
        status: "won",
        guessedPlayerIds,
        score: record.attemptsRemaining * 100,
        xpEarned: 20 + record.attemptsRemaining * 5,
        startedAtEpochMs,
        completedAtEpochMs: nowMs,
        elapsedMs,
      },
      feedback: "correct",
      settlementPending: true,
    };
  }

  return {
    record: {
      ...record,
      status: "inProgress",
      guessedPlayerIds,
      attemptsRemaining: Math.max(0, record.attemptsRemaining - 1),
      revealedClueCount: Math.min(6, record.revealedClueCount + 1),
      startedAtEpochMs,
      completedAtEpochMs: 0,
      elapsedMs,
    },
    feedback: "wrong",
    settlementPending: false,
  };
}

/** Ends the run and unlocks the rest of the route. Pays nothing. */
export function giveUp(
  record: GuessPlayerDayRecord,
  nowMs: number,
): SubmissionResult | null {
  if (record.status !== "inProgress") return null;
  const startedAtEpochMs =
    record.startedAtEpochMs === 0 ? nowMs : record.startedAtEpochMs;
  return {
    record: {
      ...record,
      status: "gaveUp",
      revealedClueCount: 6,
      startedAtEpochMs,
      completedAtEpochMs: nowMs,
      elapsedMs: Math.max(0, nowMs - startedAtEpochMs),
    },
    feedback: "wrong",
    settlementPending: true,
  };
}

/**
 * The one bought guess, available only once the six free ones are spent.
 *
 * It comes with the whole route already decrypted — there is nothing left to
 * reveal — so the restored attempt is a read of the full career, not a seventh
 * blind guess.
 */
export function buyExtraAttempt(
  record: GuessPlayerDayRecord,
): GuessPlayerDayRecord | null {
  if (record.status !== "inProgress" || record.attemptsRemaining > 0) return null;
  return { ...record, attemptsRemaining: 1, revealedClueCount: 6 };
}

/** Records a bought profile scan. Costs no attempt. */
export function unlockHint(
  record: GuessPlayerDayRecord,
  type: GuessPlayerHintType,
): GuessPlayerDayRecord | null {
  if (record.status !== "inProgress" || hasHint(record, type)) return null;
  return { ...record, revealedHintTypes: [...record.revealedHintTypes, type] };
}

/* ---- The player database ---------------------------------------------------- */

/**
 * The eight names a query offers.
 *
 * Every whitespace-separated token has to appear somewhere in the folded name,
 * so `de bruyne` and `bruyne de` both find him. Names already scanned are gone
 * from the list — there is no way to spend an attempt on the same player twice.
 * A name that *starts* with the query outranks one that merely contains it,
 * then the better card, then the alphabet.
 */
export function searchPlayers(
  players: PlayerCard[],
  query: string,
  guessedPlayerIds: readonly string[] = [],
): PlayerCard[] {
  const normalized = normalizeGuessPlayerSearch(query);
  if (normalized.length < 2) return [];

  const guessed = new Set(guessedPlayerIds);
  const tokens = normalized.split(" ").filter((token) => token !== "");

  const matches = players.filter((player) => {
    if (guessed.has(player.id)) return false;
    const name = normalizeGuessPlayerSearch(player.name);
    return tokens.every((token) => name.includes(token));
  });

  matches.sort((a, b) => {
    const aPrefix = normalizeGuessPlayerSearch(a.name).startsWith(normalized);
    const bPrefix = normalizeGuessPlayerSearch(b.name).startsWith(normalized);
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return compareStrings(a.name, b.name);
  });

  return matches.slice(0, 8);
}

/* ---- Statuses the archive screen paints ------------------------------------- */

export type ArchiveTileStatus = "solved" | "failed" | "live" | "missed";

export function tileStatusFor(
  record: GuessPlayerDayRecord | undefined,
  isToday: boolean,
): ArchiveTileStatus {
  if (record === undefined) return isToday ? "live" : "missed";
  if (effectiveWon(record)) return "solved";
  return statusToTile(record.status, isToday);
}

function statusToTile(
  status: GuessPlayerResultStatus,
  isToday: boolean,
): ArchiveTileStatus {
  switch (status) {
    case "inProgress":
      return isToday ? "live" : "missed";
    case "lost":
    case "gaveUp":
    case "legacy":
      return "failed";
    case "expired":
      return "missed";
    case "won":
      return "solved";
  }
}

/** Whether an archive tile opens. */
export function tileOpens(
  record: GuessPlayerDayRecord | undefined,
  isToday: boolean,
): boolean {
  if (isToday) return true;
  return (
    record !== undefined &&
    record.status !== "expired" &&
    record.status !== "inProgress"
  );
}

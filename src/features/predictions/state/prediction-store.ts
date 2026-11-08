"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  ScoreAnswer,
  defaultPredictionQuizId,
  isContestQuiz,
  isQuizSettleable,
  predictionStorageKey,
  scorelineContestPrizeFor,
  settleQuiz,
  settledAnswerFor,
  type PredictionMultiplierId,
  type PredictionQuiz,
  type PredictionStatus,
  type SettlementQuestionResult,
  type UserPrediction,
} from "@/domain/predictions";
import type { SportMatch } from "@/domain/matches";
import { readEconomy, settleCoinReward, spendCoins } from "@/features/economy";
import { recordStreakActivity } from "@/features/streaks/activity";
import { matchById, matchBoardRivals, quizzesForMatch } from "@/mocks/matches";

/**
 * Every prediction the player has entered, kept in browser storage.
 *
 * The app holds this in a cubit over a repository; the web keeps the same
 * lifecycle — draft, lock, settle — in the store shape the rest of the features
 * use: a versioned key, a frozen server snapshot, a cached parse so
 * `useSyncExternalStore` can compare by reference, and a `storage` listener so
 * a second tab moves this one.
 *
 * A draft is only ever created before kickoff, is immutable once locked, and
 * settles exactly once — the XP and any contest prize are credited on that one
 * transition, so re-opening a settled card never pays twice.
 */

const storageKey = "statoz.next.games-web.predictions.v1";

export type PredictionsSnapshot = {
  version: 1;
  hydrated: boolean;
  /** `matchId::quizId` -> the entry. */
  predictions: Record<string, UserPrediction>;
};

const serverSnapshot: PredictionsSnapshot = Object.freeze({
  version: 1,
  hydrated: false,
  predictions: Object.freeze({}) as Record<string, UserPrediction>,
});

let current: PredictionsSnapshot | null = null;
const listeners = new Set<() => void>();

/* ---- The demo card --------------------------------------------------------- */

/**
 * One sealed card on a fixture that has already finished.
 *
 * The app's fixtures move through their own lifecycle, so a card entered before
 * kickoff is still there to be revealed afterwards. The web's are static: a
 * scheduled fixture never becomes a finished one, and without this the reveal —
 * and the contest payout behind it — could never be reached. So the demo starts
 * with one locked card, the way the picks demo starts with settled positions.
 */
const seededMatchId = "fifa_fra_eng_result";

function seededPredictions(): Record<string, UserPrediction> {
  const match = matchById(seededMatchId);
  if (!match) return {};
  const quiz = quizzesForMatch(match).find((entry) => entry.id === defaultPredictionQuizId);
  if (!quiz) return {};

  const answers: Record<string, number> = {};
  quiz.questions.forEach((question, index) => {
    const actual = settledAnswerFor(question);
    // The first two are called right, the rest are near misses — a card worth
    // revealing rather than a perfect one.
    if (actual != null && index < 2) {
      answers[question.id] = actual;
      return;
    }
    if (question.type === "exactScore") {
      answers[question.id] = ScoreAnswer.encode(1, 1);
      return;
    }
    const wrong = question.options.findIndex((_, option) => option !== actual);
    answers[question.id] = wrong < 0 ? 0 : wrong;
  });

  const key = predictionStorageKey(match.id, quiz.id);
  return {
    [key]: {
      matchId: match.id,
      quizId: quiz.id,
      answers,
      multipliersByQuestion: { [quiz.questions[0]?.id ?? "q1"]: "x2" },
      submittedAt: match.kickoff,
      status: "locked",
      rewardEarned: 0,
      contestPrizeOz: 0,
    },
  };
}

/* ---- Reading --------------------------------------------------------------- */

function coerce(value: unknown): Record<string, UserPrediction> {
  if (typeof value !== "object" || value === null) return {};
  const entries: Record<string, UserPrediction> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as Partial<UserPrediction>;
    if (typeof record.matchId !== "string" || typeof record.quizId !== "string") continue;
    if (typeof record.answers !== "object" || record.answers === null) continue;
    entries[key] = {
      matchId: record.matchId,
      quizId: record.quizId,
      answers: { ...(record.answers as Record<string, number>) },
      multipliersByQuestion: {
        ...(record.multipliersByQuestion as Record<string, PredictionMultiplierId> | undefined),
      },
      submittedAt: typeof record.submittedAt === "string" ? record.submittedAt : new Date().toISOString(),
      status: statusOf(record.status),
      correctCount: typeof record.correctCount === "number" ? record.correctCount : undefined,
      rewardEarned: typeof record.rewardEarned === "number" ? record.rewardEarned : 0,
      contestRank: typeof record.contestRank === "number" ? record.contestRank : undefined,
      contestPrizeOz: typeof record.contestPrizeOz === "number" ? record.contestPrizeOz : 0,
    };
  }
  return entries;
}

function statusOf(value: unknown): PredictionStatus {
  return value === "locked" || value === "settled" ? value : "open";
}

function load(): PredictionsSnapshot {
  let predictions = seededPredictions();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) predictions = coerce((JSON.parse(raw) as { predictions?: unknown }).predictions);
  } catch {
    // A private window refusing storage keeps this session in memory.
  }
  return { ...serverSnapshot, hydrated: true, predictions };
}

function getSnapshot(): PredictionsSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  current ??= load();
  return current;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function write(predictions: Record<string, UserPrediction>): PredictionsSnapshot {
  current = { ...getSnapshot(), hydrated: true, predictions };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, predictions }));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  notify();
  return current;
}

function onStorage(event: StorageEvent): void {
  if (event.key === storageKey || event.key === null) {
    current = load();
    notify();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function usePredictions(): PredictionsSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function readPredictions(): PredictionsSnapshot {
  return getSnapshot();
}

export function predictionFor(
  snapshot: PredictionsSnapshot,
  matchId: string,
  quizId: string,
): UserPrediction | undefined {
  return snapshot.predictions[predictionStorageKey(matchId, quizId)];
}

/** The entry for one quiz, subscribed. */
export function usePrediction(matchId: string, quizId: string): UserPrediction | undefined {
  return predictionFor(usePredictions(), matchId, quizId);
}

/* ---- Writing --------------------------------------------------------------- */

export type SaveDraftInput = {
  match: SportMatch;
  quizId: string;
  answers: Record<string, number>;
  multipliersByQuestion: Record<string, PredictionMultiplierId>;
};

/**
 * Whether a fixture is still open to a fresh entry.
 *
 * The app compares kickoff against the wall clock because its fixtures are
 * generated around it. The web's are static and dated, and carry their own
 * status, so the status is the authority — otherwise every demo fixture would
 * read as kicked off the day after the catalogue was written.
 */
function beforeKickoff(match: SportMatch): boolean {
  return match.status === "scheduled";
}

/**
 * Creates or updates an editable draft.
 *
 * A draft write preserves the original submission time and can never reopen a
 * locked or settled entry. A *new* entry is refused once kickoff has passed;
 * an existing draft is left to the deadline lock, so a queued autosave can
 * still be flushed before its immutable snapshot is sealed.
 */
export function saveDraft(input: SaveDraftInput): boolean {
  const key = predictionStorageKey(input.match.id, input.quizId);
  const snapshot = getSnapshot();
  const existing = snapshot.predictions[key];
  if (existing && existing.status !== "open") return false;
  if (!existing && !beforeKickoff(input.match)) return false;

  const next: UserPrediction = existing
    ? { ...existing, answers: { ...input.answers }, multipliersByQuestion: { ...input.multipliersByQuestion } }
    : {
        matchId: input.match.id,
        quizId: input.quizId,
        answers: { ...input.answers },
        multipliersByQuestion: { ...input.multipliersByQuestion },
        submittedAt: new Date().toISOString(),
        status: "open",
        rewardEarned: 0,
        contestPrizeOz: 0,
      };

  write({ ...snapshot.predictions, [key]: next });
  if (!existing) recordStreakActivity("predict");
  return true;
}

export type EnterContestResult = { ok: true } | { ok: false; reason: "insufficient" };

/**
 * Charges a paid contest's entry fee, once, when the player first enters.
 *
 * Editing answers afterwards never re-charges: the caller only reaches here for
 * a fresh entry, and the economy's own ledger id keeps a repeat call idempotent
 * inside one match.
 */
export function chargeContestEntry(match: SportMatch, quiz: PredictionQuiz): EnterContestResult {
  if (!isContestQuiz(quiz)) return { ok: true };
  if (readEconomy().coins < quiz.entryFee) return { ok: false, reason: "insufficient" };
  const paid = spendCoins({
    id: `quiz-entry-${match.id}-${quiz.id}`,
    coins: quiz.entryFee,
    title: "SCORELINE QUIZ ENTRY",
    subtitle: `${match.home.shortName} vs ${match.away.shortName}`,
  });
  return paid.ok ? { ok: true } : { ok: false, reason: "insufficient" };
}

/** Seals a draft into an immutable lock. */
export function lockPrediction(input: SaveDraftInput): boolean {
  const key = predictionStorageKey(input.match.id, input.quizId);
  const snapshot = getSnapshot();
  const existing = snapshot.predictions[key];
  if (!existing || existing.status !== "open") return false;
  write({
    ...snapshot.predictions,
    [key]: {
      ...existing,
      answers: { ...input.answers },
      multipliersByQuestion: { ...input.multipliersByQuestion },
      status: "locked",
    },
  });
  return true;
}

export type SettlementOutcome = {
  results: SettlementQuestionResult[];
  correctCount: number;
  xp: number;
  /** Finish position in a contest's field. Zero on a free quiz. */
  rank: number;
  prizeOz: number;
  fieldSize: number;
  /**
   * The share of the field the player matched or beat, 0..1. Null when the
   * board fielded no one to compare against.
   */
  beatenShare: number | null;
};

/**
 * Marks a locked entry, credits it, and stores the verdict.
 *
 * Called once — a second call on an already-settled entry returns the stored
 * result without paying again, which is what makes skipping the reveal safe.
 */
export function settlePrediction(
  match: SportMatch,
  quiz: PredictionQuiz,
): SettlementOutcome | null {
  const key = predictionStorageKey(match.id, quiz.id);
  const snapshot = getSnapshot();
  const existing = snapshot.predictions[key];
  if (!existing) return null;
  if (!isQuizSettleable(quiz)) return null;

  const marked = settleQuiz(quiz, existing);
  const rivals = matchBoardRivals(match.id, quiz.id);
  const scorable = quiz.questions.filter((question) => question.forcedVoid !== true).length;
  const ahead = rivals.filter(
    (rival) => Math.min(rival.correct, scorable) > marked.correctCount,
  ).length;
  const rank = ahead + 1;
  const beaten = rivals.filter(
    (rival) => marked.correctCount >= Math.min(rival.correct, scorable),
  ).length;
  const prizeOz = isContestQuiz(quiz) ? scorelineContestPrizeFor(rank) : 0;
  const outcome: SettlementOutcome = {
    ...marked,
    rank: isContestQuiz(quiz) ? rank : 0,
    prizeOz,
    fieldSize: rivals.length + 1,
    beatenShare: rivals.length === 0 ? null : beaten / rivals.length,
  };

  // Already settled: report the stored verdict, pay nothing.
  if (existing.status === "settled") return outcome;

  write({
    ...snapshot.predictions,
    [key]: {
      ...existing,
      status: "settled",
      correctCount: marked.correctCount,
      rewardEarned: marked.xp,
      contestRank: outcome.rank || undefined,
      contestPrizeOz: prizeOz,
    },
  });

  if (prizeOz > 0) {
    settleCoinReward({
      id: `quiz-prize-${match.id}-${quiz.id}`,
      coins: prizeOz,
      title: "SCORELINE QUIZ PRIZE",
      subtitle: `Finished #${rank}`,
    });
  }
  return outcome;
}

export function resetPredictions(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to the default.
  }
  current = null;
  notify();
}

/* ---- The career line ------------------------------------------------------- */

export type PredictionCareer = {
  /** XP earned from settled cards — the profile's PREDICT track. */
  xp: number;
  made: number;
  correct: number;
  /** Oz won from contest prize pools. */
  prizeOz: number;
};

export function predictionCareer(snapshot: PredictionsSnapshot): PredictionCareer {
  const entries = Object.values(snapshot.predictions);
  return {
    xp: entries.reduce((sum, entry) => sum + entry.rewardEarned, 0),
    made: entries.length,
    correct: entries.reduce((sum, entry) => sum + (entry.correctCount ?? 0), 0),
    prizeOz: entries.reduce((sum, entry) => sum + entry.contestPrizeOz, 0),
  };
}

export function usePredictionCareer(): PredictionCareer {
  const snapshot = usePredictions();
  return useMemo(() => predictionCareer(snapshot), [snapshot]);
}

import { questionsPerSet, setCount, twoStarScore } from "../constants";
import type {
  QuizMode,
  QuizModeProgress,
  QuizProgress,
  QuizSetProgress,
  QuizSetVisualState,
  SetOutcome,
} from "../types";

/**
 * The rules of the ladder, as pure functions over a progress record.
 *
 * There is no fail state: finishing a set always clears it and always opens the
 * next one. The score decides only how many mastery stars the set holds, which
 * is the whole reason to come back to one you have already cleared.
 *
 * Kept apart from the store so the rules can be checked on their own — they are
 * the part a save file has to keep agreeing with.
 */

const noSet: QuizSetProgress = Object.freeze({
  completed: false,
  bestCorrect: 0,
  attempts: 0,
});

const noMode: QuizModeProgress = Object.freeze({ sets: {} });

export const emptyProgress: QuizProgress = Object.freeze({ byMode: {} });

/** Mastery grade, 0–3. A flawless run is the only way to three. */
export function starsFor(bestCorrect: number): number {
  if (bestCorrect >= questionsPerSet) return 3;
  if (bestCorrect >= twoStarScore) return 2;
  if (bestCorrect > 0) return 1;
  return 0;
}

export function modeProgressOf(
  progress: QuizProgress,
  mode: QuizMode,
): QuizModeProgress {
  return progress.byMode[mode] ?? noMode;
}

export function setProgressOf(
  progress: QuizModeProgress,
  setNumber: number,
): QuizSetProgress {
  return progress.sets[setNumber] ?? noSet;
}

/** Set one is always open; every other set waits on the one before it. */
export function isSetUnlocked(
  progress: QuizModeProgress,
  setNumber: number,
): boolean {
  if (setNumber < 1 || setNumber > setCount) return false;
  if (setNumber === 1) return true;
  return setProgressOf(progress, setNumber - 1).completed;
}

export function completedCount(progress: QuizModeProgress): number {
  return Object.values(progress.sets).filter((set) => set.completed).length;
}

/** Stars banked across the mode's fifty sets. */
export function starCount(progress: QuizModeProgress): number {
  return Object.values(progress.sets).reduce(
    (sum, set) => sum + starsFor(set.bestCorrect),
    0,
  );
}

export const maxStars = setCount * 3;

/** Sets cleared across all four of a sport's ladders. */
export function clearedAcross(
  progress: QuizProgress,
  modes: QuizMode[],
): number {
  return modes.reduce(
    (sum, mode) => sum + completedCount(modeProgressOf(progress, mode)),
    0,
  );
}

/**
 * The set the player should open next: the first unlocked one they have not
 * finished. Falls back to the last authored set once the ladder is complete.
 */
export function nextChallenge(
  progress: QuizModeProgress,
  authoredSets: number,
): number {
  for (let set = 1; set <= setCount; set += 1) {
    if (set > authoredSets) break;
    if (isSetUnlocked(progress, set) && !setProgressOf(progress, set).completed) {
      return set;
    }
  }
  return authoredSets < 1 ? 1 : authoredSets;
}

export function visualStateFor(
  progress: QuizModeProgress,
  setNumber: number,
  authoredSets: number,
): QuizSetVisualState {
  const set = setProgressOf(progress, setNumber);
  if (starsFor(set.bestCorrect) >= 3) return "mastered";
  if (set.completed) return "cleared";
  if (setNumber > authoredSets) return "upcoming";
  if (!isSetUnlocked(progress, setNumber)) return "locked";
  return "available";
}

/**
 * Folds a finished run into the record.
 *
 * Returns what changed alongside the new progress rather than leaving the
 * reveal to re-read the store afterwards, so the two can never disagree about
 * whether this run was the one that cleared the set.
 */
export function recordRun(
  progress: QuizProgress,
  mode: QuizMode,
  setNumber: number,
  correct: number,
): { progress: QuizProgress; outcome: SetOutcome } {
  const before = modeProgressOf(progress, mode);
  const beforeSet = setProgressOf(before, setNumber);

  const afterSet: QuizSetProgress = {
    completed: true,
    bestCorrect: Math.max(beforeSet.bestCorrect, correct),
    attempts: beforeSet.attempts + 1,
  };

  const after: QuizModeProgress = {
    sets: { ...before.sets, [setNumber]: afterSet },
  };

  const stars = starsFor(afterSet.bestCorrect);
  return {
    progress: { byMode: { ...progress.byMode, [mode]: after } },
    outcome: {
      newlyCleared: !beforeSet.completed,
      stars,
      starsGained: stars - starsFor(beforeSet.bestCorrect),
      bestBefore: beforeSet.bestCorrect,
    },
  };
}

import type { Sport } from "@/domain/sports";

/**
 * The four Knowledge Arena modes. Three are skill tiers and `global` is the
 * world-sport capstone; each is a self-contained pool of answer-keyed trivia.
 *
 * All four are open from the start. The app carries an `unlockedBy` ladder
 * between modes, but `QuizProgress.isUnlocked` returns true unconditionally —
 * the gate that actually bites is the numbered sets inside a mode.
 */
export type QuizMode = "easy" | "medium" | "hard" | "global";

/**
 * One answer-keyed question. Unlike a prediction market, which settles later,
 * the right answer is known up front.
 */
export type TriviaQuestion = {
  /** Positional, `<sport>_<mode>_qNNN`, so it survives reformatting the file. */
  id: string;
  sport: Sport;
  mode: QuizMode;
  prompt: string;
  options: string[];
  correctIndex: number;
};

/** What the player has done with one numbered set. */
export type QuizSetProgress = {
  /** True once every question has been answered. Any score completes it. */
  completed: boolean;
  bestCorrect: number;
  attempts: number;
};

/** One mode's fifty sets. Absent entries have never been played. */
export type QuizModeProgress = {
  sets: Record<number, QuizSetProgress>;
};

/** Every mode's ladder, for one sport. */
export type QuizProgress = {
  byMode: Partial<Record<QuizMode, QuizModeProgress>>;
};

/**
 * How a set tile reads: mastered at a flawless run, cleared once finished at
 * any score, available when open but unplayed, locked until the set before it
 * is finished, and upcoming when the question file does not reach it.
 */
export type QuizSetVisualState =
  | "mastered"
  | "cleared"
  | "available"
  | "locked"
  | "upcoming";

/** One line of the end-of-run review. */
export type AnswerResult = {
  prompt: string;
  pickedLabel: string;
  correctLabel: string;
  correct: boolean;
  earnedXp: number;
};

/** What a finished run changed, so the reveal can play the right beats. */
export type SetOutcome = {
  /** This run completed the set for the first time. */
  newlyCleared: boolean;
  /** Mastery stars held afterwards, 0–3. */
  stars: number;
  /** Stars this run added on top of the previous best. */
  starsGained: number;
  /** Best correct count before the run, for the NEW BEST flag. */
  bestBefore: number;
};

import type { QuizMode } from "./types";

/**
 * The shape of a Knowledge Arena ladder.
 *
 * Every mode is fifty numbered sets of ten questions, authored in five bands of
 * a hundred. The bands are how difficulty ramps across the ladder — band 1 is a
 * mode's gentlest rung, band 5 its hardest — and they are also how the question
 * files are written, so the two must agree.
 */

export const setCount = 50;
export const questionsPerSet = 10;

/** Sets covered by one authored band. Five bands span the ladder. */
export const setsPerBand = 10;
export const bandCount = setCount / setsPerBand;
export const bandSize = questionsPerSet * setsPerBand;

/** Coins charged to open a set, and again to replay it. */
export const entryCost = 25;

/**
 * Best-score threshold for the second mastery star. There is no pass gate —
 * finishing a set always clears it — so stars are the only reason to replay,
 * and the third one costs a flawless run.
 */
export const twoStarScore = 7;

/** The four modes, in ladder order. */
export const quizModes: QuizMode[] = ["easy", "medium", "hard", "global"];

/**
 * XP paid per correct answer. Every correct answer pays, whatever the final
 * score — there is no pass gate. It lives here rather than with the modes'
 * colours and glyphs because the ladder's own arithmetic depends on it, and
 * that must not have to reach through the design system to find it.
 */
export const modeRewards: Record<QuizMode, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
  global: 5,
};

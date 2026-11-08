/**
 * The three-over attack. One bowler per over, each with a light delivery bias
 * you can learn to read: the pace bowler hunts the off stump and the yorker,
 * the seamer sits on a good length at middle, the spinner drags you leg side
 * and drops it short.
 *
 * Ported from `BowlerProfile` in the `final_over` package's `domain/models.dart`.
 *
 * The key order of both weight maps is load-bearing — `weightedPick` walks the
 * entries in insertion order and subtracts as it goes, so reordering them
 * changes the outcome of a seeded roll. Dart preserves a const map's insertion
 * order and so does a JavaScript object with string keys; keep them in step.
 */

import type { BowlerProfile } from "../types";

export const paceBowler: BowlerProfile = {
  id: "fo-bowler-pace",
  name: "VOLT",
  lookKey: "fo-bowler-pace",
  jerseyNumber: 7,
  lineWeights: { off: 34, middle: 28, leg: 24 },
  lengthWeights: { yorker: 28, full: 30, good: 26, short: 16 },
};

export const seamBowler: BowlerProfile = {
  id: "fo-bowler-seam",
  name: "EDGE",
  lookKey: "fo-bowler-seam",
  jerseyNumber: 11,
  lineWeights: { off: 28, middle: 36, leg: 22 },
  lengthWeights: { yorker: 18, full: 26, good: 36, short: 20 },
};

export const spinBowler: BowlerProfile = {
  id: "fo-bowler-spin",
  name: "DRIFT",
  lookKey: "fo-bowler-spin",
  jerseyNumber: 23,
  lineWeights: { off: 22, middle: 30, leg: 34 },
  lengthWeights: { yorker: 12, full: 30, good: 28, short: 30 },
};

/** The default attack, in the order Flutter declares it. */
export const bowlerAttack: readonly BowlerProfile[] = [
  paceBowler,
  seamBowler,
  spinBowler,
];

/** What a bowler pitches when no profile is supplied. */
export const defaultLineWeights = { off: 30, middle: 34, leg: 28 } as const;
export const defaultLengthWeights = {
  yorker: 22,
  full: 28,
  good: 32,
  short: 18,
} as const;

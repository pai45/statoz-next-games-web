/**
 * What the bowler sends down. Ported from the `final_over` package's
 * `domain/delivery_generator.dart`.
 *
 * Every delivery is drawn from its own `delivery` stream seed, so the same
 * match seed always produces the same over regardless of what the batter did.
 */

import {
  defaultLengthWeights,
  defaultLineWeights,
} from "../data/bowlers";
import { lineX as lineOffsets, type GameplayTuning } from "../tuning";
import {
  clamp,
  type BallResult,
  type BowlerProfile,
  type DeliveryLength,
  type DeliveryLine,
  type DeliverySpec,
  type ExtraType,
} from "../types";

import { DeterministicRandom, seedFor } from "./random";

/**
 * Walks the entries in insertion order, subtracting as it goes. The order of
 * the weight map is therefore part of the result — see `data/bowlers.ts`.
 */
function weightedPick<T extends string>(
  random: DeterministicRandom,
  weights: Partial<Record<T, number>>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random.nextInt(total);
  for (const [key, weight] of entries) {
    if (roll < weight) return key;
    roll -= weight;
  }
  return entries[entries.length - 1][0];
}

export type GenerateDeliveryOptions = {
  matchSeed: number;
  physicalOrdinal: number;
  legalBalls: number;
  score: number;
  target: number;
  history: readonly BallResult[];
  previousDeliveries: readonly DeliverySpec[];
  expectedContactMicros?: number;
  bowler?: BowlerProfile | null;
  tuning: GameplayTuning;
};

export function generateDelivery({
  matchSeed,
  physicalOrdinal,
  legalBalls,
  score,
  target,
  history,
  previousDeliveries,
  expectedContactMicros = 0,
  bowler = null,
  tuning,
}: GenerateDeliveryOptions): DeliverySpec {
  if (physicalOrdinal < 1) {
    throw new RangeError(`physicalOrdinal must be at least 1, got ${physicalOrdinal}`);
  }

  const seed = seedFor(matchSeed, physicalOrdinal, "delivery");
  const random = new DeterministicRandom(seed);

  const noBalls = history.filter((result) => result.extra === "noBall").length;
  const wides = history.filter((result) => result.extra === "wide").length;

  /**
   * The last legal ball of a chase that is still alive is played straight: no
   * extras, a hittable line and length, and the pace taken off it. Losing to a
   * random wide on the final delivery is not a game, it is a coin toss.
   */
  const fairFinalBall =
    legalBalls === tuning.maximumLegalBalls - 1 && target - score <= 6;

  let extra: ExtraType = "none";
  if (physicalOrdinal > 1 && !fairFinalBall) {
    // No-ball has explicit precedence, so a delivery can never be both.
    if (noBalls < tuning.maximumNoBalls && random.nextBool(tuning.noBallProbability)) {
      extra = "noBall";
    } else if (wides < tuning.maximumWides && random.nextBool(tuning.wideProbability)) {
      extra = "wide";
    }
  }

  const lineWeights = bowler?.lineWeights ?? defaultLineWeights;
  const lengthWeights = bowler?.lengthWeights ?? defaultLengthWeights;

  const line: DeliveryLine = fairFinalBall
    ? random.choose<DeliveryLine>(["off", "middle", "leg"])
    : extra === "wide"
      ? random.choose<DeliveryLine>(["wideOff", "wideLeg"])
      : weightedPick<DeliveryLine>(random, lineWeights);

  let length: DeliveryLength = fairFinalBall
    ? random.choose<DeliveryLength>(["full", "good"])
    : weightedPick<DeliveryLength>(random, lengthWeights);

  // Three identical yorkers or bouncers in a row is a pattern, not a plan.
  if (previousDeliveries.length >= 2) {
    const previous = previousDeliveries[previousDeliveries.length - 1].length;
    const beforePrevious = previousDeliveries[previousDeliveries.length - 2].length;
    if (
      previous === beforePrevious &&
      previous === length &&
      (length === "yorker" || length === "short")
    ) {
      length = random.choose<DeliveryLength>(["full", "good"]);
    }
  }

  let movement = random.range(-tuning.maximumMovement, tuning.maximumMovement);
  let speed = random.range(0.82, 1.08);
  if (physicalOrdinal === 1) speed *= 0.95;
  if (fairFinalBall) {
    movement = clamp(movement, -0.006, 0.006);
    speed = clamp(speed, 0.82, 0.92);
  }

  return {
    ordinal: physicalOrdinal,
    seed,
    line,
    length,
    speed,
    movement,
    extra,
    lineX: lineOffsets[line],
    expectedContactMicros,
    isFairFinalBall: fairFinalBall,
  };
}

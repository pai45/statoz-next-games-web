/**
 * The rules that turn an input into an outcome — the web port of the
 * `final_over` package's `domain/resolvers.dart`.
 *
 * Pure functions throughout. Randomness arrives as a `DeterministicRandom` the
 * caller has already seeded, and the *order* of the draws inside each function
 * is part of the contract: reordering them changes every seeded match.
 */

import type { GameplayTuning } from "../tuning";
import {
  addVectors,
  clamp,
  deliveryContactX,
  distanceBetween,
  isBoundary,
  isProductiveContact,
  isWicket,
  normalizeVector,
  resultTotalRuns,
  scaleVector,
  vectorFromShotAngle,
  vectorLength,
  zeroVector,
  type BallKinematics,
  type BallResult,
  type ContactOutcome,
  type DeliverySpec,
  type DismissalType,
  type Elevation,
  type ExtraType,
  type FielderState,
  type FieldVector,
  type ObjectiveType,
  type RiskLevel,
  type ShotDirection,
  type TimingGrade,
} from "../types";

import type { DeterministicRandom } from "./random";

/* ---- Timing -------------------------------------------------------------- */

/**
 * How well the bat met the ball. A negative error is early, positive is late,
 * and the windows widen with the difficulty tier.
 */
export function resolveTiming(
  errorMs: number,
  hasInput: boolean,
  tuning: GameplayTuning,
): TimingGrade {
  if (!hasInput) return "miss";
  const magnitude = Math.abs(errorMs);
  if (magnitude <= tuning.perfectWindowMs) return "perfect";
  if (magnitude <= tuning.goodWindowMs) return "good";
  if (magnitude <= tuning.earlyLateWindowMs) {
    return errorMs < 0 ? "early" : "late";
  }
  if (magnitude <= tuning.poorWindowMs) return "poor";
  return "miss";
}

/* ---- Contact ------------------------------------------------------------- */

/** Where each shot direction sends the ball before spread is applied. */
function nominalAngle(direction: ShotDirection): number {
  switch (direction) {
    case "offSide":
      return -45;
    case "straight":
      return 0;
    case "legSide":
      return 45;
    case "behind":
      return 180;
  }
}

/** What each timing grade is worth, before technique modifies it. */
function timingProfile(timing: TimingGrade): { power: number; control: number } {
  switch (timing) {
    case "perfect":
      return { power: 1.0, control: 1.0 };
    case "good":
      return { power: 0.9, control: 0.88 };
    case "early":
    case "late":
      return { power: 0.74, control: 0.66 };
    case "poor":
      return { power: 0.48, control: 0.38 };
    case "miss":
      return { power: 0, control: 0 };
  }
}

/**
 * How well the shot suits the ball. Playing the line is most of it; the rest is
 * whether you went over the top of something you should have kept down.
 */
export function compatibility(
  delivery: DeliverySpec,
  direction: ShotDirection,
  elevation: Elevation,
): number {
  let score = 0.5;

  const lineMatch =
    delivery.line === "off" || delivery.line === "wideOff"
      ? direction === "offSide"
      : delivery.line === "middle"
        ? direction === "straight"
        : direction === "legSide" || direction === "behind";

  if (lineMatch) {
    score += delivery.line === "middle" ? 0.2 : 0.18;
  } else {
    score -= 0.08;
  }

  if (delivery.length === "yorker") {
    score += elevation === "ground" ? 0.1 : -0.08;
  } else if (delivery.length === "full") {
    score += elevation === "ground" ? 0.08 : 0.04;
  } else if (delivery.length === "good") {
    score += 0.08;
  } else {
    score += elevation === "loft" ? 0.12 : -0.08;
  }

  return clamp(score, 0, 1);
}

/**
 * How hard a given backlift lets you hit: nothing at all still connects (a
 * dab), and anything from `chargePerfectCenter` up swings the full blade. A
 * null charge is a swing with no backlift input — judged on timing alone, which
 * is what the shipped app always sends.
 */
export function backliftPower(
  charge: number | null,
  tuning: GameplayTuning,
): number {
  if (charge === null) return 1;
  const loaded = clamp(charge / tuning.chargePerfectCenter, 0, 1);
  return tuning.backliftPowerFloor + (1 - tuning.backliftPowerFloor) * loaded;
}

/** 0 until you pass `overswingFrom`, then ramps to 1 at a fully wound-up bat. */
export function overswing(
  charge: number | null,
  tuning: GameplayTuning,
): number {
  if (charge === null || charge <= tuning.overswingFrom) return 0;
  return clamp((charge - tuning.overswingFrom) / (1 - tuning.overswingFrom), 0, 1);
}

export type ResolveContactOptions = {
  delivery: DeliverySpec;
  elevation: Elevation;
  direction: ShotDirection;
  timingErrorMs: number;
  hasInput: boolean;
  powerShot: boolean;
  random: DeterministicRandom;
  charge?: number | null;
  tuning: GameplayTuning;
};

export function resolveContact({
  delivery,
  elevation,
  direction,
  timingErrorMs,
  hasInput,
  powerShot,
  random,
  charge = null,
  tuning,
}: ResolveContactOptions): ContactOutcome {
  const timing = resolveTiming(timingErrorMs, hasInput, tuning);
  const contactX = Math.abs(deliveryContactX(delivery));

  // Only a ball in the stump channel can bowl you, and never a bouncer or a wide.
  const bowledThreat =
    contactX <= tuning.stumpChannel &&
    delivery.extra !== "wide" &&
    delivery.length !== "short";
  const reachable = contactX <= tuning.batterReach;

  if (!hasInput || timing === "miss" || !reachable) {
    return {
      type: "miss",
      timing: "miss",
      timingErrorMs,
      direction,
      elevation,
      power: 0,
      control: 0,
      shotAngleDegrees: nominalAngle(direction),
      velocity: zeroVector,
      verticalVelocity: 0,
      acceptedSwing: hasInput,
      powerShotUsed: hasInput && powerShot,
      bowledThreat,
    };
  }

  const profile = timingProfile(timing);
  const technique = compatibility(delivery, direction, elevation);
  const wild = overswing(charge, tuning);

  let control = profile.control * (0.65 + 0.55 * technique);
  if (powerShot) control += tuning.powerShotControlBonus;
  control *= 1 - tuning.overswingControlPenalty * wild;
  control = clamp(control, 0, 1);

  const baseEdgeChance =
    timing === "perfect"
      ? 0.015
      : timing === "good"
        ? 0.06
        : timing === "early" || timing === "late"
          ? 0.22
          : timing === "poor"
            ? 0.44
            : 1.0;
  const edgeChance =
    baseEdgeChance + (1 - technique) * 0.12 + tuning.overswingEdgeBonus * wild;

  // First draw: whether it came off the middle.
  const edged = random.nextBool(clamp(edgeChance, 0, 0.75));

  let power = profile.power * (0.8 + 0.42 * technique) * random.range(0.94, 1.06);
  power *= backliftPower(charge, tuning);
  if (powerShot) power *= tuning.powerShotPowerMultiplier;
  if (edged) power *= random.range(0.35, 0.65);
  power = clamp(power, 0.12, 1.2);

  let angle = nominalAngle(direction);
  if (timing === "early") angle += 7 + 8 * (1 - control);
  if (timing === "late") angle -= 7 + 8 * (1 - control);
  const maximumSpread = timing === "poor" ? 28.0 : 16.0 * (1 - control);
  angle += random.range(-maximumSpread, maximumSpread);
  if (edged) angle += random.range(-18, 18);

  const horizontalSpeed =
    elevation === "ground"
      ? tuning.groundBaseSpeed + tuning.groundPowerSpeed * power
      : tuning.loftBaseSpeed + tuning.loftPowerSpeed * power;
  const verticalSpeed =
    elevation === "loft"
      ? tuning.loftVerticalBaseSpeed + tuning.loftVerticalPowerSpeed * power
      : 0;

  return {
    type: edged ? "edge" : "clean",
    timing,
    timingErrorMs,
    direction,
    elevation,
    power,
    control,
    shotAngleDegrees: angle,
    velocity: scaleVector(vectorFromShotAngle(angle), horizontalSpeed),
    verticalVelocity: verticalSpeed,
    acceptedSwing: true,
    powerShotUsed: powerShot,
    bowledThreat: false,
  };
}

/* ---- Physics ------------------------------------------------------------- */

export function launchBall(
  contact: ContactOutcome,
  ballAtContactPosition: FieldVector,
): BallKinematics {
  return {
    position: ballAtContactPosition,
    velocity: contact.velocity,
    // A hair off the turf, so the first frame already counts as airborne.
    height: contact.elevation === "loft" ? 0.001 : 0,
    verticalVelocity: contact.verticalVelocity,
    aerial: contact.elevation === "loft",
    firstBounceOccurred: false,
    stopped: false,
  };
}

export function stepBall(
  ball: BallKinematics,
  seconds: number,
  tuning: GameplayTuning,
): BallKinematics {
  if (ball.stopped || seconds <= 0) return ball;

  const position = addVectors(ball.position, scaleVector(ball.velocity, seconds));
  let velocity = ball.velocity;
  let height = ball.height;
  let verticalVelocity = ball.verticalVelocity;
  let aerial = ball.aerial;
  let bounced = ball.firstBounceOccurred;

  if (aerial) {
    height += verticalVelocity * seconds - 0.5 * tuning.gravity * seconds * seconds;
    verticalVelocity -= tuning.gravity * seconds;
    if (height <= 0 && verticalVelocity <= 0) {
      height = 0;
      verticalVelocity = 0;
      aerial = false;
      bounced = true;
      velocity = scaleVector(velocity, tuning.landingSpeedRetention);
    }
  } else {
    const speed = vectorLength(velocity);
    const nextSpeed = Math.max(0, speed - tuning.groundDragPerSecond * seconds);
    velocity = speed === 0 ? zeroVector : scaleVector(normalizeVector(velocity), nextSpeed);
  }

  const stopped = !aerial && vectorLength(velocity) <= 0.015;
  return {
    position,
    velocity: stopped ? zeroVector : velocity,
    height,
    verticalVelocity,
    aerial,
    firstBounceOccurred: bounced,
    stopped,
  };
}

/** Ground can never produce a six, and any loft that bounced is also a four. */
export function boundaryValue(
  ball: BallKinematics,
  elevation: Elevation,
  tuning: GameplayTuning,
): number {
  if (vectorLength(ball.position) < tuning.boundaryRadius) return 0;
  return elevation === "loft" && !ball.firstBounceOccurred ? 6 : 4;
}

/** A catch at the exact bounce time is a bounce, not a catch. */
export function catchPrecedesBounce(
  catchTime: number,
  firstBounceTime: number,
): boolean {
  return catchTime < firstBounceTime;
}

/** Boundary wins an exact tie against pickup. */
export function pickupPrecedesBoundary(
  pickupTime: number,
  boundaryTime: number,
): boolean {
  return pickupTime < boundaryTime;
}

/* ---- Fielding ------------------------------------------------------------ */

export type ChaserSelection = { primaryId: number; backupId: number };

export function reactionDelay(
  fielder: FielderState,
  tuning: GameplayTuning,
): number {
  if (fielder.role === "wicketkeeper") return tuning.keeperReactionSeconds;
  return vectorLength(fielder.position) < 0.55
    ? tuning.closeReactionSeconds
    : tuning.deepReactionSeconds;
}

/**
 * The two who go for it: nearest by time-to-arrive, not by distance, so a slow
 * reaction can cost a close fielder the ball. Ties break by id so the choice is
 * reproducible.
 */
export function selectChasers(
  fielders: readonly FielderState[],
  predictedPosition: FieldVector,
  tuning: GameplayTuning,
): ChaserSelection {
  if (fielders.length < 2) {
    throw new RangeError("At least two fielders are required");
  }
  const timeFor = (fielder: FielderState) =>
    reactionDelay(fielder, tuning) +
    distanceBetween(fielder.position, predictedPosition) / tuning.fielderSpeed;

  const ranked = [...fielders].sort((a, b) => {
    const difference = timeFor(a) - timeFor(b);
    return difference !== 0 ? difference : a.id - b.id;
  });
  return { primaryId: ranked[0].id, backupId: ranked[1].id };
}

export type CatchChanceOptions = {
  fielder: FielderState;
  contact: ContactOutcome;
  runningCatch: boolean;
  arrivedEarly: boolean;
  tuning: GameplayTuning;
};

export function catchChance({
  fielder,
  contact,
  runningCatch,
  arrivedEarly,
  tuning,
}: CatchChanceOptions): number {
  let chance =
    fielder.role === "wicketkeeper" ? tuning.keeperCatchChance : tuning.baseCatchChance;
  if (runningCatch) chance -= 0.12;
  if (contact.power > 0.85) chance -= 0.12;
  if (contact.type === "edge") chance += 0.06;
  if (arrivedEarly) chance += 0.08;
  return clamp(chance, tuning.catchChanceMinimum, tuning.catchChanceMaximum);
}

export function riskForMargin(
  marginSeconds: number,
  tuning: GameplayTuning,
): RiskLevel {
  if (marginSeconds > tuning.safeMarginSeconds) return "safe";
  if (marginSeconds < tuning.dangerMarginSeconds) return "danger";
  return "close";
}

/** The runner is safe when crease and stump break are simultaneous. */
export function isRunOut(stumpBreakMicros: number, creaseMicros: number): boolean {
  return stumpBreakMicros < creaseMicros;
}

/* ---- Scoring ------------------------------------------------------------- */

export type HistoryTokenOptions = {
  extra: ExtraType;
  totalRuns: number;
  batAndRunningRuns: number;
  boundary: number;
  dismissal: DismissalType;
};

/** The short string the ball strip and the result screen print for a delivery. */
export function historyToken({
  extra,
  totalRuns,
  batAndRunningRuns,
  boundary,
  dismissal,
}: HistoryTokenOptions): string {
  const parts: string[] = [];
  if (extra === "wide") parts.push("WD");
  if (extra === "noBall") parts.push("NB");

  if (boundary > 0) {
    parts.push(String(boundary));
  } else if (batAndRunningRuns > 0) {
    parts.push(String(batAndRunningRuns));
  } else if (extra === "none" && totalRuns === 0) {
    parts.push("0");
  }

  if (dismissal !== "none") {
    parts.push(
      dismissal === "bowled" ? "BOWLED" : dismissal === "caught" ? "CAUGHT" : "RUN OUT",
    );
  }
  return parts.join("+");
}

export type ObjectiveUpdate = { progress: number; completed: boolean };

export function updateObjective(
  objective: ObjectiveType,
  currentProgress: number,
  result: BallResult,
): ObjectiveUpdate {
  const progress =
    objective === "twoBoundaries"
      ? currentProgress + (isBoundary(result) ? 1 : 0)
      : objective === "sixRunsFirstThreeLegalBalls"
        ? currentProgress + (result.legalBallsBefore < 3 ? resultTotalRuns(result) : 0)
        : Math.max(currentProgress, result.completedRunningRuns >= 2 ? 1 : 0);

  const threshold =
    objective === "twoBoundaries" ? 2 : objective === "sixRunsFirstThreeLegalBalls" ? 6 : 1;

  return { progress, completed: progress >= threshold };
}

/** Runs off the bat build the combo; a wicket or a dot off the bat resets it. */
export function nextCombo(currentCombo: number, result: BallResult): number {
  if (isProductiveContact(result) && !isWicket(result)) {
    return Math.min(3, currentCombo + 1);
  }
  if (isWicket(result) || (result.contactType !== "none" && resultTotalRuns(result) === 0)) {
    return 1;
  }
  // A no-contact extra does not alter combo.
  return currentCombo;
}

/** What one delivery pays into the OVERDRIVE meter. */
export function chargeFor(result: BallResult, increasedCombo: number): number {
  const scoredFromContact = result.runsOffBat + result.completedRunningRuns;
  if (result.contactType === "none" || scoredFromContact <= 0) return 0;
  const base = result.boundary === 6 ? 3 : result.boundary === 4 ? 2 : 1;
  return base + Math.max(0, increasedCombo - 1);
}

export type StarsForWinOptions = {
  objectiveCompleted: boolean;
  legalBalls: number;
  wickets: number;
  maximumLegalBalls?: number;
};

export function starsForWin({
  objectiveCompleted,
  legalBalls,
  wickets,
  maximumLegalBalls = 18,
}: StarsForWinOptions): number {
  let stars = 1;
  if (objectiveCompleted) stars += 1;
  // Early finish (2+ balls spare) or an unbeaten chase earns the third star.
  if (maximumLegalBalls - legalBalls >= 2 || wickets === 0) stars += 1;
  return stars;
}

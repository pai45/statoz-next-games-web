/**
 * Everything that decides how a chase plays out — the web port of the
 * `final_over` package's `domain/gameplay_tuning.dart`.
 *
 * Balancing lives here and nowhere else. Presentation beats are in
 * `constants.ts`, and changing one of those must not change a single run scored.
 *
 * The numbers are the Flutter engine's, verbatim. Where a preset omits a field
 * it inherits the base value, exactly as the Dart constructor's defaults do.
 */

import {
  clamp,
  type DeliveryLine,
  type FieldLayout,
  type FielderState,
  type FieldVector,
} from "./types";

export type GameplayTuning = {
  /** 60 Hz. The simulation only ever advances in whole steps of this. */
  fixedStepMicros: number;
  /** A frame longer than this is clamped, so a backgrounded tab cannot spiral. */
  maximumFrameMicros: number;

  deliveryPreparationMicros: number;
  runUpMicros: number;
  incomingToContactMicros: number;
  lateSwingGraceMicros: number;
  cameraTransitionMicros: number;
  impactHoldMicros: number;
  deliveryResultMicros: number;
  betweenBallsMicros: number;
  pickupDecisionMicros: number;

  perfectWindowMs: number;
  goodWindowMs: number;
  earlyLateWindowMs: number;
  poorWindowMs: number;

  batterReach: number;
  stumpChannel: number;
  maximumMovement: number;
  groundBaseSpeed: number;
  groundPowerSpeed: number;
  groundDragPerSecond: number;
  loftBaseSpeed: number;
  loftPowerSpeed: number;
  loftVerticalBaseSpeed: number;
  loftVerticalPowerSpeed: number;
  gravity: number;
  landingSpeedRetention: number;
  catchHeight: number;
  fieldRadius: number;
  pitchLength: number;
  pitchWidth: number;
  boundaryRadius: number;
  ballPickupRadius: number;
  catchRadius: number;
  fielderSpeed: number;
  backupSpeedFactor: number;
  throwSpeed: number;
  closeReactionSeconds: number;
  deepReactionSeconds: number;
  keeperReactionSeconds: number;
  runDurationSeconds: number;
  turnBackLimit: number;
  closeCallSeconds: number;
  safeMarginSeconds: number;
  dangerMarginSeconds: number;
  maximumRuns: number;
  maximumLegalBalls: number;
  maximumOvers: number;
  ballsPerOver: number;
  maximumWickets: number;
  maximumNoBalls: number;
  maximumWides: number;
  noBallProbability: number;
  wideProbability: number;
  baseCatchChance: number;
  keeperCatchChance: number;
  catchChanceMinimum: number;
  catchChanceMaximum: number;
  dropSpeedMinimum: number;
  dropSpeedMaximum: number;

  /**
   * Combo segments the batter must bank before OVERDRIVE can be armed. One
   * source of truth: the HUD reads the same number the controller gates on.
   */
  powerShotSegments: number;
  powerShotPowerMultiplier: number;
  powerShotControlBonus: number;

  /* Backlift. Hold a swing and the bat loads; how charged it is on release
   * decides how hard the ball is hit, and holding too long is a slog.
   *
   * The shipped Flutter app never sends a charge, so `backliftPower` returns 1
   * and the overswing penalties never fire. Ported for completeness and left
   * unused, matching shipped behaviour rather than the unreachable branch. */
  chargeSeconds: number;
  chargePerfectCenter: number;
  chargePerfectHalf: number;
  chargeGoodHalf: number;
  overswingFrom: number;
  backliftPowerFloor: number;
  overswingControlPenalty: number;
  overswingEdgeBonus: number;
};

/** The Dart constructor's defaults. Every preset below starts from these. */
export const baseTuning: GameplayTuning = {
  fixedStepMicros: 16667,
  maximumFrameMicros: 250000,
  deliveryPreparationMicros: 3000000,
  runUpMicros: 900000,
  incomingToContactMicros: 650000,
  lateSwingGraceMicros: 276000,
  cameraTransitionMicros: 360000,
  impactHoldMicros: 450000,
  deliveryResultMicros: 650000,
  betweenBallsMicros: 450000,
  pickupDecisionMicros: 500000,

  perfectWindowMs: 50,
  goodWindowMs: 115,
  earlyLateWindowMs: 190,
  poorWindowMs: 275,

  batterReach: 0.085,
  stumpChannel: 0.028,
  maximumMovement: 0.012,
  groundBaseSpeed: 0.36,
  groundPowerSpeed: 0.64,
  groundDragPerSecond: 0.52,
  loftBaseSpeed: 0.42,
  loftPowerSpeed: 0.59,
  loftVerticalBaseSpeed: 0.55,
  loftVerticalPowerSpeed: 0.45,
  gravity: 1.65,
  landingSpeedRetention: 0.54,
  catchHeight: 0.025,
  fieldRadius: 1,
  pitchLength: 0.42,
  pitchWidth: 0.1,
  boundaryRadius: 1,
  ballPickupRadius: 0.045,
  catchRadius: 0.06,
  fielderSpeed: 0.29,
  backupSpeedFactor: 0.65,
  throwSpeed: 0.62,
  closeReactionSeconds: 0.24,
  deepReactionSeconds: 0.33,
  keeperReactionSeconds: 0.14,
  runDurationSeconds: 1.2,
  turnBackLimit: 0.45,
  closeCallSeconds: 0.09,
  safeMarginSeconds: 0.22,
  dangerMarginSeconds: -0.15,
  maximumRuns: 3,
  maximumLegalBalls: 18,
  maximumOvers: 3,
  ballsPerOver: 6,
  maximumWickets: 2,
  maximumNoBalls: 3,
  maximumWides: 5,
  noBallProbability: 0.02,
  wideProbability: 0.05,
  baseCatchChance: 0.82,
  keeperCatchChance: 0.88,
  catchChanceMinimum: 0.25,
  catchChanceMaximum: 0.95,
  dropSpeedMinimum: 0.35,
  dropSpeedMaximum: 0.6,

  powerShotSegments: 10,
  powerShotPowerMultiplier: 1.18,
  powerShotControlBonus: 0.08,

  chargeSeconds: 0.8125,
  chargePerfectCenter: 0.8,
  chargePerfectHalf: 0.1,
  chargeGoodHalf: 0.22,
  overswingFrom: 0.92,
  backliftPowerFloor: 0.55,
  overswingControlPenalty: 0.22,
  overswingEdgeBonus: 0.1,
};

/* ---- Difficulty presets -------------------------------------------------- */
/* A tier is not just a bigger target. Each brings its own timing windows, its
 * own wickets in hand, its own slip-fingered or safe-handed fielders, and its
 * own OVERDRIVE price.                                                       */

export const rookieTuning: GameplayTuning = {
  ...baseTuning,
  perfectWindowMs: 80,
  goodWindowMs: 180,
  earlyLateWindowMs: 300,
  poorWindowMs: 400,
  lateSwingGraceMicros: 401000,
  maximumWickets: 4,
  baseCatchChance: 0.58,
  keeperCatchChance: 0.68,
  powerShotSegments: 4,
  fielderSpeed: 0.24,
  throwSpeed: 0.56,
  closeReactionSeconds: 0.3,
  deepReactionSeconds: 0.4,
  keeperReactionSeconds: 0.18,
  batterReach: 0.1,
  groundBaseSpeed: 0.396,
  groundPowerSpeed: 0.704,
  loftBaseSpeed: 0.462,
  loftPowerSpeed: 0.649,
  backliftPowerFloor: 0.75,
  overswingFrom: 0.98,
  overswingControlPenalty: 0.1,
  overswingEdgeBonus: 0.04,
};

export const proTuning: GameplayTuning = {
  ...baseTuning,
  perfectWindowMs: 65,
  goodWindowMs: 150,
  earlyLateWindowMs: 245,
  poorWindowMs: 330,
  lateSwingGraceMicros: 331000,
  maximumWickets: 3,
  baseCatchChance: 0.68,
  keeperCatchChance: 0.76,
  powerShotSegments: 5,
  fielderSpeed: 0.27,
  throwSpeed: 0.59,
  closeReactionSeconds: 0.27,
  deepReactionSeconds: 0.36,
  keeperReactionSeconds: 0.16,
  batterReach: 0.092,
  groundBaseSpeed: 0.378,
  groundPowerSpeed: 0.672,
  loftBaseSpeed: 0.441,
  loftPowerSpeed: 0.627,
  backliftPowerFloor: 0.65,
  overswingFrom: 0.95,
  overswingControlPenalty: 0.16,
  overswingEdgeBonus: 0.07,
};

/**
 * The engine's own defaults, reproduced exactly — the package's balance suite
 * still measures the game it was tuned against. Only `powerShotSegments`
 * differs from `baseTuning`, and since the app always passes a tier, 8 is the
 * live value and the base's 10 is never reached.
 */
export const eliteTuning: GameplayTuning = {
  ...baseTuning,
  perfectWindowMs: 50,
  goodWindowMs: 115,
  earlyLateWindowMs: 190,
  poorWindowMs: 275,
  lateSwingGraceMicros: 276000,
  maximumWickets: 2,
  baseCatchChance: 0.82,
  keeperCatchChance: 0.88,
  powerShotSegments: 8,
  fielderSpeed: 0.29,
  throwSpeed: 0.62,
  closeReactionSeconds: 0.24,
  deepReactionSeconds: 0.33,
  keeperReactionSeconds: 0.14,
  batterReach: 0.085,
  groundBaseSpeed: 0.36,
  groundPowerSpeed: 0.64,
  loftBaseSpeed: 0.42,
  loftPowerSpeed: 0.59,
  backliftPowerFloor: 0.55,
  overswingFrom: 0.92,
  overswingControlPenalty: 0.22,
  overswingEdgeBonus: 0.1,
};

/* ---- The chase ladder ---------------------------------------------------- */

/** Approved targets for the three-over format. Do not invent a rung. */
export const targetOptions: readonly number[] = [
  32, 36, 40, 44, 48, 52, 56, 58, 62, 66,
];

export const targetMinimum = 32;
export const targetMaximum = 66;

/** How far off centre each line pitches, in field units. */
export const lineX: Record<DeliveryLine, number> = {
  wideOff: -0.11,
  off: -0.035,
  middle: 0,
  leg: 0.035,
  wideLeg: 0.11,
};

/* ---- Field layouts ------------------------------------------------------- */

function fielderAt(
  id: number,
  role: FielderState["role"],
  position: FieldVector,
): FielderState {
  return {
    id,
    role,
    homePosition: position,
    position,
    velocity: { x: 0, y: 0 },
    motion: "idle",
    hasBall: false,
    reactionRemainingSeconds: 0,
  };
}

function fieldLayout(
  id: string,
  label: string,
  outfield: readonly FieldVector[],
): FieldLayout {
  return {
    id,
    label,
    fielders: [
      ...outfield.map((position, index) => fielderAt(index, "outfielder", position)),
      fielderAt(8, "wicketkeeper", { x: 0, y: 0.27 }),
      fielderAt(9, "bowler", { x: 0, y: -0.05 }),
    ],
  };
}

/**
 * Five balanced shapes. The seed chooses the opening shape and every physical
 * delivery advances one slot, so wides and no-balls trigger the same visible
 * tactical reset as legal balls.
 */
export const fieldLayouts: readonly FieldLayout[] = [
  fieldLayout("balanced", "BALANCED", [
    { x: -0.78, y: -0.12 },
    { x: 0.78, y: -0.12 },
    { x: -0.45, y: -0.72 },
    { x: 0.45, y: -0.72 },
    { x: -0.72, y: 0.48 },
    { x: 0.72, y: 0.48 },
    { x: -0.18, y: -0.82 },
    { x: 0.18, y: -0.82 },
  ]),
  fieldLayout("off-guard", "OFF GUARD", [
    { x: -0.82, y: -0.1 },
    { x: -0.64, y: -0.5 },
    { x: -0.42, y: -0.78 },
    { x: -0.18, y: -0.88 },
    { x: -0.58, y: 0.38 },
    { x: 0.64, y: -0.58 },
    { x: 0.8, y: 0.14 },
    { x: 0.42, y: 0.6 },
  ]),
  fieldLayout("leg-guard", "LEG GUARD", [
    { x: 0.82, y: -0.1 },
    { x: 0.64, y: -0.5 },
    { x: 0.42, y: -0.78 },
    { x: 0.18, y: -0.88 },
    { x: 0.58, y: 0.38 },
    { x: -0.64, y: -0.58 },
    { x: -0.8, y: 0.14 },
    { x: -0.42, y: 0.6 },
  ]),
  fieldLayout("straight-wall", "STRAIGHT WALL", [
    { x: -0.74, y: -0.3 },
    { x: 0.74, y: -0.3 },
    { x: -0.52, y: -0.72 },
    { x: 0.52, y: -0.72 },
    { x: -0.26, y: -0.91 },
    { x: 0.26, y: -0.91 },
    { x: -0.66, y: 0.43 },
    { x: 0.66, y: 0.43 },
  ]),
  fieldLayout("close-attack", "CLOSE ATTACK", [
    { x: -0.4, y: -0.32 },
    { x: 0.4, y: -0.32 },
    { x: -0.28, y: -0.54 },
    { x: 0.28, y: -0.54 },
    { x: -0.62, y: -0.66 },
    { x: 0.62, y: -0.66 },
    { x: -0.48, y: 0.44 },
    { x: 0.48, y: 0.44 },
  ]),
];

/** The original neutral field, for simulations that ask for it explicitly. */
export const balancedField = fieldLayouts[0].fielders;

export function fieldLayoutFor(
  matchSeed: number,
  physicalOrdinal: number,
): FieldLayout {
  const count = fieldLayouts.length;
  const seededStart = ((matchSeed % count) + count) % count;
  const deliveryOffset = physicalOrdinal <= 1 ? 0 : physicalOrdinal - 1;
  return fieldLayouts[(seededStart + deliveryOffset) % count];
}

/* ---- Tier ---------------------------------------------------------------- */

export type FinalOverTier = "rookie" | "pro" | "elite";

export const finalOverTiers: readonly FinalOverTier[] = [
  "rookie",
  "pro",
  "elite",
];

export const tierTuning: Record<FinalOverTier, GameplayTuning> = {
  rookie: rookieTuning,
  pro: proTuning,
  elite: eliteTuning,
};

export const tierLabels: Record<FinalOverTier, string> = {
  rookie: "ROOKIE",
  pro: "PRO",
  elite: "ELITE",
};

/** The whole pitch in six words. */
export const tierBlurbs: Record<FinalOverTier, string> = {
  rookie: "GET YOUR EYE IN",
  pro: "THE HONEST CHASE",
  elite: "BOUNDARIES OR BUST",
};

/** Targets each tier draws from. Every value is on the ladder above. */
export const tierTargets: Record<FinalOverTier, readonly number[]> = {
  rookie: [32, 36, 40],
  pro: [44, 48, 52, 56],
  elite: [58, 62, 66],
};

/** Elite chases are worth more because they are, in fact, harder. */
export const tierXpMultipliers: Record<FinalOverTier, number> = {
  rookie: 0.8,
  pro: 1,
  elite: 1.35,
};

/** The range shown under a tier tile. The dash is an en dash, as in Flutter. */
export function tierRange(tier: FinalOverTier): string {
  const targets = tierTargets[tier];
  return `${targets[0]}–${targets[targets.length - 1]}`;
}

/** Keeps a caller from asking for a target the engine does not recognise. */
export function isApprovedTarget(target: number): boolean {
  return targetOptions.includes(clamp(target, targetMinimum, targetMaximum));
}

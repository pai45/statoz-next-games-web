/**
 * Every tunable constant for Hoop Duel in one place — the web port of
 * `games/basketball/basketball_tuning.dart`, name for name and value for value.
 *
 * World units are metres along a single axis x (the side-view court), plus a
 * height axis h for the ball and jumps. The hoop is on the RIGHT. Distances to
 * the rim are `d = rimX - x`.
 *
 * Nothing here is a rendering decision. Pixels-per-metre and screen geometry
 * live in `components/renderer/geometry.ts`; this file is the rules' dimensions.
 */

import type { BasketballDifficulty } from "./types";

/* ---- Court geometry ------------------------------------------------------- */

export const courtMinX = 0.0;
export const courtMaxX = 12.6;
export const rimX = 11.6;
export const backboardX = 11.95;
export const rimHeight = 3.05;

/** Three-point distance from the rim; the arc line sits at `rimX - arcDist`. */
export const arcDist = 6.75;

/** The line itself, as a court x. Feet on or behind it make it a three. */
export const arcLineX = rimX - arcDist;

/** Offense/defense reset spots after a made basket or a turnover. */
export const checkSpotX = 3.2;
export const defenderResetX = 5.6;

/** Shot-zone boundaries by distance to the rim. */
export const dunkGate = 1.5;
export const dunkGateRimPressure = 2.2;
export const layupRange = 2.4;
export const closeRange = 4.5;

/* ---- Clocks & flow -------------------------------------------------------- */

export const halfSeconds = 45;
export const shotClockSeconds = 12;

/** Dead-ball reset (post-basket / violation) — players lerp to reset spots. */
export const resetSeconds = 0.9;

/* ---- Movement ------------------------------------------------------------- */

/** Base run speed (m/s) at 70 SPD; scales by ±20% across the rating range. */
export const baseSpeed = 3.4;
export const driveMult = 1.5;
export const stanceMult = 0.62;
export const protectMult = 0.7;
export const driveDuration = 0.9;
export const burstStaminaCost = 12;

/** A direction flip within this window of the previous one is a crossover. */
export const crossoverWindow = 0.22;
export const crossoverDuration = 0.25;
export const stepbackDistance = 0.9;
export const stepbackDuration = 0.3;

/** Guarded auto ball-protection kicks in inside this gap. */
export const guardedGap = 1.4;

/** Soft body separation — bodies cannot overlap closer than this. */
export const bodyGap = 0.45;

/* ---- Jumps & shot meter --------------------------------------------------- */

export const gatherSeconds = 0.12;
export const gatherQuickRelease = 0.08;
export const jumpShotDuration = 0.75;
export const layupDuration = 0.6;
export const dunkDuration = 0.65;
export const blockJumpDuration = 0.6;
export const reboundJumpDuration = 0.55;

/** Meter apex (the perfect point) as a fraction of the shot jump. */
export const shotApexFrac = 0.42;
export const shotApexQuickRelease = 0.36;
export const maxJumpHeight = 0.75;

/** Perfect half-window (seconds) at rating 50, before modifiers. */
export const perfectHalfWindowBase = 0.06;

/** Good grade extends this far beyond the perfect window on both sides. */
export const goodHalfWindow = 0.14;

/** The hold threshold that separates a tap from a shot gather. */
export const tapThreshold = 0.12;

/* ---- Shot model (probabilities multiply, then clamp) ---------------------- */

export const baseLayup = 0.58;
export const baseClose = 0.5;
export const baseMid = 0.46;
export const baseThree = 0.4;

/** Make-chance change per rating point away from 70. */
export const ratingSlope = 0.004;

/** Make-chance loss per metre beyond the zone's reference distance. */
export const distanceSlope = 0.03;

export const timingPerfect = 1.3;
export const timingGood = 1.0;
export const timingEarlyLate = 0.55;

/** Max contest suppression (at gap 0 with a synced jump contest). */
export const contestMax = 0.55;
export const contestRange = 2.2;

export const balanceMoving = 0.85;
export const balanceStepback = 0.92;

export const heatShotBonus = 1.12;
export const repeatPenalty = 0.9;
export const repeatMaxStacks = 2;

export const shotFloor = 0.02;
export const shotCap = 0.88;
export const shotCapPerfect = 0.93;

/** Put-back bonus on top of the layup base. */
export const putbackBonus = 0.1;
export const putbackWindow = 0.9;

/* ---- Defense -------------------------------------------------------------- */

export const stealReach = 1.1;
export const stealActiveFrom = 0.08;
export const stealActiveTo = 0.2;
export const stealBase = 0.35;
export const stealRatingSlope = 0.005;
export const stealExposedBonus = 0.25;
export const stealProtectedPenalty = 0.65;
export const whiffRecover = 0.55;

/** Grounded contest arm-up trigger gap. */
export const contestGap = 2.2;

/** Block: the jump must start within this window of the release to connect. */
export const blockSyncWindow = 0.14;
export const blockReachBase = 1.2;
export const blockReachSlope = 0.004;
export const blockDunkBase = 0.35;
export const staggerSeconds = 0.6;
export const fakeSeconds = 0.35;

/* ---- Rebounds ------------------------------------------------------------- */

/** The ball becomes grabbable below this height while loose. */
export const catchHeight = 2.6;
export const reboundReach = 0.95;
export const boxOutBonus = 0.4;
export const glassCleanerBonus = 0.15;
export const groundPickupRange = 0.7;
export const gravity = 9.8;

/**
 * A loose ball nobody recovers for this long is scooped by the nearest player,
 * so there is never dead time and a pending buzzer can always resolve.
 */
export const looseTimeout = 3.5;

/* ---- Stamina (0-100) ------------------------------------------------------ */

export const drainDrivePerSec = 12;
export const drainCrossover = 3;
export const drainJumpShot = 6;
export const drainDunk = 18;
export const drainBlockJump = 8;
export const drainLunge = 5;
export const drainContest = 2;
export const drainReboundJump = 6;
export const drainStancePerSec = 1.5;
export const regenCalmPerSec = 8;
export const regenResetPerSec = 15;
export const halftimeActiveRegen = 40;
export const dunkStaminaGate = 35;

/** Low-stamina floors: fully tired means these multipliers. */
export const tiredSpeedFloor = 0.85;
export const tiredJumpFloor = 0.9;
export const tiredWindowFloor = 0.7;

/* ---- Heat ----------------------------------------------------------------- */

export const heatPerBasket = 0.34;
export const heatPerStop = 0.12;
export const heatPerBoard = 0.08;
export const heatDuration = 15;
export const heatWindowMult = 1.25;
export const heatSpeedMult = 1.08;
export const heatDrainMult = 0.6;

/* ---- Spin move (a second double-tap mid-drive) ---------------------------- */

export const spinDuration = 0.38;
export const spinSpeedMult = 1.35;
export const spinStaminaCost = 10;

/** Ball-exposed window at spin start — the steal counterplay. */
export const spinExposed = 0.1;

/** Fresh drive time granted when a spin beats the defender. */
export const spinCarryDrive = 0.3;

/** Lockout when a set defender absorbs the spin (they held their ground). */
export const spinAbsorbRecover = 0.3;

/* ---- Presentation beats (render-facing, still engine-timed) --------------- */

/**
 * Post-basket reaction beat (scorer celebrates, victim slumps). Must stay
 * inside `resetSeconds` so both athletes are idle when play resumes.
 */
export const reactSeconds = 0.8;

/** Impact cinematic: focal zoom-punch duration and strength. */
export const cineSeconds = 0.3;
export const cineZoom = 0.03;

/** Backboard score-flash decay. */
export const scoreFlashSeconds = 0.5;

/** Hardwood reflection ghosts (rig/ball/hoop): opacity and vertical squash. */
export const reflectAlpha = 0.09;
export const reflectSquash = 0.38;

/* ---- AI ------------------------------------------------------------------- */

export const aiLatency: Record<BasketballDifficulty, number> = {
  rookie: 0.4,
  pro: 0.25,
  allStar: 0.16,
};

export const aiJitter: Record<BasketballDifficulty, number> = {
  rookie: 0.12,
  pro: 0.07,
  allStar: 0.04,
};

export const aiEpsilon: Record<BasketballDifficulty, number> = {
  rookie: 0.35,
  pro: 0.18,
  allStar: 0.08,
};

/** How readily a defender bites on a pump fake. */
export const aiBite: Record<BasketballDifficulty, number> = {
  rookie: 0.55,
  pro: 0.3,
  allStar: 0.15,
};

/** How long the AI waits between steal attempts. */
export const aiStealCooldown: Record<BasketballDifficulty, number> = {
  rookie: 2.2,
  pro: 1.6,
  allStar: 1.1,
};

/**
 * Presentation beats for Final Over — the web port of the app's
 * `games/final_over/final_over_tuning.dart`, plus the projection geometry the
 * batting camera shares.
 *
 * Gameplay tuning does NOT live here — that is `tuning.ts`, and it is the only
 * thing allowed to change how a match plays out. Everything below is
 * render-facing: how hard the camera kicks and how long a celebration runs.
 * Changing any of it must not change a single run scored.
 */

import type { DeliveryLength } from "./types";

/* ---- Camera juice -------------------------------------------------------- */

/** Screen shake on contact, boundary and wicket. */
export const shakeSeconds = 0.32;
export const shakeContact = 5.0;
export const shakeWicket = 8.0;

/** Focal zoom-punch on a run-out or a completed run — the chase tightening. */
export const cineSeconds = 0.55;
export const cineZoom = 0.055;

/** How long a full-screen effect (ring, pulse, burst) lives. */
export const effectSeconds = 1.1;

/** The last legal ball dims the edges of the world. Cheap, and it works. */
export const finalBallVignette = 0.62;

/** How long a HUD sting (SIX / FOUR / OUT / PERFECT) stays up. */
export const stingMajorMs = 1500;
export const stingMinorMs = 1000;

/** Bowler run-up leg-cycle speed, in radians of phase per unit of progress. */
export const runUpCycle = 26.0;

/** The crowd never goes quiet; it goes berserk, then takes a couple of
 * seconds to come back down. */
export const crowdDots = 96;
export const crowdIdleHype = 0.22;
export const crowdHypeSeconds = 2.2;

/**
 * How long a held swing takes to wind up to the fully-cocked backlift, in
 * microseconds of engine simulation time. Purely a render-facing ramp — the
 * grading engine only ever sees the real release timestamp.
 */
export const backliftLoadMicros = 300000;

/** How long a committed swing takes to play out, in simulation microseconds. */
export const swingPoseMicros = 520000;

/** How long the batter stays on screen after a wicket before the next one. */
export const nextBatterHoldSeconds = 2.2;

/* ---- Batting projection -------------------------------------------------- */

/**
 * Where the grass starts — directly under the hoardings, so there is no
 * no-man's-land between the boards and the rope.
 */
export const horizonFraction = 0.29;

/** The frame of reference every rig dimension scales against. */
export const referenceHeightMetres = 1.8;

/** Visual progress along the incoming delivery at which it reaches the pitch. */
export const bounceProgress: Record<DeliveryLength, number> = {
  short: 0.42,
  good: 0.56,
  full: 0.7,
  yorker: 0.82,
};

/* ---- Input --------------------------------------------------------------- */

/** Below this the drag is a tap, not a swipe. */
export const tapSlopPx = 24;

/** Upward pixels that turn a front drive into a loft. */
export const loftRisePx = 26;

/** Flick speed, in pixels per second, that lofts regardless of angle. */
export const loftSpeedPxPerSecond = 900;

/* ---- Screens ------------------------------------------------------------- */

/** The bowler-reveal card, between overs. */
export const bowlerRevealMs = 1600;

/** The result cinematic advances a stage on this interval. */
export const resultStageMs = 750;

/** The XP counter's count-up. */
export const xpCountUpMs = 900;

/** How long the match holds on the final ball before the result appears. */
export const resultDelayMs = 900;

/** The lobby deals itself in: status strip, hero, tiers, then the CTA. */
export const lobbyEnterMs = 480;
export const lobbyHeroDelayMs = 80;
export const lobbyTiersDelayMs = 240;
export const lobbyPlayDelayMs = 320;

/** The hero emblem's idle breathing. */
export const heroPulseMs = 2200;

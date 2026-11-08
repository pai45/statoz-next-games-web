/**
 * Every number the race feels like, in metres, m/s, m/s² and seconds.
 *
 * A verbatim port of the `k…` constants at the head of
 * `games/grand_prix/grand_prix_engine.dart`. Nothing here is a presentation
 * timing — those live in `constants.ts` — and nothing in `engine/` invents a
 * figure that is not in this file.
 */

export const topSpeed = 88; // ~316 kph
export const accel = 26; // peak acceleration off the line
export const coast = 10; // speed decay with the throttle released
export const brake = 44; // braking deceleration
export const carLength = 5.5;
export const carWidth = 2.0;

/** Drivable asphalt half-width — about four car widths plus margins. */
export const trackHalfWidth = 4.5;

/** Grass runs from the asphalt edge to the wall; the wall is a hard clamp. */
export const wallLateral = 6.5;
export const grassTopSpeedFactor = 0.55;

/**
 * Off the asphalt the car bogs down hard — enough that a car that runs wide and
 * is not steered back grinds to a crawl and gets stuck, which eventually ends
 * the race. Direct m/s² lost while off the road.
 */
export const grassDrag = 22;

export const steerRate = 7.5; // lateral m/s at full lock

/**
 * The drawn road compresses corner curvature to this fraction of lane widths.
 * The physics drifts the car to the OUTSIDE of a bend by exactly the same
 * amount, so a straight-heading car runs wide and the driver has to steer INTO
 * the corner to follow it. The renderer's `bendPxPerMeter` uses the same ratio —
 * keep the two in step or the road stops agreeing with the physics.
 */
export const bendCompression = 0.21;

/**
 * Below this forward speed the player counts as stuck. Reached only by running
 * off the road or into a barrier and stopping, never by ordinary cornering —
 * the slowest safe corner on the calendar is 23 m/s.
 */
export const stuckSpeed = 14;

/** Seconds the player may stay stuck before the race is over. */
export const stuckTimeout = 10.0;

export const slipstreamMin = 4;
export const slipstreamMax = 28;
export const slipstreamBoost = 0.08;
export const slipstreamAlign = 1.8;

/**
 * Speed scrubbed per second per m/s of corner overspeed — tyres fighting for
 * grip. Overspeed bleeds off as a pure speed loss and never pushes the car
 * sideways, so the driver keeps full lateral control through a bend and the car
 * only leaves its line when it is actually steered.
 */
export const scrub = 2.2;

export const wallHitSpeedFactor = 0.35;

/**
 * A corner wall impact only spins the car when it arrives with real speed. A
 * slow graze along the barrier just scrubs.
 */
export const wallSpinMinSpeed = 30;
export const spinSeconds = 0.8;
export const spinSpeedFactor = 0.25; // crawl multiplier while spinning
export const contactRearDecel = 22; // m/s² lost by the car doing the hitting
export const contactFrontDecel = 10; // m/s² lost by the car hit from behind
export const contactPushRate = 12; // lateral separation m/s while overlapping
export const heavyContactClosingSpeed = 22;
export const jumpStartCutSeconds = 2.0;

export const fieldSize = 20;
export const gridGap = 7.0; // metres between grid slots
export const maxCornerError = 0.35; // weak-CPU corner-entry overspeed fraction

/** The grid slots the player can be drawn into: P8 through P16. */
export const startPositionMin = 8;
export const startPositionSpan = 9;

/** The simulation's fixed substep, and the largest frame it will swallow. */
export const subStepSeconds = 1 / 120;
export const maxFrameSeconds = 1 / 30;

/** CPU skill from the player's Grand Prix level, capped at level 12. */
export function cpuSmartness(level: number): number {
  return Math.min(1, level / 12);
}

/**
 * Presentation timings and input thresholds — everything the Flutter widgets
 * spell inline as `Duration(milliseconds: …)` or a bare pixel count.
 *
 * The rules' dimensions live in `tuning.ts`. This file is only how long a beat
 * holds, how far a thumb travels, and how quickly a pad lights up. Changing a
 * value here changes how the game feels to watch, never how it plays.
 */

/* ---- Stings (PERFECT / ANKLE BREAKER / …) --------------------------------- */

/** `BasketballStingLayer`: majors slam bigger and hold longer. */
export const stingMajorMs = 1600;
export const stingMinorMs = 1100;

/* ---- Controls ------------------------------------------------------------- */

/** A second press on the same move arrow inside this window is a burst-drive. */
export const burstWindowMs = 260;

/** Leftward travel inside the ACTION pad that commits to a step-back. */
export const stepbackSwipePx = 34;

/** The pads' pressed-state crossfade, and the ACTION cue's label switch. */
export const padPressMs = 90;
export const actionCueSwitchMs = 140;

/* ---- Overlays ------------------------------------------------------------- */

/** The OVERTIME stinger auto-advances; a tap skips it. */
export const overtimeStingerMs = 2200;
export const overtimeStingerFadeMs = 600;

/** How long the court holds after the final buzzer before the result appears. */
export const resultDelayMs = 900;

/** The result reveal's four beats, and each beat's own entrance. */
export const resultStageMs = 750;
export const resultRevealMs = 340;

/** The XP figure counts up over this long. */
export const xpCountUpMs = 900;

/* ---- Lobby ---------------------------------------------------------------- */

/** The lobby deals itself in: status strip, hero, difficulty, CTA, links. */
export const lobbyHeroDelayMs = 80;
export const lobbyDifficultyDelayMs = 240;
export const lobbyPlayDelayMs = 400;
export const lobbyActionsDelayMs = 470;
export const lobbyLinksDelayMs = 650;

/** The lobby emblem's idle breathing. */
export const emblemPulseMs = 2600;

/* ---- Loop ----------------------------------------------------------------- */

/**
 * The simulation's fixed substep. Flutter runs the engine at 120 Hz inside a
 * 60 Hz frame so a fast release lands on the same tick on any device.
 */
export const substepSeconds = 1 / 120;

/** A backgrounded tab must not resolve a whole possession when it returns. */
export const maxFrameSeconds = 1 / 30;

/** How much the clock slows during a slow-mo beat. */
export const slowMoScale = 0.25;

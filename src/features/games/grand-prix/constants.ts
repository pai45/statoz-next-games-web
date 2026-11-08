/**
 * Presentation beats — everything the Flutter widgets spell inline as a
 * `Duration` or a bare pixel count.
 *
 * The race's own numbers live in `tuning.ts`. Changing a value here changes how
 * a moment reads, never how the car behaves.
 */

/* ---- The start sequence --------------------------------------------------- */

/** How long the grid holds before the lamps begin. */
export const gridHoldMs = 1200;

/** One lamp per second, five lamps. */
export const lightIntervalMs = 1000;

/** Lights out lands somewhere in this window after the fifth lamp. */
export const lightsOutMinHoldMs = 200;
export const lightsOutMaxHoldMs = 1500;

/** No throttle this long after lights out and the launch is graded slow. */
export const launchTimeoutMs = 2000;

/* ---- Flashes and toasts --------------------------------------------------- */

/** The launch-grade stamp: PERFECT LAUNCH, JUMP START… */
export const launchFlashMs = 1900;

/** The lap-crossing beat, and FINAL LAP. */
export const lapFlashMs = 1600;

/** An overtake toast. */
export const overtakeToastMs = 1500;

/**
 * The stuck warning stays quiet for this long, so a hard brake or a spin does
 * not flash it — only genuinely being beached does.
 */
export const stuckWarningAfterSeconds = 2.5;

/* ---- The finish ----------------------------------------------------------- */

/** The car holds on screen after the flag before the result rises. */
export const resultDelayMs = 900;

/** The result's sequenced reveal, and the XP figure's count-up within it. */
export const resultSequenceMs = 2400;

/* ---- The lobby ------------------------------------------------------------ */

/** The lobby deals itself in, block by block. */
export const lobbyHeroDelayMs = 80;
export const lobbyRecordDelayMs = 160;
export const lobbyCircuitDelayMs = 240;
export const lobbyLapsDelayMs = 300;
export const lobbyPlayDelayMs = 360;
export const lobbyLinksDelayMs = 420;

/** The circuit picker's card width and the gap between two of them. */
export const circuitCardWidthPx = 172;
export const circuitCardGapPx = 10;

/* ---- The canvas ----------------------------------------------------------- */

/** The player car's fixed screen row, as a fraction of the canvas height. */
export const cameraAnchorFraction = 0.68;

/** How far up the road the camera sizes itself to show, in metres. */
export const viewAheadMeters = 95;

/** The asphalt band's share of the canvas width. */
export const trackWidthFraction = 0.42;

/** The road is sampled every this many metres when it is drawn. */
export const roadSampleStep = 6;

/** How far behind the player the road is still drawn. */
export const roadBehindMeters = 60;

/** A spark's life, and how many a wall hit or a touch throws. */
export const sparkLifeSeconds = 0.45;
export const wallSparkCount = 18;
export const contactSparkCount = 8;

/**
 * The widest the race column grows before it stops. Beyond this a top-down
 * scroller is showing empty grass, not more race.
 */
export const raceColumnMaxPx = 560;

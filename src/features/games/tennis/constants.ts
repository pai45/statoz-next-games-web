/**
 * Tennis Rally's court geometry, presentation beats and control-pad measures.
 *
 * The court block is *gameplay* — it comes from `tennis_engine.dart` and the
 * simulation reads it directly. Everything below the divider is render-facing:
 * how long a sting stays up, how far a thumb travels. Changing a presentation
 * value must not change a single point scored.
 */

/* ---- Court, in metres ---------------------------------------------------- */

/** Half the singles court's width. Doubles alleys are not drawn or played. */
export const courtHalfWidth = 4.115;
export const courtHalfLength = 11.885;
export const serviceLine = 6.4;
export const netHeight = 0.914;
export const gravity = -9.8;

/** The simulation's fixed step. Never the frame time — see `tennis-game.ts`. */
export const stepSeconds = 1 / 120;

/** The largest wall-clock slice the engine will accept in one frame. */
export const maximumFrameSeconds = 1 / 30;

/* ---- The play column ----------------------------------------------------- */

/**
 * Flutter constrains the match stack to 520 logical pixels and locks portrait.
 * The renderer's fixed pixel sizes — an 18px net, a 3.4px ball — are tuned for
 * that range and are not scaled, so the column caps here rather than stretching
 * and quietly becoming a different game on a desktop monitor.
 */
export const playColumnMaxWidth = 520;

/* ======================================================================== */
/* Presentation                                                              */
/* ======================================================================== */

/* ---- Stings -------------------------------------------------------------- */

/** How long a sting holds before it fades. Majors get the longer beat. */
export const stingMajorSeconds = 1.35;
export const stingMinorSeconds = 0.85;

/** The crossfade between one sting and the next. */
export const stingSwitchMs = 150;

/* ---- Camera and court FX ------------------------------------------------- */

/** Decay rates per second for the three impulses the renderer reads. */
export const cameraPushDecay = 2.5;
export const netPulseDecay = 3.2;
export const linePulseDecay = 2.6;

/** How hard each event kicks the camera. Suppressed under reduced motion. */
export const cameraPushSmash = 1;
export const cameraPushWinner = 0.8;
export const cameraPushPerfect = 0.55;

/** Ball trail: how far apart samples must be, and how many are kept. */
export const trailSpacing = 0.34;
export const trailLength = 7;
export const trailLengthReducedMotion = 2;

/* ---- Serve meter --------------------------------------------------------- */

/**
 * Where the green band sits on the serve meter, as fractions of the track.
 *
 * Flutter positions it at `left: 122, width: 26` inside a 182px plate with 9px
 * of padding a side — a 164px track. Those pixels are converted here so the
 * band survives a change of plate width, and they straddle the 0.82 the serve's
 * accuracy formula actually rewards.
 */
export const serveBandStart = 122 / 164;
export const serveBandEnd = 148 / 164;

/**
 * The meter's plate.
 *
 * Flutter's is 182px and shrinks its two labels with a `FittedBox` to keep them
 * on one line each, at 8px and 7px — below the floor of this app's type scale.
 * The plate is widened instead so the smallest token fits without wrapping. The
 * band above is expressed as fractions precisely so this cannot move it off the
 * sweet spot.
 */
export const serveMeterWidth = 214;
export const serveMeterTrackHeight = 5;

/* ---- Control pads -------------------------------------------------------- */

/** Both pads are square at rest; `controlScale` stretches the width only. */
export const padSize = 128;

/** Movement: the thumb's travel limit, and what counts as a sprint flick. */
export const moveRadius = 46;
export const sprintFlickMs = 210;
export const sprintFlickDistance = 42;

/** Shot: the drag's travel limit, and the divisor that turns pixels into aim. */
export const shotDragLimit = 74;
export const shotAimDivisor = 58;

/** Gesture-label thresholds, in pad pixels. Mirrors `_ShotPainter._gestureLabel`. */
export const gestureDeadZone = 18;
export const gestureMinorRise = 16;
export const gestureMajorRise = 46;

/* ---- Lobby --------------------------------------------------------------- */

/** The lobby deals itself in: status strip, hero, stats, CTA, brief. */
export const lobbyEnterMs = 480;
export const lobbyHeroDelayMs = 80;
export const lobbyStatsDelayMs = 180;
export const lobbyPlayDelayMs = 390;
export const lobbyBriefDelayMs = 590;

/** The lobby emblem's idle breathing. */
export const emblemPulseMs = 2600;

/* ---- Overlays ------------------------------------------------------------ */

/** How long the match holds after the final point before the result appears. */
export const resultDelayMs = 700;

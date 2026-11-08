/**
 * How long the matchmaking beat runs.
 *
 * There is no queue and no server behind any of this: the rival was drawn the
 * moment the lobby's CTA was pressed. The search is theatre, and deliberately
 * so — it is what turns a solo game into a match — and these are the durations
 * Flutter's `GameMatchmakingView` and `GameKickoffCountdown` spend on it.
 */

/** The queue scan, from the first frame to the rival landing. */
export const searchMs = 2600;
/** How long the rival's banner takes to slide in. */
export const rivalRevealMs = 360;
/** The beat the locked rival is held on before the countdown. */
export const foundHoldMs = 700;
/** Under `prefers-reduced-motion` the whole scan collapses to this. */
export const reducedMotionHoldMs = 180;

/** One second a number, then the stamp holds while the game comes up. */
export const countdownTickMs = 1000;
export const goStampMs = 780;

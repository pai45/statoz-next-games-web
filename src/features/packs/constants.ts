/**
 * The reveal's timeline, in one place.
 *
 * Flutter chains eighteen AnimationControllers to walk these stages; on the web
 * each stage is a CSS animation of the same duration and the component only
 * needs to know when to swap what is mounted. Any value used by both the
 * component and its stylesheet is published as a custom property below, so the
 * two can never drift.
 */

/** Pack: slides in, breathes, then rattles itself apart. */
export const packEntryMs = 400;
export const packPulseMs = 400;
export const packShakeMs = 300;

/** The white-out. The pack becomes the card at its peak, so at half of this. */
export const flashMs = 150;

/** Card: flips face-up, overshoots, and settles. */
export const cardFlipMs = 600;
export const cardSettleMs = 450;

/** Effects that fire with the settle. */
export const confettiMs = 750;
export const shockwaveMs = 650;
export const rayBurstMs = 16000;
export const holoSweepMs = 2200;
export const ovrCountMs = 750;
export const ovrHoldMs = 1000;
export const ovrFadeMs = 260;

/** The rarity word dropping in over the card. */
export const rarityTitleMs = 300;
/** Platinum alone earns a shimmer across that word, twice. */
export const platinumShimmerMs = 800;
export const platinumShimmerCount = 2;

/**
 * A beat between the rarity word and the idle hover. Flutter spends it counting
 * the rating up on its built-in card face; that face is never used, but the
 * pause it created is part of the rhythm, so it stays.
 */
export const revealHoldMs = 500;

/** Idle: the card hovers until it is dismissed, or dismisses itself. */
export const idleLevitateMs = 2000;
export const idleAutoAdvanceMs = 1500;
export const dismissMs = 300;

/** How long the pack half of the sequence runs before the card takes over. */
export const packPhaseMs = packEntryMs + packPulseMs + packShakeMs + flashMs;

/** How long the card takes to arrive, settle, and name its rarity. */
export function cardPhaseMs(isPlatinum: boolean): number {
  return (
    cardFlipMs +
    cardSettleMs +
    rarityTitleMs +
    (isPlatinum ? platinumShimmerMs * platinumShimmerCount : 0) +
    revealHoldMs
  );
}

/* ---- Intro and summary ------------------------------------------------- */

/** The intro's title cascade, and how long it holds before handing over. */
export const introTitleMs = 1100;
export const introHoldMs = 3000;
export const introExitFlashMs = 380;
/** The mystery slots pop in from here, this far apart. */
export const slotStaggerStartMs = 720;
export const slotStaggerStepMs = 130;

/** The summary deals its cards in from here, this far apart. */
export const summaryStaggerStartMs = 80;
export const summaryStaggerStepMs = 120;
export const summaryCardMs = 420;

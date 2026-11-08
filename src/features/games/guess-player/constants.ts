/**
 * Guess The Player's fixed numbers, from `guess_player_cubit.dart` and the
 * screens that read it.
 *
 * The rules half — attempts, costs, deck size, schedule version — is the app's
 * and must not drift: the schedule version is hashed into the daily order, so
 * changing it deals every player a different puzzle today.
 */

/* ---- Rules ---------------------------------------------------------------- */

/** Free guesses a day starts with, and the length of the clue route. */
export const maxAttempts = 6;

/** Days the archive screen looks back over. */
export const archiveWindowDays = 30;

/** Coins one profile scan costs. Position and affiliation are priced alike. */
export const hintCost = 25;

/** Coins the single restored guess costs, once the six are spent. */
export const extraAttemptCost = 25;

/** The floor the deck is topped up to when the authored routes fall short. */
export const minimumDeckSize = 30;

/**
 * Salted into the schedule hash. The app bumps it to reshuffle the daily order
 * without renaming a puzzle, so it is part of the content, not a build detail.
 */
export const scheduleVersion = "career-intel-v2";

/** The date the daily rotation counts days from, in UTC, as the app does. */
export const scheduleEpochUtc = Date.UTC(2024, 0, 1);

/* ---- Presentation --------------------------------------------------------- */

/**
 * How long a transient note stays up — the duplicate-scan warning, and the
 * confirmation that a spoiler-free result reached the clipboard. Matched to the
 * `notice` keyframes in the stylesheet, which is where the motion lives.
 */
export const noticeMs = 2400;

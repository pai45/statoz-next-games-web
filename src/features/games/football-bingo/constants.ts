/**
 * Football Bingo's fixed numbers — the web port of the `kFootballBingo*`
 * constants in `models/football_bingo.dart`, plus the presentation beats the
 * screens animate on.
 */

/** Three by three: nine cells, three club axes each way. */
export const gridSize = 3;

/** Every daily grid opens with five lifelines. */
export const startingLifelines = 5;

/** What one more lifeline costs, in Oz Coins. */
export const lifelineCost = 25;

/** Authored days in a season. Day 201 starts the order again. */
export const campaignLength = 200;

/**
 * Bumped when the authored grids change in a way that invalidates saved
 * solutions. A stored archive on an older version starts a clean season rather
 * than attaching old answers to new data.
 */
export const contentVersion = 3;

/* ---- Presentation --------------------------------------------------------- */

/** The placed player's flight from the active plate into its cell. */
export const placementFlightMs = 560;

/** The beat after the flight lands, before the cell settles into its portrait. */
export const placementSettleMs = 60;

/** What the flight costs when the two rects cannot be measured. */
export const placementFallbackMs = 220;

/** How long the completion overlay holds before it reveals the summary. */
export const completionRevealMs = 1400;

/** And how long the summary holds before it returns on its own. */
export const completionSummaryMs = 1200;

/** The 0→9 count-up behind the completion overlay's solved tally. */
export const completionCountMs = 1200;

/** How long a "buy a lifeline" or "not enough coins" message stays up. */
export const messageMs = 1600;

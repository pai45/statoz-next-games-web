/**
 * The identity and chrome the shared matchmaking cinematic is configured with.
 *
 * Ported from Flutter's `GameMatchmakingConfig`. Every head-to-head mode fills
 * the same shape in, so the beat between "play" and the first ball is one
 * component rather than one per game.
 */

/** One side of the face-off: the player, or the rival the queue landed on. */
export type MatchmakingFighter = {
  name: string;
  /** Portrait path under `public/`, as {@link import("@statoz/design-system/games").Avatar} wants it. */
  avatar: string;
  /** The plate under the portrait — a level, a rating, a seed. */
  badge?: string;
  /** Banner accent. Defaults to the config's search accent for the player and its locked accent for the rival. */
  accent?: string;
};

export type GameMatchmakingConfig = {
  /** Header title, e.g. `5V5 FOOTBALL CHESS`. */
  title: string;
  /** The line under it. */
  subtitle?: string;
  /** Telemetry under the search bar, e.g. `SCANNING GLOBAL CHESS QUEUE`. */
  queueLabel?: string;
  /** Optional arena art under `public/`. Absent, the gradient bed carries the screen alone. */
  backgroundAsset?: string;
  player: MatchmakingFighter;
  opponent: MatchmakingFighter;
  /** Colour of the queue while it is still searching. */
  searchAccent?: string;
  /** Colour everything turns once the rival lands. */
  lockedAccent?: string;
};

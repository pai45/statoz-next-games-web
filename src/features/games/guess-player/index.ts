export { GuessPlayer } from "./components/guess-player";
export type { GuessPlayerProps } from "./components/guess-player";

/**
 * The mode's contribution to the profile, and the demo reset. The archive, the
 * deck, and every rule stay inside the module.
 */
export {
  archiveFor,
  guessPlayerStatsFrom,
  readGuessPlayerStore,
  resetGuessPlayer,
  useGuessPlayerStore,
  useGuessPlayerStats,
  type GuessPlayerStore,
  type GuessPlayerStats,
} from "./state/guess-player-store";

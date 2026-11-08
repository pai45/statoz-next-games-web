/**
 * The leaderboard feature's public API.
 *
 * The board itself, plus the fabricated field behind it — the friends arena
 * will rank the same rivals when it is built, and there must only ever be one
 * roster for them to agree on.
 */
export { LeaderboardScreen } from "./components/leaderboard-screen";
export { LeaderboardSearchScreen } from "./components/leaderboard-search-screen";

export { isPro, rivalRoster, rivalSeedByName } from "@/mocks/leaderboard";

export {
  isProSeed,
  resolveRival,
  rivalIsOnline,
  rivalLevelFor,
} from "./roster";

export type { LeaderboardEntry, RivalSeed } from "./types";
export type { LeaderboardLadder, LeaderboardPeriod, LeaderboardSelection, LeaderboardStanding } from "./types";

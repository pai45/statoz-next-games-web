import type {
  GameMode,
  LeaderboardType,
  ScoreMeta,
  MatchesBoard,
  TournamentScope,
} from "./types";

/**
 * How a board reads the field.
 *
 * Every rival has exactly one canonical XP; a board is a lens on it, never a
 * separate table of numbers. Keeping the arithmetic here — pure, with no store
 * or hook behind it — is what makes that checkable.
 */

export const leaderboardTypeOrder: LeaderboardType[] = ["games"];

export const matchesBoardOrder: MatchesBoard[] = ["players", "teams"];

export const tournamentScopeOrder: TournamentScope[] = [
  "weekly",
  "season",
  "allTime",
];

export function jsSafeHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 0x7fffffff;
  }
  return hash;
}

export function leagueAdjustedScore(base: number, leagueId: string): number {
  return base + (jsSafeHash(leagueId) % 700) - 320;
}

/** What the score column is measured in. */
export function scoreMetaFor(
  type: LeaderboardType,
  isTeamBoard: boolean,
): ScoreMeta {
  if (isTeamBoard) return { unit: "PTS" };
  return { unit: type === "games" ? "W" : "XP" };
}

/** A rival's canonical XP, read through the active board's lens. */
export function scoreFor(
  type: LeaderboardType,
  base: number,
  scope: TournamentScope,
  mode: GameMode,
  leagueId: string,
): number {
  switch (type) {
    case "matches":
      // A season is six weeks of play, and all-time is twenty-seven.
      return leagueAdjustedScore(scope === "weekly" ? base : scope === "season" ? base * 6 : base * 27, leagueId);
    case "games":
      // Wins, not XP — a rough win count with a nudge per mode.
      return Math.max(0, Math.round(base / 55) + (jsSafeHash(mode) % 9) - 4);
  }
}

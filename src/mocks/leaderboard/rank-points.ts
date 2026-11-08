import type { LeaderboardGameResult, LeaderboardParticipant } from "@/domain/leaderboard";
import { rivalRoster } from "./rivals";

export const leaderboardFixtureVersion = "rank-points-v1";

/** FNV-1a: stable across runtimes, without a mutable random source. */
export function leaderboardSeed(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  }
  return result >>> 0;
}

export const leaderboardParticipants: LeaderboardParticipant[] = rivalRoster.map((rival) => ({
  id: `rival:${rival.name.toLowerCase()}`,
  name: rival.name,
  xp: rival.base,
  badge: rival.badge,
}));

/** Sample RP is independent of profile XP and of other participants. */
export function demoGameResults(participantId: string, gameIds: readonly string[], periodId: string): LeaderboardGameResult[] {
  return gameIds.map((gameId) => {
    const seed = `${leaderboardFixtureVersion}|${participantId}|${gameId}|${periodId}`;
    const played = leaderboardSeed(`${seed}|played`) % 7 !== 0;
    return { gameId, rp: played ? 100 + leaderboardSeed(`${seed}|points`) % 901 : 0 };
  });
}

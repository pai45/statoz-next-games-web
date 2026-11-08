import type { LeaderboardGameResult, LeaderboardParticipant } from "@/domain/leaderboard";
import type { GameId } from "@/features/games/types";
import { demoGameResults } from "@/mocks/leaderboard/rank-points";
import { previousLeaderboardWindow, type LeaderboardWindow } from "./periods";
import type { LeaderboardContribution, LeaderboardSelection, LeaderboardStanding } from "./types";

export function bestFiveContributions(results: readonly LeaderboardGameResult[]): LeaderboardContribution[] {
  return results.filter((result) => result.rp > 0)
    .map((result) => ({ gameId: result.gameId as GameId, rp: Math.min(1000, Math.max(0, Math.round(result.rp))) }))
    .sort((a, b) => b.rp - a.rp || compareIds(a.gameId, b.gameId)).slice(0, 5);
}

function compareIds(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

export function rankStandings(entries: Omit<LeaderboardStanding, "rank" | "movement">[]): LeaderboardStanding[] {
  return [...entries].sort((a, b) => b.rp - a.rp || compareIds(a.id, b.id))
    .map((entry, index) => ({ ...entry, rank: index + 1, movement: null }));
}

export function buildLeaderboard({ participants, games, selection, window }: {
  participants: readonly LeaderboardParticipant[];
  games: readonly GameId[];
  selection: LeaderboardSelection;
  window: LeaderboardWindow;
}): LeaderboardStanding[] {
  function snapshot(periodId: string) {
    return rankStandings(participants.flatMap((participant) => {
      const results = demoGameResults(participant.id, games, periodId);
      const contributions = selection.ladder === "master"
        ? bestFiveContributions(results)
        : results.filter((result) => result.gameId === selection.ladder && result.rp > 0) as LeaderboardContribution[];
      const rp = contributions.reduce((sum, result) => sum + result.rp, 0);
      return rp > 0 ? [{ ...participant, rp, contributions, gamesPlayed: results.filter((result) => result.rp > 0).length }] : [];
    }));
  }
  const previous = new Map(snapshot(previousLeaderboardWindow(selection.period, window).id).map((entry) => [entry.id, entry.rank]));
  return snapshot(window.id).map((entry) => ({ ...entry, movement: previous.has(entry.id) ? previous.get(entry.id)! - entry.rank : null }));
}

export function searchStandings(entries: readonly LeaderboardStanding[], query: string): LeaderboardStanding[] {
  const normalized = query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  if (normalized.length < 2) return [];
  const words = normalized.split(" ");
  return entries.filter((entry) => words.every((word) => entry.name.toLocaleLowerCase().includes(word)));
}

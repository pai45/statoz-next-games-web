import { isGameEnabled } from "@/domain/demo-product";
import { gameRegistry, sportGameDecks } from "@/mocks/games";
import type { GameId } from "@/features/games/types";
import type { LeaderboardLadder } from "./types";

/** Use all active decks, including golf and archery, in stable catalog order. */
export const leaderboardGameIds = [...new Set(Object.values(sportGameDecks).flat())]
  .filter((id) => isGameEnabled(id) && Boolean(gameRegistry[id]));

export function isLeaderboardGame(id: string): id is GameId {
  return leaderboardGameIds.some((gameId) => gameId === id);
}

export function ladderTitle(ladder: LeaderboardLadder): string {
  return ladder === "master" ? "MASTER LEADERBOARD" : gameRegistry[ladder].title;
}

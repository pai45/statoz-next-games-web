import { isGameEnabled } from "@/domain/demo-product";
import { gameRegistry } from "@/mocks/games/game-registry";
import type { GameId } from "../types";

export type RecentGame = { gameId: GameId; lastPlayedAt: number };
export const homeRecentsKey = "statoz.next.games-web.home-recents.v1";
export const recentGameLimit = 12;

export function isHomeGame(id: unknown): id is GameId {
  return typeof id === "string" && Object.hasOwn(gameRegistry, id) && isGameEnabled(id);
}

export function parseHomeRecents(raw: string | null): RecentGame[] {
  try {
    const record: unknown = JSON.parse(raw ?? "null");
    if (!record || typeof record !== "object" || !("version" in record) || record.version !== 1 || !("entries" in record) || !Array.isArray(record.entries)) return [];
    const valid = record.entries.filter((entry): entry is RecentGame => Boolean(entry && typeof entry === "object" && isHomeGame(entry.gameId) && typeof entry.lastPlayedAt === "number" && Number.isFinite(entry.lastPlayedAt) && entry.lastPlayedAt > 0));
    const seen = new Set<GameId>();
    return valid.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt).filter(entry => {
      if (seen.has(entry.gameId)) return false;
      seen.add(entry.gameId);
      return true;
    }).slice(0, recentGameLimit);
  } catch { return []; }
}

export function withRecentGame(entries: readonly RecentGame[], gameId: unknown, now: number): RecentGame[] {
  if (!isHomeGame(gameId) || !Number.isFinite(now) || now <= 0) return [...entries];
  return parseHomeRecents(JSON.stringify({ version: 1, entries: [{ gameId, lastPlayedAt: now }, ...entries.filter(entry => entry.gameId !== gameId)] }));
}

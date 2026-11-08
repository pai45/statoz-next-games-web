import { isLeaderboardGame } from "./catalog";
import type { LeaderboardSelection } from "./types";

export function parseLeaderboardSelection(params: Pick<URLSearchParams, "get">): LeaderboardSelection {
  const candidate = params.get("ladder") ?? params.get("mode") ?? "master";
  const period = params.get("period") ?? params.get("scope");
  return {
    ladder: isLeaderboardGame(candidate) ? candidate : "master",
    period: period === "season" || period === "allTime" ? "season" : "weekly",
  };
}

export function leaderboardHref(selection: LeaderboardSelection, search = false): string {
  const params = new URLSearchParams({ ladder: selection.ladder, period: selection.period });
  return `/leaderboard${search ? "/search" : ""}?${params}`;
}

/** Read the old search returnTo only as an internal leaderboard URL. */
export function searchBoardSelection(params: URLSearchParams): LeaderboardSelection {
  const returnTo = params.get("returnTo");
  if (!params.has("ladder") && returnTo) {
    try {
      const url = new URL(returnTo, "https://leaderboard.local");
      if (url.origin === "https://leaderboard.local" && /^\/leaderboard\/?$/.test(url.pathname)) {
        return parseLeaderboardSelection(url.searchParams);
      }
    } catch { /* A malformed legacy return URL is just a default selection. */ }
  }
  return parseLeaderboardSelection(params);
}

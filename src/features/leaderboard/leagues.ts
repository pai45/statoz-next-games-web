import type { Sport } from "@/domain/sports";

export type LeaderboardLeague = { id: string; label: string };

export const leaderboardLeagues: Record<Sport, LeaderboardLeague[]> = {
  football: [{ id: "epl", label: "PREMIER LEAGUE" }, { id: "laliga", label: "LALIGA" }, { id: "serie-a", label: "SERIE A" }, { id: "bundesliga", label: "BUNDESLIGA" }],
  cricket: [{ id: "ipl", label: "IPL" }, { id: "t20i", label: "T20I" }, { id: "bbl", label: "BIG BASH" }],
  basketball: [{ id: "nba", label: "NBA" }, { id: "euroleague", label: "EUROLEAGUE" }, { id: "wnba", label: "WNBA" }],
  motorsport: [{ id: "f1", label: "FORMULA 1" }, { id: "f2", label: "FORMULA 2" }, { id: "nascar", label: "NASCAR" }, { id: "indy", label: "INDYCAR" }],
  tennis: [{ id: "atp", label: "ATP" }, { id: "wta", label: "WTA" }],
};

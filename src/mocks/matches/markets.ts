import type { PickMarket } from "@/domain/predictions";

/**
 * Curated prediction markets shown with the sport match fixtures.
 *
 * Every outcome names its colour: a side wears its own, a draw or a catch-all
 * takes slate, and a yes/no pair reads green against red. The pick cards fill
 * their outcome badges with it.
 */
export const trendingMarkets: PickMarket[] = [
  { id: "fifa_2026_winner", sport: "football", leagueLabel: "WORLD CUP", question: "Who lifts the 2026 World Cup?", outcomes: [{ id: "bra", label: "Brazil", probabilityPercent: 24, delta: 3, color: "#facc15" }, { id: "fra", label: "France", probabilityPercent: 21, delta: -2, color: "#1d4ed8" }, { id: "eng", label: "England", probabilityPercent: 15, delta: 1, color: "#ffffff" }, { id: "arg", label: "Argentina", probabilityPercent: 14, delta: -1, color: "#74acdf" }], volumeOz: 412000, resolved: false },
  { id: "epl_liv_mc_winner", sport: "football", leagueLabel: "EPL", question: "Liverpool vs Man City result", outcomes: [{ id: "liv", label: "Liverpool", probabilityPercent: 41, delta: 7, color: "#c8102e" }, { id: "draw", label: "Draw", probabilityPercent: 27, delta: -3, color: "#64748b" }, { id: "mci", label: "Man City", probabilityPercent: 32, delta: -4, color: "#6cabdd" }], volumeOz: 96500, resolved: false },
  { id: "ipl_2026_winner", sport: "cricket", leagueLabel: "IPL", question: "Which side takes the 2026 IPL title?", outcomes: [{ id: "csk", label: "Chennai", probabilityPercent: 28, delta: 2, color: "#ffd400" }, { id: "mi", label: "Mumbai", probabilityPercent: 23, delta: -1, color: "#2856a5" }, { id: "rcb", label: "Bengaluru", probabilityPercent: 19, delta: 4, color: "#d81920" }], volumeOz: 238000, resolved: false },
  { id: "ipl_sixes_over_12_5", sport: "cricket", leagueLabel: "IPL", question: "Over 12.5 sixes in tonight's innings?", outcomes: [{ id: "over", label: "Over", probabilityPercent: 58, delta: 6, color: "#36b86a" }, { id: "under", label: "Under", probabilityPercent: 42, delta: -6, color: "#ff332e" }], volumeOz: 44700, resolved: false },
  { id: "epl_mu_over_1_5", sport: "football", leagueLabel: "EPL", question: "Man United to score over 1.5 goals?", outcomes: [{ id: "over", label: "Over", probabilityPercent: 47, delta: -2, color: "#36b86a" }, { id: "under", label: "Under", probabilityPercent: 53, delta: 2, color: "#ff332e" }], volumeOz: 29100, resolved: false },
  { id: "f1_belgian_gp_winner", sport: "motorsport", leagueLabel: "BELGIAN GP", question: "Who wins at Spa?", outcomes: [{ id: "ver", label: "Verstappen", probabilityPercent: 36, delta: 1, color: "#3671c6" }, { id: "nor", label: "Norris", probabilityPercent: 29, delta: 5, color: "#ff8000" }, { id: "lec", label: "Leclerc", probabilityPercent: 18, delta: -3, color: "#e8002d" }], volumeOz: 153000, resolved: false },
];

export function marketById(id: string): PickMarket | undefined { return trendingMarkets.find((market) => market.id === id); }

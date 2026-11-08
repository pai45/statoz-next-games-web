import type { DetailConfig } from "./shared";

export const footballDetail: DetailConfig = {
  lineup: {
    formation: "4-3-3",
    roles: ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "AM", "LW", "ST"],
  },
  statLabels: ["POSSESSION", "SHOTS", "ON TARGET", "PASSES"],
  scoreRows: (match, seed) => [
    {
      label: "FIRST HALF",
      home: match.homeScore == null ? "—" : String(match.homeScore),
      away: match.awayScore == null ? "—" : String(match.awayScore),
    },
    {
      label: "SHOTS",
      home: String(7 + (seed % 7)),
      away: String(5 + ((seed >> 2) % 7)),
    },
    {
      label: "CORNERS",
      home: String(2 + (seed % 5)),
      away: String(1 + ((seed >> 3) % 5)),
    },
  ],
};

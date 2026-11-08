import type { DetailConfig } from "./shared";
export const cricketDetail: DetailConfig = {
  lineup: { formation: "PLAYING XI", roles: ["BAT", "BAT", "AR", "WK", "AR", "BWL", "BWL", "BWL", "BWL", "BWL", "BWL"] },
  statLabels: ["RUN RATE", "BOUNDARIES", "WICKETS", "DOT BALLS"],
  scoreRows: (match) => [{ label: "POWERPLAY", home: "52/1", away: "46/2" }, { label: "OVERS", home: "20.0", away: match.status === "live" ? "17.2" : "20.0" }, { label: "RUN RATE", home: "8.25", away: "7.40" }],
};

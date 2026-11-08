import type { DetailConfig } from "./shared";
export const tennisDetail: DetailConfig = {
  lineup: { formation: "STARTING FIVE", roles: ["STARTER", "STARTER", "STARTER", "STARTER", "STARTER"] },
  statLabels: ["ACES", "WINNERS", "BREAK POINTS", "1ST SERVE"],
  scoreRows: (match) => [{ label: "SET 1", home: "6", away: "4" }, { label: "SET 2", home: "3", away: "6" }, { label: "SET 3", home: match.status === "live" ? "4" : "6", away: match.status === "live" ? "4" : "2" }],
};

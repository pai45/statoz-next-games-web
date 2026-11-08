import type { DetailConfig } from "./shared";
export const motorsportDetail: DetailConfig = {
  lineup: { formation: "STARTING FIVE", roles: ["STARTER", "STARTER", "STARTER", "STARTER", "STARTER"] },
  statLabels: ["TOP SPEED", "LAPS", "PIT STOPS", "TYRE STINT"], motorsport: true,
  scoreRows: (match) => [{ label: "RACE", home: match.status === "scheduled" ? "PENDING" : "P1", away: match.status === "scheduled" ? "PENDING" : "P2" }, { label: "LAPS", home: "44", away: "44" }, { label: "GAP", home: "â€”", away: "+2.184" }],
  sessions: [{ label: "PRACTICE 1", results: ["1. Verstappen  1:12.844", "2. Norris  +0.184", "3. Leclerc  +0.316"] }, { label: "QUALIFYING", results: ["P1 Verstappen", "P2 Norris", "P3 Leclerc"] }],
  driverStandings: ["Verstappen · 251", "Norris · 221", "Leclerc · 188", "Piastri · 176"],
};

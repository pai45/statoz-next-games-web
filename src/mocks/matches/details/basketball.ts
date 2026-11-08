import type { DetailConfig } from "./shared";
export const basketballDetail: DetailConfig = {
  lineup: { formation: "STARTING FIVE", roles: ["STARTER", "STARTER", "STARTER", "STARTER", "STARTER"] },
  statLabels: ["FIELD GOALS", "3 POINTS", "REBOUNDS", "ASSISTS"],
  scoreRows: (_match, seed) => [{ label: "Q1", home: "24", away: "19" }, { label: "Q2", home: "21", away: "25" }, { label: "Q3", home: String(18 + (seed % 10)), away: String(19 + ((seed >> 2) % 10)) }, { label: "Q4", home: "—", away: "—" }],
};

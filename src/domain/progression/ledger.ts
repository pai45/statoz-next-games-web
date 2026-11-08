import type { ProgressTrack } from "./track";

export type XpTransactionType = "earn" | "loss" | "openingBalance";

export type XpTransactionSource =
  | "openingBalance"
  | "match"
  | "shootout"
  | "prediction"
  | "pack"
  | "dailyDrop"
  | "streakReward"
  | "cardUnlock"
  | "quiz"
  | "footballChess"
  | "grandPrix"
  | "superOver"
  | "basketball"
  | "tennis"
  | "finalOver"
  | "guessPlayer"
  | "bingo";

export type XpLedgerEntry = {
  id: string;
  timestamp: string;
  delta: number;
  balanceAfter: number;
  type: XpTransactionType;
  source: XpTransactionSource;
  track: ProgressTrack;
  title: string;
  details?: string;
};

export type XpChartRange = "all" | "week" | "day";
export type XpHistoryFilter =
  | "all"
  | "earned"
  | "lost"
  | "games"
  | "predictions"
  | "rewards";

const gameSources = new Set<XpTransactionSource>([
  "match",
  "shootout",
  "quiz",
  "footballChess",
  "superOver",
  "basketball",
  "tennis",
  "grandPrix",
  "finalOver",
  "guessPlayer",
  "bingo",
]);

const rewardSources = new Set<XpTransactionSource>([
  "pack",
  "dailyDrop",
  "streakReward",
  "cardUnlock",
]);

/** The Flutter XP-history category rules, kept pure for filtering and counts. */
export function matchesXpFilter(
  entry: XpLedgerEntry,
  filter: XpHistoryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "earned":
      return entry.delta > 0 && entry.type !== "openingBalance";
    case "lost":
      return entry.delta < 0;
    case "games":
      return gameSources.has(entry.source);
    case "predictions":
      return entry.source === "prediction";
    case "rewards":
      return rewardSources.has(entry.source);
  }
}

/**
 * Narrows chart activity relative to the most recent ledger row, exactly like
 * the app. Sparse ranges retain the latest two points so the graph stays legible.
 */
export function xpLedgerForRange(
  ledger: XpLedgerEntry[],
  range: XpChartRange,
): XpLedgerEntry[] {
  const sorted = [...ledger].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  if (sorted.length === 0 || range === "all") return sorted;

  const anchor = Date.parse(sorted.at(-1)?.timestamp ?? "");
  const duration = range === "week" ? 7 * 86_400_000 : 86_400_000;
  const cutoff = anchor - duration;
  const filtered = sorted.filter(
    (entry) => Date.parse(entry.timestamp) >= cutoff,
  );
  if (filtered.length >= 2) return filtered;
  if (sorted.length <= 2) return sorted;
  return sorted.slice(-2);
}

export function xpBalanceValues(
  totalXp: number,
  ledger: XpLedgerEntry[],
): number[] {
  if (ledger.length === 0) return [totalXp];
  return [...ledger]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((entry) => entry.balanceAfter);
}

export function selectedXpChartIndex(
  selectedIndex: number | null,
  pointCount: number,
): number {
  if (pointCount <= 0) return 0;
  if (selectedIndex === null) return pointCount - 1;
  return Math.min(Math.max(selectedIndex, 0), pointCount - 1);
}

export function xpChartIndexForDx(
  dx: number,
  width: number,
  pointCount: number,
): number {
  if (pointCount <= 1 || width <= 0) return 0;
  const percent = Math.min(Math.max(dx / width, 0), 1);
  return Math.round(percent * (pointCount - 1));
}

import type { Sport } from "../sports";

export type PickMarketType = "match" | "event" | "future";
export type PickMarketStatus = "upcoming" | "live" | "closed" | "unresolved" | "settled" | "voided";
export type PickPositionStatus = "pending" | "live" | "unresolved" | "settleable" | "won" | "lost" | "voided";

export type PickOutcome = {
  id: string;
  label: string;
  /** Implied probability and one-share price, 1..99 Oz. */
  probabilityPercent: number;
  /** Outcome/team identity is data, not a design-system token. */
  color?: string;
  /** Change in percentage points since the previous tick. */
  delta?: number;
};

export type PickPricePoint = { at: string; percentsByOutcome: Record<string, number> };

export type PickMarket = {
  id: string;
  sport: Sport;
  leagueId?: string;
  leagueLabel: string;
  question: string;
  type?: PickMarketType;
  status?: PickMarketStatus;
  outcomes: PickOutcome[];
  volumeOz: number;
  closesAt?: string;
  priceHistory?: PickPricePoint[];
  matchId?: string;
  contextTitle?: string;
  contextSubtitle?: string;
  homeLabel?: string;
  awayLabel?: string;
  homeScore?: string;
  awayScore?: string;
  liveLabel?: string;
  resultNote?: string;
  resolvedOutcomeId?: string;
  voidReason?: string;
  /** Compatibility field for existing trending surfaces. */
  resolved: boolean;
};

export type PickPosition = {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketType: PickMarketType;
  leagueLabel: string;
  outcomeId: string;
  outcomeLabel: string;
  stakeOz: number;
  shareCount: number;
  averageProbabilityPercent: number;
  submittedAt: string;
  status: PickPositionStatus;
  resolvedAt?: string;
  payoutOz: number;
  resultNote?: string;
};

export function isValidProbability(probabilityPercent: number): boolean {
  return Number.isInteger(probabilityPercent) && probabilityPercent >= 1 && probabilityPercent <= 99;
}

export function isValidStake(input: { stakeOz: number; probabilityPercent: number; balanceOz: number }): boolean {
  return Number.isInteger(input.stakeOz) && input.stakeOz > 0 && input.stakeOz <= input.balanceOz &&
    isValidProbability(input.probabilityPercent) && input.stakeOz % input.probabilityPercent === 0;
}

export function sharesForStake(stakeOz: number, probabilityPercent: number): number {
  return isValidProbability(probabilityPercent) && stakeOz > 0 && stakeOz % probabilityPercent === 0
    ? Math.floor(stakeOz / probabilityPercent) : 0;
}

export function payoutForShares(shares: number): number {
  return Math.max(0, Math.floor(shares)) * 100;
}

export function positionMaxPayout(position: PickPosition): number { return payoutForShares(position.shareCount); }
export function positionIsFinal(position: PickPosition): boolean {
  return position.status === "won" || position.status === "lost" || position.status === "voided";
}
export function marketCanBuy(market: PickMarket): boolean { return market.status === "upcoming" || market.status === "live"; }
export function marketResultKnown(market: PickMarket): boolean { return market.status === "settled" || market.status === "voided"; }
export function outcomeFor(market: PickMarket, outcomeId: string): PickOutcome | undefined {
  return market.outcomes.find((outcome) => outcome.id === outcomeId);
}
export function leadingOutcome(market: PickMarket): PickOutcome {
  return market.outcomes.reduce((leader, outcome) => outcome.probabilityPercent > leader.probabilityPercent ? outcome : leader);
}
export function latestDeltaFor(market: PickMarket, outcomeId: string): number | undefined {
  if (market.priceHistory && market.priceHistory.length >= 2) {
    const latest = market.priceHistory.at(-1)?.percentsByOutcome[outcomeId];
    const previous = market.priceHistory.at(-2)?.percentsByOutcome[outcomeId];
    if (latest !== undefined && previous !== undefined) return latest - previous;
  }
  return outcomeFor(market, outcomeId)?.delta;
}

export const HOT_DELTA_THRESHOLD = 5;
export function isHot(market: PickMarket): boolean {
  const delta = latestDeltaFor(market, leadingOutcome(market).id);
  return delta !== undefined && Math.abs(delta) >= HOT_DELTA_THRESHOLD && !market.resolved;
}

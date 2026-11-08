import type { Sport } from "@/domain/sports";

export type EconomyItemKind =
  | "playerCard"
  | "actionCard"
  | "avatar"
  | "banner"
  | "frame"
  | "kit"
  | "jersey"
  | "livery";

export type EconomyTransactionKind =
  | "openingBalance"
  | "reward"
  | "purchase"
  | "topUp"
  | "grant";

export type EconomyTransaction = {
  id: string;
  at: string;
  kind: EconomyTransactionKind;
  delta: number;
  balanceAfter: number;
  title: string;
  subtitle?: string;
};

export type StarterClaim = {
  claimedAt: string;
  playerCardIds: string[];
  actionCardIds: string[];
};

export type EconomyOwned = {
  playerCardIds: string[];
  actionCardIds: string[];
  avatarIds: string[];
  bannerIds: string[];
  frameIds: string[];
  kitIds: string[];
  jerseyIds: string[];
  liveryIds: string[];
};

export type EconomySnapshot = {
  version: 1;
  coins: number;
  owned: EconomyOwned;
  equipped: {
    avatarId: string;
    bannerId: string;
    frameId: string | null;
    kitId: string;
    jerseyId: string;
    liveryId: string | null;
  };
  starterClaims: Partial<Record<Sport, StarterClaim>>;
  dailyDropLastClaimedAt: number | null;
  transactions: EconomyTransaction[];
  settledRewardIds: string[];
};

export type PurchaseResult =
  | { ok: true; snapshot: EconomySnapshot }
  | { ok: false; reason: "owned" | "insufficient"; snapshot: EconomySnapshot };

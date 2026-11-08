import type { CardTier } from "@/domain/cards";
import type { PackRevealItem } from "@/features/packs";

export const streakActivities = [
  "predict",
  "pick",
  "pitchDuel",
  "penaltyShootout",
  "guessPlayer",
] as const;

export type StreakActivity = (typeof streakActivities)[number];

export const streakCategories = [
  "overall",
  "predict",
  "pick",
  "games",
  "pitchDuel",
  "penaltyShootout",
] as const;

export type StreakCategory = (typeof streakCategories)[number];

export type StreakCelebration =
  | {
      id: string;
      kind: "daily";
      date: string;
      streak: number;
      activity: StreakActivity;
    }
  | {
      id: string;
      kind: "milestone";
      days: number;
    };

export type StreakSnapshot = {
  version: 1;
  activeDays: Record<StreakCategory, string[]>;
  activities: Record<string, StreakActivity[]>;
  claimedMilestones: number[];
  announcedMilestones: number[];
  celebrationQueue: StreakCelebration[];
};

export type StreakMilestoneReward =
  | { kind: "coins"; coins: number }
  | { kind: "card"; tier: Extract<CardTier, "gold" | "platinum"> }
  | {
      kind: "pack";
      tier: Extract<CardTier, "gold" | "platinum">;
      playerCards: number;
      actionCards: number;
      odds: Record<CardTier, number>;
    };

export type StreakMilestone = {
  days: number;
  title: string;
  rewardLabel: string;
  reward: StreakMilestoneReward;
};

export type StreakRecordResult =
  | { ok: true; changed: boolean; snapshot: StreakSnapshot }
  | { ok: false; reason: "future" | "invalid-date"; snapshot: StreakSnapshot };

export type StreakClaimResult =
  | { ok: false; reason: "locked" | "claimed" | "busy" }
  | { ok: true; kind: "coins"; coins: number; label: string }
  | { ok: true; kind: "cards"; items: PackRevealItem[]; label: string };


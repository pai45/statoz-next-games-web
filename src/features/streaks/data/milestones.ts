import type { StreakMilestone } from "../types";

export const streakMilestones: readonly StreakMilestone[] = [
  {
    days: 7,
    title: "ONE WEEK ON FIRE",
    rewardLabel: "250 OZ COINS",
    reward: { kind: "coins", coins: 250 },
  },
  {
    days: 25,
    title: "STREAK SPECIALIST",
    rewardLabel: "750 OZ COINS",
    reward: { kind: "coins", coins: 750 },
  },
  {
    days: 50,
    title: "FIFTY STRONG",
    rewardLabel: "GOLD CARD",
    reward: { kind: "card", tier: "gold" },
  },
  {
    days: 100,
    title: "CENTURY CLUB",
    rewardLabel: "PLATINUM CARD",
    reward: { kind: "card", tier: "platinum" },
  },
  {
    days: 250,
    title: "RELENTLESS",
    rewardLabel: "GOLD PACK",
    reward: {
      kind: "pack",
      tier: "gold",
      playerCards: 2,
      actionCards: 2,
      odds: { bronze: 35, silver: 45, gold: 16, platinum: 4 },
    },
  },
  {
    days: 365,
    title: "YEAR OF FIRE",
    rewardLabel: "ELITE PACK",
    reward: {
      kind: "pack",
      tier: "platinum",
      playerCards: 2,
      actionCards: 3,
      odds: { bronze: 10, silver: 40, gold: 35, platinum: 15 },
    },
  },
] as const;

export function streakMilestoneFor(days: number): StreakMilestone | undefined {
  return streakMilestones.find((milestone) => milestone.days === days);
}


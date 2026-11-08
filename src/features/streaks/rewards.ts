"use client";

import { playerRoleSports, type ActionCard, type CardTier, type PlayerCard } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import { grantCards, readEconomy, settleCoinReward } from "@/features/economy";
import {
  allActionCards,
  allPlayerCards,
  rollFrom,
  type PackRevealItem,
} from "@/features/packs";

import { streakMilestoneFor } from "./data/milestones";
import { markStreakMilestoneClaimed, readStreakSnapshot } from "./state/streak-store";
import type { StreakClaimResult, StreakMilestoneReward } from "./types";

const claimsInFlight = new Set<number>();

function drawMany<T>(
  pool: T[],
  count: number,
  tierOf: (item: T) => CardTier,
  odds: Record<CardTier, number>,
): T[] {
  const available = [...pool];
  const result: T[] = [];
  while (result.length < count && available.length) {
    const card = rollFrom(available, tierOf, odds, Math.random);
    if (!card) break;
    result.push(card);
    available.splice(available.indexOf(card), 1);
  }
  return result;
}

function grant(items: PackRevealItem[], days: number, label: string): void {
  grantCards({
    id: `streak:${days}`,
    playerCardIds: items.filter((item) => item.kind === "player").map((item) => item.card.id),
    actionCardIds: items.filter((item) => item.kind === "action").map((item) => item.card.id),
    title: `STREAK REWARD · ${label}`,
  });
}

function singleCardReward(
  tier: Extract<CardTier, "gold" | "platinum">,
  sport: Sport,
  days: number,
  label: string,
): StreakClaimResult {
  const owned = readEconomy().owned;
  const players = allPlayerCards.filter(
    (card) => playerRoleSports[card.role] === sport && card.tier === tier && !owned.playerCardIds.includes(card.id),
  );
  const actions = allActionCards.filter(
    (card) => card.tier === tier && !owned.actionCardIds.includes(card.id),
  );
  const choices: PackRevealItem[] = [
    ...players.map((card): PackRevealItem => ({ kind: "player", card })),
    ...actions.map((card): PackRevealItem => ({ kind: "action", card })),
  ];
  if (!choices.length) {
    const coins = tier === "gold" ? 500 : 1500;
    settleCoinReward({
      id: `streak:${days}:exhausted-refund`,
      coins,
      title: "STREAK CARD REFUND",
      subtitle: `${label} pool already owned`,
    });
    return { ok: true, kind: "coins", coins, label: `${coins.toLocaleString()} OZ COINS` };
  }
  const item = choices[Math.floor(Math.random() * choices.length)];
  grant([item], days, label);
  return { ok: true, kind: "cards", items: [item], label };
}

function packReward(
  reward: Extract<StreakMilestoneReward, { kind: "pack" }>,
  sport: Sport,
  days: number,
  label: string,
): StreakClaimResult {
  const playerPool = allPlayerCards.filter((card) => playerRoleSports[card.role] === sport);
  const players = drawMany<PlayerCard>(playerPool, reward.playerCards, (card) => card.tier, reward.odds);
  const actions = drawMany<ActionCard>(allActionCards, reward.actionCards, (card) => card.tier, reward.odds);
  const items: PackRevealItem[] = [
    ...players.map((card) => ({ kind: "player" as const, card })),
    ...actions.map((card) => ({ kind: "action" as const, card })),
  ];
  grant(items, days, label);
  return { ok: true, kind: "cards", items, label };
}

export function claimStreakMilestone(days: number, primarySport: Sport): StreakClaimResult {
  if (claimsInFlight.has(days)) return { ok: false, reason: "busy" };
  const snapshot = readStreakSnapshot();
  if (snapshot.claimedMilestones.includes(days)) return { ok: false, reason: "claimed" };
  if (!snapshot.announcedMilestones.includes(days)) return { ok: false, reason: "locked" };
  const milestone = streakMilestoneFor(days);
  if (!milestone) return { ok: false, reason: "locked" };

  claimsInFlight.add(days);
  try {
    let result: StreakClaimResult;
    if (milestone.reward.kind === "coins") {
      settleCoinReward({
        id: `streak:${days}`,
        coins: milestone.reward.coins,
        title: "STREAK MILESTONE",
        subtitle: `${days} DAYS`,
      });
      result = { ok: true, kind: "coins", coins: milestone.reward.coins, label: milestone.rewardLabel };
    } else if (milestone.reward.kind === "card") {
      result = singleCardReward(milestone.reward.tier, primarySport, days, milestone.rewardLabel);
    } else {
      result = packReward(milestone.reward, primarySport, days, milestone.rewardLabel);
    }
    if (result.ok) markStreakMilestoneClaimed(days);
    return result;
  } finally {
    claimsInFlight.delete(days);
  }
}


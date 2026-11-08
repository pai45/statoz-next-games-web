import {
  cardTiers,
  type ActionCard,
  type CardTier,
  type PlayerCard,
} from "@/domain/cards";

import {
  actionCards as defaultActionCards,
  attackActionCards,
  defenseActionCards,
} from "@/mocks/packs";
import { attackers, basketballPlayerCards, cricketBattingCards, defenders, goalkeepers, racingPlayerCards, tennisPlayerCards } from "@/mocks/packs";
import { starterPackActions, starterPackPlayers } from "./types";
import type { PackResult, StarterPack } from "./types";

/**
 * A source of randomness in `[0, 1)`. Flutter takes a `Random`; taking the
 * function instead lets a caller pass a seeded generator and get a reproducible
 * pack, which is what makes the weighting testable at all.
 */
export type RandomSource = () => number;

/** Relative drop weights for the starter pack — 55 : 35 : 4 : 1. */
export const starterPackTierWeights: Record<CardTier, number> = {
  bronze: 55,
  silver: 35,
  gold: 4,
  platinum: 1,
};

const totalTierWeight = Object.values(starterPackTierWeights).reduce(
  (sum, weight) => sum + weight,
  0,
);

/** Probability a single roll lands on this tier. */
export function starterDropChance(tier: CardTier): number {
  return starterPackTierWeights[tier] / totalTierWeight;
}

/**
 * Tiers in descending drop order. `rollPackRarity` walks this list, so the rare
 * tiers are tested first and the common one absorbs any floating-point slack.
 */
const tiersByDropOrder: CardTier[] = ["platinum", "gold", "silver", "bronze"];

/** Where a player's overall sits on the pack's tier scale. */
export function packRarityForRating(rating: number): CardTier {
  if (rating >= 90) return "platinum";
  if (rating >= 86) return "gold";
  if (rating >= 80) return "silver";
  return "bronze";
}

/** Where an action's power sits on the same scale. */
export function packRarityForPower(power: number): CardTier {
  if (power >= 22) return "platinum";
  if (power >= 16) return "gold";
  if (power >= 10) return "silver";
  return "bronze";
}

export function packRarityOfPlayer(card: PlayerCard): CardTier {
  return packRarityForRating(card.rating);
}

export function packRarityOfAction(card: ActionCard): CardTier {
  return packRarityForPower(card.power);
}

/** Rolls a target tier on the 55 / 35 / 4 / 1 weighting. */
export function rollPackRarity(random: RandomSource = Math.random): CardTier {
  const roll = random();
  let cumulative = 0;
  for (const tier of tiersByDropOrder) {
    cumulative += starterDropChance(tier);
    if (roll < cumulative) return tier;
  }
  return "bronze";
}

/**
 * Draws one card from `pool` matching a fresh rarity roll, skipping anything
 * already in `taken`.
 *
 * When nothing of the rolled tier is left it falls back to the nearest tier by
 * ordinal distance, so a draw never fails while any card remains — without it a
 * 1% platinum roll against an exhausted platinum shelf would throw.
 */
function drawByRarity<T>(
  pool: T[],
  rarityOf: (card: T) => CardTier,
  taken: Set<T>,
  random: RandomSource,
): T {
  const available = pool.filter((card) => !taken.has(card));
  if (available.length === 0) {
    throw new Error("Starter pack draw failed: pool exhausted.");
  }

  const target = cardTiers.indexOf(rollPackRarity(random));
  const distance = (card: T) =>
    Math.abs(cardTiers.indexOf(rarityOf(card)) - target);
  const nearest = Math.min(...available.map(distance));
  const candidates = available.filter((card) => distance(card) === nearest);

  const pick = candidates[Math.floor(random() * candidates.length)];
  taken.add(pick);
  return pick;
}

export const starterPackStrikerCount = 2;
export const starterPackDefenderCount = 2;
export const starterPackKeeperCount = 1;
/** A freshly rolled `StarterPack` defaults to five actions… */
export const starterPackActionCount = 5;
/** …but the deck format requires six, so the football pack overrides it. */
export const starterDeckActionCount = 6;
export const cricketStarterCardCount = 5;
export const basketballStarterCardCount = 3;
export const tennisStarterCardCount = 1;
export const grandPrixStarterCardCount = 1;

export type RollStarterPackOptions = {
  strikerPool: PlayerCard[];
  defenderPool: PlayerCard[];
  keeperPool: PlayerCard[];
  attackActionPool: ActionCard[];
  defenseActionPool: ActionCard[];
  actionCount?: number;
  random?: RandomSource;
};

/**
 * Rolls a starter pack from the supplied pools.
 *
 * Every card goes through `rollPackRarity`, and no card repeats inside a pack.
 * The actions split as evenly as the count allows; an odd remainder goes to a
 * random side, so a five-action pack is 3 + 2 or 2 + 3 rather than always the
 * same shape.
 */
export function rollStarterPack({
  strikerPool,
  defenderPool,
  keeperPool,
  attackActionPool,
  defenseActionPool,
  actionCount = starterPackActionCount,
  random = Math.random,
}: RollStarterPackOptions): StarterPack {
  const takenPlayers = new Set<PlayerCard>();
  const takenActions = new Set<ActionCard>();

  const drawPlayer = (pool: PlayerCard[]) =>
    drawByRarity(pool, packRarityOfPlayer, takenPlayers, random);
  const drawAction = (pool: ActionCard[]) =>
    drawByRarity(pool, packRarityOfAction, takenActions, random);

  const strikers = Array.from({ length: starterPackStrikerCount }, () =>
    drawPlayer(strikerPool),
  );
  const defenders = Array.from({ length: starterPackDefenderCount }, () =>
    drawPlayer(defenderPool),
  );
  const keeper = drawPlayer(keeperPool);

  const half = Math.floor(actionCount / 2);
  const attackCount =
    half + (actionCount % 2 === 1 && random() < 0.5 ? 1 : 0);
  const defenseCount = actionCount - attackCount;

  return {
    strikers,
    defenders,
    keeper,
    attackActions: Array.from({ length: attackCount }, () =>
      drawAction(attackActionPool),
    ),
    defenseActions: Array.from({ length: defenseCount }, () =>
      drawAction(defenseActionPool),
    ),
  };
}

/** Rolls a starter pack from the game's own football pools. */
export function rollDefaultStarterPack(
  options: { actionCount?: number; random?: RandomSource } = {},
): StarterPack {
  return rollStarterPack({
    strikerPool: attackers,
    defenderPool: defenders,
    keeperPool: goalkeepers,
    attackActionPool: attackActionCards,
    defenseActionPool: defenseActionCards,
    actionCount: starterDeckActionCount,
    ...options,
  });
}

/** Every action card, for callers rolling their own split. */
export const actionCardPool = defaultActionCards;

/* ---- The second weighting -----------------------------------------------
 *
 * Four of the five starter packs do not use `drawByRarity` at all. Cricket,
 * tennis, and motorsport hand out bronze only — the ladder above it is meant to
 * be earned in-game — and basketball rolls its own odds with a different
 * fallback. Both rules exist in Flutter and both are needed; they are named
 * apart here so the difference cannot be missed.
 * ---------------------------------------------------------------------- */

/**
 * The odds the starter `CardPack` carries, which basketball rolls against.
 * Note these are not the 55/35/4/1 of `starterPackTierWeights` — platinum is
 * off the table entirely.
 */
export const starterPackOdds: Record<CardTier, number> = {
  bronze: 70,
  silver: 25,
  gold: 5,
  platinum: 0,
};

/** Picks a tier by relative weight, ignoring whether any card of it exists. */
export function pickWeighted(
  odds: Record<CardTier, number>,
  random: RandomSource,
): CardTier {
  const total = cardTiers.reduce((sum, tier) => sum + odds[tier], 0);
  let roll = random() * total;
  for (const tier of cardTiers) {
    roll -= odds[tier];
    if (roll <= 0) return tier;
  }
  return "bronze";
}

/**
 * Draws one card by rolling a tier and taking any card of it.
 *
 * Where `drawByRarity` falls back to the *nearest* tier by ordinal distance,
 * this walks a fixed preference — the rolled tier, then platinum down to bronze
 * — and takes the first tier with stock. Returns null only for an empty pool.
 */
export function rollFrom<T>(
  pool: T[],
  tierOf: (item: T) => CardTier,
  odds: Record<CardTier, number>,
  random: RandomSource,
): T | null {
  if (pool.length === 0) return null;

  const wanted = pickWeighted(odds, random);
  for (const tier of [wanted, "platinum", "gold", "silver", "bronze"] as const) {
    const matches = pool.filter((item) => tierOf(item) === tier);
    if (matches.length > 0) {
      return matches[Math.floor(random() * matches.length)];
    }
  }
  return pool[Math.floor(random() * pool.length)];
}

/* ---- Pack results -------------------------------------------------------- */

/** A player card is worth its rating; an action is worth its power plus 30. */
export function packXp(players: PlayerCard[], actions: ActionCard[]): number {
  return (
    players.reduce((sum, card) => sum + card.rating, 0) +
    actions.reduce((sum, card) => sum + Math.max(15, 30 + card.power), 0)
  );
}

/** Wraps a draw in its earned XP. */
export function finalizePack(
  playerCards: PlayerCard[],
  actionCards: ActionCard[] = [],
): PackResult {
  return { playerCards, actionCards, xpGained: packXp(playerCards, actionCards) };
}

/** The football starter pack: five players and six actions. */
export function rollFootballStarterPack(
  random: RandomSource = Math.random,
): PackResult {
  const pack = rollDefaultStarterPack({ random });
  return finalizePack(starterPackPlayers(pack), starterPackActions(pack));
}

/** Takes `count` cards uniformly from `pool`, without repeats. */
function drawUniqueBronze(
  pool: PlayerCard[],
  count: number,
  random: RandomSource,
  failure: string,
): PlayerCard[] {
  const available = pool.filter((card) => card.tier === "bronze");
  if (available.length === 0) throw new Error(failure);

  const picked: PlayerCard[] = [];
  while (picked.length < count && available.length > 0) {
    picked.push(...available.splice(Math.floor(random() * available.length), 1));
  }
  return picked;
}

/**
 * Final Over hands out five bronze batters. Always bronze, matching Tennis
 * Rally and Grand Prix Dash: the ladder above bronze is earned in-game.
 */
export function rollCricketStarterPack(
  pool: PlayerCard[] = cricketBattingCards,
  random: RandomSource = Math.random,
): PackResult {
  return finalizePack(
    drawUniqueBronze(
      pool,
      cricketStarterCardCount,
      random,
      "Cricket starter pack draw failed: no bronze batsmen.",
    ),
  );
}

/**
 * Hoop Duel hands out one guard, one wing, and one big. This is the only
 * starter pack that rolls odds, and it keeps platinum off the table.
 */
export function rollBasketballStarterPack(
  pool: PlayerCard[] = basketballPlayerCards,
  random: RandomSource = Math.random,
): PackResult {
  const picked: PlayerCard[] = [];

  for (const role of [
    "basketballGuard",
    "basketballWing",
    "basketballBig",
  ] as const) {
    const available = pool.filter(
      (card) =>
        card.role === role &&
        card.tier !== "platinum" &&
        !picked.some((chosen) => chosen.id === card.id),
    );
    const card = rollFrom(
      available,
      (item) => item.tier,
      starterPackOdds,
      random,
    );
    if (card) picked.push(card);
  }

  return finalizePack(picked);
}

/** Tennis Rally hands out a single bronze player. */
export function rollTennisStarterPack(
  pool: PlayerCard[] = tennisPlayerCards,
  random: RandomSource = Math.random,
): PackResult {
  return finalizePack(
    drawUniqueBronze(
      pool,
      tennisStarterCardCount,
      random,
      "Tennis starter pack draw failed: no bronze players.",
    ),
  );
}

/** Grand Prix Dash hands out a single bronze driver, from the full grid. */
export function rollGrandPrixStarterPack(
  pool: PlayerCard[] = racingPlayerCards,
  random: RandomSource = Math.random,
): PackResult {
  return finalizePack(
    drawUniqueBronze(
      pool,
      grandPrixStarterCardCount,
      random,
      "Grand Prix starter pack draw failed: no bronze drivers.",
    ),
  );
}

/* ---- Match deck constraint --------------------------------------------- */

/** A deck taken into a match may hold at most this many cards. */
export const maxMatchDeckCards = 5;

export function isValidMatchDeckSize(count: number): boolean {
  return count >= 1 && count <= maxMatchDeckCards;
}

export function canAddToMatchDeck(currentCount: number): boolean {
  return currentCount < maxMatchDeckCards;
}

/** Trims a deck to the five-card limit, preserving order. */
export function enforceMatchDeckLimit<T>(cards: T[]): T[] {
  return cards.slice(0, maxMatchDeckCards);
}

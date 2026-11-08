import type { CardTier } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import { allActionCards } from "./catalog";
import { footballPlayerCards, cricketPlayerCards, basketballPlayerCards, tennisPlayerCards, racingPlayerCards } from "@/mocks/packs";
import { rollFrom, type RandomSource } from "../rolling";
import type { PackRevealItem } from "../types";

/** Flutter's daily drop odds, separate from starter-pack odds. */
export const dailyDropOdds: Record<CardTier, number> = {
  bronze: 40, silver: 40, gold: 16, platinum: 4,
};

export function rollDailyDrop(sport: Sport, random: RandomSource = Math.random): PackRevealItem | null {
  if (sport === "football" && random() < 0.5) {
    const card = rollFrom(allActionCards, (card) => card.tier, dailyDropOdds, random);
    if (card) return { kind: "action", card };
  }
  const pools = { football: footballPlayerCards, cricket: cricketPlayerCards,
    basketball: basketballPlayerCards, tennis: tennisPlayerCards, motorsport: racingPlayerCards };
  const card = rollFrom(pools[sport],
    (card) => card.tier, dailyDropOdds, random);
  return card ? { kind: "player", card } : null;
}

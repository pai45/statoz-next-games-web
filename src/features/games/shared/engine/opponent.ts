import type { PlayerCard } from "@/domain/cards";

import type { RandomSource } from "./random-source";

/** The rating the CPU squad is drawn around, climbing two a level to a cap. */
export function targetRatingForLevel(level: number): number {
  return Math.min(95, 66 + level * 2);
}

/**
 * Picks `count` cards near the target rating, but not the same ones every
 * time: it sorts the pool by distance from the target, then shuffles a window
 * of the closest and takes from that. A strictly nearest pick would field the
 * identical opponent at every level.
 */
function variedNearestByRating(
  pool: PlayerCard[],
  target: number,
  count: number,
  random: RandomSource,
): PlayerCard[] {
  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target),
  );

  const windowSize = Math.min(pool.length, Math.max(count * 8, 12));
  const window = sorted.slice(0, windowSize);
  for (let index = window.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [window[index], window[swap]] = [window[swap], window[index]];
  }

  return window.slice(0, count);
}

export type OpponentSquad = {
  /** In squad order: ATK1, ATK2, DEF1, DEF2, GK. */
  shooters: PlayerCard[];
  keeper: PlayerCard;
};

/**
 * Builds the CPU's five at the player's level, in the order both games want:
 * two attackers, two defenders, a keeper. The keeper appears twice on purpose —
 * in the shootout it stands in goal *and* takes the fifth kick, as in Flutter.
 *
 * It lived in the shootout until Football Chess became the second game to field
 * exactly this shape.
 */
export function generateShootoutOpponent(
  level: number,
  attackerPool: PlayerCard[],
  defenderPool: PlayerCard[],
  keeperPool: PlayerCard[],
  random: RandomSource = Math.random,
): OpponentSquad {
  const target = targetRatingForLevel(level);
  const cpuAttackers = variedNearestByRating(attackerPool, target, 2, random);
  const cpuDefenders = variedNearestByRating(defenderPool, target, 2, random);
  const keeper = variedNearestByRating(keeperPool, target, 1, random)[0];

  return {
    shooters: [...cpuAttackers, ...cpuDefenders, keeper],
    keeper,
  };
}

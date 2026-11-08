import type { ActionCard, PlayerCard } from "@/domain/cards";

import type { RandomSource } from "../../shared/engine/random-source";
import { fillFormation, formationIds, type ClubSetup } from "./lineup";
import type { FormationId, MatchSetup } from "./types";

export const divisions = ["LOCAL LEAGUE", "CITY CIRCUIT", "REGIONAL CUP", "NATIONAL LEAGUE", "CHAMPIONS DIVISION"];

export const opponentClubs = [
  ["Mill Town", "Harbour FC", "Kingsbridge", "Ashford Rovers"],
  ["Northside", "Riverside City", "Old Quay", "Bramley United"],
  ["Union Eleven", "Castlegate", "Westmoor", "Redcliff Athletic"],
  ["Royal Borough", "Eastport", "Highfield", "Calder Vale"],
  ["Metro Stars", "Crown Athletic", "Ironbridge", "Atlas FC"],
];

/** The CPU squad's target overall per division. */
const opponentRating = [77, 80, 83, 86, 89];

/** Three points a win; promotion every nine, five divisions. */
export function divisionFor(points: number): number {
  return Math.min(5, Math.floor(Math.max(0, points) / 9) + 1);
}

export type TeamInput = MatchSetup["home"];

export function teamFromClub(
  club: ClubSetup,
  name: string,
  cardFor: (id: string) => PlayerCard | undefined,
  actionFor: (id: string) => Pick<ActionCard, "id" | "power"> | undefined,
): TeamInput {
  const ids = [club.keeperId, ...club.outfield];
  const cards = Object.fromEntries(ids.map((id) => [id, cardFor(id)]).filter((e): e is [string, PlayerCard] => Boolean(e[1])));
  return {
    name,
    formation: club.formation,
    keeperId: club.keeperId,
    outfield: club.outfield,
    cards,
    tactics: club.tactics.map(actionFor).filter((c): c is Pick<ActionCard, "id" | "power"> => Boolean(c)).map((c) => ({ id: c.id, power: c.power })),
  };
}

export type Opponent = { name: string; team: TeamInput };

/**
 * The CPU club for a division: a name, a formation and eleven cards near the
 * division's level, each picked for the place it plays.
 */
export function draftOpponent(
  division: number,
  pools: { attackers: PlayerCard[]; defenders: PlayerCard[]; keepers: PlayerCard[] },
  random: RandomSource,
): Opponent {
  const tier = Math.min(4, Math.max(0, division - 1));
  const names = opponentClubs[tier];
  const name = names[Math.floor(random() * names.length)];
  const target = opponentRating[tier];
  const formation: FormationId = formationIds[Math.floor(random() * formationIds.length)];

  // Cards near the target, in a seeded shuffle so equal fits vary match to match.
  const near = (cards: PlayerCard[], spread: number) => {
    const close = cards.filter((c) => Math.abs(c.rating - target) <= spread);
    const pool = close.length >= 4 ? close : cards;
    return pool
      .map((c) => ({ c, key: random() }))
      .sort((a, b) => a.key - b.key)
      .map((e) => e.c);
  };
  const keeper = near(pools.keepers, 4)[0] ?? pools.keepers[0];
  const outfieldPool = near([...pools.defenders, ...pools.attackers], 5);
  const byId = new Map(outfieldPool.map((c) => [c.id, c]));
  // Rank by fit, then by closeness to the target instead of the raw rating.
  const lookup = (id: string) => {
    const card = byId.get(id);
    return card ? { ...card, rating: 100 - Math.abs(card.rating - target) } : undefined;
  };
  let outfield = fillFormation(formation, outfieldPool.map((c) => c.id), lookup);
  if (outfield.some((id) => !id)) {
    const all = [...pools.defenders, ...pools.attackers];
    for (const c of all) byId.set(c.id, c);
    outfield = fillFormation(formation, all.map((c) => c.id), lookup, outfield);
  }
  const ids = outfield.filter((id): id is string => Boolean(id));
  const cards = Object.fromEntries([keeper, ...ids.map((id) => byId.get(id)!)].map((c) => [c.id, c]));
  return { name, team: { name, formation, keeperId: keeper.id, outfield: ids, cards, tactics: [] } };
}

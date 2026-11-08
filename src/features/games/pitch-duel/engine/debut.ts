import type { PlayerCard } from "@/domain/cards";

import type { RandomSource } from "../../shared/engine/random-source";
import { formations, positionFit } from "./lineup";
import { pickWeighted } from "./rng";
import type { FormationId, SlotPosition } from "./types";

/**
 * The debut XI: the eleven a first-time player signs in the opening reveal.
 * One marquee signing, two stars and eight squad players, each drawn for a
 * place in a 4-3-3 from the football catalogue. Pure, so it can be tested.
 */
export const debutFormation: FormationId = "4-3-3";

export type DebutSquad = {
  formation: FormationId;
  keeperId: string;
  /** Ten outfield ids, in the formation's slot order. */
  outfield: string[];
  /** The headline signing, revealed last with the full walkout. */
  marqueeId: string;
};

type Band = [number, number];

/** Rating bands. A marquee signing is a 90+ about one time in eight. */
export const debutBands = { marquee: [86, 89] as Band, platinum: [90, 99] as Band, star: [82, 85] as Band, squad: [75, 81] as Band };
export const platinumChance = 0.12;

/** How likely each place is to hold the marquee signing: forwards most, keepers least. */
const marqueeWeight: Record<SlotPosition | "GK", number> = {
  GK: 1, LB: 1, CB: 1, RB: 1, LWB: 1, RWB: 1, CDM: 2, CM: 2, CAM: 3, LM: 2, RM: 2, LW: 3, RW: 3, ST: 4,
};

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  return items
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map((e) => e.item);
}

/**
 * Draws a debut XI. Each place takes a natural fit inside its band, widening
 * the band, then the fit, only when the catalogue runs short. Cards in `avoid`
 * (already owned) are used only when nothing else fits.
 */
export function draftDebut(
  pools: { outfield: readonly PlayerCard[]; keepers: readonly PlayerCard[] },
  random: RandomSource,
  avoid: ReadonlySet<string> = new Set(),
  formation: FormationId = debutFormation,
): DebutSquad {
  const places: (SlotPosition | "GK")[] = ["GK", ...formations[formation].slots.map((s) => s.pos)];
  const indices = places.map((_, i) => i);
  const marquee = pickWeighted(indices, places.map((p) => marqueeWeight[p]), random);
  const stars = shuffled(indices.filter((i) => i !== marquee && i !== 0), random).slice(0, 2);
  const platinum = random() < platinumChance;
  const bandFor = (i: number): Band =>
    i === marquee ? (platinum ? debutBands.platinum : debutBands.marquee) : stars.includes(i) ? debutBands.star : debutBands.squad;

  const used = new Set<string>();
  const picked: string[] = new Array(places.length).fill("");
  // The tightest places first: the marquee, then the stars, then the rest.
  const order = [marquee, ...stars, ...indices.filter((i) => i !== marquee && !stars.includes(i))];

  for (const i of order) {
    const place = places[i];
    const pool = place === "GK" ? pools.keepers : pools.outfield;
    const fit = (card: PlayerCard) => (place === "GK" ? (card.role === "goalkeeper" ? 3 : 0) : positionFit(card, place));
    const [lo, hi] = bandFor(i);
    let choice: PlayerCard | undefined;
    // Widen the band, then accept a near fit, before giving up on the rules.
    for (const [minFit, widen] of [[3, 0], [3, 2], [3, 4], [2, 2], [2, 5], [1, 6]] as const) {
      const options = pool.filter((c) => !used.has(c.id) && fit(c) >= minFit && c.rating >= lo - widen && c.rating <= hi + widen);
      const fresh = options.filter((c) => !avoid.has(c.id));
      const from = fresh.length ? fresh : options;
      if (from.length) {
        choice = from[Math.floor(random() * from.length)];
        break;
      }
    }
    choice ??= pool.find((c) => !used.has(c.id) && fit(c) > 0);
    if (!choice) throw new Error(`No card can play ${place}`);
    used.add(choice.id);
    picked[i] = choice.id;
  }

  return { formation, keeperId: picked[0], outfield: picked.slice(1), marqueeId: picked[marquee] };
}

/** The order the reveal shows them: lowest rated first, the marquee signing last. */
export function revealOrder(squad: DebutSquad, ratingOf: (id: string) => number): string[] {
  const ids = [squad.keeperId, ...squad.outfield];
  return ids
    .filter((id) => id !== squad.marqueeId)
    .map((id, i) => ({ id, i, r: ratingOf(id) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((e) => e.id)
    .concat(squad.marqueeId);
}

/** A squad's overall: the mean rating of the eleven, rounded. */
export function squadOvr(ids: readonly string[], ratingOf: (id: string) => number): number {
  return ids.length ? Math.round(ids.reduce((sum, id) => sum + ratingOf(id), 0) / ids.length) : 0;
}

/**
 * The 180-athlete roster, as the engine needs it.
 *
 * The web already ships the Flutter roster: `features/packs/data/basketball-cards.ts`
 * carries every id, name, team, position, role, rating and archetype. What it
 * does not carry is the eleven granular ratings and the body height the
 * simulation runs on, because a card face has no use for them.
 *
 * So this file is Flutter's `_buildAthlete` and nothing else — the same per-role
 * deltas, the same shooter handling, the same heights — applied to the cards
 * that already exist rather than to a second copy of the roster. A player's OVR
 * on their card and their OVR on the court are the same number by construction.
 */

import { basketballPlayerCards } from "@/features/packs";
import type { PlayerCard, PlayerRole } from "@/domain/cards";

import {
  type BasketballArchetype,
  type BasketballAthlete,
  type BasketballCardRole,
  type BasketballTrait,
} from "../types";

/* ---- Card → athlete vocabulary -------------------------------------------- */

const roleByPlayerRole: Partial<Record<PlayerRole, BasketballCardRole>> = {
  basketballGuard: "guard",
  basketballWing: "wing",
  basketballBig: "big",
};

/** The cards print the archetype in their `trait` field; this reads it back. */
const archetypeByLabel: Record<string, BasketballArchetype> = {
  "BALANCED GUARD": "balancedGuard",
  SHARPSHOOTER: "sharpshooter",
  SLASHER: "slasher",
  "INTERIOR POWER": "interiorPower",
};

/** One trait per archetype — the pairing is fixed, as it is in Flutter. */
const traitByArchetype: Record<BasketballArchetype, BasketballTrait> = {
  sharpshooter: "deepRange",
  balancedGuard: "quickRelease",
  slasher: "rimPressure",
  interiorPower: "glassCleaner",
};

/* ---- Rating derivation ---------------------------------------------------- */

function rating(ovr: number, delta: number): number {
  const value = ovr + delta;
  return value < 25 ? 25 : value > 99 ? 99 : value;
}

const speedDelta: Record<BasketballCardRole, number> = { guard: 5, wing: 2, big: -12 };
const insideDelta: Record<BasketballCardRole, number> = { guard: -5, wing: 1, big: 8 };
const midDelta: Record<BasketballCardRole, number> = { guard: 2, wing: 1, big: -2 };
const threeDelta: Record<BasketballCardRole, number> = { guard: 3, wing: 1, big: -10 };
const dunkDelta: Record<BasketballCardRole, number> = { guard: -12, wing: 3, big: 7 };
const defenseDelta: Record<BasketballCardRole, number> = { guard: -4, wing: 2, big: 5 };
const stealDelta: Record<BasketballCardRole, number> = { guard: 2, wing: 1, big: -6 };
const blockDelta: Record<BasketballCardRole, number> = { guard: -25, wing: -6, big: 10 };
const reboundDelta: Record<BasketballCardRole, number> = { guard: -15, wing: 1, big: 10 };

function handlingDelta(role: BasketballCardRole, shooter: boolean): number {
  switch (role) {
    case "guard":
      return shooter ? 8 : 7;
    case "wing":
      return 2;
    case "big":
      return -10;
  }
}

/**
 * Body height in metres. It is not cosmetic: reach for blocks and rebounds,
 * body separation weight, and the contest bonus all read it.
 */
function heightFor(role: BasketballCardRole, position: string, name: string): number {
  switch (role) {
    case "guard":
      return position.includes("F") ? 1.96 : 1.91;
    case "wing":
      return position.includes("PF") ? 2.06 : 2.03;
    case "big":
      if (name === "Victor Wembanyama") return 2.24;
      if (name === "Kristaps Porzingis") return 2.21;
      return 2.11;
  }
}

const roleTagline: Record<BasketballCardRole, string> = {
  guard: "Backcourt value",
  wing: "Two-way wing value",
  big: "Paint value",
};

const traitTagline: Record<BasketballTrait, string> = {
  quickRelease: "quick-trigger reads",
  deepRange: "deep-range pressure",
  rimPressure: "rim pressure",
  glassCleaner: "glass control",
};

/* ---- The roster ----------------------------------------------------------- */

export function athleteFromCard(card: PlayerCard): BasketballAthlete | null {
  const cardRole = roleByPlayerRole[card.role];
  if (cardRole === undefined) return null;

  const archetype =
    archetypeByLabel[card.trait] ??
    (cardRole === "big"
      ? "interiorPower"
      : cardRole === "wing"
        ? "slasher"
        : "balancedGuard");
  const trait = traitByArchetype[archetype];
  // Only guards and wings are ever sharpshooters, so the archetype the card
  // already carries is the same flag Flutter derives from its shooter list.
  const shooter = archetype === "sharpshooter";
  const ovr = card.rating;

  return {
    id: card.id,
    name: card.name,
    ovr,
    teamName: card.country,
    teamCode: card.countryCode,
    position: card.position,
    cardRole,
    archetype,
    trait,
    tagline: `${roleTagline[cardRole]} with ${traitTagline[trait]}.`,
    heightM: heightFor(cardRole, card.position, card.name),
    speed: rating(ovr, speedDelta[cardRole]),
    handling: rating(ovr, handlingDelta(cardRole, shooter)),
    inside: rating(ovr, insideDelta[cardRole]),
    mid: rating(ovr, shooter ? 5 : midDelta[cardRole]),
    three: rating(ovr, shooter ? 8 : threeDelta[cardRole]),
    dunk: rating(ovr, dunkDelta[cardRole]),
    defense: rating(ovr, defenseDelta[cardRole]),
    steal: rating(ovr, stealDelta[cardRole]),
    block: rating(ovr, blockDelta[cardRole]),
    rebound: rating(ovr, reboundDelta[cardRole]),
    stamina: rating(ovr, ovr >= 90 ? 3 : 0),
  };
}

/** Every athlete the game can field. The CPU draws its roster from here. */
export const basketballAthletes: BasketballAthlete[] = basketballPlayerCards
  .map(athleteFromCard)
  .filter((athlete): athlete is BasketballAthlete => athlete !== null);

const athletesById = new Map(
  basketballAthletes.map((athlete) => [athlete.id, athlete]),
);

export function athleteById(id: string): BasketballAthlete {
  return athletesById.get(id) ?? basketballAthletes[0];
}

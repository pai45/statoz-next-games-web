import type { Sport } from "../sports";

/**
 * Collectible card rarity. The order is the escalation the whole product keys
 * off — pack drop weights, reveal drama, and the tier pips on a card face all
 * read it as a rank rather than a name.
 */
export type CardTier = "bronze" | "silver" | "gold" | "platinum";

/** Tiers in ascending rarity. Index doubles as the rank, 0 bronze … 3 platinum. */
export const cardTiers: CardTier[] = ["bronze", "silver", "gold", "platinum"];

/** 0 bronze · 1 silver · 2 gold · 3 platinum. */
export function cardTierRank(tier: CardTier): number {
  return cardTiers.indexOf(tier);
}

/** What a player does on the pitch, court, crease, or grid. */
export type PlayerRole =
  | "attacker"
  | "defender"
  | "goalkeeper"
  | "batsman"
  | "bowler"
  | "basketballGuard"
  | "basketballWing"
  | "basketballBig"
  | "tennisSingles"
  | "f1Driver"
  | "f2Driver"
  | "nascarDriver"
  | "indycarDriver";

/** The short code a card prints above its country. */
export const playerRoleLabels: Record<PlayerRole, string> = {
  attacker: "ATK",
  defender: "DEF",
  goalkeeper: "GK",
  batsman: "BAT",
  bowler: "BOWL",
  basketballGuard: "G",
  basketballWing: "W",
  basketballBig: "BIG",
  tennisSingles: "SGL",
  f1Driver: "F1",
  f2Driver: "F2",
  nascarDriver: "CUP",
  indycarDriver: "IND",
};

/** Which sport's markings a role draws behind its portrait. */
export const playerRoleSports: Record<PlayerRole, Sport> = {
  attacker: "football",
  defender: "football",
  goalkeeper: "football",
  batsman: "cricket",
  bowler: "cricket",
  basketballGuard: "basketball",
  basketballWing: "basketball",
  basketballBig: "basketball",
  tennisSingles: "tennis",
  f1Driver: "motorsport",
  f2Driver: "motorsport",
  nascarDriver: "motorsport",
  indycarDriver: "motorsport",
};

export type ActionCategory = "attack" | "defense" | "special";

/** A player card. Portrait art is optional so catalog-only cards keep the glyph face. */
export type PlayerCard = {
  id: string;
  name: string;
  /** The name printed on the nameplate, short enough not to be clipped. */
  shortName: string;
  country: string;
  /** Three-letter country code. */
  countryCode: string;
  /** Positions the player covers, slash-separated, e.g. `RW/CAM`. */
  position: string;
  role: PlayerRole;
  /** Overall, 0–99. Also what the pack's rarity roll is bucketed by. */
  rating: number;
  trait: string;
  tier: CardTier;
  /** Key of the glyph the card shows, from the design system's icon set. */
  icon: string;
  /** Public asset path for portrait artwork, when the source catalog provides it. */
  portraitSrc?: string;
};

/** A one-shot effect played alongside a player card. */
export type ActionCard = {
  id: string;
  title: string;
  category: ActionCategory;
  tier: CardTier;
  /** Human-readable effect, with the tier's power already resolved. */
  effect: string;
  power: number;
  /** Whether the effect can backfire. */
  risky: boolean;
  icon: string;
};

/** A card of either kind, as a collection or a pack holds them. */
export type Card = PlayerCard | ActionCard;

export function isPlayerCard(card: Card): card is PlayerCard {
  return "rating" in card;
}

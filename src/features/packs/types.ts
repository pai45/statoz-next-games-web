import type { ActionCard, CardTier, PlayerCard } from "@/domain/cards";

/**
 * One card in a reveal. Flutter models this as a class holding two nullable
 * fields and reading whichever is set; a discriminated union says the same
 * thing without letting both — or neither — be present.
 */
export type PackRevealItem =
  | { kind: "player"; card: PlayerCard }
  | { kind: "action"; card: ActionCard };

export function revealItemId(item: PackRevealItem): string {
  return item.card.id;
}

export function revealItemTier(item: PackRevealItem): CardTier {
  return item.card.tier;
}

/** A player's overall, or an action's power — whichever the card leads with. */
export function revealItemRating(item: PackRevealItem): number {
  return item.kind === "player" ? item.card.rating : item.card.power;
}

export function revealItemName(item: PackRevealItem): string {
  return item.kind === "player" ? item.card.name : item.card.title;
}

export function revealItemShortName(item: PackRevealItem): string {
  return item.kind === "player" ? item.card.shortName : item.card.title;
}

export function revealItemSubtitle(item: PackRevealItem): string {
  return item.kind === "player" ? item.card.position : item.card.category;
}

/**
 * What any pack hands over, whichever sport rolled it.
 *
 * The five starter packs have nothing in common structurally — football deals a
 * squad and a hand of actions, tennis deals one player — so they meet here, the
 * way Flutter's builders all return a `PackResult`.
 */
export type PackResult = {
  playerCards: PlayerCard[];
  actionCards: ActionCard[];
  /** Earned from the cards themselves; see `packXp`. */
  xpGained: number;
};

export function packCardCount(result: PackResult): number {
  return result.playerCards.length + result.actionCards.length;
}

/**
 * A new player's football starter pack: two strikers, two defenders, a keeper,
 * and a set of actions split between attack and defense.
 */
export type StarterPack = {
  strikers: PlayerCard[];
  defenders: PlayerCard[];
  keeper: PlayerCard;
  attackActions: ActionCard[];
  defenseActions: ActionCard[];
};

export function starterPackPlayers(pack: StarterPack): PlayerCard[] {
  return [...pack.strikers, ...pack.defenders, pack.keeper];
}

export function starterPackActions(pack: StarterPack): ActionCard[] {
  return [...pack.attackActions, ...pack.defenseActions];
}

/** How many of each tier a pack holds, players and actions together. */
export function starterPackRarityBreakdown(
  pack: StarterPack,
): Record<CardTier, number> {
  const counts: Record<CardTier, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  };
  for (const card of starterPackPlayers(pack)) counts[card.tier] += 1;
  for (const card of starterPackActions(pack)) counts[card.tier] += 1;
  return counts;
}

/**
 * Everything a reveal screen needs: the cards, the copy around them, and how
 * the flow should pace itself.
 */
export type PackRevealData = {
  playerCards: PlayerCard[];
  actionCards: ActionCard[];
  /**
   * The game this pack belongs to, set over the headline. Flutter hardcodes
   * PITCH DUEL here because its pack screen only ever served football; five
   * sports share this one, so it is data.
   */
  brandLabel: string;
  /** The intro's headline. Newlines are honoured as deliberate line breaks. */
  headline: string;
  /** The word under the headline — UNLOCKED, PURCHASED, CLAIMED. */
  statusLabel: string;
  /** The summary screen's primary action. */
  ctaLabel: string;
  summaryLabel: string;
  xpGained: number;
  /** Levels crossed by this pack, in order. */
  levelsGained: number[];
  /**
   * Whether the action cards are shown together on one page instead of being
   * flipped one at a time. A five-card starter would otherwise take a minute.
   */
  groupActionCards: boolean;
  /** Caps how many player cards get the full flip. */
  maxAnimatedPlayerCards?: number;
  detailLabel?: string;
};

/** Every card in the pack, players first. */
export function revealItems(reveal: PackRevealData): PackRevealItem[] {
  return [
    ...reveal.playerCards.map(
      (card): PackRevealItem => ({ kind: "player", card }),
    ),
    ...reveal.actionCards.map(
      (card): PackRevealItem => ({ kind: "action", card }),
    ),
  ];
}

/** The cards that earn a full flip, in order. */
export function revealAnimatedItems(reveal: PackRevealData): PackRevealItem[] {
  if (!reveal.groupActionCards) return revealItems(reveal);
  return reveal.playerCards
    .slice(0, reveal.maxAnimatedPlayerCards ?? reveal.playerCards.length)
    .map((card): PackRevealItem => ({ kind: "player", card }));
}

/** The actions held back for the grouped page. */
export function revealGroupedActionItems(
  reveal: PackRevealData,
): PackRevealItem[] {
  return reveal.actionCards.map(
    (card): PackRevealItem => ({ kind: "action", card }),
  );
}

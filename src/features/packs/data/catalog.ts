import type { ActionCard, PlayerCard } from "@/domain/cards";

import { actionCards, basketballPlayerCards, cricketPlayerCards, footballPlayerCards, fictionalCards, racingPlayerCards, tennisPlayerCards } from "@/mocks/packs";

export const allPlayerCards: PlayerCard[] = [
  ...footballPlayerCards,
  ...fictionalCards,
  ...cricketPlayerCards,
  ...basketballPlayerCards,
  ...tennisPlayerCards,
  ...racingPlayerCards,
];

export const allActionCards: ActionCard[] = actionCards;

const playersById = new Map(allPlayerCards.map((card) => [card.id, card]));
const actionsById = new Map(allActionCards.map((card) => [card.id, card]));

export function playerCardForId(id: string): PlayerCard | undefined {
  return playersById.get(id);
}

export function actionCardForId(id: string): ActionCard | undefined {
  return actionsById.get(id);
}

const tierMultiplier = { bronze: 1, silver: 3, gold: 8, platinum: 20 } as const;

/** Flutter's direct-card price curve. */
export function playerCardCoinPrice(card: PlayerCard): number {
  return Math.max(100, (card.rating - 65) * 100 * tierMultiplier[card.tier]);
}

export function playerCardInrPrice(card: PlayerCard): number {
  return Math.max(10, Math.ceil(playerCardCoinPrice(card) / 100));
}

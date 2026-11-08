import type { PlayerCard } from "@/domain/cards";

import { portraitAssets } from "./portrait-assets.generated";
import { cardGamePortraitAssets } from "./portrait-assets.card-game.generated";

/** Returns copied Flutter portrait art when a catalog card has a verified match. */
export function portraitForCard(card: Pick<PlayerCard, "id" | "portraitSrc">): string | undefined {
  return card.portraitSrc ?? portraitAssets[card.id] ?? cardGamePortraitAssets[card.id];
}

export { portraitAssets };

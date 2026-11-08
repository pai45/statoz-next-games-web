export { CardUnpack } from "./components/card-unpack";
export { DailyDrop } from "./components/daily-drop";
export type { CardUnpackProps } from "./components/card-unpack";
export {
  PackRevealSequence,
  type PackRevealSequenceProps,
} from "./components/pack-reveal-sequence";
export { RevealCardFace } from "./components/reveal-card-face";
/**
 * The reveal's bed and its ray burst. Public because a flawless quiz run earns
 * the same celebration — the app reaches for these exact two there as well.
 */
export {
  PackRevealBackdrop,
  RayBurst,
  type PackRevealBackdropProps,
} from "./components/reveal-effects";
export { StarterPackReveal } from "./components/starter-pack-reveal";
export type { StarterPackRevealProps } from "./components/starter-pack-reveal";

export {
  attackers as footballAttackers,
  defenders as footballDefenders,
  footballPlayerCards,
  goalkeepers as footballGoalkeepers,
} from "@/mocks/packs";
export {
  cricketBattingCards,
  cricketBowlingCards,
  cricketPlayerCards,
} from "@/mocks/packs";
export { basketballPlayerCards } from "@/mocks/packs";
export { tennisPlayerCards } from "@/mocks/packs";
export { racingPlayerCards } from "@/mocks/packs";
export { collectionFrom, collectionFromIds, type CardCollection } from "./data/collection";
export { rollStarterPackFor } from "./data/starter-packs";
export { portraitAssets, portraitForCard } from "./data/portraits";
export {
  actionCardForId,
  allActionCards,
  allPlayerCards,
  playerCardCoinPrice,
  playerCardForId,
  playerCardInrPrice,
} from "./data/catalog";

export {
  claimPack,
  resetClaimedPacks,
  useClaimedPacks,
  useIsHydrated,
  useIsPackClaimed,
} from "./state/claimed-packs";
export type { ClaimedPacks, PackClaim } from "./state/claimed-packs";

export {
  actionCardPool,
  basketballStarterCardCount,
  canAddToMatchDeck,
  cricketStarterCardCount,
  enforceMatchDeckLimit,
  finalizePack,
  grandPrixStarterCardCount,
  isValidMatchDeckSize,
  maxMatchDeckCards,
  packRarityForPower,
  packRarityForRating,
  packRarityOfAction,
  packRarityOfPlayer,
  packXp,
  pickWeighted,
  rollBasketballStarterPack,
  rollCricketStarterPack,
  rollDefaultStarterPack,
  rollFootballStarterPack,
  rollFrom,
  rollGrandPrixStarterPack,
  rollPackRarity,
  rollStarterPack,
  rollTennisStarterPack,
  starterDeckActionCount,
  starterDropChance,
  starterPackActionCount,
  starterPackDefenderCount,
  starterPackKeeperCount,
  starterPackOdds,
  starterPackStrikerCount,
  starterPackTierWeights,
  tennisStarterCardCount,
} from "./rolling";
export type { RandomSource, RollStarterPackOptions } from "./rolling";

export {
  revealAnimatedItems,
  revealGroupedActionItems,
  revealItemId,
  revealItemName,
  revealItemRating,
  revealItemShortName,
  revealItemSubtitle,
  packCardCount,
  revealItems,
  revealItemTier,
  starterPackActions,
  starterPackPlayers,
  starterPackRarityBreakdown,
} from "./types";
export type {
  PackResult,
  PackRevealData,
  PackRevealItem,
  StarterPack,
} from "./types";

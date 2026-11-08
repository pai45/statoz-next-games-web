import type { Sport } from "@/domain/sports";

import {
  rollBasketballStarterPack,
  rollCricketStarterPack,
  rollFootballStarterPack,
  rollGrandPrixStarterPack,
  rollTennisStarterPack,
  type RandomSource,
} from "../rolling";
import { packCardCount, type PackResult, type PackRevealData } from "../types";

/**
 * The copy each sport's starter pack announces itself with, from the
 * `PackRevealData.*Starter` factories in Flutter's game state.
 *
 * `summary` is a function because two of them count the cards and three name
 * what the player just signed.
 */
type StarterCopy = {
  /** The deck game this pack outfits, set over the headline. */
  brandLabel: string;
  /** The intro headline. The newline is a deliberate line break. */
  headline: string;
  ctaLabel: string;
  summary: (result: PackResult) => string;
  /**
   * Whether the actions arrive on one page instead of flipping one at a time.
   * Football is the only pack that has any.
   */
  groupActionCards: boolean;
  maxAnimatedPlayerCards: number;
};

const cardsAdded = (where: string) => (result: PackResult) =>
  `${packCardCount(result)} CARDS ADDED TO ${where}`;

const starterCopy: Record<Sport, StarterCopy> = {
  football: {
    brandLabel: "PITCH DUEL",
    headline: "STARTER\nPACK",
    ctaLabel: "ENTER THE GAME",
    summary: cardsAdded("YOUR COLLECTION"),
    groupActionCards: true,
    maxAnimatedPlayerCards: 5,
  },
  cricket: {
    brandLabel: "FINAL OVER",
    headline: "CRICKET\nSTARTER",
    ctaLabel: "ENTER FINAL OVER",
    summary: cardsAdded("YOUR COLLECTION"),
    groupActionCards: false,
    maxAnimatedPlayerCards: 3,
  },
  basketball: {
    brandLabel: "HOOP DUEL",
    headline: "HOOP\nSTARTER",
    ctaLabel: "ENTER HOOP DUEL",
    summary: cardsAdded("YOUR ROSTER DECK"),
    groupActionCards: false,
    maxAnimatedPlayerCards: 3,
  },
  tennis: {
    brandLabel: "TENNIS RALLY",
    headline: "TENNIS\nSTARTER",
    ctaLabel: "ENTER TENNIS RALLY",
    summary: () => "YOUR FIRST PLAYER IS SIGNED",
    groupActionCards: false,
    maxAnimatedPlayerCards: 1,
  },
  motorsport: {
    brandLabel: "RALLY DASH",
    headline: "PIT LANE\nSTARTER",
    ctaLabel: "ENTER RALLY DASH",
    summary: () => "YOUR FIRST DRIVER IS SIGNED",
    groupActionCards: false,
    maxAnimatedPlayerCards: 1,
  },
};

/**
 * How each sport rolls. No two are alike: football deals a squad and a hand of
 * actions on the 55/35/4/1 weighting, basketball rolls one player per court
 * role against its own odds, and the other three hand out bronze only.
 */
const starterRolls: Record<Sport, (random: RandomSource) => PackResult> = {
  football: (random) => rollFootballStarterPack(random),
  cricket: (random) => rollCricketStarterPack(undefined, random),
  basketball: (random) => rollBasketballStarterPack(undefined, random),
  tennis: (random) => rollTennisStarterPack(undefined, random),
  motorsport: (random) => rollGrandPrixStarterPack(undefined, random),
};

/**
 * Rolls a sport's starter pack and dresses it for the reveal.
 *
 * The roll happens here rather than at import time, so a caller controls when a
 * pack is drawn — which matters, because a pack drawn during render would
 * differ between the server and the browser.
 */
export function rollStarterPackFor(
  sport: Sport,
  random: RandomSource = Math.random,
): PackRevealData {
  const result = starterRolls[sport](random);
  const copy = starterCopy[sport];

  return {
    playerCards: result.playerCards,
    actionCards: result.actionCards,
    brandLabel: copy.brandLabel,
    headline: copy.headline,
    statusLabel: "UNLOCKED",
    ctaLabel: copy.ctaLabel,
    summaryLabel: copy.summary(result),
    xpGained: result.xpGained,
    levelsGained: [],
    groupActionCards: copy.groupActionCards,
    maxAnimatedPlayerCards: copy.maxAnimatedPlayerCards,
  };
}

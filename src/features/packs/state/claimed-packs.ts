"use client";

import type { Sport } from "@/domain/sports";
import { seedLoadoutFromClaim } from "@/features/cards-decks";
import {
  claimStarterPack,
  resetStarterClaims,
  useEconomy,
  useIsEconomyHydrated,
  type StarterClaim,
} from "@/features/economy";

import type { PackRevealData } from "../types";

export type PackClaim = StarterClaim;
export type ClaimedPacks = Partial<Record<Sport, PackClaim>>;

export const useIsHydrated = useIsEconomyHydrated;

/** Compatibility projection for existing games and profile surfaces. */
export function useClaimedPacks(): ClaimedPacks {
  return useEconomy().starterClaims;
}

export function useIsPackClaimed(sport: Sport): boolean {
  return useClaimedPacks()[sport] !== undefined;
}

/** Grants the cards and creates the first valid editable loadout. */
export function claimPack(sport: Sport, reveal: PackRevealData): void {
  const claim: PackClaim = {
    claimedAt: new Date().toISOString(),
    playerCardIds: reveal.playerCards.map((card) => card.id),
    actionCardIds: reveal.actionCards.map((card) => card.id),
  };
  claimStarterPack(sport, claim);
  seedLoadoutFromClaim(sport, claim.playerCardIds, claim.actionCardIds);
}

export function resetClaimedPacks(): void {
  resetStarterClaims();
}

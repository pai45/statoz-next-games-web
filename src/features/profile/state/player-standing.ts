"use client";

import { useMemo } from "react";

import { avatarOptionById } from "@/features/onboarding";
import { useEconomy } from "@/features/economy";
import { playerCardForId, portraitForCard } from "@/features/packs";
import { shopFrames } from "@/features/shop";

import { usePlayerProgress } from "./player-progress";
import { useIsHydrated, useProfileIdentity } from "./profile-identity";

/**
 * Who the player is on a board: the narrow read a ranked list needs, without
 * reaching into the identity store or the progress projection itself.
 *
 * The same boundary shape as the games feature's `useGameCareer` — a feature
 * that owns numbers publishes a summary of them, rather than having every other
 * feature learn where they are kept.
 */
export type PlayerStanding = {
  displayName: string;
  /** Resolved portrait path, already falling back to the default face. */
  avatarSrc: string;
  totalXp: number;
  level: number;
  /**
   * False until the browser's own record has been read. A board must not rank
   * the player before it knows their XP — the server has no way to know it.
   */
  ready: boolean;
  frameColor?: string;
};

/**
 * The name the dossier and every board show. The app stores a chosen handle;
 * the web has never asked for one, so both surfaces say the same thing rather
 * than disagreeing about it.
 */
export const playerDisplayName = "PLAYER ONE";

export function usePlayerStanding(): PlayerStanding {
  const hydrated = useIsHydrated();
  const identity = useProfileIdentity();
  const progress = usePlayerProgress();
  const economy = useEconomy();

  return useMemo(
    () => ({
      displayName: identity.displayName || playerDisplayName,
      avatarSrc: (() => {
        const card = playerCardForId(identity.avatarId);
        return card && economy.owned.avatarIds.includes(card.id) ? portraitForCard(card) ?? avatarOptionById(identity.avatarId).src : avatarOptionById(identity.avatarId).src;
      })(),
      totalXp: progress.totalXp,
      level: progress.level,
      ready: hydrated,
      frameColor: economy.equipped.frameId ? shopFrames.find((frame) => frame.id === economy.equipped.frameId)?.color : undefined,
    }),
    [economy.equipped.frameId, economy.owned.avatarIds, hydrated, identity.avatarId, identity.displayName, progress.totalXp, progress.level],
  );
}

"use client";

import { avatarForName, avatarOptionById } from "@/features/onboarding";
import { playerDisplayName, useProfileIdentity } from "@/features/profile";

import type { MatchmakingFighter } from "./types";

/**
 * Who the two banners show.
 *
 * Flutter reads the equipped avatar out of the game bloc at every call site;
 * the web has one dossier and one rival-portrait rule, so both live here and
 * every mode fills its config the same way.
 */

/** The player's side, from the dossier they set up. */
export function useMatchmakingPlayer(badge?: string): MatchmakingFighter {
  const identity = useProfileIdentity();
  return {
    name: identity.displayName || playerDisplayName,
    avatar: avatarOptionById(identity.avatarId).src,
    badge,
  };
}

/**
 * A side identified only by a name: every rival, and the athletes the tennis
 * modes field on both sides. Fabricated identities have one seed — their name —
 * so the same name wears the same face here, on a leaderboard row, and in their
 * dossier.
 */
export function matchmakingFighter(
  name: string,
  badge?: string,
): MatchmakingFighter {
  return { name, avatar: avatarForName(name).src, badge };
}

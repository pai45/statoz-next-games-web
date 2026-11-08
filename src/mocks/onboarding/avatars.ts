import { seedHash } from "@/shared/utils";

import type { AvatarOption } from "@/features/onboarding/types";

/** The faces a new player picks their dossier portrait from. */
export const avatarOptions: AvatarOption[] = [
  { id: "adams", label: "Adams", src: "/assets/avatars/adams.webp" },
  { id: "bellingham", label: "Bellingham", src: "/assets/avatars/bellingham.webp" },
  { id: "raphinha", label: "Raphinha", src: "/assets/avatars/raphinha.webp" },
  { id: "camavinga", label: "Camavinga", src: "/assets/avatars/camavinga.webp" },
  { id: "ndiaye", label: "Ndiaye", src: "/assets/avatars/ndiaye.webp" },
  { id: "rodri", label: "Rodri", src: "/assets/avatars/rodri.webp" },
];

export function avatarOptionById(id: string | undefined): AvatarOption {
  return avatarOptions.find((avatar) => avatar.id === id) ?? avatarOptions[0];
}

/**
 * The face a display name always wears. Rivals are fabricated, so their
 * portrait is expanded from the only seed they have — the same name maps to the
 * same face on a leaderboard row, on the podium and in their dossier.
 */
export function avatarForName(name: string): AvatarOption {
  return avatarOptions[seedHash(name) % avatarOptions.length];
}

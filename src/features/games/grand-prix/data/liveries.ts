import { grandPrixLiveryIds, type GrandPrixLivery } from "../types";

/**
 * The constructor liveries — the web port of `data/grand_prix_liveries.dart`.
 *
 * Two content colours per car: the bodywork and the accent that carries the
 * wings, the nose stripe and the helmet. They belong to the car the way a
 * team's kit belongs to the team, so they are data here rather than palette
 * tokens — the same exception Hoop Duel's jerseys and Final Over's kits take.
 *
 * The ids and the colours are the Shop's, so what a player buys in
 * `mocks/shop/catalog.ts` is exactly what the car wears on track.
 */

export type GrandPrixLiverySpec = {
  livery: GrandPrixLivery;
  name: string;
  primary: string;
  accent: string;
};

export const grandPrixLiveries: GrandPrixLiverySpec[] = [
  { livery: "gridLine", name: "GRID LINE", primary: "#0a0e14", accent: "#35e7ff" },
  { livery: "scarlet", name: "SCARLET", primary: "#d8232a", accent: "#ffe24a" },
  { livery: "silverArrow", name: "SILVER ARROW", primary: "#b9bfc6", accent: "#00d2be" },
  { livery: "papaya", name: "PAPAYA", primary: "#ff8000", accent: "#2a9df4" },
  { livery: "midnight", name: "MIDNIGHT", primary: "#16265c", accent: "#35e7ff" },
  { livery: "racingGreen", name: "RACING GREEN", primary: "#0b5b3c", accent: "#d4af37" },
  { livery: "skyBlue", name: "SKY BLUE", primary: "#6fc5f0", accent: "#f4f7fa" },
];

/** The one livery every player starts with — the Shop prices it at zero. */
export const freeLivery: GrandPrixLivery = "gridLine";

export function grandPrixLiverySpec(livery: GrandPrixLivery): GrandPrixLiverySpec {
  return (
    grandPrixLiveries.find((spec) => spec.livery === livery) ??
    grandPrixLiveries[0]
  );
}

export function isGrandPrixLiveryFree(livery: GrandPrixLivery): boolean {
  return livery === freeLivery;
}

export function isGrandPrixLiveryOwned(
  livery: GrandPrixLivery,
  ownedLiveryIds: readonly string[],
): boolean {
  return isGrandPrixLiveryFree(livery) || ownedLiveryIds.includes(livery);
}

/** Clamps an equipped livery the player no longer owns back to the free one. */
export function ensureEquippedLiveryOwned(
  ownedLiveryIds: readonly string[],
  equipped: GrandPrixLivery,
): GrandPrixLivery {
  return isGrandPrixLiveryOwned(equipped, ownedLiveryIds) ? equipped : freeLivery;
}

/** The liveries the rest of the grid draws from — never the player's. */
export function cpuLiveries(playerLivery: GrandPrixLivery): GrandPrixLivery[] {
  return grandPrixLiveryIds.filter((livery) => livery !== playerLivery);
}

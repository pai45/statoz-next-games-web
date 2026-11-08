import type { PlayerCard } from "@/domain/cards";

/** Original Pitch Duel club cards. These characters are fictional. */
export const fictionalCards: PlayerCard[] = [
  { id: "pd2-niko-vale", name: "Niko Vale", shortName: "N. VALE", country: "Pitch Duel", countryCode: "PD", position: "ST", role: "attacker", rating: 75, trait: "Rapid finisher", tier: "silver", icon: "sports_soccer" },
  { id: "pd2-ada-sol", name: "Ada Sol", shortName: "A. SOL", country: "Pitch Duel", countryCode: "PD", position: "CAM", role: "attacker", rating: 80, trait: "Creative passer", tier: "gold", icon: "sports_soccer" },
  { id: "pd2-mara-stone", name: "Mara Stone", shortName: "M. STONE", country: "Pitch Duel", countryCode: "PD", position: "CB", role: "defender", rating: 83, trait: "Blocking specialist", tier: "gold", icon: "sports_soccer" },
  { id: "pd2-eli-reed", name: "Eli Reed", shortName: "E. REED", country: "Pitch Duel", countryCode: "PD", position: "GK", role: "goalkeeper", rating: 87, trait: "Keeper positioning", tier: "platinum", icon: "sports_soccer" },
];
export const promotionCard = (division: number): PlayerCard | undefined => fictionalCards[division - 2];

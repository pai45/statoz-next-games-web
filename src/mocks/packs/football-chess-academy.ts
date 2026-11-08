import type { PlayerCard } from "@/domain/cards";

/**
 * Football Chess's academy five: fictional players who take the field when a
 * football deck is not complete. They cover every piece class (Striker,
 * Runner, Playmaker, Defender, Keeper), are never sold in packs and never
 * count as owned cards.
 *
 * Squad order is the engine's: two forward slots, two back slots, keeper.
 */
const academy = (
  id: string,
  name: string,
  shortName: string,
  position: string,
  role: PlayerCard["role"],
  rating: number,
  trait: string,
): PlayerCard => ({
  id: `fc-academy-${id}`,
  name,
  shortName,
  country: "Football Chess Academy",
  countryCode: "FCA",
  position,
  role,
  rating,
  trait,
  tier: "bronze",
  icon: "sports_soccer",
});

export const footballChessAcademy: readonly PlayerCard[] = [
  academy("st", "Bram Okoro", "B. OKORO", "ST", "attacker", 70, "Poacher"),
  academy("rw", "Luca Fenwick", "L. FENWICK", "RW", "attacker", 68, "Direct runner"),
  academy("cm", "Teo Marchetti", "T. MARCHETTI", "CM", "attacker", 69, "Deep playmaker"),
  academy("cb", "Dara Nwosu", "D. NWOSU", "CB", "defender", 70, "Stopper"),
  academy("gk", "Henrik Saar", "H. SAAR", "GK", "goalkeeper", 69, "Shot stopper"),
];

export function isFootballChessAcademyId(id: string): boolean {
  return id.startsWith("fc-academy-");
}

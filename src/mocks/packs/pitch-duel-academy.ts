import type { PlayerCard } from "@/domain/cards";

/**
 * Pitch Duel's academy: fictional youth players who make up an eleven when a
 * collection is too small. They are always available inside Pitch Duel, are
 * never sold in packs and never count as owned cards.
 */
const academy = (id: string, name: string, shortName: string, position: string, role: PlayerCard["role"], rating: number, trait: string): PlayerCard => ({
  id: `pd-academy-${id}`,
  name,
  shortName,
  country: "Pitch Duel Academy",
  countryCode: "PDA",
  position,
  role,
  rating,
  trait,
  tier: "bronze",
  icon: "sports_soccer",
});

export const academyCards: PlayerCard[] = [
  academy("gk-1", "Tomas Brill", "T. BRILL", "GK", "goalkeeper", 64, "Keeper positioning"),
  academy("gk-2", "Ivo Marsh", "I. MARSH", "GK", "goalkeeper", 60, "Shot stopper"),
  academy("lb", "Rafe Corran", "R. CORRAN", "LB", "defender", 62, "Overlapping runner"),
  academy("cb-1", "Dario Penn", "D. PENN", "CB", "defender", 64, "Aerial stopper"),
  academy("cb-2", "Kofi Lund", "K. LUND", "CB", "defender", 63, "Recovery defender"),
  academy("cb-3", "Sami Holt", "S. HOLT", "CB", "defender", 59, "Blocking specialist"),
  academy("rb", "Jules Arden", "J. ARDEN", "RB", "defender", 61, "Overlapping runner"),
  academy("cdm", "Nils Okafor", "N. OKAFOR", "CDM", "defender", 63, "Ball winner"),
  academy("cm-1", "Leo Varga", "L. VARGA", "CM", "attacker", 64, "Tempo passer"),
  academy("cm-2", "Remy Castell", "R. CASTELL", "CM", "attacker", 61, "Engine"),
  academy("cam", "Pip Navarro", "P. NAVARRO", "CAM", "attacker", 65, "Creative passer"),
  academy("lm", "Ezra Quill", "E. QUILL", "LM/LW", "attacker", 61, "Direct runner"),
  academy("rm", "Milo Fenn", "M. FENN", "RM/RW", "attacker", 60, "Direct runner"),
  academy("lw", "Ari Solberg", "A. SOLBERG", "LW", "attacker", 63, "Flair dribbler"),
  academy("rw", "Teo Brandt", "T. BRANDT", "RW", "attacker", 62, "Rapid winger"),
  academy("st-1", "Oskar Duvall", "O. DUVALL", "ST", "attacker", 66, "Box striker"),
  academy("st-2", "Finn Adeyemi", "F. ADEYEMI", "ST", "attacker", 62, "Pressing forward"),
];

export const academyIds: string[] = academyCards.map((card) => card.id);

export function isAcademyId(id: string): boolean {
  return id.startsWith("pd-academy-");
}

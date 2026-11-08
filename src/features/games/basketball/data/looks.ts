/**
 * The person inside the kit — the web port of the look half of
 * `data/basketball_athletes.dart`.
 *
 * A livery dresses an athlete; a *look* is who they are: skin, hair, the hair's
 * silhouette, how broad the frame reads, and one trait-linked accessory. All of
 * it is derived from a stable hash of the athlete id, so a given player looks
 * the same in every match and across every session — Flutter uses an explicit
 * fold rather than `String.hashCode` for exactly that reason, and so does this.
 *
 * `build` and `buildScale` are width-only. Height and every gameplay dimension
 * come from the athlete's `heightM`; nothing here can change reach or a hitbox.
 */

import type { BasketballAthlete, BasketballCardRole, BasketballTrait } from "../types";

/** Procedural hair silhouettes the on-court rig draws. */
export type BasketballHairStyle = "closeCrop" | "fade" | "curls" | "highTop" | "twists";

export const basketballHairStyles: BasketballHairStyle[] = [
  "closeCrop",
  "fade",
  "curls",
  "highTop",
  "twists",
];

/** Render-only frame categories. These never affect reach or collisions. */
export type BasketballBuild = "lean" | "athletic" | "power";

/** One restrained, trait-linked accessory per athlete. */
export type BasketballGear = "none" | "shootingSleeve" | "headband" | "kneeSleeve";

export type BasketballLook = {
  /** Signature colour used for the heat aura tint and the halftime card dot. */
  accent: string;
  skin: string;
  hair: string;
  hairStyle: BasketballHairStyle;
  hairScale: number;
  build: BasketballBuild;
  buildScale: number;
  gear: BasketballGear;
};

type TeamLook = { accent: string; skin: string; hair: string };

/** One base look per franchise; the athlete's own hash varies it from there. */
const teamLooks: Record<string, TeamLook> = {
  ATL: { accent: "#e03a3e", skin: "#8d5524", hair: "#17110d" },
  BOS: { accent: "#007a33", skin: "#c68642", hair: "#191919" },
  BKN: { accent: "#f5f5f5", skin: "#e0ac69", hair: "#1b1b22" },
  CHA: { accent: "#1d8cab", skin: "#c68642", hair: "#2b221b" },
  CHI: { accent: "#ce1141", skin: "#e0ac69", hair: "#4b2e1f" },
  CLE: { accent: "#ffb81c", skin: "#8d5524", hair: "#151515" },
  DAL: { accent: "#00538c", skin: "#c68642", hair: "#1d1714" },
  DEN: { accent: "#ffc72c", skin: "#e0ac69", hair: "#5a3b26" },
  DET: { accent: "#c8102e", skin: "#8d5524", hair: "#111111" },
  GSW: { accent: "#ffc72c", skin: "#c68642", hair: "#231a14" },
  HOU: { accent: "#ce1141", skin: "#8d5524", hair: "#141414" },
  IND: { accent: "#ffc633", skin: "#c68642", hair: "#151515" },
  LAC: { accent: "#c8102e", skin: "#8d5524", hair: "#111111" },
  LAL: { accent: "#fdb927", skin: "#8d5524", hair: "#141414" },
  MEM: { accent: "#5d76a9", skin: "#8d5524", hair: "#111111" },
  MIA: { accent: "#98002e", skin: "#6b4423", hair: "#181818" },
  MIL: { accent: "#00471b", skin: "#c68642", hair: "#201914" },
  MIN: { accent: "#78be20", skin: "#8d5524", hair: "#111111" },
  NOP: { accent: "#c8102e", skin: "#6b4423", hair: "#111111" },
  NYK: { accent: "#f58426", skin: "#c68642", hair: "#17120f" },
  OKC: { accent: "#ef3b24", skin: "#8d5524", hair: "#111111" },
  ORL: { accent: "#0077c0", skin: "#c68642", hair: "#17120f" },
  PHI: { accent: "#006bb6", skin: "#6b4423", hair: "#111111" },
  PHX: { accent: "#e56020", skin: "#c68642", hair: "#17120f" },
  POR: { accent: "#e03a3e", skin: "#8d5524", hair: "#111111" },
  SAC: { accent: "#5a2d81", skin: "#e0ac69", hair: "#5a3b26" },
  SAS: { accent: "#c4ced4", skin: "#e0ac69", hair: "#2c221b" },
  TOR: { accent: "#ce1141", skin: "#8d5524", hair: "#151515" },
  UTA: { accent: "#ffc72c", skin: "#8d5524", hair: "#111111" },
  WAS: { accent: "#002b5c", skin: "#8d5524", hair: "#111111" },
};

const fallbackTeamLook = teamLooks.ATL;

/**
 * A stable fold hash, not `String.hashCode`. Flutter's comment is the reason:
 * a hash that shifts between runtimes would change a player's jersey number and
 * haircut between sessions, which reads as a different person.
 */
export function stableAthleteHash(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) & 0x7fffffff;
  }
  return hash;
}

/** Stable jersey number derived from the athlete id, 0-99. */
export function jerseyNumberFor(id: string): number {
  return stableAthleteHash(id) % 100;
}

const gearForTrait: Record<BasketballTrait, BasketballGear> = {
  quickRelease: "shootingSleeve",
  deepRange: "shootingSleeve",
  rimPressure: "headband",
  glassCleaner: "kneeSleeve",
};

const buildForRole: Record<BasketballCardRole, BasketballBuild> = {
  guard: "lean",
  wing: "athletic",
  big: "power",
};

function buildScaleFor(role: BasketballCardRole, hash: number): number {
  const step = (hash >> 3) % 4;
  switch (role) {
    case "guard":
      return 0.88 + step * 0.012;
    case "wing":
      return 0.97 + step * 0.012;
    case "big":
      return 1.08 + ((hash >> 3) % 4) * 0.015;
  }
}

export function buildLook(athlete: BasketballAthlete): BasketballLook {
  const base = teamLooks[athlete.teamCode] ?? fallbackTeamLook;
  const hash = stableAthleteHash(athlete.id);

  return {
    accent: base.accent,
    skin: base.skin,
    hair: base.hair,
    hairStyle: basketballHairStyles[(hash >> 7) % basketballHairStyles.length],
    hairScale: 0.9 + ((hash >> 11) % 5) * 0.04,
    build: buildForRole[athlete.cardRole],
    buildScale: buildScaleFor(athlete.cardRole, hash),
    gear: gearForTrait[athlete.trait],
  };
}

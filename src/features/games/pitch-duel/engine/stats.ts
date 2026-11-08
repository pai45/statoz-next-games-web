import type { PlayerCard } from "@/domain/cards";

import { hashString } from "./rng";
import type { DerivedStats, KeeperKey, Lane, StatKey } from "./types";

/**
 * StatOz cards carry one overall, a position string and a trait. Ballers duels
 * want six outfield stats and four keeper stats, so they are derived here —
 * deterministically, so a card always plays the same.
 */

type Mods = Record<StatKey, number>;

const outfieldKeys: StatKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];
const keeperKeys: KeeperKey[] = ["div", "ref", "han", "pos"];

const fullback: Mods = { pac: 4, sho: -16, pas: -1, dri: -3, def: 1, phy: -1 };
const winger: Mods = { pac: 6, sho: -1, pas: 0, dri: 4, def: -15, phy: -4 };

const positionMods: Record<string, Mods> = {
  ST: { pac: 2, sho: 6, pas: -4, dri: 1, def: -18, phy: 2 },
  SS: { pac: 1, sho: 3, pas: 1, dri: 3, def: -16, phy: -2 },
  LW: winger,
  RW: winger,
  LM: winger,
  RM: winger,
  CAM: { pac: 0, sho: 0, pas: 5, dri: 5, def: -14, phy: -4 },
  CM: { pac: 0, sho: -6, pas: 4, dri: 1, def: -4, phy: 0 },
  CDM: { pac: -4, sho: -12, pas: 1, dri: -3, def: 3, phy: 3 },
  CB: { pac: -6, sho: -20, pas: -6, dri: -8, def: 5, phy: 5 },
  LB: fullback,
  RB: fullback,
  LWB: fullback,
  RWB: fullback,
  GK: { pac: -25, sho: -25, pas: -15, dri: -25, def: -25, phy: -25 },
};

const roleFallback: Record<string, string> = { attacker: "ST", defender: "CB", goalkeeper: "GK" };

type TraitBonus = { pattern: RegExp; stat: StatKey | "keep" | "composure"; value: number };

const traitBonuses: TraitBonus[] = [
  { pattern: /finish|striker|clinical|box|target|power striker/, stat: "sho", value: 4 },
  { pattern: /winger|runner|explosive|direct|rapid|overlap/, stat: "pac", value: 4 },
  { pattern: /creat|playmak|pass|tempo|vision|link|maestro/, stat: "pas", value: 4 },
  { pattern: /flair|technical|agile|press breaker|skill|inside forward/, stat: "dri", value: 4 },
  { pattern: /shield|winner|stopper|defender|leader|recovery|block|ball-playing/, stat: "def", value: 3 },
  { pattern: /power|aerial|enforcer|engine|target/, stat: "phy", value: 4 },
  { pattern: /keeper|shot stopper|wall|sweeper|positioning/, stat: "keep", value: 3 },
  { pattern: /captain|veteran|iconic|leader|master/, stat: "composure", value: 3 },
];

const clamp = (value: number) => Math.min(99, Math.max(35, Math.round(value)));

function jitter(card: PlayerCard, key: string): number {
  return (hashString(`${card.id}:${key}`) % 5) - 2;
}

export function positionsOf(card: PlayerCard): string[] {
  const parts = card.position
    .toUpperCase()
    .split("/")
    .map((p) => p.trim())
    .filter((p) => p in positionMods);
  return parts.length ? parts : [roleFallback[card.role] ?? "CM"];
}

export function deriveStats(card: PlayerCard): DerivedStats {
  const [primary, secondary] = positionsOf(card);
  const trait = card.trait.toLowerCase();
  const bonus = (stat: TraitBonus["stat"]) =>
    traitBonuses.filter((t) => t.stat === stat && t.pattern.test(trait)).reduce((sum, t) => sum + t.value, 0);

  const out = {} as Record<StatKey, number>;
  for (const key of outfieldKeys) {
    const base = positionMods[primary][key] + (secondary ? positionMods[secondary][key] * 0.5 : 0);
    out[key] = clamp(card.rating + base + bonus(key) + jitter(card, key));
  }

  const isKeeper = primary === "GK";
  const keeper = {} as Record<KeeperKey, number>;
  for (const key of keeperKeys) {
    keeper[key] = isKeeper ? clamp(card.rating + bonus("keep") + jitter(card, key)) : 35;
  }
  const keep = Math.round(keeperKeys.reduce((sum, k) => sum + keeper[k], 0) / keeperKeys.length);

  return { ...out, keeper, keep, composure: clamp(card.rating - 6 + bonus("composure") + jitter(card, "composure")) };
}

const wideSpots = new Set(["LW", "RW", "LM", "RM", "LB", "RB", "LWB", "RWB"]);
const centralSpots = new Set(["ST", "CAM", "CB", "CDM", "CM", "SS"]);

/** +2 in a natural lane, −2 out of it. */
export function laneFit(card: PlayerCard, lane: Lane): number {
  const primary = positionsOf(card)[0];
  if (wideSpots.has(primary)) return lane === "center" ? -2 : 2;
  if (centralSpots.has(primary)) return lane === "center" ? 2 : -2;
  return 0;
}

export function weighted(stats: DerivedStats, weights: Partial<Record<StatKey, number>>): number {
  let total = 0;
  for (const [key, w] of Object.entries(weights) as [StatKey, number][]) total += stats[key] * w;
  return total;
}

/** The two-letter-ish stat labels the UI prints. */
export const statLabels: Record<StatKey, string> = { pac: "PAC", sho: "SHO", pas: "PAS", dri: "DRI", def: "DEF", phy: "PHY" };

import { rivalDossier } from "@/features/profile";
import { rivalRoster } from "@/mocks/leaderboard";
import { normaliseTag, playerTagForName, seedHash } from "@/shared/utils";

import type { RivalSeed } from "./types";

/**
 * The rules over the fabricated field.
 *
 * The roster itself is mock data; how you find someone in it, what level they
 * read as, and whether they show as online are rules, and they belong with the
 * board that owns the roster. The friends arena searches the same field the
 * leaderboard ranks, so both reach these.
 */

/** The badge that marks a veteran, on their row and in their dossier. */
export function isProSeed(seed: RivalSeed): boolean {
  return seed.badge === "PRO";
}

/**
 * Resolves a friends-search query to a rival: an exact name first, then an
 * exact tag, then a name substring. Null when nothing matches.
 *
 * The local player is never a result — the web's roster holds rivals only, and
 * you could not add yourself in any case.
 */
export function resolveRival(query: string): RivalSeed | undefined {
  const trimmed = query.trim();
  if (trimmed === "") return undefined;
  const upper = trimmed.toUpperCase();
  const tag = normaliseTag(trimmed);

  let byName: RivalSeed | undefined;
  let byTag: RivalSeed | undefined;
  let byContains: RivalSeed | undefined;

  for (const seed of rivalRoster) {
    const name = seed.name.toUpperCase();
    if (name === upper) byName ??= seed;
    if (playerTagForName(seed.name).replace(/-/g, "") === tag) byTag ??= seed;
    if (byContains === undefined && upper.length >= 2 && name.includes(upper)) {
      byContains = seed;
    }
  }
  return byName ?? byTag ?? byContains;
}

/** The fabricated level a rival reads at — the same one their dossier shows. */
export function rivalLevelFor(seed: RivalSeed): number {
  return rivalDossier({ name: seed.name, xp: seed.base, pro: isProSeed(seed) }).level;
}

/**
 * Whether a rival reads as online.
 *
 * Deterministic from the name, so the count beside FRIENDS is stable rather
 * than flickering on every render — about 55% of the roster is online.
 */
export function rivalIsOnline(name: string): boolean {
  return seedHash(name) % 20 < 11;
}

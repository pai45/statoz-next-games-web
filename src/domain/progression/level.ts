/**
 * The XP curve every StatOz mode shares.
 *
 * A level costs 50 XP more than the one before it, so reaching level L takes
 * `50 · L · (L − 1)` XP in total: 0, 100, 300, 600, 1000 … Each mode keeps its
 * own XP, and the profile levels the sum on the same curve, which is why the
 * rule lives here rather than inside any one feature.
 */

const levelXp = 50;

/** Total XP needed to reach a level. */
export function xpToReach(level: number): number {
  return levelXp * level * (level - 1);
}

/** The inverse of that curve, floored, and never below level one. */
export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  const level = Math.floor(
    (levelXp + Math.sqrt(levelXp * levelXp + 4 * levelXp * xp)) / (2 * levelXp),
  );
  return Math.max(1, level);
}

export type LevelProgress = {
  level: number;
  /** XP earned since this level began. */
  intoLevel: number;
  /** XP this level spans end to end. */
  levelSpan: number;
  toNextLevel: number;
  /** 0..1, for the bar. */
  fraction: number;
};

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, totalXp);
  const level = levelFromXp(xp);
  const start = xpToReach(level);
  const span = xpToReach(level + 1) - start;
  const intoLevel = xp - start;

  return {
    level,
    intoLevel,
    levelSpan: span,
    toNextLevel: span - intoLevel,
    fraction: span === 0 ? 0 : intoLevel / span,
  };
}

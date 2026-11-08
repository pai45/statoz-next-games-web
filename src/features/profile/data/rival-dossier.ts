import { levelProgress, type LevelProgress } from "@/domain/progression";
import { seedHash } from "@/shared/utils";

import type { AchievementStats } from "../types";

/**
 * A deterministic, fabricated profile for a leaderboard rival.
 *
 * There is no backend, so a rival is "scouted" from the only real seeds there
 * are — their display name and their canonical XP. The same name always yields
 * the same dossier, and the numbers scale with XP, so a rival ranked above you
 * genuinely reads as stronger rather than merely differently random.
 *
 * Pure, and deliberately free of any store or component, so it can serve the
 * dossier overlay and the friends roster alike.
 */

export type RivalDossier = {
  name: string;
  totalXp: number;
  level: number;
  band: LevelProgress;
  matchesPlayed: number;
  matchWins: number;
  draws: number;
  /** Whole percent, 0–100. */
  winRate: number;
  bestStreak: number;
  cleanSheets: number;
  shootoutWins: number;
  predictionsMade: number;
  correctPredictions: number;
  predictionAccuracy: number;
  picksPlaced: number;
  picksWon: number;
  activePicks: number;
  pickWinRate: number;
  ownedCards: number;
  platinumOwned: number;
  /** What the achievement catalogue measures this rival against. */
  achievements: AchievementStats;
};

/**
 * An xorshift seeded from a name, so the same rival is scouted identically
 * every time. Every step is masked back to 31 bits, which is what keeps the
 * sequence identical to the app's — the mask makes the arithmetic portable
 * between Dart's integers and JavaScript's.
 */
function seededRng(seed: string): (max: number) => number {
  const hash = seedHash(seed);
  let state = hash === 0 ? 0x1a2b3c4d : hash;

  return (max: number) => {
    if (max <= 0) return 0;
    state ^= (state << 13) & 0x7fffffff;
    state ^= state >> 17;
    state ^= (state << 5) & 0x7fffffff;
    return (state & 0x7fffffff) % max;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function rivalDossier({
  name,
  xp,
  pro = false,
}: {
  name: string;
  xp: number;
  /** A PRO badge; the app uses it to grant an equipped frame. */
  pro?: boolean;
}): RivalDossier {
  const next = seededRng(name);

  // Strength in 0..0.95 from XP (the board's field runs ~1980..3910). It biases
  // every figure below, which is what makes a higher rank look like one.
  const strength = clamp((xp - 1900) / 2200, 0, 0.95);

  const matchesPlayed = 24 + Math.round(strength * 90) + next(16);
  const winRate = clamp(44 + Math.round(strength * 30) + next(11) - 5, 32, 84);
  const matchWins = Math.round((matchesPlayed * winRate) / 100);
  const draws = Math.round(matchesPlayed * (0.1 + next(8) / 100));
  const bestStreak = 2 + Math.round(strength * 6) + next(3);
  const cleanSheets = Math.round(matchWins * (0.25 + next(15) / 100));
  const shootoutWins = 1 + Math.round(strength * 5) + next(3);

  const predictionsMade = 14 + Math.round(strength * 60) + next(18);
  const predictionAccuracy = clamp(
    40 + Math.round(strength * 34) + next(11) - 5,
    28,
    88,
  );
  const correctPredictions = Math.round(
    (predictionsMade * predictionAccuracy) / 100,
  );

  const picksPlaced = 8 + Math.round(strength * 36) + next(12);
  const pickWinRate = clamp(38 + Math.round(strength * 30) + next(11) - 5, 28, 82);
  const picksWon = Math.round((picksPlaced * pickWinRate) / 100);
  const activePicks = next(6);

  const ownedCards = 14 + Math.round(strength * 70) + next(20);
  const platinumOwned = strength > 0.6 ? next(4) : next(2);

  // The app draws an equipped avatar frame here for a PRO. The web has no
  // frame catalogue, so the badge is all a PRO carries — and it is still what
  // marks them out on their row.
  void pro;

  const band = levelProgress(xp);

  return {
    name,
    totalXp: xp,
    level: band.level,
    band,
    matchesPlayed,
    matchWins,
    draws,
    winRate,
    bestStreak,
    cleanSheets,
    shootoutWins,
    predictionsMade,
    correctPredictions,
    predictionAccuracy,
    picksPlaced,
    picksWon,
    activePicks,
    pickWinRate,
    ownedCards,
    platinumOwned,
    achievements: {
      level: band.level,
      totalXp: xp,
      matchesPlayed,
      matchWins,
      bestMatchStreak: bestStreak,
      cleanSheets,
      shootoutWins,
      // Rivals have not hit the court yet — no fabricated hoop record.
      basketballWins: 0,
      tennisAchievements: [],
      predictionsMade,
      correctPredictions,
      picksPlaced,
      picksWon,
      pickStreak: bestStreak,
      pickProfit: (picksWon - (picksPlaced - picksWon)) * 20,
      ownedCards,
      platinumOwned,
      // A rival's wallet is private.
      coins: 0,
    },
  };
}

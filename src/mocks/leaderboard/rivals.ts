import type { RivalSeed } from "@/domain/leaderboard";

/**
 * The fabricated field the boards rank.
 *
 * Every rival is a display name and a canonical XP; their face, level, career
 * and dossier are all expanded from those two seeds, so the same rival reads
 * identically on a row, on the podium and in their dossier.
 *
 * The app's roster carries a twenty-fourth seed — `pai`, 3,870 XP — standing in
 * for the player at a permanent rank #12. The web has a real profile to rank
 * instead, so that seed is gone and the board splices the live player in at
 * their actual XP. Every other seed is verbatim, movements and badges included.
 */
export const rivalRoster: RivalSeed[] = [
  { name: "jarvis", base: 3910, movement: -1, badge: "PRO" },
  { name: "Vortex", base: 3905, movement: 2 },
  { name: "NeoStrike", base: 3901, movement: -1, badge: "PRO" },
  { name: "PhantomX", base: 3897, movement: 1 },
  { name: "Blaze", base: 3893, movement: 4 },
  { name: "Titan", base: 3889, movement: -2 },
  { name: "EchoZero", base: 3885, movement: 1, badge: "PRO" },
  { name: "Reaper", base: 3881, movement: -3 },
  { name: "NovaQ", base: 3878, movement: 2 },
  { name: "Falcon9", base: 3874, movement: -1 },
  { name: "Striker", base: 3872, movement: 5, isNew: true },
  { name: "Diwakar", base: 3860, movement: -2 },
  { name: "monika", base: 3830, movement: 1, badge: "PRO" },
  { name: "Raja2000", base: 3740, movement: -1 },
  { name: "Invincible51", base: 3670, movement: 4 },
  { name: "rocky", base: 3380, movement: -2 },
  { name: "Mirage", base: 3120, movement: 1 },
  { name: "Zenith", base: 2980, movement: -1, isNew: true },
  { name: "Ghost", base: 2810, movement: 2 },
  { name: "Drift", base: 2640, movement: -3 },
  { name: "Volt", base: 2470, movement: 1 },
  { name: "Comet", base: 2300, movement: -1 },
  { name: "Rookie7", base: 1980, movement: 0, isNew: true },
];

/** The badge that marks a veteran, on their row and in their dossier. */
export function isPro(seed: RivalSeed): boolean {
  return seed.badge === "PRO";
}

export function rivalSeedByName(name: string): RivalSeed | undefined {
  return rivalRoster.find((seed) => seed.name === name);
}

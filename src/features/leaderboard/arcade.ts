import type { LeaderboardEntry } from "./types";

/**
 * Pure helpers behind the arcade high-score look. Kept free of React so the
 * rules can be tested on their own.
 */

/** `1ST`, `2ND`, `3RD`, `4TH` … with 11TH–13TH handled. */
export function ordinal(rank: number): string {
  const n = Math.max(0, Math.trunc(rank));
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}TH`;
  switch (n % 10) {
    case 1:
      return `${n}ST`;
    case 2:
      return `${n}ND`;
    case 3:
      return `${n}RD`;
    default:
      return `${n}TH`;
  }
}

/** A score zero-padded the way an arcade cabinet shows it: `000071`. */
export function padScore(value: number, digits = 6): string {
  const whole = Math.max(0, Math.round(value));
  return whole.toString().padStart(digits, "0");
}

export type NextTarget = {
  /** The entry one place above the player. */
  target: LeaderboardEntry;
  /** XP the player still needs to draw level. Never negative. */
  gapXp: number;
};

/**
 * Who the player has to pass next, and by how much.
 *
 * The board is ranked on XP, so the gap is measured in XP, whatever unit the
 * score column shows. Null when the player is not on the board or already
 * holds first place.
 */
export function nextTarget(entries: LeaderboardEntry[]): NextTarget | null {
  const index = entries.findIndex((entry) => entry.isUser);
  if (index <= 0) return null;
  const user = entries[index];
  const target = entries[index - 1];
  return { target, gapXp: Math.max(0, target.xp - user.xp) };
}

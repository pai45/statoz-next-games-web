import type { MatchState, Side } from "./types";

/**
 * Momentum: each side fills a 0–100 bar by winning duels, reading the other
 * side, making saves and scoring. A full bar is a surge, one duel played with
 * a big edge. The bar stays full until the surge is spent, so a side can hold
 * it for the moment that matters.
 */
export const momentumFull = 100;

/** The k shift a surge adds to one duel, in the spender's favour. */
export const surgeBoost = 9;

export const momentumGain = {
  duelWin: 15,
  /** Extra for a big success or a big stop. */
  bigWin: 8,
  /** Extra for a defender who read the move and won. */
  read: 6,
  duelLoss: -7,
  save: 14,
  goalFor: 20,
  goalAgainst: -30,
} as const;

export function surgeReady(state: Pick<MatchState, "momentum">, side: Side): boolean {
  return state.momentum[side] >= momentumFull;
}

/** Moves one side's bar. A full bar holds until it is spent. */
export function addMomentum(state: Pick<MatchState, "momentum">, side: Side, delta: number): void {
  const now = state.momentum[side];
  if (now >= momentumFull) return;
  state.momentum[side] = Math.round(Math.min(momentumFull, Math.max(0, now + delta)));
}

/**
 * Where a side spends its surge: attacking from the other half, or defending
 * its own third. The CPU always follows this; the simulator plays the human
 * the same way so test matches stay symmetric.
 */
export function surgeMoment(state: Pick<MatchState, "possession" | "pending">, side: Side): boolean {
  if (state.pending.kind !== "open") return false;
  const { side: onBall, progress } = state.possession;
  return onBall === side ? progress >= 5 : progress >= 6;
}

export function cpuSpendsSurge(state: Pick<MatchState, "momentum" | "possession" | "pending">): boolean {
  return surgeReady(state, "away") && surgeMoment(state, "away");
}

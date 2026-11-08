import type { RandomSource } from "../../shared/engine/random-source";
import type { Outcome } from "./types";

/**
 * Ballers' duel: a stat edge `k` plus a triangular swing (common results near
 * zero, rare extremes), bucketed into four outcomes from the attacker's side.
 */
export const swingScale = 24;
export const highThreshold = 12;

export function outcomeFor(total: number): Outcome {
  if (total >= highThreshold) return "success_high";
  if (total >= 0) return "success";
  if (total >= -highThreshold) return "fail";
  return "fail_high";
}

export function rollDuel(k: number, volatility: number, random: RandomSource): { swing: number; outcome: Outcome } {
  const spread = swingScale * volatility;
  const swing = (random() + random() - 1) * spread;
  return { swing, outcome: outcomeFor(k + swing) };
}

/** P(X ≥ x) for X triangular on [−s, s] with mode 0. */
function tail(x: number, s: number): number {
  if (x <= -s) return 1;
  if (x >= s) return 0;
  if (x <= 0) return 1 - ((x + s) ** 2) / (2 * s * s);
  return ((s - x) ** 2) / (2 * s * s);
}

/** Exact outcome odds for a duel — the CPU's expected values and the tests use it. */
export function outcomeProbabilities(k: number, volatility: number): Record<Outcome, number> {
  const s = swingScale * volatility;
  const high = tail(highThreshold - k, s);
  const win = tail(-k, s);
  const notDisaster = tail(-highThreshold - k, s);
  return {
    success_high: high,
    success: win - high,
    fail: notDisaster - win,
    fail_high: 1 - notDisaster,
  };
}

export function isWin(outcome: Outcome): boolean {
  return outcome === "success" || outcome === "success_high";
}

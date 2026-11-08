import type { RandomSource } from "../../shared/engine/random-source";

/**
 * Mulberry32 with its state held outside the closure, so a match can store the
 * stream position and every step stays pure and replayable (React StrictMode
 * runs reducers twice; a closure-held stream would advance twice).
 */
export function nextRandom(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let r = Math.imul(next ^ (next >>> 15), 1 | next);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, next];
}

/** A stateful cursor over a stored stream; read `state` back when done. */
export class Stream {
  constructor(public state: number) {}
  next: RandomSource = () => {
    const [value, next] = nextRandom(this.state);
    this.state = next;
    return value;
  };
}

/** A standalone seeded source, for tests and opponent drafting. */
export function seededSource(seed: number): RandomSource {
  return new Stream(seed >>> 0).next;
}

/** FNV-1a, for deterministic per-card jitter. */
export function hashString(value: string): number {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}

export function pickWeighted<T>(items: readonly T[], weights: readonly number[], random: RandomSource): T {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total <= 0) return items[Math.floor(random() * items.length)];
  let roll = random() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= Math.max(0, weights[i]);
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

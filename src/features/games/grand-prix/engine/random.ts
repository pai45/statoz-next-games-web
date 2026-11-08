/**
 * The race's source of randomness.
 *
 * Dart's `Random(seed)` is a multiply-with-carry generator behind a native seed
 * mix, and nothing in the app depends on its exact stream — a race seed is
 * drawn fresh every time and never leaves the device. What *does* matter is
 * that the Dart original and this port can be handed the same stream, or the
 * differential harness compares two different races and proves nothing.
 *
 * So both sides run mulberry32 instead: four integer operations, exactly
 * reproducible in a language with 32-bit `Math.imul` and in one with 64-bit
 * ints, and distributionally indistinguishable from the generator it replaces.
 */

export type RaceRandom = {
  /** A double in [0, 1). */
  nextDouble: () => number;
  /** An integer in [0, max). */
  nextInt: (max: number) => number;
};

export function raceRandom(seed: number): RaceRandom {
  let state = seed | 0;

  const nextDouble = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    nextDouble,
    nextInt: (max: number) => Math.floor(nextDouble() * max),
  };
}

/**
 * A fresh race seed. Drawn in the browser only — a seed rolled during a server
 * render would differ from the client's and the whole race with it.
 */
export function drawRaceSeed(): number {
  return Math.floor(Math.random() * 0x80000000);
}

/**
 * The pseudo-random generator every seeded rally runs on.
 *
 * A textbook 31-bit linear congruential generator, ported constant-for-constant
 * from `TennisRandom` in `tennis_engine.dart`. It is not a good generator and
 * that is not the point: it is *the* generator, so a seed replays a match shot
 * for shot, and a saved snapshot resumes into the same future it would have had.
 *
 * The multiply is done through `Math.imul` because 1103515245 × state overflows
 * a double's exact integer range; Dart's ints do not, so the naive expression
 * would drift from the source after a few hundred draws.
 */
export class TennisRandom {
  state: number;

  constructor(seed: number) {
    this.state = seed & 0x7fffffff;
  }

  nextDouble(): number {
    this.state = (Math.imul(1103515245, this.state) + 12345) & 0x7fffffff;
    return this.state / 0x80000000;
  }

  nextInt(max: number): number {
    return Math.min(max - 1, Math.max(0, Math.floor(this.nextDouble() * max)));
  }
}

/** A signed unit draw, `-1..1` — the spread every aim error is sampled from. */
export function signed(random: TennisRandom): number {
  return random.nextDouble() * 2 - 1;
}

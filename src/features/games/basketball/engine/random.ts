/**
 * The pseudo-random generator every seeded duel runs on.
 *
 * Flutter hands the engine a `dart:math` `Random`, whose stream is an
 * implementation detail of the VM and not reproducible here. What the game
 * actually depends on is that *one seed replays one match* — nothing compares a
 * web match against a Dart one — so this is the same 31-bit LCG Tennis Rally
 * already uses, with the `Random` surface the engine and the AI call through:
 * `nextDouble`, `nextBool`, `nextInt`.
 *
 * The multiply goes through `Math.imul` because the constant times the state
 * overflows a double's exact integer range, which would silently drift the
 * stream after a few hundred draws.
 */
export class BasketballRandom {
  private state: number;

  constructor(seed: number) {
    // A zero state is a fixed point for this generator, so it is nudged off it.
    this.state = (seed & 0x7fffffff) || 0x2545f49;
  }

  nextDouble(): number {
    this.state = (Math.imul(1103515245, this.state) + 12345) & 0x7fffffff;
    return this.state / 0x80000000;
  }

  nextBool(): boolean {
    return this.nextDouble() < 0.5;
  }

  nextInt(max: number): number {
    return Math.min(max - 1, Math.max(0, Math.floor(this.nextDouble() * max)));
  }
}

/**
 * A seed for one match. Drawn in the browser only — a roll during a server
 * render would differ from the client's and React would report the mismatch.
 */
export function drawSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

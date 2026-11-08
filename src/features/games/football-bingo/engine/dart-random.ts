/**
 * Dart's seeded `Random`, and the `List.shuffle` that draws from it.
 *
 * The daily player order is `ids.shuffle(Random(_stableSeed(...)))` in
 * `football_bingo_cubit.dart`. Nothing about that sequence is derivable from
 * first principles — it is whatever Dart's generator emits — so both pieces are
 * ported bit for bit from the SDK: the multiply-with-carry step and Thomas
 * Wang's 64-bit seed mix in `_internal/vm/lib/math_patch.dart`, and the
 * Fisher–Yates walk in `collection/list.dart`.
 *
 * Dart ints are 64-bit and wrap; JavaScript numbers are not, so the generator's
 * state is a `BigInt` narrowed with `asIntN`/`asUintN` at every step. Nine draws
 * per grid, once a day — the cost is irrelevant, and the alternative is a
 * different puzzle order from the app's.
 */

const zero = BigInt(0);
const shift32 = BigInt(32);
const low32 = BigInt("0xffffffff");
const twoTo32 = BigInt("0x100000000");
/** `_A` in the SDK: the multiply-with-carry constant. */
const carryMultiplier = BigInt("0xffffda61");

/** Dart's `n >>> k` on a 64-bit int: shift the bit pattern, not the value. */
function unsignedShift(value: bigint, bits: bigint): bigint {
  return BigInt.asUintN(64, value) >> bits;
}

/** Dart's `n & 0xFFFFFFFF`: the low word, always non-negative. */
function lowWord(value: bigint): bigint {
  return BigInt.asUintN(64, value) & low32;
}

/** Thomas Wang's 64-bit mix, which is how Dart turns a seed into a state. */
function setupSeed(seed: bigint): bigint {
  let n = BigInt.asIntN(64, seed);
  n = BigInt.asIntN(64, ~n + (n << BigInt(21)));
  n = BigInt.asIntN(64, n ^ unsignedShift(n, BigInt(24)));
  n = BigInt.asIntN(64, n * BigInt(265));
  n = BigInt.asIntN(64, n ^ unsignedShift(n, BigInt(14)));
  n = BigInt.asIntN(64, n * BigInt(21));
  n = BigInt.asIntN(64, n ^ unsignedShift(n, BigInt(28)));
  n = BigInt.asIntN(64, n + (n << BigInt(31)));
  return n === zero ? BigInt("0x5a17") : n;
}

/**
 * The generator itself. Only `nextInt` is ported: it is all `shuffle` asks for,
 * and `nextDouble`/`nextBool` would be untested weight.
 */
export class DartRandom {
  private state: bigint;

  constructor(seed: number) {
    this.state = setupSeed(BigInt(seed));
    // The SDK cranks four times to spread the seed bits before first use.
    for (let i = 0; i < 4; i += 1) this.step();
  }

  private step(): void {
    const stateLow = lowWord(this.state);
    const stateHigh = unsignedShift(this.state, shift32);
    this.state = BigInt.asIntN(64, carryMultiplier * stateLow + stateHigh);
  }

  /** A value in `[0, max)`. */
  nextInt(max: number): number {
    if (max <= 0 || max > twoTo32) {
      throw new RangeError(`max must be positive and <= 2^32, got ${max}`);
    }

    // Powers of two need no rejection: the low bits are already uniform.
    if ((max & -max) === max) {
      this.step();
      return Number(lowWord(this.state) & BigInt(max - 1));
    }

    const bound = BigInt(max);
    let drawn: bigint;
    let result: bigint;
    // Rejection sampling, so the fold back into `[0, max)` stays uniform. The
    // comparison is `>` rather than `>=`, exactly as the SDK writes it.
    do {
      this.step();
      drawn = lowWord(this.state);
      result = drawn % bound;
    } while (drawn - result + bound > twoTo32);
    return Number(result);
  }
}

/**
 * Dart's in-place `List.shuffle`, which walks down from the end swapping each
 * position with an earlier one. The direction and the shrinking bound both
 * matter: reversing either gives a different permutation from the same seed.
 */
export function dartShuffle<T>(values: T[], random: DartRandom): T[] {
  let length = values.length;
  while (length > 1) {
    const position = random.nextInt(length);
    length -= 1;
    const held = values[length];
    values[length] = values[position];
    values[position] = held;
  }
  return values;
}

/**
 * The FNV-1a variant the cubit uses to turn `"<puzzleId>:<dayKey>"` into a
 * seed, masked to 31 bits so it is always a positive Dart int.
 *
 * `Math.imul` rather than `*`: the true product runs past 2^53 and a plain
 * multiply would round it, but only the low 31 bits survive the mask and those
 * are exactly what `imul` keeps.
 */
export function stableSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) & 0x7fffffff;
  }
  return hash;
}

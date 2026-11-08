/**
 * SplitMix64 with explicitly masked unsigned 64-bit arithmetic.
 *
 * The Dart original uses `BigInt` rather than the VM's signed `int` precisely so
 * that a match seed produces the same over on every runtime. JavaScript's
 * `BigInt` reproduces it exactly: `BigInt.asUintN(64, x)` stands in for Dart's
 * `& 0xffffffffffffffff`, and both languages treat a BigInt as infinite
 * two's-complement, so the negative ordinal salt below wraps identically.
 *
 * Seeds stay `bigint` all the way through. Dart's `int` is a true 64-bit
 * integer, and a derived stream seed routinely exceeds `Number.MAX_SAFE_INTEGER`
 * — passing one through `number` silently rounds it and every draw downstream
 * diverges from the Flutter engine. Verified against the Dart original.
 *
 * Do not "optimise" this into `Number` arithmetic for the same reason.
 */

import { randomStreams, type RandomStream } from "../types";

const mask64 = (value: bigint): bigint => BigInt.asUintN(64, value);

/**
 * Written as `BigInt("0x…")` rather than a `0x…n` literal because the project
 * compiles to an ES2017 target, where the literal form is a type error. The
 * values are identical and evaluated once at module load.
 */
const twoTo64 = BigInt(1) << BigInt(64);
const twoTo63 = BigInt(1) << BigInt(63);
const increment = BigInt("0x9e3779b97f4a7c15");
const mix1 = BigInt("0xbf58476d1ce4e5b9");
const mix2 = BigInt("0x94d049bb133111eb");
const shift11 = BigInt(11);
const shift27 = BigInt(27);
const shift30 = BigInt(30);
const shift31 = BigInt(31);

/** The 53 bits a JavaScript double can hold exactly. */
const twoTo53 = 9007199254740992;

function mixBits(value: bigint): bigint {
  let z = mask64(value);
  z = mask64((z ^ (z >> shift30)) * mix1);
  z = mask64((z ^ (z >> shift27)) * mix2);
  return mask64(z ^ (z >> shift31));
}

/** The signed two's-complement view of 64 random bits, as Dart reports it. */
function toSigned(bits: bigint): bigint {
  return bits >= twoTo63 ? bits - twoTo64 : bits;
}

export class DeterministicRandom {
  private state: bigint;

  constructor(seed: number | bigint) {
    this.state = mask64(typeof seed === "bigint" ? seed : BigInt(Math.trunc(seed)));
  }

  private nextBits(): bigint {
    this.state = mask64(this.state + increment);
    return mixBits(this.state);
  }

  nextUint64(): bigint {
    return toSigned(this.nextBits());
  }

  nextDouble(): number {
    return Number(this.nextBits() >> shift11) / twoTo53;
  }

  nextBool(probability = 0.5): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.nextDouble() < probability;
  }

  /**
   * Rejection sampling, not a plain modulo — the discarded range is what keeps
   * the distribution uniform, and dropping it would shift every seeded draw.
   */
  nextInt(maximum: number): number {
    if (maximum <= 0) {
      throw new RangeError(`nextInt maximum must be positive, got ${maximum}`);
    }
    const bound = BigInt(Math.trunc(maximum));
    const threshold = twoTo64 % bound;
    for (;;) {
      const value = this.nextBits();
      if (value >= threshold) return Number(value % bound);
    }
  }

  range(minimum: number, maximum: number): number {
    if (maximum < minimum) {
      throw new RangeError("maximum must not be smaller than minimum");
    }
    return minimum + (maximum - minimum) * this.nextDouble();
  }

  choose<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new RangeError("Cannot choose from an empty list");
    }
    return values[this.nextInt(values.length)];
  }
}

export function mix64(value: number | bigint): bigint {
  return toSigned(
    mixBits(mask64(typeof value === "bigint" ? value : BigInt(Math.trunc(value)))),
  );
}

/**
 * Named streams keep unrelated decisions from perturbing each other: a re-rolled
 * catch must not shift the next delivery's line. The salt order matches the
 * `randomStreams` array, which is the ported enum order.
 */
const streamSalts: readonly bigint[] = [
  BigInt("0x243f6a8885a308d3"),
  BigInt("0x13198a2e03707344"),
  BigInt("0xa4093822299f31d0"),
  BigInt("0x082efa98ec4e6c89"),
  BigInt("0x452821e638d01377"),
  BigInt("0xbe5466cf34e90c6c"),
];

/** Negative on purpose; the multiply below is allowed to wrap. */
const ordinalSalt = -BigInt("0x61c8864680b583eb");

/** Derives a unique stream seed from the match and the physical delivery. */
export function seedFor(
  matchSeed: number,
  deliveryOrdinal: number,
  stream: RandomStream,
): bigint {
  const match = mixBits(mask64(BigInt(Math.trunc(matchSeed))));
  const ordinal = mixBits(BigInt(Math.trunc(deliveryOrdinal)) * ordinalSalt);
  const salt = streamSalts[randomStreams.indexOf(stream)];
  return toSigned(mixBits(match ^ ordinal ^ salt));
}

export function randomForStream(
  matchSeed: number,
  deliveryOrdinal: number,
  stream: RandomStream,
): DeterministicRandom {
  return new DeterministicRandom(seedFor(matchSeed, deliveryOrdinal, stream));
}

/**
 * A small, stable number for seeding presentation-only randomness — the wicket
 * burst's shard angles and suchlike. Never feed this back into the engine.
 */
export function visualSeed(seed: bigint): number {
  return Number(BigInt.asUintN(32, seed));
}

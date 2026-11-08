import { seedHash } from "./hash";

/**
 * The shareable `XXXX-XXXX` player tag.
 *
 * A tag is the only handle one player can give another here — there is no
 * backend, so the friends search resolves a pasted tag by expanding every
 * rival's name through the same function and comparing. That is why this lives
 * in one place: the profile mints the player's own tag from a random seed, and
 * the roster derives a rival's from their name, and both must spell it the
 * same way.
 */

/** No 0/O/1/I/L look-alikes, so a tag can be read aloud or copied by hand. */
const tagAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * An 8-character tag expanded deterministically from a seed.
 *
 * The same LCG the app uses, which matters because both sides must agree on
 * what a given seed spells. `Math.imul` keeps the multiply inside 32 bits —
 * plain multiplication would pass 2^53 and start rounding, and the low bits are
 * the only part the mask keeps.
 */
export function tagFromSeed(seed: number): string {
  let state = (seed ^ 0x5f3759df) & 0x7fffffff;
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    if (i === 4) out += "-";
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    out += tagAlphabet[state % tagAlphabet.length];
  }
  return out;
}

/** A fresh tag, minted once for this browser and then kept. */
export function randomPlayerTag(): string {
  return tagFromSeed(Math.floor(Math.random() * 0x7fffffff));
}

/** The stable tag for a rival: the same name always spells the same tag. */
export function playerTagForName(name: string): string {
  return tagFromSeed(seedHash(name));
}

/** A search query reduced to a comparable tag — upper case, no spaces or dashes. */
export function normaliseTag(query: string): string {
  return query.toUpperCase().replace(/[\s-]/g, "");
}

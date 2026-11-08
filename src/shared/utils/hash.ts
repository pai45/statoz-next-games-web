/**
 * A 31-bit hash of a string, used as a seed wherever something has to look
 * random but stay the same every time: which face a rival wears, which career
 * their dossier is scouted from.
 *
 * The `& 0x7fffffff` after every step is what keeps it inside 31 bits, and it
 * is also why this is portable — the same expression in Dart's 64-bit integers
 * and JavaScript's doubles produces the same number, so a name that maps to one
 * face in the app maps to that same face here.
 */
export function seedHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

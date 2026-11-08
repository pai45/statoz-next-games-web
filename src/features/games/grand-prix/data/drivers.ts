import type { RaceRandom } from "../engine/random";

/**
 * The CPU driver name pool, ported from `data/grand_prix_drivers.dart`.
 *
 * Twenty first names crossed with twenty surnames — four hundred paddock-
 * sounding drivers, none of them a real pairing. The cross product order is
 * load-bearing: the shuffle that draws a field walks this list, so the order
 * here is part of what a seed means.
 */
const firstNames = [
  "Luca",
  "Mika",
  "Jules",
  "Rio",
  "Kazuki",
  "Nico",
  "Theo",
  "Enzo",
  "Otto",
  "Dario",
  "Ivan",
  "Marco",
  "Alexi",
  "Bruno",
  "Felix",
  "Hugo",
  "Levi",
  "Mateo",
  "Ayaan",
  "Callum",
];

const lastNames = [
  "Vermeer",
  "Castellano",
  "Lindqvist",
  "Okada",
  "Ferrand",
  "Novak",
  "Almeida",
  "Baumann",
  "Kowalski",
  "Marchetti",
  "Sorensen",
  "Duval",
  "Ishida",
  "Petrakis",
  "Weller",
  "Zubarev",
  "Nakamura",
  "Herrero",
  "Vance",
  "Adeyemi",
];

export const grandPrixDriverNames: string[] = firstNames.flatMap((first) =>
  lastNames.map((last) => `${first} ${last}`),
);

/**
 * Draws `count` unique names.
 *
 * Dart's `List.shuffle` is a Fisher–Yates walking downward from the end, and it
 * is reproduced here rather than replaced with an idiomatic shuffle: the same
 * seed has to deal the same grid on both sides for the differential harness to
 * mean anything.
 */
export function generateDriverNames(
  count: number,
  random: RaceRandom,
): string[] {
  const pool = [...grandPrixDriverNames];
  let length = pool.length;
  while (length > 1) {
    const pos = random.nextInt(length);
    length -= 1;
    const swap = pool[length];
    pool[length] = pool[pos];
    pool[pos] = swap;
  }
  return pool.slice(0, count);
}

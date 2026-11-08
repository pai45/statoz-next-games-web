/**
 * The rival the matchmaking queue produces.
 *
 * Ported verbatim from Flutter's `random_opponent_names.dart`: twenty-five
 * first names against twenty last names, so five hundred rivals — enough that
 * a repeat inside one session reads as coincidence rather than a short list.
 */
import type { RandomSource } from "../engine/random-source";

const firstNames = [
  "Aarav", "Mateo", "Luca", "Noah", "Elias",
  "Omar", "Kenji", "Rafael", "Dante", "Niko",
  "Sofia", "Maya", "Amara", "Leila", "Ines",
  "Yara", "Mina", "Talia", "Nora", "Elena",
  "Theo", "Kai", "Arjun", "Malik", "Diego",
];

const lastNames = [
  "Sharma", "Rossi", "Tan", "Silva", "Okafor",
  "Haddad", "Santos", "Kovac", "Novak", "Mensah",
  "Garcia", "Petrov", "Kimani", "Moreau", "Rahman",
  "Bennett", "Alvarez", "Hassan", "Ito", "Diallo",
];

export const opponentNames: string[] = firstNames.flatMap((first) =>
  lastNames.map((last) => `${first} ${last}`),
);

export function randomOpponentName(random: RandomSource = Math.random): string {
  return opponentNames[Math.floor(random() * opponentNames.length)];
}

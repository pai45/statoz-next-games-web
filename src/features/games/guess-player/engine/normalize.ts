/**
 * The search fold from `guess_player_cubit.dart`.
 *
 * Typing `mbappe` has to find Mbappé, so accents are folded before matching.
 * The table is the app's, character for character — including the pairs that
 * fold to two letters — because the port must agree with it on which players a
 * query reaches and, through the prefix test, on what order they come back in.
 *
 * Deliberately not `String.normalize("NFD")`: that would fold characters the
 * app leaves alone, and would silently change the result set.
 */

const folds: Record<string, string> = {
  "á": "a",
  "à": "a",
  "â": "a",
  "ä": "a",
  "ã": "a",
  "å": "a",
  "æ": "ae",
  "ç": "c",
  "é": "e",
  "è": "e",
  "ê": "e",
  "ë": "e",
  "í": "i",
  "ì": "i",
  "î": "i",
  "ï": "i",
  "ñ": "n",
  "ó": "o",
  "ò": "o",
  "ô": "o",
  "ö": "o",
  "õ": "o",
  "ø": "o",
  "œ": "oe",
  "ú": "u",
  "ù": "u",
  "û": "u",
  "ü": "u",
  "ý": "y",
  "ÿ": "y",
  "š": "s",
  "ž": "z",
};

/**
 * Lower-cased, accent-folded, and reduced to single-spaced words.
 *
 * Iterated by code point rather than by UTF-16 unit, which is what Dart's
 * `runes` does; anything outside the table and outside `[a-z0-9]` becomes a
 * space, and the ends are trimmed.
 */
export function normalizeGuessPlayerSearch(value: string): string {
  const lower = value.trim().toLowerCase();
  let folded = "";
  for (const char of lower) folded += folds[char] ?? char;
  return folded.replace(/[^a-z0-9]+/g, " ").trim();
}

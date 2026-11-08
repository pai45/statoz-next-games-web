/**
 * Dart's `String.compareTo`, which orders by UTF-16 code unit.
 *
 * `localeCompare` is the wrong tool here: it collates, so it files `Álvarez`
 * next to `Alvarez` where Dart files it after `Z`. Both are defensible orders,
 * but only one matches the app — and this decides which player a search offers
 * first, so it has to be the app's.
 */
export function compareStrings(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a.charCodeAt(index);
    const right = b.charCodeAt(index);
    if (left !== right) return left < right ? -1 : 1;
  }
  if (a.length === b.length) return 0;
  return a.length < b.length ? -1 : 1;
}

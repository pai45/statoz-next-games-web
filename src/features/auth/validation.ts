/**
 * Deliberately lenient: something before an `@`, a dotted domain after it, and
 * no whitespace. The provider is the real authority on whether an address
 * exists, so this only catches obvious typos before a round trip.
 */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value.trim());
}

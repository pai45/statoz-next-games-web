/**
 * A source of uniform randomness, so an engine stays pure and seedable.
 *
 * Shared because every game needs the same escape hatch: production passes
 * `Math.random`, a test or a replay passes a seeded generator, and nothing in
 * the rules layer ever reaches for the global.
 */
export type RandomSource = () => number;

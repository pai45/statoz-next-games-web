/**
 * The five difficulty rungs every mode is authored in. Band `k` owns sets
 * `10(k-1)+1 … 10k`, so the chapter selector doubles as the difficulty ladder —
 * the rung name carries the real information and the set range is the fine
 * print.
 */
export const bandNames = [
  "FOUNDATION",
  "PROSPECT",
  "CONTENDER",
  "SPECIALIST",
  "LEGEND",
] as const;

/** Which band a set number falls in, zero-based. */
export function bandForSet(setNumber: number): number {
  return Math.floor((setNumber - 1) / 10);
}

/** The first set of a band, one-based. */
export function firstSetOfBand(band: number): number {
  return band * 10 + 1;
}

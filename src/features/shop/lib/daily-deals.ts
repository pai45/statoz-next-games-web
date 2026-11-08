/**
 * The daily market's rules, kept free of React and catalogue imports so they
 * can be tested on their own.
 *
 * Deals are picked deterministically from the sport and the local calendar day:
 * the same three items stay on offer through every reload, and a new three
 * arrive at local midnight. Nothing is stored. A deal is "claimed" simply by
 * owning its item.
 */

export type DailyDeal<Slot extends string, Item> = {
  slot: Slot;
  item: Item;
  /** Whole percent off, e.g. 30. */
  discount: number;
};

const DAY_MS = 86_400_000;

/** The local calendar day as `YYYY-MM-DD`. */
export function dayKey(now: number): string {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Milliseconds until the next local midnight, when the deals change. */
export function msUntilReset(now: number): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, Math.min(DAY_MS, next.getTime() - now));
}

/** `HH:MM:SS` for a countdown. */
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

/** A discounted price: rounded down, never below 1. A free item stays free. */
export function dealPrice(price: number, discount: number): number {
  if (price <= 0) return 0;
  return Math.max(1, Math.floor((price * (100 - discount)) / 100));
}

/**
 * One deal per slot, in slot order. A slot whose pool is empty is skipped, so
 * a sport with no cosmetics yet still gets its other deals.
 */
export function pickDailyDeals<Slot extends string, Item>(
  seed: string,
  slots: readonly Slot[],
  pools: Readonly<Record<Slot, readonly Item[]>>,
  discounts: readonly number[],
): DailyDeal<Slot, Item>[] {
  const random = seededRandom(seed);
  const deals: DailyDeal<Slot, Item>[] = [];
  for (const slot of slots) {
    const pool = pools[slot];
    // Draw both numbers even for an empty pool, so one sport's empty slot
    // never shifts what the other slots pick.
    const itemRoll = random();
    const discountRoll = random();
    if (!pool.length || !discounts.length) continue;
    deals.push({
      slot,
      item: pool[Math.floor(itemRoll * pool.length)],
      discount: discounts[Math.floor(discountRoll * discounts.length)],
    });
  }
  return deals;
}

/** mulberry32, seeded from an FNV-1a hash of the string. */
function seededRandom(seed: string): () => number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

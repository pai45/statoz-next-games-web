import test from "node:test";
import assert from "node:assert/strict";

import {
  dayKey,
  dealPrice,
  formatCountdown,
  msUntilReset,
  pickDailyDeals,
} from "../src/features/shop/lib/daily-deals";
import { dailyDealConfig } from "../src/mocks/shop/catalog";

const pools = {
  cosmetic: Array.from({ length: 25 }, (_, index) => `cosmetic-${index}`),
  avatar: Array.from({ length: 30 }, (_, index) => `avatar-${index}`),
};

function pick(seed: string, source = pools) {
  return pickDailyDeals(seed, dailyDealConfig.slots, source, dailyDealConfig.discounts);
}

test("the same sport and day always offer the same deals", () => {
  assert.deepEqual(pick("football:2026-10-28"), pick("football:2026-10-28"));
});

test("a new day or another sport changes the offer", () => {
  const today = pick("football:2026-10-28");
  const days = ["2026-10-29", "2026-10-30", "2026-10-31"].map((day) => pick(`football:${day}`));
  assert.ok(days.some((deals) => JSON.stringify(deals) !== JSON.stringify(today)));
  assert.notDeepEqual(pick("cricket:2026-10-28"), today);
});

test("one deal per slot, in slot order, with a configured discount", () => {
  for (const seed of ["a", "b", "tennis:2026-01-01", "motorsport:2026-12-31"]) {
    const deals = pick(seed);
    assert.deepEqual(deals.map((deal) => deal.slot), dailyDealConfig.slots);
    for (const deal of deals) {
      assert.ok(dailyDealConfig.discounts.includes(deal.discount));
      assert.ok((pools[deal.slot] as string[]).includes(deal.item));
    }
  }
});

test("an empty pool skips its slot without moving the others", () => {
  const full = pick("tennis:2026-10-28");
  const partial = pick("tennis:2026-10-28", { ...pools, cosmetic: [] });
  assert.deepEqual(partial.map((deal) => deal.slot), ["avatar"]);
  assert.deepEqual(partial[0], full[1]);
});

test("deal prices round down, never reach zero, and keep free items free", () => {
  assert.equal(dealPrice(150, 30), 105);
  assert.equal(dealPrice(25, 40), 15);
  assert.equal(dealPrice(99, 25), 74);
  assert.equal(dealPrice(1, 40), 1);
  assert.equal(dealPrice(0, 30), 0);
});

test("the day key and reset countdown follow local midnight", () => {
  const evening = new Date(2026, 9, 28, 23, 59, 30).getTime();
  assert.equal(dayKey(evening), "2026-10-28");
  assert.equal(msUntilReset(evening), 30_000);
  assert.equal(formatCountdown(msUntilReset(evening)), "00:00:30");

  const midnight = new Date(2026, 9, 29, 0, 0, 0).getTime();
  assert.equal(dayKey(midnight), "2026-10-29");
  assert.ok(msUntilReset(midnight) > 23 * 3_600_000);
  assert.equal(formatCountdown(7 * 3_600_000 + 41 * 60_000 + 12_000), "07:41:12");
});

test("player cards are never a daily deal", () => {
  assert.ok(!(dailyDealConfig.slots as string[]).includes("card"));
});

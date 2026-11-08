import type { CoinBundle } from "@/mocks/shop";

/** Splits a bundle into base and bonus coins. Derived from the price list; amounts never change here. */
export function coinBundleValue(bundle: CoinBundle) {
  const base = Math.round(bundle.coins / (1 + bundle.bonus / 100));
  return {base, bonusCoins: bundle.coins - base};
}

/** How many unlocks at a given price one bundle covers. */
export function coinUnlocks(bundle: CoinBundle, price: number) {
  return price > 0 ? Math.floor(bundle.coins / price) : 0;
}

/** Lit segments on the bonus ladder: one per 10% bonus. */
export function coinBonusSteps(bundle: CoinBundle, steps = 5) {
  return Math.max(0, Math.min(steps, Math.round(bundle.bonus / 10)));
}

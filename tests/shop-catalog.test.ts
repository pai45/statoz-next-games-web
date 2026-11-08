import test from "node:test";
import assert from "node:assert/strict";

import { readEconomy } from "../src/features/economy";
import {
  buildShopCatalog, buildStorefrontCatalog, categoryFromTab, featuredShopProducts, filterShopCatalog, loadoutProgress, storefrontCategories,
  nextLoadoutProduct, productState, shopAvatarSource, shopTierFor, type ShopAvatar,
} from "../src/features/shop/lib/shop-catalog";
import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { avatarOptions } from "../src/mocks/onboarding/avatars";
import { avatarPrice, coinBundles, colorProducts, shopBanners, shopFrames } from "../src/mocks/shop";
import { coinBonusSteps, coinBundleValue, coinUnlocks } from "../src/features/shop/lib/coin-bundles";
import { leavesPlatformFrame } from "../src/features/games/shared/mobile-viewport/policy";

const avatars: ShopAvatar[] = footballPlayerCards.map(card => ({card, src: `/test-portraits/${card.id}.webp`}));
const wallet = () => structuredClone(readEconomy());

test("catalogue adapts existing records without changing prices or selling player cards", () => {
  for (const sport of ["football", "cricket", "basketball", "motorsport"] as const) {
    const catalog = buildShopCatalog(sport, avatars);
    assert.ok(catalog.length > 0);
    assert.equal(new Set(catalog.map(item => `${item.kind}:${item.id}`)).size, catalog.length);
    for (const item of catalog) {
      assert.equal(item.sport, sport);
      assert.ok(Number.isInteger(item.price) && item.price >= 0);
      if (item.kind === "frame") assert.equal(item.price, shopFrames.find(frame => frame.id === item.id)!.price);
      else if (item.kind === "banner") assert.equal(item.price, shopBanners.find(banner => banner.id === item.id)!.price);
      else if (item.art.type === "kit") assert.equal(item.price, colorProducts.find(product => product.id === item.id)!.price);
      else assert.equal(item.price, avatarOptions.some(avatar => avatar.id === item.id) ? 0 : avatarPrice);
    }
    assert.ok(!catalog.some(item => ["playerCard", "actionCard", "pack"].includes(item.kind)));
  }
});

test("search includes portraits, teams, country names and unaccented spellings", () => {
  const catalog = buildShopCatalog("football", avatars), economy = wallet();
  const find = (query: string) => filterShopCatalog(catalog, economy, {category: "featured", query, ownedOnly: false, sort: "recommended"});
  assert.ok(find("neymar").some(item => item.id === "bra-neymar" && item.kind === "avatar"));
  assert.ok(find("kylian mbappe").some(item => item.id === "fra-kylian-mbappe"));
  assert.ok(find("brazil neymar").some(item => item.id === "bra-neymar"));
  assert.ok(find("  LFC   EPL ").some(item => item.id === "frame_liv"));
  assert.equal(find("no-such-product-999").length, 0);
});

test("item rarity is a presentation tier derived from the unchanged price ladder", () => {
  assert.deepEqual([0, 25, 100, 150].map(shopTierFor), ["bronze", "silver", "gold", "platinum"]);
  for (const sport of ["football", "cricket", "basketball", "motorsport"] as const) {
    for (const item of buildShopCatalog(sport, avatars)) assert.equal(item.tier, shopTierFor(item.price), item.id);
  }
  const football = buildShopCatalog("football", avatars);
  assert.equal(football.find(item => item.id === "frame_liv")?.tier, "platinum");
  assert.equal(football.find(item => item.id === "bra-neymar")?.tier, "silver");
  assert.equal(football.find(item => item.id === "adams")?.tier, "bronze");
});

test("coin bundles split into base and bonus coins without changing the price list", () => {
  for (const bundle of coinBundles) {
    const {base, bonusCoins} = coinBundleValue(bundle);
    assert.equal(base + bonusCoins, bundle.coins, bundle.id);
    assert.ok(Math.abs(bonusCoins - base * bundle.bonus / 100) <= 1, bundle.id);
  }
  const pro = coinBundles.find(bundle => bundle.id === "pro")!;
  assert.deepEqual(coinBundleValue(pro), {base: 10000, bonusCoins: 2000});
  assert.equal(coinUnlocks(pro, 150), 80);
  assert.equal(coinUnlocks(pro, 0), 0);
  assert.deepEqual(coinBundles.map(bundle => coinBonusSteps(bundle)), [0, 1, 2, 3, 4, 5]);
});

test("category, owned-only and price/name sorting all affect the actual catalogue", () => {
  const catalog = buildShopCatalog("football", avatars), economy = wallet();
  const owned = filterShopCatalog(catalog, economy, {category: "avatars", query: "", ownedOnly: true, sort: "name"});
  assert.equal(owned.length, avatarOptions.length);
  assert.ok(owned.every(item => economy.owned.avatarIds.includes(item.id)));
  assert.deepEqual(owned.map(item => item.name), [...owned.map(item => item.name)].sort((a, b) => a.localeCompare(b)));
  const sorted = filterShopCatalog(catalog, economy, {category: "featured", query: "", ownedOnly: false, sort: "price"});
  assert.ok(sorted.every((item, i) => i === 0 || item.price >= sorted[i-1].price));
  assert.ok(filterShopCatalog(catalog, economy, {category: "frames", query: "", ownedOnly: false, sort: "recommended"}).every(item => item.kind === "frame"));
});

test("ownership and equipped states cannot be forged by an equipped ID alone", () => {
  const frame = buildShopCatalog("football").find(item => item.id === "frame_liv")!, economy = wallet();
  assert.equal(productState(frame, economy), "new");
  economy.equipped.frameId = frame.id;
  assert.equal(productState(frame, economy), "new");
  economy.owned.frameIds.push(frame.id);
  assert.equal(productState(frame, economy), "equipped");
  economy.equipped.frameId = null;
  assert.equal(productState(frame, economy), "owned");
});

test("loadout progress uses real equipped slots and suggests owned gear before a purchase", () => {
  const economy = wallet(), products = buildShopCatalog("football", avatars);
  assert.equal(loadoutProgress(economy).filter(slot => slot.complete).length, 2);
  assert.equal(nextLoadoutProduct(products, economy)?.kind, "frame");
  economy.owned.frameIds.push("frame_ars");
  assert.equal(nextLoadoutProduct(products, economy)?.id, "frame_ars");
  economy.equipped.frameId = "frame_ars";
  assert.equal(loadoutProgress(economy).filter(slot => slot.complete).length, 3);
  assert.equal(nextLoadoutProduct(products, economy), null);
});

test("featured items are a small varied selection, not a duplicate of the spotlight", () => {
  const products = buildShopCatalog("football", avatars), economy = wallet();
  const before = JSON.stringify(products), spotlight = nextLoadoutProduct(products, economy);
  const picks = featuredShopProducts(products, economy, spotlight);
  assert.equal(picks.length, 4);
  assert.ok(new Set(picks.map(item => item.kind)).size >= 3);
  assert.ok(!picks.some(item => item.id === spotlight?.id && item.kind === spotlight?.kind));
  assert.equal(JSON.stringify(products), before);
});

test("starter and purchased portrait sources both resolve to a real selected look", () => {
  assert.equal(shopAvatarSource("adams", avatars), "/assets/avatars/adams.webp");
  assert.equal(shopAvatarSource("bra-neymar", avatars), "/test-portraits/bra-neymar.webp");
  assert.equal(shopAvatarSource("missing-avatar", avatars), undefined);
});

test("legacy deep links remain useful and shop pages stay in the landscape phone frame", () => {
  assert.equal(categoryFromTab("style"), "avatars");
  assert.equal(categoryFromTab("frames"), "frames");
  assert.equal(categoryFromTab("coins"), "coins");
  assert.equal(categoryFromTab("borders"), "frames");
  assert.equal(categoryFromTab("kits"), "avatars");
  assert.equal(categoryFromTab("packs"), "avatars");
  assert.equal(categoryFromTab("cards"), "avatars");
  assert.equal(categoryFromTab(null), "avatars");
  assert.equal(leavesPlatformFrame("/shop"), false);
  assert.equal(leavesPlatformFrame("/shop/search"), false);
  assert.equal(leavesPlatformFrame("/shopping"), false);
  assert.equal(leavesPlatformFrame("/games/cricket"), false);
});

test("the storefront combines all five sports and lists every profile cosmetic once", () => {
  const catalog = buildStorefrontCatalog(avatars);
  assert.deepEqual(storefrontCategories, ["coins", "avatars", "frames", "banners"]);
  assert.equal(new Set(catalog.map(item => `${item.kind}:${item.id}`)).size, catalog.length);
  assert.deepEqual([...new Set(catalog.map(item => item.sport))].sort(), ["basketball", "cricket", "football", "motorsport", "tennis"]);
  assert.ok(catalog.every(item => ["avatar", "frame", "banner"].includes(item.kind)));
  for (const avatar of avatarOptions) assert.equal(catalog.filter(item => item.kind === "avatar" && item.id === avatar.id).length, 1);
  for (const frame of shopFrames) assert.equal(catalog.find(item => item.kind === "frame" && item.id === frame.id)?.price, frame.price);
  for (const banner of shopBanners) assert.equal(catalog.find(item => item.kind === "banner" && item.id === banner.id)?.price, banner.price);
  assert.equal(catalog.find(item => item.id === "korea")?.sport, "tennis");
});

import { playerRoleSports, type PlayerCard } from "@/domain/cards";
import type { RarityName } from "@statoz/design-system/games";
import { sportModules, type Sport } from "@/domain/sports";
import type { EconomySnapshot } from "@/features/economy";
import { avatarPrice, colorProducts, shopBanners, shopFrames, type ColorProduct, type ShopBanner } from "@/mocks/shop";
import { avatarOptions } from "@/mocks/onboarding/avatars";

export type ShopKind = "avatar" | "frame" | "banner" | "kit" | "jersey" | "livery";
export type ShopCategory = "featured" | "avatars" | "frames" | "banners" | "kits" | "coins";
export type ShopSort = "recommended" | "price" | "name";
export const storefrontCategories = ["coins", "avatars", "frames", "banners"] as const;
export type StorefrontCategory = typeof storefrontCategories[number];
export type ShopProduct = {
  id: string;
  kind: ShopKind;
  category: Exclude<ShopCategory, "featured" | "coins">;
  name: string;
  subtitle: string;
  sport: Sport;
  price: number;
  /** Presentation rarity derived from the established price ladder. */
  tier: RarityName;
  accent: string;
  keywords: string[];
  rank: number;
  art:
    | { type: "avatar"; src: string }
    | { type: "frame"; color: string; initials: string }
    | { type: "banner"; banner: ShopBanner }
    | { type: "kit"; item: ColorProduct };
};
export type ShopAvatar = { card: PlayerCard; src: string };
type ShopProductBase = Omit<ShopProduct, "tier">;

/** Free starters are bronze; portraits and banners silver; kits gold; team frames platinum. */
export function shopTierFor(price: number): RarityName {
  if (price <= 0) return "bronze";
  if (price <= 25) return "silver";
  if (price <= 100) return "gold";
  return "platinum";
}

/** Adapts existing catalogue records; prices and ownership stay with their established owners. */
export function buildShopCatalog(sport: Sport, avatars: readonly ShopAvatar[] = []): ShopProduct[] {
  const products: ShopProductBase[] = [
    // Starter portraits are global profile cosmetics, usable while browsing any sport.
    ...avatarOptions.map((avatar): ShopProductBase => ({
      id: avatar.id, kind: "avatar", category: "avatars", name: avatar.label, subtitle: "Included profile avatar",
      sport, price: 0, accent: "var(--ds-color-accent-cyan)", keywords: ["starter", "included"], rank: -1,
      art: {type: "avatar", src: avatar.src},
    })),
    ...shopFrames.filter(frame => frame.sport === sport).map((frame): ShopProductBase => ({
      id: frame.id, kind: "frame", category: "frames", name: frame.label, subtitle: `${frame.leagueId.toUpperCase()} · Team frame`,
      sport, price: frame.price, accent: frame.color, keywords: [frame.shortLabel, frame.teamId, frame.leagueId], rank: 0,
      art: {type: "frame", color: frame.color, initials: frame.shortLabel},
    })),
    ...avatars.filter(({card}) => playerRoleSports[card.role] === sport).map(({card, src}): ShopProductBase => ({
      id: card.id, kind: "avatar", category: "avatars", name: card.name, subtitle: `${card.countryCode} · Profile avatar`,
      sport, price: avatarPrice, accent: "var(--ds-color-accent-cyan)", keywords: [card.shortName, card.countryCode, card.country], rank: card.rating,
      art: {type: "avatar", src},
    })),
    ...shopBanners.filter(banner => banner.sport === sport).map((banner): ShopProductBase => ({
      id: banner.id, kind: "banner", category: "banners", name: banner.label, subtitle: "Profile banner",
      sport, price: banner.price, accent: banner.accent, keywords: [banner.id], rank: 0, art: {type: "banner", banner},
    })),
    ...colorProducts.filter(item => item.sport === sport).map((item): ShopProductBase => ({
      id: item.id, kind: item.kind, category: "kits", name: item.label,
      subtitle: item.kind === "livery" ? "Racing livery" : item.kind === "jersey" ? "Basketball jersey" : "Cricket kit",
      sport, price: item.price, accent: item.accent, keywords: [item.kind, item.id], rank: 0, art: {type: "kit", item},
    })),
  ];
  return products.map(product => ({...product, tier: shopTierFor(product.price)}));
}

export function productState(product: ShopProduct, economy: EconomySnapshot): "new" | "owned" | "equipped" {
  if (!economy.owned[`${product.kind}Ids`].includes(product.id)) return "new";
  return economy.equipped[`${product.kind}Id`] === product.id ? "equipped" : "owned";
}

/** All profile cosmetics, once each; legacy sport catalogues keep their own callers. */
export function buildStorefrontCatalog(avatars: readonly ShopAvatar[] = []): ShopProduct[] {
  const unique = new Map<string, ShopProduct>();
  for (const sport of Object.keys(sportModules) as Sport[]) {
    for (const product of buildShopCatalog(sport, avatars)) {
      if (product.category === "kits") continue;
      const key = `${product.kind}:${product.id}`;
      if (!unique.has(key)) unique.set(key, product);
    }
  }
  return [...unique.values()];
}

export function categoryFromTab(tab: string | null): StorefrontCategory {
  if (tab === "style") return "avatars";
  if (tab === "borders") return "frames";
  return storefrontCategories.includes(tab as StorefrontCategory) ? tab as StorefrontCategory : "avatars";
}

export function filterShopCatalog(
  products: readonly ShopProduct[],
  economy: EconomySnapshot,
  options: { category: ShopCategory; query: string; ownedOnly: boolean; sort: ShopSort },
) {
  const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const words = searchable(options.query.trim()).split(/\s+/).filter(Boolean);
  return products.filter(product => {
    if (options.category !== "featured" && product.category !== options.category) return false;
    if (options.ownedOnly && productState(product, economy) === "new") return false;
    const text = searchable([product.name, product.subtitle, product.kind, ...product.keywords].join(" "));
    return words.every(word => text.includes(word));
  }).sort((a, b) => options.sort === "price" ? a.price-b.price || a.name.localeCompare(b.name)
    : options.sort === "name" ? a.name.localeCompare(b.name)
      : Number(productState(a, economy) !== "new")-Number(productState(b, economy) !== "new") || b.rank-a.rank);
}

export const loadoutSlots = ["avatar", "frame", "banner"] as const;

export function loadoutProgress(economy: EconomySnapshot) {
  return loadoutSlots.map(kind => ({
    kind,
    complete: !!economy.equipped[`${kind}Id`] && economy.owned[`${kind}Ids`].includes(economy.equipped[`${kind}Id`] ?? ""),
  }));
}

/** Prefer using something already owned before suggesting another purchase. */
export function nextLoadoutProduct(products: readonly ShopProduct[], economy: EconomySnapshot) {
  const missing = loadoutProgress(economy).find(slot => !slot.complete);
  if (!missing) return null;
  return products.find(product => product.kind === missing.kind && productState(product, economy) === "owned")
    ?? products.find(product => product.kind === missing.kind && productState(product, economy) === "new")
    ?? null;
}

export function featuredShopProducts(products: readonly ShopProduct[], economy: EconomySnapshot, excluded?: ShopProduct | null) {
  const eligible = products.filter(product => !excluded || product.kind !== excluded.kind || product.id !== excluded.id);
  const groups = (["frames", "avatars", "banners", "kits"] as const).map(category =>
    filterShopCatalog(eligible, economy, {category, query: "", ownedOnly: false, sort: "recommended"}).slice(0, 2),
  );
  return [0, 1].flatMap(index => groups.flatMap(group => group[index] ? [group[index]] : [])).slice(0, 4);
}

export function shopAvatarSource(id: string, avatars: readonly ShopAvatar[]) {
  return avatars.find(({card}) => card.id === id)?.src ?? avatarOptions.find(avatar => avatar.id === id)?.src;
}

import type { CardTier } from "@/domain/cards";
import type { Sport } from "@/domain/sports";

import { shopFrames } from "./frames.generated";

export type ShopCategory = "avatars" | "frames" | "banners" | "kits" | "coins" | "packs" | "cards";

export const shopCategories: { id: ShopCategory; label: string }[] = [
  { id: "avatars", label: "Avatar" },
  { id: "frames", label: "Frame" },
  { id: "banners", label: "Banner" },
  { id: "kits", label: "Kits" },
  { id: "coins", label: "Coins" },
  { id: "packs", label: "Packs" },
  { id: "cards", label: "Cards" },
];

export { shopFrames };

/** Every player portrait sells as a profile avatar for the same flat price. */
export const avatarPrice = 25;

/** The kinds of item a daily deal can be. Player cards are not sold in the shop. */
export type DealSlot = "cosmetic" | "avatar";

/**
 * The daily market: one deal per slot each day, each discounted by one of the
 * listed percentages.
 */
export const dailyDealConfig: { slots: DealSlot[]; discounts: number[] } = {
  slots: ["cosmetic", "avatar"],
  discounts: [20, 25, 30, 40],
};

export type ShopBanner = {
  id: string;
  label: string;
  sport: Sport;
  price: number;
  colors: readonly [string, string];
  accent: string;
  assetSrc?: string;
};

const racingBanners = [
  ["mercedes", "MERCEDES", "#00d2be", "#050b0a"],
  ["ferrari", "FERRARI", "#dc0000", "#1b0207"],
  ["mclaren", "MCLAREN", "#ff8700", "#1a0a00"],
  ["red_bull_racing", "RED BULL RACING", "#263bff", "#0a0618"],
  ["alpine", "ALPINE", "#0090ff", "#0a0614"],
  ["racing_bulls", "RACING BULLS", "#1e41ff", "#050814"],
  ["haas_f1_team", "HAAS F1 TEAM", "#e10600", "#0a0a0a"],
  ["williams", "WILLIAMS", "#00a3e0", "#041018"],
  ["audi", "AUDI", "#f50537", "#0a0a0a"],
  ["aston_martin", "ASTON MARTIN", "#006f62", "#031210"],
  ["cadillac_f1_team", "CADILLAC F1", "#c5c7ca", "#08090b"],
] as const;

export const shopBanners: ShopBanner[] = [
  { id: "nebula", label: "NEBULA", sport: "football", price: 25, colors: ["#111d60", "#050b1e"], accent: "#5cdfff" },
  { id: "stadium_night", label: "STADIUM NIGHT", sport: "football", price: 25, colors: ["#083b66", "#07111c"], accent: "#35e0ff" },
  { id: "south_africa", label: "SOUTH AFRICA", sport: "cricket", price: 25, colors: ["#007a42", "#07100f"], accent: "#ffc400", assetSrc: "/assets/shop/banners/profile_banner_south_africa.png" },
  { id: "green_red", label: "GREEN RED", sport: "cricket", price: 25, colors: ["#0e6f3a", "#061d13"], accent: "#e21e2b", assetSrc: "/assets/shop/banners/profile_banner_green_red.png" },
  { id: "hardwood", label: "HARDWOOD", sport: "basketball", price: 25, colors: ["#8b4513", "#201108"], accent: "#fdb927" },
  { id: "korea", label: "KOREA", sport: "tennis", price: 25, colors: ["#eef2f7", "#0b3f8f"], accent: "#d9212f", assetSrc: "/assets/shop/banners/profile_banner_korea.png" },
  { id: "czech", label: "CZECH", sport: "tennis", price: 25, colors: ["#eef2f7", "#1452a3"], accent: "#e5242d", assetSrc: "/assets/shop/banners/profile_banner_czech.png" },
  { id: "sunburst", label: "SUNBURST", sport: "motorsport", price: 25, colors: ["#ffb000", "#ff5a00"], accent: "#ffd700" },
  ...racingBanners.map(([id, label, accent, end]) => ({
    id,
    label,
    sport: "motorsport" as const,
    price: 25,
    colors: [accent, end] as const,
    accent,
    assetSrc: `/assets/shop/banners/shop_banner_${id}.webp`,
  })),
];

export type ColorProduct = {
  id: string;
  label: string;
  kind: "kit" | "jersey" | "livery";
  sport: Sport;
  price: number;
  primary: string;
  secondary: string;
  accent: string;
};

export const shopKits: ColorProduct[] = [
  ["voltage", "VOLTAGE", "#1B48D6", "#EFF3FF", "#35E0FF"],
  ["ember", "EMBER", "#D83A1E", "#2A1410", "#FFB53D"],
  ["meridian", "MERIDIAN", "#0E8A5F", "#F2FFF9", "#B4FF3D"],
  ["sovereign", "SOVEREIGN", "#6A2BD9", "#E9DDFF", "#FFD24A"],
  ["monsoon", "MONSOON", "#1F7FA8", "#0B2C3B", "#7FE9FF"],
  ["saffron", "SAFFRON", "#E87722", "#14243D", "#FFF0C2"],
  ["obsidian", "OBSIDIAN", "#37415C", "#9AA8C7", "#FF3D77"],
  ["coral", "CORAL", "#E0407A", "#FFE3EC", "#20E3B2"],
].map(([id, label, primary, secondary, accent]) => ({ id, label, primary, secondary, accent, sport: "cricket", kind: "kit", price: id === "voltage" ? 0 : 100 }));

export const shopJerseys: ColorProduct[] = [
  ["statoz", "STATOZ", "#0B4F5C", "#061018", "#35E0FF"],
  ["lakers", "LOS ANGELES", "#FDB927", "#552583", "#000000"],
  ["bulls", "CHICAGO", "#CE1141", "#000000", "#FFFFFF"],
  ["celtics", "BOSTON", "#007A33", "#FFFFFF", "#000000"],
  ["warriors", "GOLDEN STATE", "#1D428A", "#FFC72C", "#FFFFFF"],
  ["heat", "MIAMI", "#98002E", "#F9A01B", "#000000"],
  ["knicks", "NEW YORK", "#F58426", "#006BB6", "#FFFFFF"],
  ["nets", "BROOKLYN", "#000000", "#FFFFFF", "#707271"],
  ["spurs", "SAN ANTONIO", "#C4CED4", "#000000", "#EF426F"],
  ["suns", "PHOENIX", "#1D1160", "#E56020", "#F9AD1B"],
  ["bucks", "MILWAUKEE", "#00471B", "#EEE1C6", "#FFFFFF"],
  ["mavs", "DALLAS", "#00538C", "#B8C4CA", "#FFFFFF"],
  ["nuggets", "DENVER", "#0E2240", "#FEC524", "#8B2131"],
].map(([id, label, primary, secondary, accent]) => ({ id, label, primary, secondary, accent, sport: "basketball", kind: "jersey", price: id === "statoz" ? 0 : 100 }));

export const shopLiveries: ColorProduct[] = [
  ["gridLine", "GRID LINE", "#0A0E14", "#061018", "#35E7FF"],
  ["scarlet", "SCARLET", "#D8232A", "#111111", "#FFE24A"],
  ["silverArrow", "SILVER ARROW", "#B9BFC6", "#101820", "#00D2BE"],
  ["papaya", "PAPAYA", "#FF8000", "#131313", "#2A9DF4"],
  ["midnight", "MIDNIGHT", "#16265C", "#080B17", "#35E7FF"],
  ["racingGreen", "RACING GREEN", "#0B5B3C", "#06150F", "#D4AF37"],
  ["skyBlue", "SKY BLUE", "#6FC5F0", "#17334A", "#F4F7FA"],
].map(([id, label, primary, secondary, accent]) => ({ id, label, primary, secondary, accent, sport: "motorsport", kind: "livery", price: id === "gridLine" ? 0 : 100 }));

export const colorProducts = [...shopKits, ...shopJerseys, ...shopLiveries];

/** A coin bundle. `accent` is the tier's colour: bronze up to the magenta max pack. */
export type CoinBundle = { id: string; label: string; inr: number; coins: number; bonus: number; tag?: string; accent: string };
export const coinBundles: CoinBundle[] = [
  { id: "rookie", label: "Rookie", inr: 10, coins: 1000, bonus: 0, accent: "#cd7f32" },
  { id: "starter", label: "Starter", inr: 50, coins: 5500, bonus: 10, accent: "#c0c0c0" },
  { id: "pro", label: "Pro", inr: 100, coins: 12000, bonus: 20, tag: "POPULAR", accent: "#5cdfff" },
  { id: "elite", label: "Elite", inr: 250, coins: 32500, bonus: 30, accent: "#a855f7" },
  { id: "champion", label: "Champion", inr: 500, coins: 70000, bonus: 40, tag: "BEST VALUE", accent: "#ffd700" },
  { id: "legendary", label: "Legendary", inr: 1000, coins: 150000, bonus: 50, tag: "MAX PACK", accent: "#ff3df7" },
];

export type ShopPack = {
  id: string;
  label: string;
  coinPrice: number;
  inr: number;
  playerCount: number;
  actionCount: number;
  guarantee: string;
  accent: string;
  /**
   * The rarest pack in its row. It trades its own accent for the foil magenta,
   * wears the gold corner star, and is the one tile allowed to glow.
   */
  gradient?: boolean;
  odds: Record<CardTier, number>;
};

export const standardPacks: ShopPack[] = [
  { id: "starter", label: "Starter Pack", coinPrice: 0, inr: 0, playerCount: 5, actionCount: 6, guarantee: "FREE SQUAD / 5 PLAYERS + 6 ACTIONS", accent: "#5cdfff", odds: { bronze: 70, silver: 25, gold: 5, platinum: 0 } },
  { id: "bronze", label: "Bronze Pack", coinPrice: 150, inr: 50, playerCount: 1, actionCount: 2, guarantee: "3 CARDS / MOSTLY BRONZE", accent: "#cd7f32", odds: { bronze: 65, silver: 28, gold: 6, platinum: 1 } },
  { id: "gold", label: "Gold Pack", coinPrice: 400, inr: 400, playerCount: 2, actionCount: 2, guarantee: "4 CARDS / SILVER OR GOLD SHOT", accent: "#ffd700", odds: { bronze: 35, silver: 45, gold: 16, platinum: 4 } },
  { id: "elite", label: "Elite Pack", coinPrice: 900, inr: 1000, playerCount: 2, actionCount: 3, guarantee: "5 HIGH-END CARDS / BEST ODDS", accent: "#ff3df7", gradient: true, odds: { bronze: 10, silver: 40, gold: 35, platinum: 15 } },
];

export const racingPacks: ShopPack[] = [
  { id: "racing-grid", label: "Grid Pack", coinPrice: 150, inr: 50, playerCount: 1, actionCount: 0, guarantee: "1 DRIVER / MOSTLY BRONZE", accent: "#35e7ff", odds: { bronze: 65, silver: 28, gold: 6, platinum: 1 } },
  { id: "racing-podium", label: "Podium Pack", coinPrice: 400, inr: 400, playerCount: 2, actionCount: 0, guarantee: "2 DRIVERS / SILVER OR GOLD SHOT", accent: "#ff3df7", odds: { bronze: 35, silver: 45, gold: 16, platinum: 4 } },
  { id: "racing-pole", label: "Pole Pack", coinPrice: 900, inr: 1000, playerCount: 3, actionCount: 0, guarantee: "3 DRIVERS / BEST PLATINUM ODDS", accent: "#ffd700", gradient: true, odds: { bronze: 10, silver: 40, gold: 35, platinum: 15 } },
];

/**
 * How a pack's foil sweeps: the colours in the band, how bright it is, how many
 * bands travel at once, and how fast. All four escalate with rarity, so the
 * rarest pack in a row is the one carrying a full rainbow.
 */
export type PackHolo = { colors: string[]; intensity: number; bands: number; speed: number };

export const packHolo: Record<string, PackHolo> = {
  starter: { colors: ["#5cdfff", "#ffffff", "#a855f7"], intensity: 0.35, bands: 1, speed: 1 },
  bronze: { colors: ["#cd7f32", "#ffd9a8", "#ffffff"], intensity: 0.35, bands: 1, speed: 1 },
  gold: { colors: ["#ffd700", "#ffffff", "#ffe9a8", "#ffd700"], intensity: 0.42, bands: 2, speed: 1.15 },
  "racing-grid": { colors: ["#5cdfff", "#ffffff", "#a855f7"], intensity: 0.38, bands: 1, speed: 1.05 },
  "racing-podium": { colors: ["#ff3df7", "#a855f7", "#5cdfff", "#ff3df7"], intensity: 0.44, bands: 2, speed: 1.2 },
  "racing-pole": { colors: ["#ffd700", "#ff3df7", "#5cdfff", "#ffd700"], intensity: 0.52, bands: 2, speed: 1.35 },
};

/** The foil every other pack falls back to — the elite wrap's full rainbow. */
export const eliteHolo: PackHolo = {
  colors: ["#ff3df7", "#a855f7", "#5cdfff", "#ffd700", "#ff3df7"],
  intensity: 0.5,
  bands: 2,
  speed: 1.3,
};

/** The magenta a pack takes when it is the rarest in its row. */
export const foilMagenta = "#ff3df7";

/** Art is shared across rows: the racing packs wear the standard tiers' wraps. */
export const packArtIds: Record<string, string> = {
  "racing-grid": "bronze",
  "racing-podium": "gold",
  "racing-pole": "platinum",
};

"use client";

import type { ReactNode } from "react";

import { accentVar } from "@statoz/design-system/games";
import type { PlayerCard as PlayerCardData } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import type { EconomyItemKind, EconomySnapshot } from "@/features/economy";
import { allPlayerCards, portraitAssets } from "@/features/packs";
import {
  avatarPrice,
  colorProducts,
  shopBanners,
  shopFrames,
  type ColorProduct,
  type DealSlot,
  type ShopBanner,
} from "@/mocks/shop";

import type { BuyRequest } from "../hooks/use-shop-actions";
import { dealPrice, type DailyDeal } from "../lib/daily-deals";
import { ShopCardFrame, ShopFooter, ShopFooterLabel, ShopPricePill, ShopStateStamp, ShopTag } from "./shop-card";
import {
  AvatarPreview,
  BannerPreview,
  cardSport,
  ColorPreview,
  FramePreview,
} from "./shop-previews";
import styles from "./shop-screen.module.css";

type ShopFrame = (typeof shopFrames)[number];

type Cosmetic =
  | { kind: "frame"; frame: ShopFrame }
  | { kind: "banner"; banner: ShopBanner }
  | { kind: "color"; item: ColorProduct };

export type DealEntry =
  | { slot: "avatar"; card: PlayerCardData }
  | { slot: "cosmetic"; cosmetic: Cosmetic };

/** Everything in a sport that can go on offer, by deal slot. Free items never do. */
export function buildDealPools(sport: Sport): Record<DealSlot, DealEntry[]> {
  const cards = allPlayerCards.filter((card) => cardSport(card) === sport);
  return {
    avatar: cards.filter((card) => portraitAssets[card.id]).map((card) => ({ slot: "avatar", card })),
    cosmetic: [
      ...shopFrames.filter((frame) => frame.sport === sport).map((frame): Cosmetic => ({ kind: "frame", frame })),
      ...shopBanners.filter((banner) => banner.sport === sport).map((banner): Cosmetic => ({ kind: "banner", banner })),
      ...colorProducts
        .filter((item) => item.sport === sport && item.price > 0)
        .map((item): Cosmetic => ({ kind: "color", item })),
    ].map((cosmetic) => ({ slot: "cosmetic", cosmetic })),
  };
}

type DealView = {
  kind: EconomyItemKind;
  id: string;
  label: string;
  kindLabel: string;
  accent: string;
  coins: number;
  owned: boolean;
  thumb: ReactNode;
  preview: ReactNode;
};

/** A deal entry resolved to what the tile draws and what buying it does. */
export function describeDeal(entry: DealEntry, economy: EconomySnapshot): DealView {
  const cyan = accentVar("cyan");
  if (entry.slot === "avatar") {
    const { card } = entry;
    return {
      kind: "avatar",
      id: card.id,
      label: card.name,
      kindLabel: "AVATAR",
      accent: cyan,
      coins: avatarPrice,
      owned: economy.owned.avatarIds.includes(card.id),
      thumb: <AvatarPreview card={card} size={96} />,
      preview: <AvatarPreview card={card} />,
    };
  }
  const { cosmetic } = entry;
  if (cosmetic.kind === "frame") {
    const { frame } = cosmetic;
    return {
      kind: "frame",
      id: frame.id,
      label: frame.label,
      kindLabel: "TEAM FRAME",
      accent: frame.color,
      coins: frame.price,
      owned: economy.owned.frameIds.includes(frame.id),
      thumb: <FramePreview color={frame.color} />,
      preview: <FramePreview color={frame.color} />,
    };
  }
  if (cosmetic.kind === "banner") {
    const { banner } = cosmetic;
    return {
      kind: "banner",
      id: banner.id,
      label: banner.label,
      kindLabel: "BANNER",
      accent: banner.accent,
      coins: banner.price,
      owned: economy.owned.bannerIds.includes(banner.id),
      thumb: <BannerPreview banner={banner} width={150} />,
      preview: <BannerPreview banner={banner} />,
    };
  }
  const { item } = cosmetic;
  return {
    kind: item.kind,
    id: item.id,
    label: item.label,
    kindLabel: item.kind.toUpperCase(),
    accent: item.accent,
    coins: item.price,
    owned: economy.owned[`${item.kind}Ids` as "kitIds" | "jerseyIds" | "liveryIds"].includes(item.id),
    thumb: <ColorPreview item={item} />,
    preview: <ColorPreview item={item} />,
  };
}

export function DealTile({
  deal,
  economy,
  index,
  buy,
}: {
  deal: DailyDeal<DealSlot, DealEntry>;
  economy: EconomySnapshot;
  index: number;
  buy: (request: BuyRequest) => void;
}) {
  const view = describeDeal(deal.item, economy);
  const coins = dealPrice(view.coins, deal.discount);
  const request = { kind: view.kind, id: view.id, label: view.label, accent: view.accent, preview: view.preview, dealDiscount: deal.discount };

  return (
    <ShopCardFrame
      accent={view.accent}
      elevated={!view.owned}
      index={index}
      className={styles.dealTile}
      stamp={view.owned ? <ShopStateStamp kind="claimed" accent={view.accent} /> : undefined}
    >
      <div className={styles.dealTop}>
        <ShopTag label={`−${deal.discount}%`} accent={accentVar("gold")} />
        <span className={styles.dealKind}>{view.kindLabel}</span>
      </div>
      <div className={styles.dealArt}>{view.thumb}</div>
      <p className={styles.dealName}>{view.label.toUpperCase()}</p>
      {view.owned ? (
        <ShopFooter>
          <ShopFooterLabel accent={view.accent}>DEAL CLAIMED</ShopFooterLabel>
        </ShopFooter>
      ) : (
        <ShopFooter
          onSelect={() => buy({ ...request, price: coins })}
          label={`Buy ${view.label} for ${coins} Oz Coins, ${deal.discount}% off`}
        >
          <ShopPricePill coins={coins} was={view.coins} size={11} />
        </ShopFooter>
      )}
    </ShopCardFrame>
  );
}

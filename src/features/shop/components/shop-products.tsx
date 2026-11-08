"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import {
  BrandIcon, Button, CheckIcon, CloseIcon, ProfileIcon, VisibilityIcon, rarityVar, type RarityName,
} from "@statoz/design-system/games";
import { type EconomySnapshot } from "@/features/economy";
import { formatInt } from "@/shared/utils";
import { publicAsset } from "@/shared/config";

import { productState, type ShopKind, type ShopProduct } from "../lib/shop-catalog";
import { useShopDialog } from "../hooks/use-shop-dialog";
import { AvatarFrameRing } from "./avatar-frame-ring";
import { BannerArt } from "./banner-art";
import { KitPreview } from "./shop-tiles";
import styles from "./shop-screen.module.css";
import card from "./shop-item-card.module.css";

/** The loadout slot a cosmetic occupies once equipped. */
export const shopSlotLabels: Record<ShopKind, string> = {
  avatar: "Avatar", frame: "Border", banner: "Banner", kit: "Kit", jersey: "Jersey", livery: "Livery",
};

/** Rarity shades for a tiered surface; item cards and the equip celebration both read them. */
export function shopTierStyle(tier: RarityName, accent?: string): CSSProperties {
  return {
    "--tier": rarityVar(tier),
    "--tier-light": rarityVar(tier, "light"),
    "--tier-deep": rarityVar(tier, "deep"),
    ...(accent ? {"--product-accent": accent} : {}),
  } as CSSProperties;
}

export function ShopProductArt({product, avatarSrc, large = false}: {product: ShopProduct; avatarSrc?: string; large?: boolean}) {
  const art = product.art;
  const face = (sizes: string, icon: number) => avatarSrc
    ? <Image src={publicAsset(avatarSrc)} alt="" fill sizes={sizes} className="object-cover object-top" />
    : <ProfileIcon size={icon} />;
  return (
    <div className={styles.productArt} style={{"--product-accent": product.accent} as CSSProperties}
      data-art={art.type} data-large={large || undefined} aria-hidden="true">
      {art.type === "avatar" ? <div className={styles.portraitArt}><Image src={publicAsset(art.src)} alt="" fill sizes="(max-width: 600px) 160px, 220px" className="object-contain object-bottom" /></div>
        : art.type === "frame" ? <div className={styles.frameArt}>
          <AvatarFrameRing color={art.color} className={styles.productRing}><span className={styles.frameFace}>{face("120px", 40)}</span></AvatarFrameRing>
          <span className={styles.frameInitials}>{art.initials}</span>
        </div>
          : art.type === "banner" ? <div className={styles.bannerArt}><BannerArt banner={art.banner} />
            <div className={styles.bannerProfile}><span className={styles.bannerAvatar}>{face("32px", 14)}</span><span>YOUR PROFILE</span></div>
          </div>
            : <KitPreview primary={art.item.primary} secondary={art.item.secondary} accent={art.item.accent} kind={art.item.kind} />}
    </div>
  );
}

export function ShopProductAction({
  product, economy, onBuy, onEquip, compact = false, className,
}: {product: ShopProduct; economy: EconomySnapshot; onBuy: () => void; onEquip: () => void; compact?: boolean; className?: string}) {
  const state = productState(product, economy);
  const classes = [styles.productAction, className].filter(Boolean).join(" ");
  if (state === "equipped") {
    return <span className={[styles.equippedAction, className].filter(Boolean).join(" ")}><CheckIcon size={15} /> Equipped</span>;
  }
  if (state === "owned") {
    return <Button className={classes} onClick={onEquip} label={`Equip ${product.name}`} leadingIcon={<CheckIcon size={15} />}>
      Equip
    </Button>;
  }
  const free = product.price === 0, shortfall = Math.max(0, product.price - economy.coins);
  const label = free ? `Unlock ${product.name} for free`
    : `Buy ${product.name} for ${product.price} Oz Coins${shortfall ? `, ${shortfall} more needed` : ""}`;
  const price = free ? undefined : <span className={[styles.actionPrice, compact ? styles.actionPriceGold : "", compact && shortfall ? styles.actionPriceShort : ""].filter(Boolean).join(" ")}>
    <BrandIcon name="ozCoins" size={15} alt="" />{formatInt(product.price)}
  </span>;
  return (
    <Button className={classes} variant={shortfall ? "surface" : "tonal"} accent={free ? "var(--ds-color-accent-lime)" : "var(--ds-color-accent-gold)"}
      onClick={onBuy} label={label} trailingIcon={price}>
      {free ? "Claim free" : "Buy"}
    </Button>
  );
}

/** A collectible item: a tier-lit stage, chamfered rarity edge, nameplate and one clear action. */
export function ShopProductCard({
  product, economy, avatarSrc, onBuy, onEquip, onPreview, justEquipped = false,
}: {
  product: ShopProduct; economy: EconomySnapshot; avatarSrc?: string;
  onBuy: () => void; onEquip: () => void; onPreview: () => void; justEquipped?: boolean;
}) {
  const state = productState(product, economy);
  return (
    <article className={card.card} style={shopTierStyle(product.tier, product.accent)} data-tier={product.tier}
      data-product-id={product.id} data-product-kind={product.kind} data-product-state={state} data-just-equipped={justEquipped || undefined}>
      <div className={card.edge}>
        <div className={card.plate}>
          <div className={card.stage}>
            <ShopProductArt product={product} avatarSrc={avatarSrc} />
            <span className={card.sheen} aria-hidden="true" />
            <Button variant="ghost" className={card.preview} onClick={onPreview} label={`Preview ${product.name}`}>
              <span className={card.previewHint}><VisibilityIcon size={13} />Preview</span>
            </Button>
          </div>
          <div className={card.nameplate}><h3>{product.name}</h3></div>
          <ShopProductAction product={product} economy={economy} onBuy={onBuy} onEquip={onEquip} compact className={card.action} />
        </div>
      </div>
    </article>
  );
}

export function ShopProductPreview({
  product, economy, avatarSrc, onBuy, onEquip, onClose,
}: {product: ShopProduct; economy: EconomySnapshot; avatarSrc?: string; onBuy: () => void; onEquip: () => void; onClose: () => void}) {
  const ref = useShopDialog();
  return (
    <dialog ref={ref} className={styles.previewDialog} aria-labelledby="shop-preview-title" onCancel={onClose}
      onClick={event => {if (event.target === event.currentTarget) onClose();}}>
      <div className={styles.previewPanel} style={shopTierStyle(product.tier, product.accent)}>
        <header className={styles.previewHeader}>
          <span className={`${styles.eyebrow} ${styles.previewTier}`}>{product.tier.toUpperCase()} · {shopSlotLabels[product.kind].toUpperCase()}</span>
          <Button variant="ghost" className={styles.iconButton} onClick={onClose} label="Close item preview"><CloseIcon size={20} /></Button>
        </header>
        <ShopProductArt product={product} avatarSrc={avatarSrc} large />
        <h2 id="shop-preview-title">{product.name}</h2>
        <div className={styles.previewWallet}><span>Your balance</span><span><BrandIcon name="ozCoins" size={17} alt="" />{formatInt(economy.coins)}</span></div>
        <ShopProductAction product={product} economy={economy} onBuy={onBuy} onEquip={onEquip} />
        <Button variant="ghost" className={styles.textButton} onClick={onClose}>Keep browsing</Button>
      </div>
    </dialog>
  );
}

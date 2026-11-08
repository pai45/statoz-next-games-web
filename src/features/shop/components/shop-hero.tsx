"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import { ArrowRightIcon, Button, CheckIcon, FlagIcon, InventoryIcon, ProfileIcon, ShieldIcon } from "@statoz/design-system/games";
import type { EconomySnapshot } from "@/features/economy";
import { shopFrames } from "@/mocks/shop";
import { publicAsset } from "@/shared/config";

import { loadoutProgress, productState, type ShopCategory, type ShopProduct } from "../lib/shop-catalog";
import { AvatarFrameRing } from "./avatar-frame-ring";
import { ShopProductAction, ShopProductArt } from "./shop-products";
import styles from "./shop-screen.module.css";

const slotIcons = {avatar: ProfileIcon, frame: ShieldIcon, banner: FlagIcon};
const slotCategories = {avatar: "avatars", frame: "frames", banner: "banners"} as const;

/** A real, equip-based goal, not a timed claim or a purchase-only reward. */
export function ShopSpotlight({
  product, products, economy, avatarSrc, sportLabel, onBuy, onEquip, onCategory, onShowOwned,
}: {
  product: ShopProduct | null; products: ShopProduct[]; economy: EconomySnapshot; avatarSrc?: string; sportLabel: string;
  onBuy: (product: ShopProduct) => void; onEquip: (product: ShopProduct) => void;
  onCategory: (category: ShopCategory) => void; onShowOwned: () => void;
}) {
  const slots = loadoutProgress(economy), complete = slots.filter(slot => slot.complete).length;
  const owned = products.filter(item => productState(item, economy) !== "new");
  const equippedColor = shopFrames.find(frame => frame.id === economy.equipped.frameId)?.color ?? "var(--ds-color-accent-cyan)";
  return (
    <div className={styles.overview}>
      <section className={styles.spotlight} aria-labelledby="shop-spotlight-title" data-shop-spotlight>
        <div className={styles.spotlightPlate}>
          <div className={styles.spotlightMain}>
            <div className={styles.spotlightCopy}>
              <span className={styles.eyebrow}>{complete === 3 ? "GAME-DAY READY" : "BUILD YOUR SIGNATURE LOOK"}</span>
              <h2 id="shop-spotlight-title">{complete === 3 ? "Your look. Your rules." : "Finish your loadout."}</h2>
              <p>{product ? <><strong>{product.name}</strong><span> · {product.subtitle}</span></> : "Avatar, frame, banner. All three, all you."}</p>
              {product ? <ShopProductAction product={product} economy={economy} onBuy={() => onBuy(product)} onEquip={() => onEquip(product)} />
                : <Button href="/profile" className={styles.primaryButton} trailingIcon={<ArrowRightIcon size={17} />}>View your profile</Button>}
            </div>
            <div className={styles.spotlightArt} style={{"--product-accent": product?.accent ?? "var(--ds-color-accent-cyan)"} as CSSProperties}>
              {product ? <ShopProductArt product={product} avatarSrc={avatarSrc} large />
                : <AvatarFrameRing color={equippedColor} glow className={styles.readyRing}><span className={styles.frameFace}>
                  {avatarSrc ? <Image src={publicAsset(avatarSrc)} alt="" fill sizes="90px" className="object-cover object-top" /> : <ProfileIcon size={40} />}
                </span></AvatarFrameRing>}
              <span className={styles.loadoutCount}><CheckIcon size={12} />{complete}/3 EQUIPPED</span>
            </div>
          </div>
          <div className={styles.loadoutTrack} role="progressbar" aria-label="Profile loadout equipped" aria-valuemin={0} aria-valuemax={3} aria-valuenow={complete}>
            <span style={{width: `${complete/3*100}%`}} />
          </div>
          <div className={styles.loadoutSlots}>
            {slots.map(slot => {
              const Icon = slotIcons[slot.kind];
              return <div key={slot.kind} data-complete={slot.complete || undefined}>
                <Button variant="ghost" className={styles.loadoutSlot} onClick={() => onCategory(slotCategories[slot.kind])}
                  accent={slot.complete ? "var(--ds-color-text-subtle)" : "var(--ds-color-text-muted)"}
                  label={`Browse ${slotCategories[slot.kind]}${slot.complete ? ", slot equipped" : ", complete this slot"}`}
                  leadingIcon={<Icon size={15} />}
                  trailingIcon={slot.complete ? <CheckIcon size={12} /> : <span className={styles.slotEmpty} />}>
                  {slot.kind}
                </Button>
              </div>;
            })}
          </div>
        </div>
      </section>
      <aside className={styles.lockerSummary}>
        <span className={styles.eyebrow}><InventoryIcon size={14} /> YOUR {sportLabel.toUpperCase()} LOCKER</span>
        <div className={styles.lockerCount}><strong>{owned.length}</strong><span>items collected<br />and ready to use</span></div>
        <div className={styles.lockerStats}>{(["avatars", "frames", "banners"] as const).map(category =>
          <span key={category}><b>{owned.filter(item => item.category === category).length}</b>{category}</span>,
        )}</div>
        <Button variant="ghost" onClick={onShowOwned} className={styles.textButton} trailingIcon={<ArrowRightIcon size={15} />}>View my collection</Button>
      </aside>
    </div>
  );
}

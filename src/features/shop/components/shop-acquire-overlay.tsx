"use client";

import type { CSSProperties, ReactNode } from "react";

import { BrandIcon, Button, CheckIcon, CloseIcon, type RarityName } from "@statoz/design-system/games";
import { useEconomy } from "@/features/economy";
import { formatInt } from "@/shared/utils";

import type { ShopKind } from "../lib/shop-catalog";
import { useShopDialog } from "../hooks/use-shop-dialog";
import styles from "./shop-acquire-overlay.module.css";

export type ShopAcquisition = {
  key: string;
  name: string;
  accent: string;
  coinsSpent: number;
  preview: ReactNode;
  badge?: string;
  kind?: ShopKind;
  itemId?: string;
  tier?: RarityName;
};

/** A usable reward: keep the new item visible until the player chooses to equip it or continue. */
export function ShopAcquireOverlay({acquisition, onDismissed, onEquip}: {acquisition: ShopAcquisition; onDismissed: () => void; onEquip?: () => void}) {
  const ref = useShopDialog(), economy = useEconomy();
  return (
    <dialog ref={ref} className={styles.dialog} onCancel={onDismissed} aria-labelledby="shop-acquired-name"
      onClick={event => {if (event.target === event.currentTarget) onDismissed();}}>
      <div className={styles.panel} style={{"--acquire-accent": acquisition.accent} as CSSProperties}>
        <header className={styles.header}><span><CheckIcon size={15} /> ADDED TO YOUR LOCKER</span>
          <Button variant="ghost" className={styles.close} onClick={onDismissed} label="Close unlocked item"><CloseIcon size={20} /></Button></header>
        <div className={styles.preview}>{acquisition.preview}</div>
        <p className={styles.eyebrow}>NEW UNLOCK</p><h2 id="shop-acquired-name">{acquisition.name}</h2>
        <p className={styles.description}>It&apos;s yours. Make it part of your signature look.</p>
        <div className={styles.wallet}>
          <div><span>{acquisition.coinsSpent ? "Coins spent" : "Unlock cost"}</span><strong>{acquisition.coinsSpent ? <><BrandIcon name="ozCoins" size={16} alt="" />{formatInt(acquisition.coinsSpent)}</> : "Free"}</strong></div>
          <div><span>Wallet balance</span><strong><BrandIcon name="ozCoins" size={16} alt="" />{formatInt(economy.coins)}</strong></div>
        </div>
        {acquisition.badge && <span className={styles.badge}>{acquisition.badge}</span>}
        {onEquip && <Button fullWidth className={styles.primary} onClick={onEquip} leadingIcon={<CheckIcon size={17} />}>Equip now</Button>}
        <Button fullWidth variant="surface" className={styles.secondary} onClick={onDismissed}>Keep browsing</Button>
      </div>
    </dialog>
  );
}

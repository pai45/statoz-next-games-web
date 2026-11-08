"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import { ArrowRightIcon, BrandIcon, Button, CloseIcon, ShieldIcon } from "@statoz/design-system/games";
import { useEconomy } from "@/features/economy";
import type { CoinBundle } from "@/mocks/shop";
import { publicAsset } from "@/shared/config";
import { formatInt } from "@/shared/utils";

import { coinBundleValue } from "../lib/coin-bundles";
import { useShopDialog } from "../hooks/use-shop-dialog";
import styles from "./coin-vault.module.css";

/** Demo checkout: the bundle, exactly what lands in the wallet, and an explicit no-payment confirmation. */
export function CoinCheckout({bundle, onConfirm, onCancel}: {bundle: CoinBundle; onConfirm: () => void; onCancel: () => void}) {
  const ref = useShopDialog(), economy = useEconomy();
  const {base, bonusCoins} = coinBundleValue(bundle);
  return (
    <dialog ref={ref} className={styles.checkout} style={{"--tier": bundle.accent} as CSSProperties} aria-labelledby="coin-checkout-title"
      data-coin-checkout onCancel={event => {event.preventDefault(); onCancel();}}
      onClick={event => {if (event.target === event.currentTarget) onCancel();}}>
      <div className={styles.checkoutEdge}>
        <div className={styles.checkoutPlate}>
          <header className={styles.checkoutHeader}>
            <span className={styles.eyebrow}><BrandIcon name="ozCoins" size={13} alt="" />Confirm top-up</span>
            <Button variant="ghost" className={styles.close} onClick={onCancel} label="Close top-up"><CloseIcon size={20} /></Button>
          </header>
          <div className={`${styles.stage} ${styles.checkoutStage}`}>
            <span className={styles.rays} aria-hidden="true" />
            <Image src={publicAsset(`/assets/shop/coins/${bundle.id}.png`)} alt="" fill sizes="340px" className={styles.pile} />
            {bundle.bonus > 0 && <span className={styles.burst}><b>+{bundle.bonus}%</b><small>Bonus</small></span>}
          </div>
          <h2 id="coin-checkout-title" className={styles.checkoutTitle}>{bundle.label} bundle</h2>
          <strong className={styles.amount}><BrandIcon name="ozCoins" size={26} alt="" /><span>{formatInt(bundle.coins)}</span></strong>
          <span className={styles.breakdown}>{bonusCoins ? <>{formatInt(base)} coins <b>+{formatInt(bonusCoins)} bonus</b></> : "Starter boost"}</span>
          <div className={styles.balanceRow}>
            <span>Your wallet</span>
            <span>{formatInt(economy.coins)}<ArrowRightIcon size={14} /><b>{formatInt(economy.coins + bundle.coins)}</b></span>
          </div>
          <p className={styles.notice}><ShieldIcon size={14} />Demo purchase. No real payment is taken; coins stay in this browser.</p>
          <div className={styles.checkoutActions}>
            <Button variant="surface" onClick={onCancel}>Cancel</Button>
            <Button accent="var(--ds-color-accent-gold)" glow className={styles.confirm} onClick={onConfirm}
              label={`Confirm ₹${formatInt(bundle.inr)} demo top-up`}>
              Confirm · ₹{formatInt(bundle.inr)}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

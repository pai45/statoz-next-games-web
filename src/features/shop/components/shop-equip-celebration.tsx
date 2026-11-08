"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { CheckIcon, type RarityName } from "@statoz/design-system/games";

import type { ShopKind } from "../lib/shop-catalog";
import { useShopDialog } from "../hooks/use-shop-dialog";
import { shopSlotLabels, shopTierStyle } from "./shop-products";
import styles from "./shop-equip-celebration.module.css";

export type EquipCelebration = {
  key: string;
  kind: ShopKind;
  id: string;
  name: string;
  accent: string;
  tier: RarityName;
  preview: ReactNode;
  /** Profile loadout after equipping; sport kits are not loadout slots. */
  loadout: {complete: number; total: number; gained: boolean} | null;
};

const shards = Array.from({length: 14}, (_, index) => index);
const lifetimeMs = 2600;
const octagon = "30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30";

/** The equip moment: the item slams into its slot, a shockwave clears, then the loadout meter settles. */
export function ShopEquipCelebration({celebration, onDone}: {celebration: EquipCelebration; onDone: () => void}) {
  const ref = useShopDialog();
  const done = useRef(onDone);
  useEffect(() => {done.current = onDone;}, [onDone]);
  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), lifetimeMs);
    return () => window.clearTimeout(timer);
  }, []);

  const {loadout} = celebration, slot = shopSlotLabels[celebration.kind];
  const completed = !!loadout && loadout.gained && loadout.complete === loadout.total;
  // Portalled so the moment covers the sticky platform navigation, not just the shop column.
  return createPortal(
    <dialog ref={ref} className={styles.overlay} style={shopTierStyle(celebration.tier, celebration.accent)} data-equip-celebration
      aria-label={`${celebration.name} equipped`} onCancel={event => {event.preventDefault(); done.current();}}
      data-complete={completed || undefined} onClick={() => done.current()}>
      <p role="status" className="sr-only">
        {`${celebration.name} equipped in your ${slot.toLowerCase()} slot.${loadout ? ` Loadout ${loadout.complete} of ${loadout.total}.` : ""}`}
      </p>
      <div className={styles.stage} aria-hidden="true">
        <span className={styles.rays} />
        <svg className={styles.ring} viewBox="0 0 100 100"><polygon points={octagon} /></svg>
        <svg className={styles.ring} data-late viewBox="0 0 100 100"><polygon points={octagon} /></svg>
        <span className={styles.shards}>{shards.map(index => <span key={index} style={{"--i": index} as CSSProperties} />)}</span>
        <div className={styles.item}>
          <div className={styles.itemEdge}><div className={styles.itemPlate}>{celebration.preview}</div></div>
          <span className={styles.flash} />
        </div>
      </div>
      <div className={styles.copy} aria-hidden="true">
        <span className={styles.kicker}>{slot} slot</span>
        <strong className={styles.stamp}><CheckIcon size={26} />Equipped</strong>
        <span className={styles.name}>{celebration.name}</span>
        <span className={styles.meter}>
          {loadout && <span className={styles.slots}>
            {Array.from({length: loadout.total}, (_, index) => <span key={index} data-on={index < loadout.complete || undefined}
              data-new={(loadout.gained && index === loadout.complete - 1) || undefined} />)}
          </span>}
          <b>{completed ? "Loadout complete" : loadout ? `Loadout ${loadout.complete}/${loadout.total}` : "Ready to play"}</b>
        </span>
      </div>
      <button type="button" className={styles.skip} onClick={() => done.current()}>Continue</button>
    </dialog>,
    document.body,
  );
}

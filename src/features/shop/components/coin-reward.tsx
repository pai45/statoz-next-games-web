"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { ArrowRightIcon, BrandIcon } from "@statoz/design-system/games";
import type { CoinBundle } from "@/mocks/shop";
import { publicAsset } from "@/shared/config";
import { formatInt } from "@/shared/utils";

import { coinBundleValue } from "../lib/coin-bundles";
import { useShopDialog } from "../hooks/use-shop-dialog";
import styles from "./coin-vault.module.css";

export type CoinReward = {key: string; bundle: CoinBundle; before: number; after: number};

const burst = Array.from({length: 12}, (_, index) => index);
/** Fixed [x %, delay step] pairs so the shower looks scattered while render stays pure. */
const rain = [[5, 2], [13, 6], [21, 0], [29, 4], [37, 8], [45, 1], [53, 5], [61, 3], [69, 7], [77, 0], [85, 4], [93, 2], [17, 9], [65, 9]];
const lifetimeMs = 2900;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The pay-off: coins burst from the bundle and rain down while the wallet counts up. Tap or Escape skips it. */
export function CoinRewardCelebration({reward, onDone}: {reward: CoinReward; onDone: () => void}) {
  const ref = useShopDialog();
  const done = useRef(onDone);
  const [progress, setProgress] = useState(() => prefersReducedMotion() ? 1 : 0);
  useEffect(() => {done.current = onDone;}, [onDone]);
  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), lifetimeMs);
    let frame = 0;
    if (!prefersReducedMotion()) {
      const start = performance.now() + 380, duration = 1150;
      const tick = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        setProgress(1 - (1 - t) ** 3);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => {window.clearTimeout(timer); cancelAnimationFrame(frame);};
  }, []);

  const {bundle, before, after} = reward, added = after - before, {bonusCoins} = coinBundleValue(bundle);
  // Portalled so the moment covers the sticky platform navigation too.
  return createPortal(
    <dialog ref={ref} className={styles.reward} style={{"--tier": bundle.accent} as CSSProperties} data-coin-reward
      aria-label="Coins added" onCancel={event => {event.preventDefault(); done.current();}} onClick={() => done.current()}>
      <p role="status" className="sr-only">{`${formatInt(added)} Oz Coins added. New balance ${formatInt(after)}.`}</p>
      <div className={styles.rain} aria-hidden="true">
        {rain.map(([x, delay]) => <span key={x} style={{"--x": x, "--d": delay} as CSSProperties}><BrandIcon name="ozCoins" size={26} alt="" /></span>)}
      </div>
      <div className={styles.rewardStage} aria-hidden="true">
        <span className={styles.rewardRays} />
        <div className={styles.rewardPile}><Image src={publicAsset(`/assets/shop/coins/${bundle.id}.png`)} alt="" fill sizes="180px" /></div>
        <span className={styles.burstCoins}>
          {burst.map(index => <span key={index} style={{"--i": index} as CSSProperties}><BrandIcon name="ozCoins" size={22} alt="" /></span>)}
        </span>
      </div>
      <div className={styles.rewardCopy} aria-hidden="true">
        <span className={styles.rewardKicker}>Wallet topped up</span>
        <strong className={styles.rewardAmount}>+{formatInt(Math.round(added * progress))}</strong>
        {bonusCoins > 0 && <span className={styles.rewardBonus}>Includes +{formatInt(bonusCoins)} bonus</span>}
        <span className={styles.rewardBalance}>
          <BrandIcon name="ozCoins" size={16} alt="" />{formatInt(before)}<ArrowRightIcon size={14} />
          <b data-reward-balance>{formatInt(Math.round(before + added * progress))}</b>
        </span>
      </div>
      <button type="button" className={styles.rewardSkip} onClick={() => done.current()}>Continue</button>
    </dialog>,
    document.body,
  );
}

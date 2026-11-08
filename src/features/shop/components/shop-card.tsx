"use client";

import type { CSSProperties, ReactNode } from "react";

import { BrandIcon, accentVar } from "@statoz/design-system/games";
import { formatInt } from "@/shared/utils";

import styles from "./shop-card.module.css";

/**
 * The shared shop-card design system.
 *
 * Every purchasable tile — avatar, frame, banner, kit, coin, pack, card — is
 * built from these primitives, so the seven categories read as one family (same
 * cut silhouette, accent wash and edge, header strip, price read-out and
 * owned/equipped treatment) while each still shows what it sells in its own
 * preview slot.
 *
 * The app keeps a near-black shop palette of its own that mostly restates the
 * theme; those values resolve here to the tokens the web already carries.
 */

const cyan = accentVar("cyan");

/** How the accent edge is drawn: 1px at rest, heavier when this tile is live. */
type FrameWeight = "rest" | "elevated" | "focal";

export type ShopCardFrameProps = {
  /** CSS color driving the wash, the edge and (when focal) the glow. */
  accent: string;
  children: ReactNode;
  /**
   * The one live tile on a surface — an equipped frame, a card just bought.
   * Takes a heavier edge and the only glow.
   */
  focal?: boolean;
  /** A calm lift on a hard offset shadow: depth without an accent glow. */
  elevated?: boolean;
  /**
   * Strength of the accent wash, 0–1. Lower it where accent-coloured copy sits
   * on the surface (the pack tiles) so the words stay readable.
   */
  tint?: number;
  /** OWNED / EQUIPPED / CLAIMED, laid over the whole tile. */
  stamp?: ReactNode;
  /** Position in a cascading grid, for the staggered entrance. */
  index?: number;
  className?: string;
};

export function ShopCardFrame({
  accent,
  children,
  focal = false,
  elevated = false,
  tint = 0.12,
  stamp,
  index,
  className,
}: ShopCardFrameProps) {
  const weight: FrameWeight = focal ? "focal" : elevated ? "elevated" : "rest";

  return (
    <div
      className={[
        styles.frame,
        styles[weight],
        index === undefined ? "" : styles.enter,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--shop-accent": accent,
          "--shop-tint": `${tint * 100}%`,
          "--item-index": index ?? 0,
        } as CSSProperties
      }
    >
      {elevated ? <span aria-hidden className={styles.lift} /> : null}
      <div className={styles.plate}>
        <span aria-hidden className={styles.wash} />
        <div className={styles.body}>{children}</div>
        {stamp}
      </div>
    </div>
  );
}

/** One small accent chip — POPULAR / BEST VALUE / +BONUS% / a sport code. */
export function ShopTag({
  label,
  accent,
  icon,
}: {
  label: string;
  accent: string;
  icon?: ReactNode;
}) {
  return (
    <span className={styles.tag} style={{ "--shop-accent": accent } as CSSProperties}>
      {icon}
      {label.toUpperCase()}
    </span>
  );
}

/**
 * The shared price read-out: a coin amount, a rupee amount, or both. Display
 * only — wrap it in a footer button when it should be tappable.
 */
export function ShopPricePill({
  coins,
  inr,
  was,
  accent = cyan,
  size = 14,
}: {
  coins?: number;
  inr?: number;
  /** The pre-discount price, struck through before the live one. */
  was?: number;
  accent?: string;
  size?: number;
}) {
  return (
    <span className={styles.price} style={{ fontSize: `${size}px` }}>
      {was !== undefined ? (
        <span className={styles.priceWas}>
          <span className="sr-only">was </span>
          {inr !== undefined && coins === undefined ? "₹" : ""}
          {formatInt(was)}
        </span>
      ) : null}
      {coins !== undefined ? (
        <>
          <BrandIcon name="ozCoins" size={size + 1} alt="" />
          <span className={styles.priceCoins}>{formatInt(coins)}</span>
        </>
      ) : null}
      {coins !== undefined && inr !== undefined ? (
        <span className={styles.priceDot}>·</span>
      ) : null}
      {inr !== undefined ? (
        <span className={styles.priceInr} style={{ color: accent }}>
          ₹{formatInt(inr)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * A tile's bottom rail. The app draws the same near-black plate under every
 * category, whether it is a price you can tap or a state you cannot.
 */
export function ShopFooter({
  children,
  onSelect,
  height = 36,
  label,
  tint,
  className,
}: {
  children: ReactNode;
  /** Omit for a state rail — OWNED, EQUIPPED, CLAIMED. */
  onSelect?: () => void;
  height?: number;
  label?: string;
  /** Replaces the near-black plate, for the app's tinted rupee rail. */
  tint?: string;
  className?: string;
}) {
  const style = {
    height: `${height}px`,
    background: tint,
  } as CSSProperties;

  if (!onSelect) {
    return (
      <div className={[styles.footer, className ?? ""].filter(Boolean).join(" ")} style={style}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      className={[styles.footer, styles.footerButton, className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {children}
    </button>
  );
}

/** A word on a state rail: OWNED, EQUIPPED, CLAIMED, FREE. */
export function ShopFooterLabel({
  children,
  accent,
  dim = false,
}: {
  children: ReactNode;
  accent: string;
  dim?: boolean;
}) {
  return (
    <span
      className={styles.footerLabel}
      style={{ color: dim ? `color-mix(in srgb, ${accent} 50%, transparent)` : accent }}
    >
      {children}
    </span>
  );
}

export type ShopStampKind = "owned" | "equipped" | "claimed";

/**
 * The shared "you have this" stamp: a tilted accent badge over a dark scrim, so
 * owned, equipped and claimed all read the same across the seven categories.
 */
export function ShopStateStamp({
  kind,
  accent = cyan,
}: {
  kind: ShopStampKind;
  accent?: string;
}) {
  const label = kind === "owned" ? "OWNED" : kind === "equipped" ? "EQUIPPED" : "CLAIMED";

  return (
    <span aria-hidden className={styles.stampScrim}>
      <span className={styles.stamp} style={{ "--shop-accent": accent } as CSSProperties}>
        {label}
      </span>
    </span>
  );
}

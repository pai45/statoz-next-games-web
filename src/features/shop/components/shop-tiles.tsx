"use client";

import Image from "next/image";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { ProfileIcon, StyleIcon, StarIcon } from "@statoz/design-system/games";
import type { Sport } from "@/domain/sports";

import { AvatarFrameRing } from "./avatar-frame-ring";
import {
  ShopCardFrame,
  ShopFooter,
  ShopFooterLabel,
  ShopPricePill,
  ShopStateStamp,
  ShopTag,
} from "./shop-card";
import styles from "./shop-tiles.module.css";

/**
 * The seven kinds of shop tile, all built on the one `ShopCardFrame`.
 *
 * Each tile is the app's composition: the same square-portrait-and-name column
 * for avatars and coins, the same 66px ring for frames, the same 148px strip for
 * banners and kits, the same two-rail footer for anything that sells for coins
 * or rupees. The screen keeps the buying; these only draw.
 */

/* ---- Grids ----------------------------------------------------------------- */

/** Three across on a phone, four then five as the window earns them. */
export function TileGrid({ children }: { children: ReactNode }) {
  return <div className={styles.tileGrid}>{children}</div>;
}

/** Full-width strips, centred and capped, for banners and kits. */
export function StripList({ children }: { children: ReactNode }) {
  return <div className={styles.stripList}>{children}</div>;
}

/** Two across, always — a pack is taller than it is wide. */
export function PackGrid({ children }: { children: ReactNode }) {
  return <div className={styles.packGrid}>{children}</div>;
}

/** Two across, three once there is room, holding collectible cards. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className={styles.cardGrid}>{children}</div>;
}

export type ShopRailSize = "portrait" | "pack" | "card" | "strip" | "deal";

/**
 * One storefront shelf: a single row that scrolls sideways and snaps to each
 * tile. `size` sets the width a tile takes in the row.
 */
export function ShopRail({ size, label, children }: { size: ShopRailSize; label: string; children: ReactNode }) {
  return (
    <div className={styles.rail} data-size={size} role="group" aria-label={label}>
      {children}
    </div>
  );
}

/**
 * Wraps a tile a deep link can point at. It adds no box of its own, so grids
 * and rails lay the tile out unchanged; `focused` lights it up once.
 */
export function ShopFocusTarget({ id, focused, children }: { id: string; focused: boolean; children: ReactNode }) {
  return (
    <div id={shopItemDomId(id)} className={styles.focusTarget} data-focused={focused || undefined}>
      {children}
    </div>
  );
}

/** Scrolls a deep-linked tile into view once its drawer has opened. */
export function useScrollToItem(id: string | null) {
  useEffect(() => {
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      const tile = document.getElementById(shopItemDomId(id))?.firstElementChild;
      tile?.scrollIntoView({ block: "center", inline: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [id]);
}

export function shopItemDomId(id: string) {
  return `shop-item-${id}`;
}

/* ---- Avatars --------------------------------------------------------------- */

export function AvatarTile({
  name,
  portraitSrc,
  price,
  owned,
  accent,
  index,
  onBuy,
}: {
  name: string;
  portraitSrc?: string;
  price: number;
  owned: boolean;
  accent: string;
  index: number;
  onBuy: () => void;
}) {
  return (
    <ShopCardFrame accent={accent} index={index} className={styles.portraitTile}>
      <div className={styles.column}>
        <div className={styles.square}>
          {portraitSrc ? (
            <Image
              src={portraitSrc}
              alt={name}
              fill
              sizes="(max-width: 479px) 30vw, (max-width: 719px) 23vw, 160px"
              className="object-cover object-top"
            />
          ) : (
            <span className={styles.squareFallback}>
              <ProfileIcon size={32} />
            </span>
          )}
        </div>
        <p className={styles.tileName}>{name.toUpperCase()}</p>
      </div>
      {owned ? (
        <ShopFooter>
          <ShopFooterLabel accent={accent}>OWNED</ShopFooterLabel>
        </ShopFooter>
      ) : (
        <ShopFooter onSelect={onBuy} label={`Buy ${name}`}>
          <ShopPricePill coins={price} size={11} />
        </ShopFooter>
      )}
    </ShopCardFrame>
  );
}

/* ---- Frames ---------------------------------------------------------------- */

export function FrameTile({
  label,
  color,
  price,
  owned,
  equipped,
  index,
  onBuy,
  onEquip,
}: {
  label: string;
  color: string;
  price: number;
  owned: boolean;
  equipped: boolean;
  index: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <ShopCardFrame accent={color} focal={equipped} index={index} className={styles.portraitTile}>
      <div className={styles.column}>
        <div className={styles.ringSlot}>
          <AvatarFrameRing color={color} glow={equipped} className={styles.ring}>
            <span className={styles.ringFace}>
              <ProfileIcon size={30} />
            </span>
          </AvatarFrameRing>
        </div>
        <span
          aria-hidden
          className={styles.hairline}
          style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }}
        />
        <p className={styles.frameLabel}>{label.toUpperCase()}</p>
      </div>
      {equipped ? (
        <ShopFooter>
          <ShopFooterLabel accent={color}>EQUIPPED</ShopFooterLabel>
        </ShopFooter>
      ) : owned ? (
        <ShopFooter onSelect={onEquip} label={`Equip ${label}`}>
          <ShopFooterLabel accent={color}>EQUIP</ShopFooterLabel>
        </ShopFooter>
      ) : (
        <ShopFooter onSelect={onBuy} label={`Buy ${label}`}>
          <ShopPricePill coins={price} size={11} />
        </ShopFooter>
      )}
    </ShopCardFrame>
  );
}

/* ---- Banners --------------------------------------------------------------- */

export function BannerTile({
  label,
  sportCode,
  accent,
  art,
  price,
  owned,
  index,
  onBuy,
}: {
  label: string;
  sportCode: string;
  accent: string;
  art: ReactNode;
  price: number;
  owned: boolean;
  index: number;
  onBuy: () => void;
}) {
  return (
    <ShopCardFrame accent={accent} index={index} className={styles.strip}>
      <div className={styles.bannerBody}>
        <div className={styles.bannerArt}>
          {art}
          <span className={styles.bannerTag}>
            <ShopTag label={sportCode} accent={accent} />
          </span>
        </div>
        <p className={styles.bannerLabel}>{label}</p>
      </div>
      {owned ? (
        <ShopFooter>
          <ShopFooterLabel accent={accent}>OWNED</ShopFooterLabel>
        </ShopFooter>
      ) : (
        <ShopFooter onSelect={onBuy} label={`Buy ${label}`}>
          <ShopPricePill coins={price} size={11} />
        </ShopFooter>
      )}
    </ShopCardFrame>
  );
}

/* ---- Kits, jerseys and liveries -------------------------------------------- */

/*
 * The app stamps an owned kit OWNED, because it is equipped elsewhere — in the
 * game's own kit picker. The web has no Final Over or Hoop Duel to equip it in,
 * so the rail carries EQUIP instead and the stamp would only cover it.
 */

export function KitTile({
  label,
  caption,
  primary,
  secondary,
  accent,
  kind,
  price,
  owned,
  equipped,
  index,
  onBuy,
  onEquip,
}: {
  label: string;
  caption: string;
  primary: string;
  secondary: string;
  accent: string;
  kind: "kit" | "jersey" | "livery";
  price: number;
  owned: boolean;
  equipped: boolean;
  index: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <ShopCardFrame
      accent={accent}
      focal={equipped}
      index={index}
      className={styles.strip}
    >
      <div className={styles.kitRow}>
        <KitPreview primary={primary} secondary={secondary} accent={accent} kind={kind} />
        <div className={styles.kitCopy}>
          <p className={styles.kitName}>{label.toUpperCase()}</p>
          <p className={styles.kitCaption}>{caption}</p>
          <span className={styles.swatches}>
            <span style={{ background: primary }} />
            <span style={{ background: secondary }} />
            <span style={{ background: accent }} />
          </span>
        </div>
      </div>
      {equipped ? (
        <ShopFooter>
          <ShopFooterLabel accent={accent}>EQUIPPED</ShopFooterLabel>
        </ShopFooter>
      ) : owned ? (
        <ShopFooter onSelect={onEquip} label={`Equip ${label}`}>
          <ShopFooterLabel accent={accent}>EQUIP</ShopFooterLabel>
        </ShopFooter>
      ) : (
        <ShopFooter onSelect={onBuy} label={`Buy ${label}`}>
          {price === 0 ? (
            <ShopFooterLabel accent={accent}>FREE</ShopFooterLabel>
          ) : (
            <ShopPricePill coins={price} size={11} />
          )}
        </ShopFooter>
      )}
    </ShopCardFrame>
  );
}

/**
 * A kit in its three colours: the body in the primary, a contrast panel in the
 * secondary, the accent as the trim.
 *
 * The app previews a kit by dressing its Final Over batter rig in it. That rig
 * belongs to a game the web has not ported, so this draws the garment itself —
 * a shirt for a kit or a jersey, a car for a livery.
 */
export function KitPreview({
  primary,
  secondary,
  accent,
  kind,
}: {
  primary: string;
  secondary: string;
  accent: string;
  kind: "kit" | "jersey" | "livery";
}) {
  const style = {
    "--kit-primary": primary,
    "--kit-secondary": secondary,
    "--kit-accent": accent,
  } as CSSProperties;

  if (kind === "livery") {
    return (
      <span className={styles.kitPreview} style={style}>
        <span className={styles.car}>
          <span className={styles.carStripe} />
          <span className={styles.carCanopy} />
        </span>
      </span>
    );
  }

  return (
    <span className={styles.kitPreview} style={style}>
      <span className={styles.shirt}>
        <span className={styles.shirtPanel} />
        <span className={styles.shirtTrim} />
      </span>
    </span>
  );
}

/* ---- Coins ----------------------------------------------------------------- */

export function CoinTile({
  coins,
  inr,
  accent,
  artSrc,
  bonus,
  tag,
  index,
  onBuy,
  label,
}: {
  coins: string;
  inr: number;
  accent: string;
  artSrc: string;
  bonus: number;
  tag?: string;
  index: number;
  onBuy: () => void;
  label: string;
}) {
  return (
    <ShopCardFrame accent={accent} elevated index={index} className={styles.portraitTile}>
      <div className={styles.column}>
        <div className={styles.square}>
          <Image src={artSrc} alt="" fill sizes="180px" className="object-cover object-bottom" />
          {bonus > 0 || tag ? (
            <span className={styles.coinTags}>
              {bonus > 0 ? <ShopTag label={`+${bonus}%`} accent={accent} /> : null}
              {tag ? <ShopTag label={tag} accent={accent} /> : null}
            </span>
          ) : null}
        </div>
        <p className={styles.tileName}>{coins}</p>
      </div>
      <ShopFooter onSelect={onBuy} label={`Buy the ${label} coin bundle`}>
        <ShopPricePill inr={inr} accent={accent} size={11} />
      </ShopFooter>
    </ShopCardFrame>
  );
}

/* ---- Packs ----------------------------------------------------------------- */

export function PackTile({
  label,
  accent,
  artSrc,
  cardCount,
  coinPrice,
  inr,
  starter,
  claimed,
  elite,
  index,
  holo,
  onCoins,
  onInr,
}: {
  label: string;
  accent: string;
  artSrc: string;
  cardCount: number;
  coinPrice: number;
  inr: number;
  /** The free pack: one full-height rail rather than two. */
  starter: boolean;
  claimed: boolean;
  /** The rarest pack in the row — the only one allowed the focal glow. */
  elite: boolean;
  index: number;
  holo: HoloSpec;
  onCoins: () => void;
  onInr: () => void;
}) {
  return (
    <ShopCardFrame accent={accent} focal={elite} tint={0.04} index={index} className={styles.packTile}>
      <div className={styles.packBody}>
        <span className={styles.packArtWrap}>
          <PackArt src={artSrc} label={label} holo={holo} />
          {elite ? (
            <span className={styles.packStar}>
              <StarIcon size={18} />
            </span>
          ) : null}
        </span>
        <p className={styles.packName} style={{ color: accent }}>
          {label.toUpperCase()}
        </p>
        <p className={styles.packMeta}>
          <StyleIcon size={10} />
          {cardCount} CARDS
        </p>
      </div>

      {claimed ? (
        <ShopFooter height={72}>
          <ShopFooterLabel accent={accent} dim>
            CLAIMED
          </ShopFooterLabel>
        </ShopFooter>
      ) : starter ? (
        <ShopFooter height={72} onSelect={onCoins} label={`Open the ${label}`}>
          <ShopFooterLabel accent={accent}>FREE</ShopFooterLabel>
        </ShopFooter>
      ) : (
        <>
          <ShopFooter onSelect={onCoins} label={`Buy the ${label} with coins`}>
            <ShopPricePill coins={coinPrice} size={11} />
          </ShopFooter>
          <ShopFooter
            onSelect={onInr}
            label={`Buy the ${label} with rupees`}
            tint={`color-mix(in srgb, ${accent} 18%, transparent)`}
          >
            <span className={styles.inrRail} style={{ color: accent }}>
              ₹{inr.toLocaleString("en-IN")}
            </span>
          </ShopFooter>
        </>
      )}
    </ShopCardFrame>
  );
}

/**
 * How a pack's foil sweeps: which colours, how bright, how many bands and how
 * fast. The app escalates all four with rarity, so the elite pack is the one
 * carrying a full rainbow.
 */
export type HoloSpec = {
  colors: string[];
  intensity: number;
  bands: number;
  speed: number;
};

/** The pack's art with the holographic band (or two) travelling across it. */
export function PackArt({
  src,
  label,
  holo,
}: {
  src: string;
  label: string;
  holo: HoloSpec;
}) {
  const stops = holo.colors
    .map((color, index) => {
      const at = holo.colors.length === 1 ? 50 : (index / (holo.colors.length - 1)) * 100;
      return `color-mix(in srgb, ${color} ${Math.round(holo.intensity * 100)}%, transparent) ${at}%`;
    })
    .join(", ");
  const band = `linear-gradient(90deg, transparent 0%, ${stops}, transparent 100%)`;

  return (
    <span className={styles.packArt}>
      <Image src={src} alt={label} fill sizes="180px" className="object-contain" />
      {Array.from({ length: holo.bands }, (_, band_index) => (
        <span
          key={band_index}
          aria-hidden
          className={styles.holo}
          style={{
            background: band,
            animationDuration: `${2200 / holo.speed}ms`,
            animationDelay: `${(-2200 / holo.speed) * (band_index / holo.bands)}ms`,
          }}
        />
      ))}
    </span>
  );
}

/* ---- Collectible cards ----------------------------------------------------- */

export function CardTile({
  card,
  accent,
  coinPrice,
  inr,
  owned,
  index,
  onCoins,
  onInr,
  name,
}: {
  card: ReactNode;
  accent: string;
  coinPrice: number;
  inr: number;
  owned: boolean;
  index: number;
  onCoins: () => void;
  onInr: () => void;
  name: string;
}) {
  return (
    <ShopCardFrame
      accent={accent}
      index={index}
      className={styles.cardTile}
      stamp={owned ? <ShopStateStamp kind="owned" accent={accent} /> : undefined}
    >
      <div className={styles.cardSlot}>{card}</div>
      {owned ? (
        <ShopFooter>
          <ShopFooterLabel accent={accent}>OWNED</ShopFooterLabel>
        </ShopFooter>
      ) : (
        <>
          <ShopFooter onSelect={onCoins} label={`Buy ${name} with coins`}>
            <ShopPricePill coins={coinPrice} size={12} />
          </ShopFooter>
          <ShopFooter
            onSelect={onInr}
            label={`Buy ${name} with rupees`}
            tint={`color-mix(in srgb, ${accent} 18%, transparent)`}
          >
            <span className={styles.inrRail} style={{ color: accent }}>
              ₹{inr.toLocaleString("en-IN")}
            </span>
          </ShopFooter>
        </>
      )}
    </ShopCardFrame>
  );
}

/* ---- Empty ----------------------------------------------------------------- */

/** What a sport shows before its drops are seeded. */
export function ShopEmptyFilter({ sport, label }: { sport: Sport; label: string }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{"// EMPTY GRID"}</p>
      <p className={styles.emptyBody}>{label}</p>
      <p className={styles.emptySport}>{sport.toUpperCase()}</p>
    </div>
  );
}

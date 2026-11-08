"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import { SportIcon } from "@/features/matches";
import type { ShopBanner } from "@/mocks/shop";
import { publicAsset } from "@/shared/config";

import styles from "./banner-art.module.css";

/**
 * What a banner looks like, wherever it is shown — on its shop tile, and behind
 * the name of whoever bought it.
 *
 * Team banners carry their own art. The rest are painted: a two-colour wash,
 * dust, accent slashes running across it, and a burst behind the sport's crest.
 */
export function BannerArt({ banner }: { banner: ShopBanner }) {
  const accent = { "--banner-accent": banner.accent } as CSSProperties;

  return (
    <div
      className={styles.bannerArtLayer}
      style={{ background: `linear-gradient(90deg, ${banner.colors[0]}, ${banner.colors[1]})` }}
    >
      {banner.assetSrc ? (
        <Image src={publicAsset(banner.assetSrc)} alt="" fill sizes="560px" className="object-cover object-center" />
      ) : (
        <>
          <span className={styles.bannerDust} aria-hidden="true" />
          <span className={styles.bannerSlashes} aria-hidden="true" style={accent} />
          <span className={styles.bannerBurst} aria-hidden="true" style={accent} />
          <span
            className={styles.bannerCrest}
            style={{
              color: banner.accent,
              borderColor: "color-mix(in srgb, var(--ds-color-text-default) 75%, transparent)",
              background: `radial-gradient(circle, color-mix(in srgb, var(--ds-color-text-default) 24%, transparent), color-mix(in srgb, ${banner.accent} 38%, transparent), color-mix(in srgb, var(--ds-color-background-primary) 92%, transparent))`,
              boxShadow: `0 0 24px color-mix(in srgb, ${banner.accent} 62%, transparent)`,
            }}
          >
            <SportIcon sport={banner.sport} size={34} />
          </span>
        </>
      )}
    </div>
  );
}

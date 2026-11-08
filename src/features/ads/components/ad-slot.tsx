import Image from "next/image";
import { publicAsset } from "@/shared/config";

import { adPlacements } from "@/mocks/ads";
import type { AdFormat, AdPlacementId } from "../types";

import styles from "./ad-slot.module.css";

export type AdSlotProps = {
  placement: AdPlacementId;
  className?: string;
};

/**
 * A visible, non-interactive reservation for a future responsive display ad.
 * It deliberately owns no Google script or credential: a real provider can
 * replace this inner creative later without moving the route-level placement.
 */
export function AdSlot({ placement, className }: AdSlotProps) {
  const config = adPlacements[placement];
  const frameClass = [
    styles.frame,
    styles[config.format],
    config.creative === "campaign" ? styles.campaign : styles.wireframe,
  ].join(" ");
  const slotClass = [
    styles.slot,
    config.desktopOnly ? styles.desktopOnly : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={slotClass} aria-label="Advertisement" data-ad-placement={placement}>
      <div className={frameClass} aria-hidden="true">
        {config.creative === "campaign" ? <CampaignCreative format={config.format} /> : <WireframeCreative format={config.format} />}
      </div>
    </aside>
  );
}

function CampaignCreative({ format }: { format: AdFormat }) {
  const src = format === "horizontal"
    ? "/assets/ads/velocity-lab-wide.png"
    : "/assets/ads/velocity-lab-rectangle.png";

  return (
    <>
      <Image
        src={publicAsset(src)}
        alt=""
        fill
        sizes={imageSizes(format)}
        className={styles.image}
      />
      <span className={styles.scrim} />
      <div className={styles.copy}>
        <p className={styles.copyEyebrow}>Demo creative</p>
        <p className={styles.copyTitle}>Velocity Lab</p>
        <p className={styles.copyDetail}>Move beyond</p>
      </div>
    </>
  );
}

function WireframeCreative({ format }: { format: AdFormat }) {
  const dimensions = format === "horizontal"
    ? "320×100 → 970×90"
    : format === "skyscraper"
      ? "160×600"
      : format === "anchor"
        ? "320×50 → 728×90"
        : "300×250";
  const src = format === "horizontal"
    ? "/assets/ads/ad-space-horizontal.svg"
    : format === "skyscraper"
      ? "/assets/ads/ad-space-skyscraper.svg"
      : format === "anchor"
        ? "/assets/ads/ad-space-anchor.svg"
        : "/assets/ads/ad-space-rectangle.svg";
  return (
    <>
      <Image
        src={publicAsset(src)}
        alt=""
        fill
        sizes={imageSizes(format)}
        loading={format === "skyscraper" || format === "anchor" ? "eager" : undefined}
        className={styles.wireframeImage}
      />
      <div className={styles.wireframeCopy}>
        <span>Demo ad space</span>
        <strong>Responsive display</strong>
        <small>{dimensions}</small>
      </div>
    </>
  );
}

function imageSizes(format: AdFormat) {
  if (format === "horizontal") {
    return "(max-width: 767px) 320px, (max-width: 1023px) 728px, 970px";
  }

  if (format === "skyscraper") return "160px";
  if (format === "anchor") return "(max-width: 767px) 320px, 728px";
  return "300px";
}

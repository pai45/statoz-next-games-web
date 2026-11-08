import Image from "next/image";

import { withAlpha } from "@statoz/design-system/games";
import { publicAsset } from "@/shared/config";

import type { ProfileBannerOption } from "../types";

export type BannerVisualProps = {
  banner: ProfileBannerOption;
  className?: string;
};

/**
 * A profile banner: its artwork when the project ships some, otherwise the
 * procedural stand-in the app falls back to — a darkened base in the banner's
 * first colour, raked chevrons, and accent hairlines across them.
 *
 * Flutter paints the chevrons as nine overlapping parallelograms; on the web
 * the same rhythm is one repeating gradient, and the hairlines are another.
 */
export function BannerVisual({ banner, className }: BannerVisualProps) {
  const wrapper = ["absolute inset-0", className ?? ""].filter(Boolean).join(" ");

  if (banner.src) {
    return (
      <Image
        src={publicAsset(banner.src)}
        alt=""
        fill
        sizes="(min-width: 1024px) 32rem, 100vw"
        className={["object-cover", className ?? ""].filter(Boolean).join(" ")}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={wrapper}
      style={{
        background: [
          // Accent hairlines raking up across everything.
          `repeating-linear-gradient(188deg, ${withAlpha(banner.accent, 0.3)} 0 1.4px, transparent 1.4px 26px)`,
          // The banner's own two colours, as chevrons in the same rhythm. The
          // app's art carries the identity here, so the stand-in has to as
          // well — several banners share a base colour and would otherwise be
          // impossible to tell apart.
          `repeating-linear-gradient(115deg,
            transparent 0 7%,
            ${withAlpha(banner.colors[1], 0.85)} 7% 15%,
            transparent 15% 21%,
            ${withAlpha(banner.colors[2], 0.85)} 21% 29%,
            transparent 29% 36%)`,
          // A lift and a shadow under them, for the folded-fabric depth.
          "repeating-linear-gradient(115deg, rgb(255 255 255 / 6%) 0 10%, rgb(0 0 0 / 20%) 10% 20%)",
          // The base: the banner's darkest colour, taken down further.
          `color-mix(in srgb, ${banner.colors[0]} 82%, var(--ds-color-background-muted))`,
        ].join(", "),
      }}
    />
  );
}

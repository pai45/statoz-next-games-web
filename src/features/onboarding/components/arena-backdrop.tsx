import Image from "next/image";

import { withAlpha } from "@statoz/design-system/games";
import { publicAsset } from "@/shared/config";

import styles from "./motion.module.css";

const BG = "var(--ds-color-background-primary)";

export type ArenaBackdropProps = {
  className?: string;
};

/**
 * The penalty-arena bed the whole pre-platform flow sits on: the arena plate
 * drifting slowly under a scrim, finished with the app's CRT scanlines and a
 * vignette that pulls the eye to the middle.
 *
 * Flutter stacks six painted layers here; four of them are gradients the
 * browser can draw itself, so only the photograph is a real element.
 */
export function ArenaBackdrop({ className }: ArenaBackdropProps) {
  return (
    <div
      aria-hidden
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ background: "var(--ds-gradient-arena-backdrop)" }}
    >
      <div className={`${styles.drift} absolute inset-0`}>
        <Image
          src={publicAsset("/assets/backgrounds/penalty_arena.png")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.34]"
        />
      </div>

      {/* Hands the eye down the screen and keeps type off bare artwork. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${withAlpha(BG, 0.5)} 0%, ${withAlpha(BG, 0.32)} 46%, ${withAlpha(BG, 0.78)} 100%)`,
        }}
      />
      {/* CRT scanlines — a dark row every third pixel. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgb(0 0 0 / 14%) 0 1px, transparent 1px 3px)",
        }}
      />
      {/* Vignette — darkens the edges so the middle holds the eye. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(115% 115% at 50% 50%, transparent 55%, ${withAlpha("var(--ds-color-background-muted)", 0.5)} 100%)`,
        }}
      />
    </div>
  );
}

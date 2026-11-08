import Image from "next/image";

import { withAlpha } from "@statoz/design-system/games";
import { publicAsset } from "@/shared/config";

import styles from "./matchmaking.module.css";

/**
 * The bed every matchmaking screen sits on, and the same one the kickoff
 * countdown keeps behind it so the handoff does not cut.
 *
 * Flutter stacks a gradient, an optional drifting arena plate, a scrim and a
 * painted texture overlay. Three of those four are gradients the browser draws
 * itself, so only the photograph is a real element — and the bed's three stops
 * are already in the token layer as the arena backdrop the pre-platform screens
 * use.
 */

export type MatchmakingArenaBackgroundProps = {
  /** Full-bleed arena art under `public/`. Absent, the gradient carries it alone. */
  asset?: string;
};

const BG = "var(--ds-color-background-primary)";

export function MatchmakingArenaBackground({
  asset,
}: MatchmakingArenaBackgroundProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: "var(--ds-gradient-arena-backdrop)" }}
    >
      {asset === undefined ? null : (
        <div className={`${styles.drift} absolute inset-0`}>
          <Image
            src={publicAsset(asset)}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-45"
          />
        </div>
      )}

      {/* Hands the eye to the middle band, where the face-off is. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${withAlpha(BG, 0.28)} 0%, transparent 46%, ${withAlpha(BG, 0.6)} 100%)`,
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

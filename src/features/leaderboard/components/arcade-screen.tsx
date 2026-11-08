import type { CSSProperties, ReactNode } from "react";

import { hudChamferPath, withAlpha } from "@statoz/design-system/games";

import styles from "./arcade.module.css";

/**
 * The cabinet screen the high-score table sits on.
 *
 * A HUD-chamfered plate in the sport accent, built in layers because a clip
 * path crops borders and shadows away: a blurred glow, a 1px accent edge, the
 * dark glass fill, the content and, above it, a faint scanline pass that never
 * takes pointer events. It switches on like a tube each time it mounts, so a
 * new board arrives rather than mutating in place.
 */

const clip: CSSProperties = { clipPath: hudChamferPath(22, 8) };

export function ArcadeScreen({
  accent,
  className,
  children,
}: {
  accent: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label="High scores"
      className={["relative", styles.powerOn, className ?? ""].filter(Boolean).join(" ")}
      style={{ "--arcade-accent": accent, "--arcade-glow": accent } as CSSProperties}
    >
      <span aria-hidden className={styles.screenGlow} style={clip} />
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ ...clip, background: withAlpha(accent, 0.62) }}
      />
      <span aria-hidden className={`absolute inset-px ${styles.screenFill}`} style={clip} />
      <div className="relative px-3 pb-4 pt-3.5 sm:px-4.5 sm:pb-5">{children}</div>
      <span aria-hidden className={`absolute inset-px ${styles.scanlines}`} style={clip} />
    </section>
  );
}

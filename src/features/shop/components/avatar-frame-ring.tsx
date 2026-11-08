import type { CSSProperties, ReactNode } from "react";

import styles from "./shop-card.module.css";

/**
 * An equipped frame, drawn: a 4px band in the team's colour running light to
 * dark, and a 2px raised inner edge that lifts the band off the face beneath.
 *
 * The band and the bevel are both derived from the one team colour the frame
 * carries — the app mixes them the same way, 45% toward white for the highlight,
 * 35% toward black for the shade, 25% toward white for the raised edge.
 *
 * Per the glow rule the halo is opt-in: set it on the equipped instance — your
 * own avatar, the tile you are wearing — never on a resting catalogue tile.
 */
export function AvatarFrameRing({
  color,
  children,
  glow = false,
  octagon = false,
  className,
  style,
}: {
  /** The frame's team colour. Undefined leaves the child unringed. */
  color?: string;
  children: ReactNode;
  glow?: boolean;
  /** Follows the avatar octagon instead of the square. */
  octagon?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  if (!color) return <>{children}</>;

  return (
    <span
      className={[styles.ring, octagon ? styles.ringOctagon : "", glow ? styles.ringGlow : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{ "--frame-color": color, ...style } as CSSProperties}
    >
      <span className={styles.ringInner}>{children}</span>
    </span>
  );
}

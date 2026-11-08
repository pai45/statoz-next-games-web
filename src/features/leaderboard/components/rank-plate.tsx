import type { CSSProperties, ReactNode } from "react";

import { hudChamferPath } from "@statoz/design-system/games";

import styles from "./leaderboard.module.css";

/**
 * The board's shared surface: a flat fill inside a chamfered edge.
 *
 * The app draws every podium tile, row, chip and pill with one
 * `cutCornerDecoration`, which cuts the top-left and bottom-right corners and
 * leaves the other two square — the HUD chamfer with no answering cut, which is
 * exactly what `hudChamferPath(cut, 0)` describes. Only the cut size and the
 * two colours change between them, so they are all this component.
 *
 * It is not `HudPanel`: that fixes the silhouette at 14/4 and always paints an
 * accent edge, where a board needs seven different cuts and an edgeless plate
 * for the rows that are not yours.
 *
 * Built as an edge layer with the fill inset a pixel inside it, because a clip
 * path crops a border away.
 */

/**
 * A translucent fill, resolved against the page ground as an opaque colour.
 *
 * The app strokes a one-pixel border and fills behind it, so its translucent
 * fills sit on the scaffold. A clip path crops a border away, so the web has to
 * draw the edge as a plate *behind* the fill — which means a translucent fill
 * would blend into the edge instead of the page, and a strongly tinted edge
 * would swallow the fill whole. Mixing against the ground here keeps every
 * plate the colour the app painted rather than the colour of its own border.
 */
export function plateFill(color: string, amount: number): string {
  return `color-mix(in srgb, ${color} ${amount * 100}%, var(--ds-color-background-primary))`;
}

export type RankPlateProps = {
  /** Depth of the top-left and bottom-right chamfer, in pixels. */
  cut: number;
  /** Must be opaque — see {@link plateFill}. */
  background: string;
  /** Omit for a plate with no edge at all — the resting row. */
  borderColor?: string;
  /** Adds the hover lift. Set it on anything actually tappable. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function RankPlate({
  cut,
  background,
  borderColor,
  interactive = false,
  className,
  style,
  children,
}: RankPlateProps) {
  const clip: CSSProperties = { clipPath: hudChamferPath(cut, 0) };

  return (
    <div
      className={["relative", interactive ? styles.pressable : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {borderColor ? (
        <span aria-hidden className="absolute inset-0" style={{ ...clip, background: borderColor }} />
      ) : null}
      <span
        aria-hidden
        className={borderColor ? "absolute inset-px" : "absolute inset-0"}
        style={{ ...clip, background }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

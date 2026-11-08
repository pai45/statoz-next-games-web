import type { CSSProperties, ReactNode } from "react";

import styles from "./profile.module.css";

/**
 * The dossier's shared surface: a flat dark fill inside a cut-corner edge, over
 * a hard, un-blurred drop shadow. Depth without a gradient, and no glow — these
 * are always-on chrome, so under the glow rule the hero's level chip and XP
 * meter stay the only lit things on the page.
 *
 * Flutter draws it as a `ShapeDecoration` with a `CutChipBorder`; a clip path
 * crops a border away, so on the web the edge is a clipped plate with the fill
 * inset a pixel inside it — the same construction the HUD panel uses.
 */

export type ProfilePanelProps = {
  children: ReactNode;
  /** Overrides the resting edge, e.g. to mark a card as configured. */
  borderColor?: string;
  /** Adds the hover lift. Set it on anything that is actually tappable. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

const clip: CSSProperties = { clipPath: "var(--ds-clip-panel)" };

export function ProfilePanel({
  children,
  borderColor,
  interactive = false,
  className,
  style,
}: ProfilePanelProps) {
  return (
    <div
      className={[
        "relative",
        interactive ? styles.pressable : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...style,
        // The shadow sits on the wrapper, which is unclipped — a box-shadow is
        // cropped along with the element that casts it.
        filter: "drop-shadow(0 5px 0 var(--ds-color-fixture-shadow))",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          ...clip,
          background: borderColor ?? "var(--ds-color-border-default)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-px"
        style={{ ...clip, background: "var(--ds-color-background-secondary)" }}
      />
      <div className="relative" style={clip}>
        {children}
      </div>
    </div>
  );
}

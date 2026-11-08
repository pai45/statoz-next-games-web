import type { CSSProperties } from "react";

import { paletteVar, type PaletteName } from "@statoz/design-system/games";

import styles from "./how-to-play.module.css";

/**
 * The two things both How To Play screens share: publishing a guide's accent to
 * the stylesheet, and the small cyan section label a panel's contents hang from.
 *
 * The accent itself crosses the palette's two scales — most modes take an
 * accent, the bingo lives counter and the hoop-duel shot clock take danger — so
 * it resolves through `paletteVar`, which knows both.
 */

/** Publishes an accent to the stylesheet as `--guide-accent`. */
export function accentStyle(accent: PaletteName): CSSProperties {
  return { "--guide-accent": paletteVar(accent) } as CSSProperties;
}

/** The quiet cyan heading a panel's contents hang from. */
export function SectionLabel({ label }: { label: string }) {
  return <p className={styles.sectionLabel}>{label.toUpperCase()}</p>;
}

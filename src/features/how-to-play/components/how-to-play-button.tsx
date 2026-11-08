import Link from "next/link";

import { QuizIcon, type PaletteName } from "@statoz/design-system/games";

import { guideFor } from "../data/guides";
import type { HowToPlayMode } from "../types";
import { accentStyle } from "./guide-parts";
import styles from "./how-to-play.module.css";

/**
 * The compact help affordance that drops a player straight into one mode's
 * guide — for a lobby or a surface where the rules are the question being
 * asked, and a whole card of explanation is not.
 *
 * Secondary chrome: flat fill and an accent edge, never a glow. It takes the
 * guide's own accent unless the surface it sits on needs a different one.
 */
export function HowToPlayButton({
  mode,
  accent,
  className,
}: {
  mode: HowToPlayMode;
  /** Overrides the guide's accent when a lobby runs its own colour. */
  accent?: PaletteName;
  className?: string;
}) {
  const guide = guideFor(mode);
  const label = guide ? `How to play ${guide.title}` : "How to play";

  return (
    <Link
      href={`/how-to-play/${mode}`}
      aria-label={label}
      title={label}
      className={[styles.helpButton, className].filter(Boolean).join(" ")}
      style={accentStyle(accent ?? guide?.accent ?? "cyan")}
    >
      <QuizIcon size={18} />
    </Link>
  );
}

import { typography } from "@statoz/design-system/games/tokens/typography";
import Link from "next/link";

import { ChevronLeftIcon, DirectoryCard, paletteVar } from "@statoz/design-system/games";

import { guides } from "../data/guides";
import styles from "./how-to-play.module.css";

/**
 * HOW TO PLAY — one card per mode that carries a guide, each opening a flat
 * reference page built from the product docs.
 *
 * The app is explicit that this surface is gradient-free and glow-free: depth
 * comes from flat fills, the cut silhouette and accent borders. Nothing here
 * competes for the eye, because everything here is equally a starting point.
 *
 * A phone gets the app's column. Once there is room the cards deal two-up
 * rather than stretching into very wide rows.
 */

/** The count, spelled, so the standfirst cannot go stale as modes are added. */
const counts = [
  "NO",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
];

export function HowToPlayHub() {
  return (
    <div className="min-h-full bg-background text-default">
      <header className="mx-auto flex min-h-14 w-full max-w-260 items-center gap-2 px-2 pt-2 lg:px-6 lg:pt-4">
        <Link
          href="/profile"
          aria-label="Back to profile"
          className="grid h-9 w-9 place-items-center text-default hover:bg-overlay-subtle"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <div className="min-w-0">
          <h1
            className="truncate font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p19,
              color: "var(--ds-color-accent-cyan)",
              letterSpacing: "var(--ds-tracking-label)",
            }}
          >
            HOW TO PLAY
          </h1>
          <p
            className="mt-1 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {"// PICK A MODE TO LEARN"}
          </p>
        </div>
      </header>

      <div className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.introLabel}>
            {counts[guides.length] ?? guides.length} WAYS TO PLAY STATOZ
          </p>
          <p className={styles.introBody}>
            Predict fixtures, take market picks, duel with cards, trade spot kicks,
            or take on the arcade modes. Tap a mode for its quick guide.
          </p>
        </div>

        <ul className={styles.modeGrid}>
          {guides.map((guide) => (
            <li key={guide.id}>
              <DirectoryCard
                href={`/how-to-play/${guide.id}`}
                accent={paletteVar(guide.accent)}
                icon={guide.icon}
                title={guide.title}
                tagline={guide.tagline}
                meta={`${guide.steps.length} STEPS`}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

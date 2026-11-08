"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import {
  accentVar,
  feedbackVar,
  hudChamferPath,
  VerifiedUserIcon,
  WarningIcon,
  withAlpha,
} from "@statoz/design-system/games";

import { verdictStreakAccent } from "./signal-lock";

/**
 * The strip that lands under the options once a question resolves, and stays
 * until the next one is dealt.
 *
 * Flat fill and a border, never a glow: the verdict tile above it is the one
 * focal element on the screen, and two lit things would fight.
 */

const gold = accentVar("gold");

export type QuizDebriefProps = {
  correct: boolean;
  /** XP this question paid, for the chip on a correct answer. */
  xp: number;
  streak: number;
  correctLabel: string;
};

export function QuizDebrief({
  correct,
  xp,
  streak,
  correctLabel,
}: QuizDebriefProps) {
  const accent = correct ? verdictStreakAccent(streak) : feedbackVar("danger");
  const overclocked = correct && streak >= 3;
  const clip = { clipPath: hudChamferPath(10, 4) };

  return (
    <div className="relative min-h-11.5">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ ...clip, background: withAlpha(accent, 0.55) }}
      />
      <span
        aria-hidden
        className="absolute inset-px"
        style={{
          ...clip,
          background: `color-mix(in srgb, ${accent} 10%, var(--ds-color-background-elevated))`,
        }}
      />

      <div className="relative flex items-center gap-2.25 px-3.25 py-2.25">
        {correct ? (
          <VerifiedUserIcon size={18} style={{ color: accent }} />
        ) : (
          <WarningIcon size={18} style={{ color: accent }} />
        )}

        <div className="min-w-0 flex-1">
          <p
            className="font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p11,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: accent,
            }}
          >
            {overclocked
              ? `OVERCLOCK ×${streak}`
              : correct
                ? "SIGNAL LOCKED"
                : "SIGNAL LOST"}
          </p>
          <p className="mt-0.75 truncate text-2xs leading-snug text-muted">
            {correct
              ? `ANSWER CONFIRMED · ${correctLabel}`
              : `ANSWER WAS · ${correctLabel}`}
          </p>
        </div>

        {correct ? (
          <span
            className="ds-tabular shrink-0 border px-2 py-1 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p11,
              color: gold,
              background: withAlpha(gold, 0.13),
              borderColor: withAlpha(gold, 0.5),
            }}
          >
            +{xp} XP
          </span>
        ) : null}
      </div>
    </div>
  );
}

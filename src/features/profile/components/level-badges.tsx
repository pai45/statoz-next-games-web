"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { accentVar, Progress, withAlpha } from "@statoz/design-system/games";
import type { LevelProgress } from "@/domain/progression";

/**
 * The two lit pieces of a hero: the level chip and the XP meter beneath it.
 *
 * They live apart from the dossier hero because a rival wears them too. A
 * rival has no mode-by-mode progress, only a fabricated total, so the meter
 * takes the level band itself rather than the whole `PlayerProgress` record —
 * which is all it ever read.
 */

const cyan = accentVar("cyan");

export function LevelChip({ level }: { level: number }) {
  return (
    <span
      className="relative inline-flex"
      aria-label={`Level ${level}`}
      style={{ filter: "drop-shadow(0 3px 6px rgb(0 0 0 / 50%))" }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: "var(--ds-clip-field)",
          background: withAlpha(cyan, 0.85),
        }}
      />
      <span
        aria-hidden
        className="absolute inset-[1.4px]"
        style={{
          clipPath: "var(--ds-clip-field)",
          background:
            "linear-gradient(to bottom, var(--ds-color-background-elevated), var(--ds-color-background-secondary))",
        }}
      />
      <span className="relative flex items-baseline gap-1.5 px-3.5 py-1.5">
        <span
          className="font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p9,
            letterSpacing: "var(--ds-tracking-ultra)",
            color: withAlpha(cyan, 0.85),
          }}
        >
          LVL
        </span>
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p20, color: cyan }}
        >
          {level}
        </span>
      </span>
    </span>
  );
}

export function XpMeter({ band }: { band: LevelProgress }) {
  return (
    <div>
      <div className="flex items-baseline">
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          XP
        </span>
        <span
          className="ds-tabular ml-auto font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-tight)" }}
        >
          {band.intoLevel} / {band.levelSpan}
        </span>
      </div>
      <div className="mt-1.75">
        <Progress
          value={band.fraction}
          accent={cyan}
          label={`${band.intoLevel} of ${band.levelSpan} XP into level ${band.level}`}
          height={6}
        />
      </div>
    </div>
  );
}

"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { accentVar, withAlpha } from "@statoz/design-system/games";

import type { LeaderboardEntry, ScoreMeta } from "../types";

import { MovementBadge, RankTag, RivalAvatar, ScoreText } from "./rank-parts";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * A board row below the podium.
 *
 * The player's own row is the only one that gets an accent fill and an edge;
 * everyone else is a calm plate with no border at all, so the eye finds you
 * without the list turning into a wall of outlines.
 */

const cyan = accentVar("cyan");
const violet = accentVar("violet");
const gold = accentVar("gold");
const panel = "var(--ds-color-background-elevated)";

export type RankRowProps = {
  entry: LeaderboardEntry;
  accent: string;
  meta: ScoreMeta;
  /** The player's own portrait, used only on their row. */
  avatarSrc?: string;
  frameColor?: string;
  onOpen?: (entry: LeaderboardEntry) => void;
};

export function RankRow({ entry, accent, meta, avatarSrc, frameColor, onOpen }: RankRowProps) {
  const isUser = entry.isUser;

  const row = (
    <RankPlate
      cut={12}
      background={isUser ? plateFill(accent, 0.1) : plateFill(panel, 0.34)}
      borderColor={isUser ? withAlpha(accent, 0.5) : undefined}
      interactive={Boolean(onOpen)}
    >
      {/* The app spaces this row unevenly — 10 before the face, 12 either
          side of the name — so each gap is stated rather than uniform. */}
      <div className="flex items-center px-3 py-2.75">
        <span
          className="ds-tabular w-8.5 shrink-0 font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p14,
            color: entry.rank <= 3 ? gold : "var(--ds-color-text-muted)",
          }}
        >
          #{entry.rank}
        </span>

        <RivalAvatar
          className="ml-2.5"
          name={entry.name}
          size={48}
          highlight={isUser}
          team={entry.team ?? undefined}
          src={isUser ? avatarSrc : undefined}
          frameColor={isUser ? frameColor : undefined}
        />

        <div className="ml-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.75">
            <span
              className={[
                "truncate text-base leading-none",
                isUser ? "font-bold" : "font-semibold",
              ].join(" ")}
            >
              {entry.name}
            </span>
            {isUser ? (
              <RankTag label="YOU" color={cyan} />
            ) : entry.badge ? (
              <RankTag label={entry.badge} color={violet} />
            ) : null}
          </div>

          <div className="mt-1 flex items-center gap-2">
            <MovementBadge movement={entry.movement} isNew={entry.isNew} />
            {entry.subtitle ? (
              <span
                className="truncate font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)" }}
              >
                {entry.subtitle}
              </span>
            ) : null}
          </div>
        </div>

        <div className="ml-3 flex max-w-21.5 shrink-0 flex-col items-end">
          <ScoreText
            key={`row-${entry.rank}-${entry.score}-${meta.unit}`}
            value={entry.score}
            className="ds-tabular truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p16, color: accent }}
          />
          <span
            className="mt-1 font-display font-extrabold leading-none"
            style={{
              fontSize: typography.sizeRem.p9,
              letterSpacing: "var(--ds-tracking-label)",
              color: withAlpha("var(--ds-color-text-muted)", 0.82),
            }}
          >
            {meta.unit}
          </span>
        </div>
      </div>
    </RankPlate>
  );

  if (!onOpen) return row;
  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="block w-full cursor-pointer text-left"
      aria-label={`${entry.name}, rank ${entry.rank}`}
    >
      {row}
    </button>
  );
}

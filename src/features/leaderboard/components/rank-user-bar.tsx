"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { withAlpha } from "@statoz/design-system/games";

import type { LeaderboardEntry, ScoreMeta } from "../types";

import { MovementBadge, RivalAvatar, ScoreText } from "./rank-parts";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * The "where you stand" card.
 *
 * On a phone it is docked below the scroll so it never leaves; once there is
 * room it moves into the sidebar and simply stays in view. Either way it is the
 * same card — the framing is the caller's, since only the caller knows which
 * of the two it is doing.
 */

export type RankUserBarProps = {
  user: LeaderboardEntry;
  meta: ScoreMeta;
  accent: string;
  label?: string;
  /** The player's own portrait. Absent on a team board, which has a crest. */
  avatarSrc?: string;
  frameColor?: string;
  onOpen?: () => void;
  /**
   * What stands where the rank normally does. A match board uses it for the
   * two states that have no rank yet: `#--` while a card waits to settle, and
   * `UNRANKED` before one is played at all.
   */
  rankText?: string;
  /** A board the player has not scored on yet has no number to show. */
  showScore?: boolean;
  /** Turns the card into a call to action — the app's JOIN affordance. */
  ctaLabel?: string;
};

export function RankUserBar({
  user,
  meta,
  accent,
  label = "Your rank",
  avatarSrc,
  frameColor,
  onOpen,
  rankText,
  showScore = true,
  ctaLabel,
}: RankUserBarProps) {
  const card = (
    <RankPlate
      cut={18}
      background={plateFill(accent, 0.1)}
      borderColor={withAlpha(accent, 0.34)}
      interactive={Boolean(onOpen)}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <RivalAvatar
          name={user.name}
          size={54}
          highlight
          team={user.team ?? undefined}
          src={user.team ? undefined : avatarSrc}
          frameColor={user.team ? undefined : frameColor}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-display font-extrabold leading-none"
              style={{ fontSize: typography.sizeRem.p11, color: withAlpha(accent, 0.85) }}
            >
              {label}
            </span>
            <MovementBadge movement={user.movement} isNew={user.isNew} />
          </div>

          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className="ds-tabular font-display font-black leading-none"
              style={{ fontSize: rankText ? typography.sizeRem.p20 : typography.sizeRem.p28 }}
            >
              {rankText ?? `#${user.rank}`}
            </span>
            <span className="truncate text-base font-bold">{user.name}</span>
          </div>

          {user.subtitle ? (
            <p
              className="mt-1 truncate font-display font-black leading-none text-muted"
              style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-ultra)" }}
            >
              {user.subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end">
          {ctaLabel ? (
            <span
              className="font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p11,
                letterSpacing: "var(--ds-tracking-label)",
                color: accent,
                border: `1px solid ${withAlpha(accent, 0.6)}`,
                padding: "7px 12px",
              }}
            >
              {ctaLabel}
            </span>
          ) : showScore ? (
            <>
          <ScoreText
            key={`user-${meta.unit}-${user.score}`}
            value={user.score}
            className="ds-tabular font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p21, color: accent }}
          />
          <span
            className="mt-1 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p9,
              letterSpacing: "var(--ds-tracking-label)",
              color: withAlpha(accent, 0.7),
            }}
          >
            {meta.unit.toLowerCase()}
          </span>
            </>
          ) : null}
        </div>
      </div>
    </RankPlate>
  );

  if (!onOpen) return card;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full cursor-pointer text-left"
      aria-label={ctaLabel ? `${ctaLabel} this board` : "Open your profile"}
    >
      {card}
    </button>
  );
}

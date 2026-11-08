"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { CSSProperties } from "react";

import { accentVar, hudChamferPath, withAlpha } from "@statoz/design-system/games";

import { ordinal } from "../arcade";
import type { LeaderboardEntry, ScoreMeta } from "../types";

import styles from "./arcade.module.css";
import { MovementBadge, RankTag, RivalAvatar, ScoreText } from "./rank-parts";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * One line of the high-score table: rank, face, name, a dotted run, then the
 * zero-padded score and the movement arrow.
 *
 * Lines alternate in tint so the eye can track across. The player's own line
 * is cyan, edged, and marked with a blinking cursor, like the line waiting for
 * initials on a cabinet.
 */

const cyan = accentVar("cyan");
const violet = accentVar("violet");
const panel = "var(--ds-color-background-elevated)";
const muted = "var(--ds-color-text-muted)";

export type ArcadeScoreRowProps = {
  entry: LeaderboardEntry;
  /** Position in the list below the podium, for the alternating tint. */
  index: number;
  accent: string;
  meta: ScoreMeta;
  avatarSrc?: string;
  frameColor?: string;
  onOpen?: (entry: LeaderboardEntry) => void;
};

export function ArcadeScoreRow({ entry, index, accent, meta, avatarSrc, frameColor, onOpen }: ArcadeScoreRowProps) {
  const isUser = entry.isUser;
  const rankColor = isUser ? cyan : entry.rank <= 10 ? accent : muted;
  const scoreColor = isUser ? cyan : accent;

  const row = (
    <div className="relative">
      {isUser ? (
        <span
          aria-hidden
          className={`absolute -inset-0.75 blur-[5px] ${styles.youPulse}`}
          style={{ background: withAlpha(cyan, 0.45), clipPath: hudChamferPath(12, 0) }}
        />
      ) : null}
      <RankPlate
        cut={10}
        background={
          isUser ? plateFill(cyan, 0.13) : plateFill(panel, index % 2 === 0 ? 0.38 : 0.16)
        }
        borderColor={isUser ? withAlpha(cyan, 0.55) : undefined}
        interactive={Boolean(onOpen)}
      >
        <div className="relative flex items-center py-2 pl-3.5 pr-2.5 sm:pl-4">
          {isUser ? (
            <span
              aria-hidden
              className={`absolute left-1 top-1/2 -translate-y-1/2 font-display font-black leading-none sm:left-1.5 ${styles.blink}`}
              style={{ fontSize: typography.sizeRem.p9, color: cyan }}
            >
              ▶
            </span>
          ) : null}

          <span
            className="ds-tabular w-9.5 shrink-0 font-display font-black leading-none sm:w-11"
            style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-tight)", color: rankColor }}
          >
            {ordinal(entry.rank)}
          </span>

          <RivalAvatar
            className="ml-0.5"
            name={entry.name}
            size={30}
            highlight={isUser}
            team={entry.team ?? undefined}
            src={isUser ? avatarSrc : undefined}
            frameColor={isUser ? frameColor : undefined}
          />

          <div className="ml-2 flex min-w-0 shrink items-center gap-1.5 sm:ml-2.5">
            <span
              className="truncate font-display font-bold uppercase leading-none"
              style={{
                fontSize: typography.sizeRem.p11,
                letterSpacing: "var(--ds-tracking-tight)",
                color: isUser ? cyan : "var(--ds-color-text-primary)",
              }}
            >
              {entry.name}
            </span>
            {isUser ? (
              // On a phone the cursor and cyan line already say it's you;
              // the tag would only cost your own name its letters.
              <span className="max-sm:hidden">
                <RankTag label="YOU" color={cyan} />
              </span>
            ) : entry.badge ? (
              <RankTag label={entry.badge} color={violet} />
            ) : null}
          </div>

          <span aria-hidden className={styles.leader} />

          <ScoreText
            key={`row-${entry.rank}-${entry.score}-${meta.unit}`}
            value={entry.score}
            pad={6}
            className={`ds-tabular shrink-0 font-display font-black leading-none ${styles.glow}`}
            style={{
              fontSize: typography.sizeRem.p13,
              letterSpacing: "var(--ds-tracking-tight)",
              color: scoreColor,
              "--arcade-glow": scoreColor,
            } as CSSProperties}
          />

          <span className="ml-1 flex w-8 shrink-0 justify-end sm:ml-2">
            <MovementBadge movement={entry.movement} isNew={entry.isNew} />
          </span>
        </div>
      </RankPlate>
    </div>
  );

  if (!onOpen) return row;
  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="block w-full cursor-pointer text-left"
      aria-label={`${entry.name}, rank ${entry.rank}, ${entry.score} ${meta.unit}`}
    >
      {row}
    </button>
  );
}

/** The column header over the table. */
export function ArcadeTableHeader({ accent, meta }: { accent: string; meta: ScoreMeta }) {
  return (
    <div
      aria-hidden
      className="flex items-center border-y py-1.5 pl-1.5 pr-2.5 font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p9,
        letterSpacing: "var(--ds-tracking-ultra)",
        color: muted,
        borderColor: withAlpha(accent, 0.28),
        borderStyle: "dashed",
      }}
    >
      <span className="w-2 shrink-0 sm:w-2.5" />
      <span className="w-9.5 shrink-0 sm:w-11">RANK</span>
      <span className="ml-0.5 flex-1">NAME</span>
      <span>
        SCORE <span style={{ color: withAlpha(accent, 0.8) }}>{meta.unit}</span>
      </span>
      <span className="ml-1 w-8 shrink-0 sm:ml-2" />
    </div>
  );
}

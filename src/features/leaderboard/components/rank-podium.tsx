"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { CSSProperties } from "react";

import { accentVar, PremiumIcon, withAlpha } from "@statoz/design-system/games";

import type { LeaderboardEntry, ScoreMeta } from "../types";

import styles from "./leaderboard.module.css";
import { MovementBadge, RankTag, RivalAvatar, ScoreText } from "./rank-parts";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * The top three: a wide gold champion card over two runner-up cards.
 *
 * The champion reads as a lockup — face, name, badge and a big score on one
 * line — while the runners-up are the compact column version of the same card.
 * Third place is amber rather than the board accent, so the three placings stay
 * legible as placings even when the accent itself is gold.
 */

const gold = accentVar("gold");
const orange = accentVar("orange");
const panel = "var(--ds-color-background-elevated)";

/** Deal each card in on the app's 70ms stagger. */
function delay(index: number): CSSProperties {
  return { "--enter-delay": `${index * 70}ms` } as CSSProperties;
}

export type RankPodiumProps = {
  entries: LeaderboardEntry[];
  meta: ScoreMeta;
  accent: string;
  /** The player's own portrait, so their card is their face and not a hash. */
  userAvatarSrc?: string;
  userFrameColor?: string;
  onOpen?: (entry: LeaderboardEntry) => void;
};

export function RankPodium({
  entries,
  meta,
  accent,
  userAvatarSrc,
  userFrameColor,
  onOpen,
}: RankPodiumProps) {
  if (entries.length < 3) return null;
  const [first, second, third] = entries;

  const tile = (entry: LeaderboardEntry, color: string, avatarSize: number, primary: boolean) => (
    <RankWinnerTile
      entry={entry}
      meta={meta}
      color={color}
      avatarSize={avatarSize}
      primary={primary}
      avatarSrc={entry.isUser ? userAvatarSrc : undefined}
      frameColor={entry.isUser ? userFrameColor : undefined}
      onOpen={onOpen}
    />
  );

  return (
    <div>
      <div className={styles.dealIn} style={delay(0)}>
        {tile(first, gold, 86, true)}
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div className={styles.dealIn} style={delay(1)}>
          {tile(second, accent, 66, false)}
        </div>
        <div className={styles.dealIn} style={delay(2)}>
          {tile(third, orange, 66, false)}
        </div>
      </div>
    </div>
  );
}

export type RankWinnerTileProps = {
  entry: LeaderboardEntry;
  meta: ScoreMeta;
  /** Tints the edge, the rank numeral and the score — the placing's colour. */
  color: string;
  avatarSize: number;
  /** The champion layout: one wide row with the score set large at the end. */
  primary?: boolean;
  avatarSrc?: string;
  frameColor?: string;
  onOpen?: (entry: LeaderboardEntry) => void;
};

export function RankWinnerTile({
  entry,
  meta,
  color,
  avatarSize,
  primary = false,
  avatarSrc,
  frameColor,
  onOpen,
}: RankWinnerTileProps) {
  const plate = (
    <RankPlate
      cut={primary ? 18 : 13}
      background={plateFill(panel, primary ? 0.84 : 0.58)}
      borderColor={withAlpha(color, primary ? 0.42 : 0.26)}
      interactive={Boolean(onOpen)}
      className="h-full"
    >
      {primary ? (
        <div className="flex items-center p-4">
          <RivalAvatar
            name={entry.name}
            size={avatarSize}
            ring={color}
            team={entry.team ?? undefined}
            src={avatarSrc}
            frameColor={entry.isUser ? frameColor : undefined}
          />
          <WinnerCopy entry={entry} color={color} />
          <WinnerScore
            key={`podium-${entry.score}-${meta.unit}`}
            score={entry.score}
            unit={meta.unit}
            color={color}
          />
        </div>
      ) : (
        <div className="p-3">
          <div className="flex items-center gap-2">
            <span
              className="ds-tabular font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p15, color }}
            >
              #{entry.rank}
            </span>
            <MovementBadge movement={entry.movement} isNew={entry.isNew} />
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <RivalAvatar
              name={entry.name}
              size={avatarSize}
              ring={color}
              team={entry.team ?? undefined}
              src={avatarSrc}
              frameColor={entry.isUser ? frameColor : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-none">
                {entry.name}
              </p>
              <ScoreText
                key={`winner-${entry.rank}-${entry.score}-${meta.unit}`}
                value={entry.score}
                suffix={` ${meta.unit}`}
                className="ds-tabular mt-1 block truncate font-display font-black leading-none"
                style={{ fontSize: typography.sizeRem.p13, color }}
              />
            </div>
          </div>
        </div>
      )}
    </RankPlate>
  );

  if (!onOpen) return plate;
  return (
    <button
      type="button"
      onClick={() => onOpen(entry)}
      className="block h-full w-full cursor-pointer text-left"
      aria-label={`${entry.name}, rank ${entry.rank}`}
    >
      {plate}
    </button>
  );
}

function WinnerCopy({ entry, color }: { entry: LeaderboardEntry; color: string }) {
  return (
    <div className="ml-4 min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p17, color }}
        >
          #{entry.rank}
        </span>
        <PremiumIcon size={18} style={{ color: gold }} />
        <MovementBadge movement={entry.movement} isNew={entry.isNew} />
      </div>

      <p className="mt-2 truncate text-xl font-bold leading-compact">
        {entry.name}
      </p>

      {entry.subtitle ? (
        <p
          className="mt-1.5 truncate font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          {entry.subtitle}
        </p>
      ) : null}

      {entry.badge ? (
        <div className="mt-2">
          <RankTag label={entry.badge} color={color} />
        </div>
      ) : null}
    </div>
  );
}

function WinnerScore({
  score,
  unit,
  color,
}: {
  score: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="ml-3 flex max-w-24.5 shrink-0 flex-col items-end">
      <ScoreText
        value={score}
        className="ds-tabular truncate font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p24, color }}
      />
      <span
        className="mt-1 font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p9,
          letterSpacing: "var(--ds-tracking-label)",
          color: withAlpha(color, 0.72),
        }}
      >
        {unit}
      </span>
    </div>
  );
}

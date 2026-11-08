"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { accentVar, withAlpha } from "@statoz/design-system/games";
import { formatInt } from "@/shared/utils";

import type { NextTarget } from "../arcade";
import type { LeaderboardEntry, ScoreMeta } from "../types";

import styles from "./arcade.module.css";
import { MovementBadge, RivalAvatar, ScoreText } from "./rank-parts";
import { plateFill, RankPlate } from "./rank-plate";

/**
 * The Player 1 panel: where you stand, who you have to pass next, and a
 * PRESS START that takes you straight into the game this board ranks.
 *
 * Docked under the scroll on a phone and in the sidebar on desktop; the caller
 * decides the framing. The profile link and the start button are siblings, so
 * there is never one control inside another.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const muted = "var(--ds-color-text-muted)";

export type ArcadePlayerPanelProps = {
  user: LeaderboardEntry;
  meta: ScoreMeta;
  accent: string;
  target: NextTarget | null;
  playHref: string;
  avatarSrc?: string;
  frameColor?: string;
  /** Where the identity side links. Omitted on a team board. */
  profileHref?: string;
};

export function ArcadePlayerPanel({
  user,
  meta,
  accent,
  target,
  playHref,
  avatarSrc,
  frameColor,
  profileHref,
}: ArcadePlayerPanelProps) {
  const identity = (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <RivalAvatar
        name={user.name}
        size={48}
        highlight
        team={user.team ?? undefined}
        src={user.team ? undefined : avatarSrc}
        frameColor={user.team ? undefined : frameColor}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PlayerTag />
          <MovementBadge movement={user.movement} isNew={user.isNew} />
          <span className="ml-auto flex items-baseline gap-1">
            <ScoreText
              key={`p1-${meta.unit}-${user.score}`}
              value={user.score}
              pad={6}
              className={`ds-tabular font-display font-black leading-none ${styles.glow}`}
              style={{ fontSize: typography.sizeRem.p15, color: accent, "--arcade-glow": accent } as CSSProperties}
            />
            <span
              className="font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)", color: withAlpha(accent, 0.7) }}
            >
              {meta.unit}
            </span>
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span
            className={`ds-tabular font-display font-black leading-none ${styles.glow}`}
            style={{ fontSize: typography.sizeRem.p24, color: cyan, "--arcade-glow": cyan } as CSSProperties}
          >
            #{user.rank}
          </span>
          <span
            className="truncate font-display font-bold uppercase leading-none"
            style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-tight)" }}
          >
            {user.name}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <PanelPlate accent={accent}>
      {profileHref ? (
        <Link
          href={profileHref}
          className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={`Your profile: rank ${user.rank}, ${user.score} ${meta.unit}`}
        >
          {identity}
        </Link>
      ) : (
        identity
      )}

      <div className="mt-3 flex items-center gap-3 border-t pt-2.5" style={{ borderColor: withAlpha(accent, 0.22) }}>
        <TargetLine target={target} />
        <StartButton href={playHref} accent={accent} label="PRESS START" />
      </div>
    </PanelPlate>
  );
}

/** What a guest sees in the same place: a coin slot that asks them to log in. */
export function ArcadeInsertCoin({ accent, onLogin }: { accent: string; onLogin: () => void }) {
  return (
    <PanelPlate accent={accent}>
      <div className="flex items-center gap-3">
        <CoinMark />
        <div className="min-w-0 flex-1">
          <p
            className={`font-display font-black leading-none ${styles.blink} ${styles.glow}`}
            style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)", color: gold, "--arcade-glow": gold } as CSSProperties}
          >
            INSERT COIN
          </p>
          <p
            className="mt-1.5 truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)", color: muted }}
          >
            LOG IN TO GET RANKED
          </p>
        </div>
        <button
          type="button"
          onClick={onLogin}
          className={`${styles.start} block shrink-0 cursor-pointer`}
        >
          <StartFace accent={accent} label="LOG IN" />
        </button>
      </div>
    </PanelPlate>
  );
}

function PanelPlate({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <RankPlate cut={16} background={plateFill(accent, 0.09)} borderColor={withAlpha(accent, 0.42)}>
      <div className="px-3.5 py-3">{children}</div>
    </RankPlate>
  );
}

function PlayerTag() {
  return (
    <span
      className={`font-display font-black leading-none ${styles.blink}`}
      style={{
        fontSize: typography.sizeRem.p10,
        letterSpacing: "var(--ds-tracking-wide)",
        color: "var(--ds-color-text-inverse)",
        background: cyan,
        padding: "3px 5px",
      }}
    >
      P1
    </span>
  );
}

function TargetLine({ target }: { target: NextTarget | null }) {
  const style = { fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)" };
  if (!target) {
    return (
      <p className="min-w-0 flex-1 truncate font-display font-black leading-tight" style={{ ...style, color: gold }}>
        ★ YOU HOLD THE HI-SCORE
      </p>
    );
  }
  return (
    <p className="min-w-0 flex-1 font-display font-black leading-snug" style={{ ...style, color: muted }}>
      <span style={{ color: cyan }}>NEXT ▲</span>{" "}
      <span className="uppercase" style={{ color: "var(--ds-color-text-primary)" }}>
        {target.target.name}
      </span>{" "}
      #{target.target.rank}
      <br />
      <span className="ds-tabular">{formatInt(target.gapXp)} XP AHEAD</span>
    </p>
  );
}

function StartButton({ href, accent, label }: { href: string; accent: string; label: string }) {
  return (
    <Link href={href} className={`${styles.start} block shrink-0`}>
      <StartFace accent={accent} label={label} />
    </Link>
  );
}

function StartFace({ accent, label }: { accent: string; label: string }) {
  return (
    <RankPlate cut={8} background={accent}>
      <span
        className="flex items-center gap-1.5 px-3 py-2.25 font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)", color: "var(--ds-color-text-inverse)" }}
      >
        <span aria-hidden className={styles.blink}>▶</span>
        {label}
      </span>
    </RankPlate>
  );
}

function CoinMark() {
  return (
    <svg aria-hidden width="40" height="40" viewBox="0 0 40 40" className="shrink-0" style={{ color: gold }}>
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="20" cy="20" r="11" fill={withAlpha(gold, 0.18)} stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="12" width="4" height="16" fill="currentColor" />
    </svg>
  );
}

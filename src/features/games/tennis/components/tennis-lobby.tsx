"use client";


import { typography } from "@statoz/design-system/games/tokens/typography";
import { DailyDrop } from "@/features/packs";

import Link from "next/link";
import type { CSSProperties } from "react";

import { accentVar, Button, Glyph, hudChamferPath, withAlpha } from "@statoz/design-system/games";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";

import {
  lobbyBriefDelayMs,
  lobbyHeroDelayMs,
  lobbyPlayDelayMs,
  lobbyStatsDelayMs,
} from "../constants";
import { masteryLadder, tennisDifficultyLabels, type TennisDifficulty } from "../types";

import styles from "./tennis.module.css";

/**
 * The match lobby — the web port of `_PreviewScreen` in `tennis_hub.dart`.
 *
 * The system strip, emblem, career figures, match CTA, and deck entry preserve
 * the same information hierarchy while adapting to the web shell.
 */

export type TennisLobbyProps = {
  playerName: string;
  difficulty: TennisDifficulty;
  masteryXp: number;
  setsWon: number;
  winStreak: number;
  canResume: boolean;
  /** False until storage has answered, which is what decides the CTA's label. */
  ready: boolean;
  onBack: () => void;
  onPlay: () => void;
};

const displayStyle = { fontFamily: "var(--ds-font-display), sans-serif" } as const;

function delayed(delay: number): CSSProperties {
  return { "--lobby-delay": `${delay}ms` } as CSSProperties;
}

export function TennisLobby({
  playerName,
  difficulty,
  masteryXp,
  setsWon,
  winStreak,
  canResume,
  ready,
  onBack,
  onPlay,
}: TennisLobbyProps) {
  const lime = accentVar("lime");
  const mastery = masteryLadder(masteryXp);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <CourtBackdrop />

      {/* Centred as one block, as Flutter's column is — not spread to the
          edges, which leaves a hole where the court backdrop should read. */}
      <div className="relative mx-auto flex w-full max-w-95 flex-1 flex-col justify-center px-6 pb-8 pt-5.5">
        <div className={styles.lobbyIn} style={delayed(0)}>
          <StatusBar />
        </div>

        <div className={`${styles.lobbyIn} mt-4.5 flex items-center gap-4`} style={delayed(lobbyHeroDelayMs)}>
          <Emblem />
          <div className="min-w-0 flex-1">
            <h1
              className="truncate font-display font-black leading-tight"
              style={{
                ...displayStyle,
                fontSize: "var(--ds-text-2xl)",
                letterSpacing: "var(--ds-tracking-display)",
              }}
            >
              TENNIS RALLY
            </h1>
            <p
              className="mt-1.5 font-display font-extrabold leading-compact text-muted"
              style={{
                ...displayStyle,
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-mega)",
              }}
            >
              FAST COURT SHOWDOWN
            </p>
            <Chip
              label={canResume ? "MATCH SAVED" : "ATHLETE READY"}
              color={canResume ? accentVar("orange") : lime}
            />
          </div>
        </div>

        <div className={`${styles.lobbyIn} mt-5 flex gap-2`} style={delayed(lobbyStatsDelayMs)}>
          <StatTile label="MASTERY" value={`LV ${mastery.level}`} accent={lime} />
          <StatTile label="SET WINS" value={`${setsWon}`} accent={accentVar("cyan")} />
          <StatTile
            label="STREAK"
            value={`${winStreak}`}
            accent={winStreak > 0 ? "var(--ds-color-success)" : accentVar("cyan")}
          />
        </div>

        <div className={`${styles.lobbyIn} mt-6`} style={delayed(lobbyPlayDelayMs)}>
          <Button
            accent={lime}
            variant="solid"
            size="lg"
            fullWidth
            glow={ready}
            disabled={!ready}
            leadingIcon={<Glyph name="sports_tennis" size={20} />}
            onClick={onPlay}
          >
            {canResume ? "RESUME MATCH" : "PLAY MATCH"}
          </Button>
          <p
            className="mt-2 text-center font-display font-extrabold leading-compact text-muted"
            style={{
              ...displayStyle,
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-label)",
            }}
          >
            {`${tennisDifficultyLabels[difficulty]} // SEEDED FAIR PLAY`}
          </p>
          <p
            className="mt-3 text-center font-bold leading-body text-muted"
            style={{ fontSize: "var(--ds-text-2xs)" }}
          >
            PLAYING AS {playerName.toUpperCase()}
          </p>
        </div>

        <div className={`${styles.lobbyIn} mt-4`} style={delayed(lobbyBriefDelayMs)}>
          <ControlBrief />
          <Link
            href="/decks/tennis?returnTo=/play/tennis-rally"
            className="mt-4 block text-center font-display text-2xs font-black tracking-wide text-lime underline-offset-4 hover:underline"
          >
            DECK BUILDER
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 block text-center font-bold leading-compact text-muted underline-offset-4 hover:underline"
            style={{ fontSize: "var(--ds-text-2xs)" }}
          >
            Back to Tennis games
          </button>
        </div>
        <div className="mt-4"><GameLeaderboardCta gameId="tennis-rally" /></div>
        <DailyDrop sport="tennis" />
      </div>
    </div>
  );
}

/* ---- Chrome -------------------------------------------------------------- */

function StatusBar() {
  const lime = accentVar("lime");

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`${styles.statusDot} size-2 shrink-0`}
        style={{ background: lime }}
      />
      <span
        className="font-display font-extrabold leading-compact text-muted"
        style={{
          ...displayStyle,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {"SYS://TENNIS_RALLY v1.0.0"}
      </span>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: withAlpha(lime, 0.35) }}
      />
    </div>
  );
}

/** The game's badge: a racket plate with a serial in the corner. */
function Emblem() {
  const lime = accentVar("lime");

  return (
    <div
      className={`${styles.emblemPulse} relative grid size-23 shrink-0 place-items-center`}
      style={{
        clipPath: hudChamferPath(16, 5),
        background: withAlpha("var(--ds-color-background-primary)", 0.66),
        border: `1px solid ${withAlpha(lime, 0.38)}`,
      }}
    >
      <span style={{ color: lime }}>
        <Glyph name="sports_tennis" size={53} />
      </span>
      <span
        aria-hidden
        className="absolute right-3.25 top-3.25 size-1.25"
        style={{ background: withAlpha(accentVar("cyan"), 0.72) }}
      />
      <span
        aria-hidden
        className="absolute bottom-2.75 left-2.75 font-display font-extrabold leading-none text-muted"
        style={{ ...displayStyle, fontSize: typography.sizePx.p6_5, letterSpacing: "0.8px" }}
      >
        TR//01
      </span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="mt-2.5 inline-block px-2 py-1 font-display font-extrabold leading-compact"
      style={{
        ...displayStyle,
        color,
        background: withAlpha(color, 0.12),
        border: `1px solid ${withAlpha(color, 0.45)}`,
        fontSize: "var(--ds-text-2xs)",
        letterSpacing: "var(--ds-tracking-label)",
      }}
    >
      {label}
    </span>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="flex-1 px-2.5 py-3 text-center"
      style={{
        clipPath: hudChamferPath(10, 3),
        background: withAlpha("var(--ds-color-background-elevated)", 0.72),
      }}
    >
      <p
        className="font-display font-black leading-none"
        style={{ ...displayStyle, color: accent, fontSize: "var(--ds-text-lg)" }}
      >
        {value}
      </p>
      <p
        className="mt-1.5 font-display font-extrabold leading-compact text-muted"
        style={{
          ...displayStyle,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function ControlBrief() {
  const lime = accentVar("lime");

  return (
    <div
      className="flex items-center gap-3 px-3.5 py-3"
      style={{
        background: withAlpha("var(--ds-color-background-elevated)", 0.6),
        borderLeft: `2px solid ${lime}`,
      }}
    >
      <span className="shrink-0" style={{ color: accentVar("cyan") }}>
        <Glyph name="directions_run" size={18} />
      </span>
      <p
        className="flex-1 font-display font-extrabold leading-body text-muted"
        style={{ ...displayStyle, fontSize: "var(--ds-text-2xs)" }}
      >
        {"DRAG TO MOVE // QUICK FLICK TO SPRINT"}
      </p>
      <span className="shrink-0" style={{ color: lime }}>
        <Glyph name="swipe_down" size={18} />
      </span>
      <p
        className="flex-1 font-display font-extrabold leading-body text-muted"
        style={{ ...displayStyle, fontSize: "var(--ds-text-2xs)" }}
      >
        TAP, HOLD OR SWIPE TO SHAPE THE SHOT
      </p>
    </div>
  );
}

/**
 * The court receding behind the lobby, drawn faintly.
 *
 * A trapezoid and three lines is the whole thing — at 2.5% opacity anything
 * more detailed would only be noise, and the lobby's job is to look like it is
 * standing at the baseline, not to draw a court.
 */
function CourtBackdrop() {
  const lime = accentVar("lime");

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polygon
        points="25,34 75,34 108,100 -8,100"
        fill={withAlpha(lime, 0.025)}
        stroke={withAlpha(lime, 0.09)}
        strokeWidth={0.2}
      />
      <line x1={50} y1={34} x2={50} y2={100} stroke={withAlpha(lime, 0.09)} strokeWidth={0.2} />
      <line x1={11} y1={72} x2={89} y2={72} stroke={withAlpha(lime, 0.09)} strokeWidth={0.2} />
      <line x1={20} y1={53} x2={80} y2={53} stroke={withAlpha(lime, 0.09)} strokeWidth={0.2} />
    </svg>
  );
}

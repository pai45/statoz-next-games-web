"use client";


import { typography } from "@statoz/design-system/games/tokens/typography";
import { accentVar, feedbackVar, hudChamferPath, withAlpha } from "@statoz/design-system/games";

import {
  serveBandEnd,
  serveBandStart,
  serveMeterTrackHeight,
  serveMeterWidth,
} from "../constants";
import type { TennisSting } from "../engine/tennis-game";
import type { TennisHudSnapshot } from "../state/use-tennis-engine";
import { tennisModeLabels, type TennisMode } from "../types";

import styles from "./tennis.module.css";

/**
 * Everything drawn over the court in the DOM — the web port of
 * `tennis_hud.dart`.
 *
 * It is deliberately not on the canvas. Text on a 2D canvas cannot be selected,
 * read by a screen reader, or scaled by the browser's own font settings, and
 * the scoreboard is the one part of a match that has to survive all three.
 */

const displayStyle = {
  fontFamily: "var(--ds-font-display), sans-serif",
} as const;

/* ---- Top bar ------------------------------------------------------------- */

export type TennisHudProps = {
  hud: TennisHudSnapshot;
  mode: TennisMode;
  playerName: string;
  opponentName: string;
  onPause: () => void;
};

export function TennisHud({
  hud,
  mode,
  playerName,
  opponentName,
  onPause,
}: TennisHudProps) {
  return (
    <div className="flex flex-col items-center px-2.5 pt-2">
      <div className="flex w-full items-center">
        <ModeTag mode={mode} />
        <div className="flex-1" />
        <button
          type="button"
          onClick={onPause}
          aria-label="Pause match"
          className="grid h-9 w-10.5 cursor-pointer place-items-center"
          style={{
            color: accentVar("cyan"),
            background: withAlpha("var(--ds-color-background-elevated)", 0.9),
            border: `1px solid ${withAlpha(accentVar("cyan"), 0.46)}`,
          }}
        >
          <PauseIcon />
        </button>
      </div>

      <div className="h-1.5" />
      <Scoreboard hud={hud} playerName={playerName} opponentName={opponentName} />
      <div className="h-1.5" />
      <ServeMeter hud={hud} />
    </div>
  );
}

function ModeTag({ mode }: { mode: TennisMode }) {
  return (
    <div
      className="px-2.5 py-1.5"
      style={{
        clipPath: hudChamferPath(7, 2),
        background: withAlpha("var(--ds-color-background-elevated)", 0.9),
      }}
    >
      <span
        className="font-display font-extrabold leading-compact"
        style={{
          ...displayStyle,
          color: accentVar("cyan"),
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {tennisModeLabels[mode]}
      </span>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <rect x={6} y={5} width={4} height={14} rx={1} />
      <rect x={14} y={5} width={4} height={14} rx={1} />
    </svg>
  );
}

/* ---- Scoreboard ---------------------------------------------------------- */

function Scoreboard({
  hud,
  playerName,
  opponentName,
}: {
  hud: TennisHudSnapshot;
  playerName: string;
  opponentName: string;
}) {
  return (
    <div
      className="w-full px-3 pb-2.25 pt-2"
      style={{
        clipPath: hudChamferPath(12, 4),
        background: withAlpha("var(--ds-color-background-primary)", 0.92),
      }}
      role="status"
      aria-live="polite"
      aria-label={`${playerName} ${hud.playerGames} games ${hud.playerPoints}, ${opponentName} ${hud.opponentGames} games ${hud.opponentPoints}`}
    >
      {/* The rival sits on top, as they do on a real scoreboard from the
          player's own end of the court. */}
      <ScoreRow
        name={opponentName}
        serving={hud.opponentServing}
        games={hud.opponentGames}
        points={hud.opponentPoints}
        accent={accentVar("orange")}
      />
      <div
        className="my-1 h-px w-full"
        style={{ background: "var(--ds-color-border-default)" }}
      />
      <ScoreRow
        name={playerName}
        serving={hud.playerServing}
        games={hud.playerGames}
        points={hud.playerPoints}
        accent={accentVar("cyan")}
      />

      {hud.deuce || hud.tieBreak ? (
        <p
          className="pt-1.25 text-center font-display font-extrabold leading-compact"
          style={{
            ...displayStyle,
            color: accentVar("lime"),
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-ultra)",
          }}
        >
          {hud.tieBreak ? "TIEBREAK" : "DEUCE"}
        </p>
      ) : null}
    </div>
  );
}

function ScoreRow({
  name,
  serving,
  games,
  points,
  accent,
}: {
  name: string;
  serving: boolean;
  games: number;
  points: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* The serving dot. The only thing on the board that says whose serve it
          is, and it lights lime for whoever holds it. */}
      <span
        aria-hidden
        className="size-1.75 shrink-0 rounded-pill"
        style={{
          background: serving ? accentVar("lime") : "var(--ds-color-border-default)",
        }}
      />
      <span
        className="min-w-0 flex-1 truncate font-display font-extrabold leading-compact"
        style={{ ...displayStyle, fontSize: "var(--ds-text-2xs)" }}
      >
        {name}
      </span>
      <span
        className="font-display font-black leading-none"
        style={{ ...displayStyle, color: accent, fontSize: "var(--ds-text-xl)" }}
      >
        {games}
      </span>
      {/* Wide enough for LOVE, which is the longest label the board can show
          and the one Flutter's fixed 43px box quietly overflows. */}
      <span
        className="w-14 shrink-0 text-right font-display font-black leading-none"
        style={{ ...displayStyle, fontSize: "var(--ds-text-lg)" }}
      >
        {points}
      </span>
    </div>
  );
}

/* ---- Serve meter --------------------------------------------------------- */

/**
 * The serve's timing bar.
 *
 * The green band is where the accuracy formula pays: releasing inside it is a
 * clean serve, and the further outside, the wider and longer the ball strays.
 * It is drawn from the same two fractions the engine's sweet spot sits between,
 * so the band can never drift away from what it is promising.
 */
function ServeMeter({ hud }: { hud: TennisHudSnapshot }) {
  return (
    <div
      className="transition-opacity duration-150"
      style={{
        width: serveMeterWidth,
        opacity: hud.serveVisible ? 1 : 0,
        background: withAlpha("var(--ds-color-background-primary)", 0.82),
        padding: "6px 9px 7px",
      }}
      aria-hidden={!hud.serveVisible}
    >
      <div className="flex items-center justify-between gap-2 whitespace-nowrap">
        <span
          className="font-display font-extrabold leading-compact text-muted"
          style={{ ...displayStyle, fontSize: "var(--ds-text-2xs)" }}
        >
          {hud.serveNumber === 1 ? "1ST SERVE" : "2ND SERVE"}
        </span>
        <span
          className="font-display font-extrabold leading-compact"
          style={{
            ...displayStyle,
            color: accentVar("lime"),
            fontSize: "var(--ds-text-2xs)",
          }}
        >
          RELEASE IN GREEN
        </span>
      </div>

      <div
        className="relative mt-1.25 w-full"
        style={{
          height: serveMeterTrackHeight,
          background: "var(--ds-color-border-default)",
        }}
      >
        <span
          className="absolute inset-y-0"
          style={{
            left: `${serveBandStart * 100}%`,
            width: `${(serveBandEnd - serveBandStart) * 100}%`,
            background: withAlpha(accentVar("lime"), 0.48),
          }}
        />
        <span
          className="absolute inset-y-0 left-0"
          style={{
            width: `${hud.serveMeter * 100}%`,
            background: accentVar("cyan"),
          }}
        />
      </div>
    </div>
  );
}

/* ---- Status rails -------------------------------------------------------- */

/**
 * Stamina and focus, docked above the control pads.
 *
 * Focus reads full and renames itself the moment a focus point is spent, which
 * is the only warning the player gets that this point is the one their banked
 * timing is buying.
 */
export function TennisStatusRails({ hud }: { hud: TennisHudSnapshot }) {
  return (
    <div
      className="mx-3.5 flex gap-4 px-2.75 pb-2.25 pt-2"
      style={{
        background: withAlpha("var(--ds-color-background-primary)", 0.84),
        border: `1px solid ${withAlpha("var(--ds-color-border-default)", 0.72)}`,
      }}
    >
      <Meter label="STAMINA" value={hud.stamina} color={accentVar("cyan")} />
      <Meter
        label={hud.focusActive ? "FOCUS ACTIVE" : "FOCUS"}
        value={hud.focusActive ? 1 : hud.focus}
        color={accentVar("lime")}
      />
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <span
          className="font-display font-extrabold leading-compact text-muted"
          style={{ ...displayStyle, fontSize: "var(--ds-text-2xs)" }}
        >
          {label}
        </span>
        <span
          className="font-display font-extrabold leading-compact"
          style={{ ...displayStyle, color, fontSize: "var(--ds-text-2xs)" }}
        >
          {Math.round(value * 100)}%
        </span>
      </div>
      <div
        className="mt-1.25 h-1.25 w-full"
        style={{ background: withAlpha("var(--ds-color-border-default)", 0.8) }}
      >
        <span
          className="block h-full"
          style={{ width: `${Math.round(value * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ---- Stings -------------------------------------------------------------- */

const stingColors: Record<TennisSting["tone"], string> = {
  cyan: accentVar("cyan"),
  lime: accentVar("lime"),
  gold: accentVar("gold"),
  orange: accentVar("orange"),
  danger: feedbackVar("danger"),
};

/**
 * The word thrown up over the court when something worth naming happens.
 *
 * Keyed on the sting's id rather than its label, so ACE following ACE still
 * replays the animation instead of sitting there looking stale.
 */
export function TennisStingLayer({ sting }: { sting: TennisSting | null }) {
  if (sting === null) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ top: "36%" }}
      aria-hidden
    >
      <div
        key={sting.id}
        className={sting.major ? styles.stingMajor : styles.stingMinor}
        style={{
          clipPath: hudChamferPath(13, 4),
          background: withAlpha("var(--ds-color-background-primary)", 0.9),
          padding: sting.major ? "11px 24px" : "8px 17px",
        }}
      >
        <span
          style={{
            ...displayStyle,
            color: stingColors[sting.tone],
            fontSize: sting.major ? "var(--ds-text-xl)" : "var(--ds-text-md)",
            letterSpacing: "var(--ds-tracking-mega)",
            fontWeight: typography.weight.black,
          }}
        >
          {sting.label}
        </span>
      </div>
    </div>
  );
}

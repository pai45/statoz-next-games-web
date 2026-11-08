"use client";

import { useId } from "react";

import { accentVar, Button, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/games";

import {
  controlOpacityRange,
  controlScaleRange,
  firstServePercentage,
  grade,
  type TennisMatchSummary,
  type TennisReward,
  type TennisSettings,
} from "../types";

import styles from "./tennis.module.css";

/**
 * The screens that take over the court: pause, accessibility, quit, and the
 * result — the web port of the overlays in `tennis_match_screen.dart`.
 */

const displayStyle = { fontFamily: "var(--ds-font-display), sans-serif" } as const;

function Scrim({
  children,
  opacity,
}: {
  children: React.ReactNode;
  opacity: number;
}) {
  return (
    <div
      className={`${styles.overlayIn} absolute inset-0 z-20 flex items-center justify-center overflow-y-auto p-5`}
      style={{ background: withAlpha("var(--ds-color-background-primary)", opacity) }}
    >
      {children}
    </div>
  );
}

function Panel({
  accent,
  children,
  label,
}: {
  accent: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`${styles.panelIn} w-full max-w-97.5 p-5`}
      style={{
        background: "var(--ds-color-background-secondary)",
        border: `1px solid ${withAlpha(accent, 0.5)}`,
        boxShadow: `0 0 24px ${withAlpha(accent, 0.14)}`,
      }}
    >
      {children}
    </div>
  );
}

/* ---- Pause --------------------------------------------------------------- */

export type PauseOverlayProps = {
  onResume: () => void;
  onSettings: () => void;
  onRestart: () => void;
  onQuit: () => void;
};

export function PauseOverlay({
  onResume,
  onSettings,
  onRestart,
  onQuit,
}: PauseOverlayProps) {
  const cyan = accentVar("cyan");

  return (
    <Scrim opacity={0.92}>
      <Panel accent={cyan} label="Match paused">
        <h2
          className="text-center font-display font-black leading-tight"
          style={{ ...displayStyle, color: cyan, fontSize: "var(--ds-text-2xl)" }}
        >
          MATCH PAUSED
        </h2>
        <p
          className="mt-2 text-center font-bold leading-body text-muted"
          style={{ fontSize: "var(--ds-text-xs)" }}
        >
          Your exact point has been saved.
        </p>

        <div className="mt-5.5">
          <Button
            accent={cyan}
            variant="solid"
            size="lg"
            fullWidth
            leadingIcon={<Glyph name="play_arrow" size={20} />}
            onClick={onResume}
          >
            RESUME
          </Button>
        </div>

        <div className="mt-2.5 flex flex-col">
          <PauseAction icon="tune" label="SETTINGS" onClick={onSettings} />
          <PauseAction icon="replay" label="RESTART MATCH" onClick={onRestart} />
          <PauseAction
            icon="logout"
            label="QUIT WITHOUT REWARD"
            color={feedbackVar("danger")}
            onClick={onQuit}
          />
        </div>
      </Panel>
    </Scrim>
  );
}

function PauseAction({
  icon,
  label,
  color = "var(--ds-color-text-muted)",
  onClick,
}: {
  icon: "tune" | "replay" | "logout";
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center gap-2 py-3"
      style={{ color }}
    >
      <InlineIcon name={icon} />
      <span
        className="font-display font-extrabold leading-compact"
        style={{
          ...displayStyle,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Three glyphs the design system does not ship. They are drawn here rather than
 * added to the registry because they are chrome for one overlay, not part of
 * the shared vocabulary.
 */
function InlineIcon({ name }: { name: "tune" | "replay" | "logout" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "tune") {
    return (
      <svg {...common}>
        <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" />
        <circle cx={16} cy={6} r={2} />
        <circle cx={10} cy={12} r={2} />
        <circle cx={16} cy={18} r={2} />
      </svg>
    );
  }
  if (name === "replay") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l-5-5 5-5M5 12h12" />
    </svg>
  );
}

/* ---- Accessibility ------------------------------------------------------- */

export type SettingsOverlayProps = {
  settings: TennisSettings;
  onChange: (settings: TennisSettings) => void;
  onBack: () => void;
};

/**
 * The accessibility panel.
 *
 * Flutter carries two more switches. `SOUND` has nothing to drive — this app
 * ships no audio — and `STRONG FLASHES` is read by nothing in the Flutter source
 * either, so porting it would carry a dead switch across rather than fix it.
 */
export function SettingsOverlay({ settings, onChange, onBack }: SettingsOverlayProps) {
  const cyan = accentVar("cyan");

  return (
    <Scrim opacity={0.92}>
      <Panel accent={cyan} label="Accessibility settings">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to pause menu"
            className="grid size-9 cursor-pointer place-items-center"
            style={{ color: cyan }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2
            className="font-display font-black leading-tight"
            style={{ ...displayStyle, color: cyan, fontSize: "var(--ds-text-lg)" }}
          >
            ACCESSIBILITY
          </h2>
        </div>

        <div className="mt-2">
          <Toggle
            label="LEFT-HANDED CONTROLS"
            value={settings.leftHanded}
            onChange={(leftHanded) => onChange({ ...settings, leftHanded })}
          />
          <Toggle
            label="MOVEMENT ASSIST"
            value={settings.movementAssist}
            onChange={(movementAssist) => onChange({ ...settings, movementAssist })}
          />
          <Toggle
            label="REDUCED MOTION"
            value={settings.reducedMotion}
            onChange={(reducedMotion) => onChange({ ...settings, reducedMotion })}
          />
          <Toggle
            label="HAPTICS"
            value={settings.haptics}
            onChange={(haptics) => onChange({ ...settings, haptics })}
          />
        </div>

        <Slider
          label="CONTROL SIZE"
          value={settings.controlScale}
          min={controlScaleRange.min}
          max={controlScaleRange.max}
          accent={cyan}
          onChange={(controlScale) => onChange({ ...settings, controlScale })}
        />
        <Slider
          label="CONTROL OPACITY"
          value={settings.controlOpacity}
          min={controlOpacityRange.min}
          max={controlOpacityRange.max}
          accent={accentVar("lime")}
          onChange={(controlOpacity) => onChange({ ...settings, controlOpacity })}
        />
      </Panel>
    </Scrim>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const cyan = accentVar("cyan");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 py-2.5"
    >
      <span
        className="text-left font-display font-extrabold leading-compact"
        style={{
          ...displayStyle,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="relative block h-5.5 w-10 shrink-0 rounded-pill transition-colors"
        style={{
          background: value
            ? withAlpha(cyan, 0.4)
            : withAlpha("var(--ds-color-border-default)", 0.9),
        }}
      >
        <span
          className="absolute top-0.75 block size-4 rounded-pill transition-all"
          style={{
            left: value ? 22 : 3,
            background: value ? cyan : "var(--ds-color-text-muted)",
          }}
        />
      </span>
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  accent: string;
  onChange: (value: number) => void;
}) {
  const id = useId();

  return (
    <div className="mt-3">
      <label
        htmlFor={id}
        className="font-display font-extrabold leading-compact text-muted"
        style={{
          ...displayStyle,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full cursor-pointer"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

/* ---- Quit ---------------------------------------------------------------- */

export function QuitDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const danger = feedbackVar("danger");

  return (
    <Scrim opacity={0.95}>
      <Panel accent={danger} label="Quit match">
        <h2
          className="text-center font-display font-black leading-tight"
          style={{ ...displayStyle, color: danger, fontSize: "var(--ds-text-xl)" }}
        >
          QUIT MATCH?
        </h2>
        <p
          className="mt-3 text-center font-bold leading-body text-muted"
          style={{ fontSize: "var(--ds-text-xs)" }}
        >
          This run will be cleared and grants no XP or Oz Coins.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button accent={accentVar("cyan")} variant="solid" size="lg" fullWidth onClick={onCancel}>
            RESUME
          </Button>
          <Button accent={danger} variant="tonal" size="lg" fullWidth onClick={onConfirm}>
            QUIT
          </Button>
        </div>
      </Panel>
    </Scrim>
  );
}

/* ---- Result -------------------------------------------------------------- */

export type ResultOverlayProps = {
  summary: TennisMatchSummary;
  reward: TennisReward;
  onPlayAgain: () => void;
  onExit: () => void;
};

export function ResultOverlay({
  summary,
  reward,
  onPlayAgain,
  onExit,
}: ResultOverlayProps) {
  const accent = summary.won ? accentVar("lime") : feedbackVar("danger");

  return (
    <Scrim opacity={0.95}>
      <Panel accent={accent} label={summary.won ? "Victory" : "Defeat"}>
        <h2
          className="text-center font-display font-black leading-tight"
          style={{ ...displayStyle, color: accent, fontSize: "var(--ds-text-3xl)" }}
        >
          {summary.won ? "VICTORY" : "DEFEAT"}
        </h2>
        <p
          className="mt-1.5 text-center font-display font-black leading-tight"
          style={{ ...displayStyle, fontSize: "var(--ds-text-2xl)" }}
        >
          {summary.playerGames} - {summary.opponentGames}
        </p>

        <div className="mt-4 flex">
          <ResultStat label="GRADE" value={grade(summary)} />
          <ResultStat label="XP" value={`+${reward.xp}`} />
          <ResultStat label="COINS" value={`+${reward.coins}`} />
        </div>

        <div className="mt-4">
          <PerformanceRow
            label="FIRST SERVE"
            value={`${Math.round(firstServePercentage(summary.stats) * 100)}%`}
          />
          <PerformanceRow
            label="WINNERS / ERRORS"
            value={`${summary.stats.winners} / ${summary.stats.unforcedErrors}`}
          />
          <PerformanceRow label="LONGEST RALLY" value={`${summary.stats.longestRally}`} />
          <PerformanceRow
            label="PERFECT CONTACTS"
            value={`${summary.stats.perfectContacts}`}
          />
        </div>

        {reward.farmed ? (
          <p
            className="mt-3 text-center font-display font-extrabold leading-body"
            style={{
              ...displayStyle,
              color: accentVar("orange"),
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-label)",
            }}
          >
            REPEAT BONUS SUPPRESSED — CHANGE RIVAL OR DIFFICULTY
          </p>
        ) : null}

        <div className="mt-5">
          <Button
            accent={accent}
            variant="solid"
            size="lg"
            fullWidth
            leadingIcon={<Glyph name="sports_tennis" size={20} />}
            onClick={onExit}
          >
            BACK TO TENNIS
          </Button>
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 py-2.5 text-muted"
        >
          <InlineIcon name="replay" />
          <span
            className="font-display font-extrabold leading-compact"
            style={{
              ...displayStyle,
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-ultra)",
            }}
          >
            PLAY AGAIN
          </span>
        </button>
      </Panel>
    </Scrim>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 text-center">
      <p
        className="font-display font-black leading-none"
        style={{
          ...displayStyle,
          color: accentVar("cyan"),
          fontSize: "var(--ds-text-xl)",
        }}
      >
        {value}
      </p>
      <p
        className="mt-1 font-display font-extrabold leading-compact text-muted"
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

function PerformanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.25">
      <span
        className="font-display font-extrabold leading-compact text-muted"
        style={{
          ...displayStyle,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {label}
      </span>
      <span
        className="font-display font-extrabold leading-compact"
        style={{ ...displayStyle, fontSize: "var(--ds-text-2xs)" }}
      >
        {value}
      </span>
    </div>
  );
}

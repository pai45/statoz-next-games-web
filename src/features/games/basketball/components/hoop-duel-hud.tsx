"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/games";

import type { BasketballSting, StingTone } from "../engine/game-loop";
import type { HoopDuelHud as HudSnapshot } from "../state/use-hoop-duel-engine";
import type { ShotMeterView } from "../types";

import styles from "./hoop-duel.module.css";

/**
 * The match HUD — the web port of `basketball_hud.dart`.
 *
 * Top bar: the way out, your score, the clocks, the CPU's score, with a heat
 * meter under each side. Below the court: the stamina rail and, while a shot is
 * being wound up, the release meter. Stings land in the middle of the screen.
 *
 * Everything here reads one snapshot object. It is quantised upstream so an
 * unchanged frame costs no render, which is the whole reason the simulation can
 * run at 120 Hz inside a React tree.
 */

const cyan = accentVar("cyan");
const violet = accentVar("violet");
const gold = accentVar("gold");
const lime = accentVar("lime");
const amber = accentVar("orange");
const danger = feedbackVar("danger");
const success = feedbackVar("success");

const stingColors: Record<StingTone, string> = {
  cyan,
  lime,
  gold,
  violet,
  danger,
};

/* ---- Top bar --------------------------------------------------------------- */

export function HoopDuelHudBar({
  hud,
  onExit,
}: {
  hud: HudSnapshot;
  onExit: () => void;
}) {
  return (
    <div
      className="flex w-full items-start gap-2 px-3 pb-2.5 pt-1"
      style={{
        background:
          "linear-gradient(to bottom, var(--ds-color-background-primary) 0%, transparent 100%)",
      }}
    >
      <button
        type="button"
        onClick={onExit}
        aria-label="Leave the court"
        className="grid size-9 shrink-0 cursor-pointer place-items-center"
        style={{ color: "var(--ds-color-text-muted)" }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 items-start justify-center gap-3 sm:gap-6">
        <ScoreBlock
          label="YOU"
          accent={cyan}
          score={hud.playerScore}
          heat={hud.heatPlayer}
          heatActive={hud.heatActivePlayer}
          hasBall={hud.possession === 0}
        />
        <ClockCluster hud={hud} />
        <ScoreBlock
          label="CPU"
          accent={violet}
          score={hud.cpuScore}
          heat={hud.heatCpu}
          heatActive={hud.heatActiveCpu}
          hasBall={hud.possession === 1}
        />
      </div>

      {/* Balances the exit button so the clock stays optically centred. */}
      <div aria-hidden className="size-9 shrink-0" />
    </div>
  );
}

function ScoreBlock({
  label,
  accent,
  score,
  heat,
  heatActive,
  hasBall,
}: {
  label: string;
  accent: string;
  score: number;
  heat: number;
  heatActive: boolean;
  hasBall: boolean;
}) {
  return (
    <div className="flex w-14.5 flex-col items-center">
      <div className="flex items-center gap-1">
        <span
          aria-hidden
          className="transition-opacity duration-150"
          style={{ color: amber, opacity: hasBall ? 1 : 0 }}
        >
          <Glyph name="sports_basketball" size={10} />
        </span>
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.6px" }}
        >
          {label}
        </span>
      </div>

      <span
        className="mt-0.5 font-display font-black leading-none tabular-nums"
        style={{ fontSize: typography.sizeRem.p26, color: accent }}
      >
        {score}
      </span>

      <span
        className="mt-1 font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p5_5,
          letterSpacing: heatActive ? "0.8px" : "1.2px",
          color: heatActive ? gold : "var(--ds-color-text-muted)",
        }}
      >
        {heatActive ? "ON FIRE" : "HEAT"}
      </span>
      <div
        className="mt-0.5 h-1 w-full overflow-hidden rounded-xs"
        role="progressbar"
        aria-label={`${label} heat`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((heatActive ? 1 : heat) * 100)}
        style={{ backgroundColor: withAlpha(accent, 0.14) }}
      >
        <div
          className="h-full rounded-xs"
          style={{
            width: `${(heatActive ? 1 : heat) * 100}%`,
            backgroundColor: heatActive ? gold : accent,
          }}
        />
      </div>
    </div>
  );
}

function ClockCluster({ hud }: { hud: HudSnapshot }) {
  const overtime = hud.halfIndex >= 2;
  const seconds = hud.halfClockTenths / 10;
  const danger10 = seconds <= 10;
  const shotDanger = hud.shotClock <= 3;

  return (
    <div className="flex flex-col items-center">
      <span
        className="font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p8,
          letterSpacing: "1.8px",
          color: overtime ? gold : "var(--ds-color-text-muted)",
        }}
      >
        {hud.halfIndex === 0 ? "1ST HALF" : hud.halfIndex === 1 ? "2ND HALF" : "OVERTIME"}
      </span>

      {overtime ? (
        <span
          className="mt-0.5 font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p14, letterSpacing: "1.5px", color: gold }}
        >
          SUDDEN DEATH
        </span>
      ) : (
        <span
          className="mt-0.5 font-display font-black leading-none tabular-nums"
          style={{ fontSize: typography.sizeRem.p20, color: danger10 ? danger : "#ffffff" }}
        >
          {/* Under ten seconds the clock switches to tenths, which is the tell
              that the possession has become a shot rather than a plan. */}
          {seconds >= 10
            ? `0:${Math.floor(seconds).toString().padStart(2, "0")}`
            : seconds.toFixed(1)}
        </span>
      )}

      <span
        className="mt-1 px-1.5 py-px font-display font-black leading-none tabular-nums"
        style={{
          fontSize: typography.sizeRem.p8_5,
          letterSpacing: "1.2px",
          color: shotDanger ? danger : gold,
          backgroundColor: withAlpha("#0d111a", 0.6),
          border: `1px solid ${withAlpha(shotDanger ? danger : gold, 0.55)}`,
        }}
      >
        SHOT {hud.shotClock}
      </span>
    </div>
  );
}

/* ---- Stamina rail ---------------------------------------------------------- */

export function StaminaRail({ stamina }: { stamina: number }) {
  const low = stamina < 0.3;
  return (
    <div className="flex w-full items-center gap-2 px-4">
      <span
        className="font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p7_5, letterSpacing: "1.6px" }}
      >
        STAMINA
      </span>
      <div
        className="h-1.25 flex-1 overflow-hidden rounded-xs"
        role="progressbar"
        aria-label="Stamina"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(stamina * 100)}
        style={{ backgroundColor: withAlpha(success, 0.12) }}
      >
        <div
          className="h-full rounded-xs"
          style={{
            width: `${stamina * 100}%`,
            backgroundColor: low ? danger : success,
          }}
        />
      </div>
      <span
        className="w-7.5 text-right font-display font-black leading-none tabular-nums"
        style={{
          fontSize: typography.sizeRem.p7_5,
          letterSpacing: "0.5px",
          color: low ? danger : "var(--ds-color-text-muted)",
        }}
      >
        {Math.round(stamina * 100)}%
      </span>
    </div>
  );
}

/* ---- Shot meter ------------------------------------------------------------ */

/**
 * The release meter: a bar that fills as the jump rises, with the perfect
 * window marked in lime and the forgiving window either side of it.
 *
 * It is drawn from the engine's own numbers rather than a fixed graphic,
 * because the window genuinely changes — a tired, contested shooter gets a
 * narrower band, and you can see it narrow.
 */
export function ShotMeter({ view }: { view: ShotMeterView | null }) {
  if (view === null) return null;

  const hot = Math.abs(view.progress - view.perfectCenter) <= view.perfectHalf;
  const pct = (value: number) => `${Math.min(100, Math.max(0, value * 100))}%`;
  const goodStart = view.perfectCenter - view.perfectHalf - view.goodHalf;
  const goodWidth = (view.perfectHalf + view.goodHalf) * 2;

  return (
    <div
      className={`${styles.meterEnter} pointer-events-none flex flex-col items-center gap-1`}
      aria-hidden
    >
      <div
        className="relative h-28 w-3.5 overflow-hidden"
        style={{
          backgroundColor: withAlpha("#0d111a", 0.82),
          border: `1px solid ${withAlpha(hot ? lime : gold, hot ? 0.9 : 0.45)}`,
        }}
      >
        {/* The forgiving band, then the perfect band inside it. */}
        <div
          className="absolute inset-x-0"
          style={{
            bottom: pct(goodStart),
            height: pct(goodWidth),
            backgroundColor: withAlpha(gold, 0.22),
          }}
        />
        <div
          className="absolute inset-x-0"
          style={{
            bottom: pct(view.perfectCenter - view.perfectHalf),
            height: pct(view.perfectHalf * 2),
            backgroundColor: withAlpha(lime, 0.55),
          }}
        />
        {/* The rising needle. */}
        <div
          className="absolute inset-x-0 h-0.5"
          style={{
            bottom: pct(view.progress),
            backgroundColor: hot ? lime : "#ffffff",
          }}
        />
      </div>
      <span
        className="font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p7,
          letterSpacing: "1.2px",
          color: hot ? lime : withAlpha(gold, 0.8),
        }}
      >
        {hot ? "NOW" : "HOLD"}
      </span>
    </div>
  );
}

/* ---- Stings ---------------------------------------------------------------- */

export function StingLayer({ sting }: { sting: BasketballSting | null }) {
  if (sting === null) return null;
  const color = stingColors[sting.tone];
  const major = sting.major;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ top: major ? "33%" : "25%" }}
      aria-live="polite"
    >
      <div
        key={sting.id}
        className={major ? styles.stingMajor : styles.stingMinor}
        style={{
          padding: major ? "8px 18px" : "4px 10px",
          fontSize: major ? typography.sizeRem.p18 : typography.sizeRem.p11,
          letterSpacing: major ? "2.4px" : "1.4px",
          color,
          backgroundColor: withAlpha("#0d111a", 0.82),
          border: `${major ? 1.6 : 1}px solid ${withAlpha(color, 0.8)}`,
          boxShadow: major ? `0 0 16px -2px ${withAlpha(color, 0.4)}` : undefined,
        }}
      >
        {sting.label}
      </div>
    </div>
  );
}

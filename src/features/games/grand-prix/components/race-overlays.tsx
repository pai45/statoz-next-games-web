"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/games";

import { stuckWarningAfterSeconds } from "../constants";
import { stuckTimeout } from "../tuning";
import type { LaunchGrade, OvertakeEvent } from "../types";
import type { StartPhase } from "../state/use-start-sequence";

import { launchLabels } from "./grand-prix-hud";
import styles from "./grand-prix.module.css";

/**
 * Everything that appears over the road for a beat and then goes away.
 *
 * All of it is centred over the canvas and none of it takes a pointer: a toast
 * that stole a tap mid-corner would cost you the corner.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const danger = feedbackVar("danger");
const success = feedbackVar("success");

/** A plate with a coloured edge — the shape every one of these flashes wears. */
function FlashPlate({
  color,
  glow = true,
  className,
  children,
}: {
  color: string;
  glow?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`px-4 py-2 ${className}`}
      style={{
        background: withAlpha("#0d111a", 0.8),
        border: `1px solid ${color}`,
        boxShadow: glow ? `0 0 20px -4px ${withAlpha(color, 0.35)}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

/* ---- The start lights ------------------------------------------------------ */

export function LightsRig({
  phase,
  lightsOn,
  lightsOut,
}: {
  phase: StartPhase;
  lightsOn: number;
  lightsOut: boolean;
}) {
  if (phase === "away") return null;
  const waiting = phase === "grid";

  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5"
        style={{
          background: withAlpha("#0d111a", 0.85),
          border: "1px solid var(--ds-color-border-default)",
        }}
      >
        {[1, 2, 3, 4, 5].map((lamp) => {
          const on = lamp <= lightsOn;
          return (
            <span
              key={lamp}
              aria-hidden
              className="size-6.5 rounded-full transition-colors duration-120"
              style={{
                background: on ? danger : "var(--ds-color-background-elevated)",
                border: `1.4px solid ${on ? danger : "var(--ds-color-border-default)"}`,
                boxShadow: on ? `0 0 14px ${withAlpha(danger, 0.6)}` : undefined,
              }}
            />
          );
        })}
      </div>
      <span
        className="font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p10,
          letterSpacing: "2.4px",
          color: lightsOut ? success : "var(--ds-color-text-muted)",
        }}
      >
        {waiting ? "ON THE GRID" : lightsOut ? "GO GO GO!" : "WAIT FOR LIGHTS OUT…"}
      </span>
    </div>
  );
}

/* ---- The launch grade ------------------------------------------------------ */

export function LaunchFlash({ grade }: { grade: LaunchGrade | null }) {
  if (grade === null) return null;
  const { label, color } = launchLabels[grade];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[27.5%] flex justify-center">
      <FlashPlate color={color} className={styles.launchFlash}>
        <span
          className="font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p15, letterSpacing: "2px", color }}
        >
          {label}
        </span>
      </FlashPlate>
    </div>
  );
}

/* ---- Lap crossings --------------------------------------------------------- */

export function LapFlash({ lap, laps }: { lap: number; laps: number }) {
  if (lap <= 1) return null;
  const finalLap = lap === laps;
  const color = finalLap ? gold : cyan;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[27.5%] flex justify-center">
      {/* Keyed on the lap, so each crossing plays its own entrance. */}
      <FlashPlate key={lap} color={color} glow={finalLap} className={styles.lapFlash}>
        <span
          className="font-display font-black leading-none tabular-nums"
          style={{ fontSize: typography.sizeRem.p15, letterSpacing: "2px", color }}
        >
          {finalLap ? "FINAL LAP" : `LAP ${lap} / ${laps}`}
        </span>
      </FlashPlate>
    </div>
  );
}

/* ---- Beached --------------------------------------------------------------- */

/**
 * Get moving or the race is over. Held back until the player has genuinely been
 * stopped a beat, so a hard brake or a spin never flashes it.
 */
export function StuckWarning({ seconds }: { seconds: number }) {
  if (seconds < stuckWarningAfterSeconds) return null;
  const remaining = Math.max(0, Math.min(stuckTimeout, stuckTimeout - seconds));
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[44%] flex justify-center"
      role="alert"
    >
      <div
        className={`flex flex-col items-center px-4.5 py-3 ${styles.stuckWarning}`}
        style={{
          background: withAlpha("#0d111a", 0.85),
          border: `1.5px solid ${danger}`,
        }}
      >
        <span style={{ color: danger }}>
          <Glyph name="warning" size={26} />
        </span>
        <span
          className="mt-1.5 font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p16, letterSpacing: "2px", color: danger }}
        >
          GET BACK ON TRACK
        </span>
        <span
          className="mt-1 font-display font-black leading-none tabular-nums"
          style={{ fontSize: typography.sizeRem.p11, letterSpacing: "2px", color: danger }}
        >
          RETIRING IN {Math.ceil(remaining)}s
        </span>
      </div>
    </div>
  );
}

/* ---- Passes ---------------------------------------------------------------- */

export function OvertakeToast({
  overtake,
  serial,
}: {
  overtake: OvertakeEvent | null;
  serial: number;
}) {
  if (overtake === null) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[14%] flex justify-center">
      {/* Keyed on the serial, so two passes in a row both play. */}
      <div
        key={serial}
        className={`px-2.5 py-1.5 ${styles.overtakeToast}`}
        style={{
          background: withAlpha("#0d111a", 0.78),
          border: `1px solid ${withAlpha(cyan, 0.6)}`,
        }}
      >
        <span
          className="font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p9, letterSpacing: "1.4px", color: cyan }}
        >
          P{overtake.overtakenPosition} ▲ PASSED{" "}
          {overtake.overtakenName.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

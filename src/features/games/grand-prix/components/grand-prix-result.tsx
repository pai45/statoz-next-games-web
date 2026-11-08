"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { CSSProperties } from "react";

import {
  accentVar,
  Button,
  feedbackVar,
  Glyph,
  Progress,
  withAlpha,
  type GlyphName,
} from "@statoz/design-system/games";
import { levelProgress } from "@/domain/progression";
import { useCountUp } from "@/shared/hooks";

import { grandPrixCircuit } from "../data/circuits";
import {
  formatLapTime,
  grandPrixVerdict,
  placesGained,
  type GrandPrixResult,
} from "../types";

import { launchLabels } from "./grand-prix-hud";
import styles from "./grand-prix.module.css";

/**
 * The post-race screen — the web port of `GrandPrixResultOverlay`.
 *
 * A sequenced reveal over a fixed dock: the verdict, the finishing position and
 * what it cost or gained, the race's own numbers, then the XP. Flutter drives
 * the sequence from one `AnimationController` with four `Interval`s; the same
 * four beats are four animation delays here, which the reduced-motion damper in
 * `globals.css` already knows how to still.
 *
 * One thing reads differently on purpose: Flutter runs the level bar against
 * the profile's whole XP, and this runs it against the Grand Prix track, which
 * is how every other mode on the web reports a result and is the number this
 * race actually moved.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const racing = accentVar("racing");
const danger = feedbackVar("danger");
const success = feedbackVar("success");
const amber = accentVar("orange");

function reveal(delayMs: number): CSSProperties {
  return { "--reveal-delay": `${delayMs}ms` } as CSSProperties;
}

type VerdictLook = { text: string; color: string; icon: GlyphName };

function verdictLook(result: GrandPrixResult): VerdictLook {
  if (result.retired) return { text: "RETIRED", color: danger, icon: "warning" };
  switch (grandPrixVerdict(result.position)) {
    case "win":
      return { text: "WIN", color: gold, icon: "emoji_events" };
    case "podium":
      return { text: "PODIUM", color: racing, icon: "military_tech" };
    case "points":
      return { text: "POINTS", color: cyan, icon: "flag" };
    case "finished":
      // The app flies a chequered flag here; `grid_on` is the checker the
      // registry already holds, and reads as one at this size.
      return { text: "FINISHED", color: amber, icon: "grid_on" };
  }
}

export type GrandPrixResultOverlayProps = {
  result: GrandPrixResult;
  /** Career XP on the Grand Prix track, this race included. */
  trackXp: number;
  animate: boolean;
  onExit: () => void;
  onRaceAgain: () => void;
};

export function GrandPrixResultOverlay({
  result,
  trackXp,
  animate,
  onExit,
  onRaceAgain,
}: GrandPrixResultOverlayProps) {
  const look = verdictLook(result);
  const circuit = grandPrixCircuit(result.circuit);
  const circuitLabel =
    result.laps > 1 ? `${circuit.name} · ${result.laps} LAPS` : circuit.name;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col overflow-hidden"
      style={{ background: withAlpha("#0d111a", 0.94) }}
      role="dialog"
      aria-modal="true"
      aria-label="Race result"
    >
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
        <div className="mx-auto flex w-full max-w-105 flex-col">
          {/* Verdict. */}
          <div
            className={animate ? styles.revealIn : undefined}
            style={animate ? reveal(0) : undefined}
          >
            <div
              className="flex flex-col items-center py-4.5"
              style={{
                background: withAlpha(look.color, 0.12),
                border: `1.5px solid ${look.color}`,
                boxShadow: `0 0 24px -6px ${withAlpha(look.color, 0.5)}`,
              }}
            >
              <span style={{ color: look.color }}>
                <Glyph name={look.icon} size={34} />
              </span>
              <h2
                className="mt-1.5 font-display font-black leading-none"
                style={{ fontSize: typography.sizeRem.p34, letterSpacing: "3px", color: look.color }}
              >
                {look.text}
              </h2>
              <p
                className="mt-1 font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p9, letterSpacing: "2px" }}
              >
                {circuitLabel}
              </p>
            </div>
          </div>

          {/* Where it finished. */}
          <div
            className={`mt-4.5 ${animate ? styles.positionIn : ""}`}
            style={animate ? reveal(240) : undefined}
          >
            <PositionReadout result={result} />
          </div>

          {/* What it was made of. */}
          <div
            className={`mt-4.5 ${animate ? styles.revealIn : ""}`}
            style={animate ? reveal(670) : undefined}
          >
            <RaceStats result={result} />
          </div>

          {/* What it paid. */}
          <div
            className={`mt-4 ${animate ? styles.revealIn : ""}`}
            style={animate ? reveal(960) : undefined}
          >
            <XpPanel trackXp={trackXp} earned={result.xp} animate={animate} />
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-105 shrink-0 gap-3 px-4 pt-2 pb-4">
        <Button variant="tonal" size="md" fullWidth onClick={onExit}>
          EXIT
        </Button>
        <Button accent={racing} variant="solid" size="md" fullWidth onClick={onRaceAgain}>
          RACE AGAIN
        </Button>
      </div>
    </div>
  );
}

function PositionReadout({ result }: { result: GrandPrixResult }) {
  if (result.retired) {
    return (
      <div className="flex flex-col items-center">
        <p
          className="font-display font-black leading-none tabular-nums"
          style={{ fontSize: typography.sizeRem.p64, color: danger }}
        >
          DNF
        </p>
        <p
          className="mt-1 font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p10, letterSpacing: "1.8px", color: danger }}
        >
          GAME OVER · STUCK ON TRACK
        </p>
      </div>
    );
  }

  const gained = placesGained(result);
  const [deltaText, deltaColor] =
    gained > 0
      ? [`▲ ${gained} PLACES GAINED`, success]
      : gained < 0
        ? [`▼ ${-gained} PLACES LOST`, danger]
        : ["HELD POSITION", "var(--ds-color-text-muted)"];

  return (
    <div className="flex flex-col items-center">
      <p className="flex items-baseline justify-center">
        <span
          className="font-display font-black leading-none tabular-nums"
          style={{ fontSize: typography.sizeRem.p64, color: cyan }}
        >
          P{result.position}
        </span>
        <span
          className="font-display font-black leading-none tabular-nums text-muted"
          style={{ fontSize: typography.sizeRem.p28 }}
        >
          /{result.fieldSize}
        </span>
      </p>
      <p
        className="mt-1 font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p10, letterSpacing: "1.8px", color: deltaColor }}
      >
        {deltaText}
      </p>
    </div>
  );
}

function RaceStats({ result }: { result: GrandPrixResult }) {
  const launch = launchLabels[result.launchGrade];
  return (
    <div
      className="flex flex-col gap-2.5 p-3.5"
      style={{
        background: withAlpha("#1d293d", 0.85),
        border: "1px solid var(--ds-color-border-default)",
      }}
    >
      <StatRow label={result.laps > 1 ? "RACE TIME" : "LAP TIME"}>
        <span
          className="font-display font-black leading-none tabular-nums"
          style={{ fontSize: typography.sizeRem.p13 }}
        >
          {formatLapTime(result.lapTimeMs)}
        </span>
        {result.personalBest ? <Chip label="PB" color={gold} /> : null}
      </StatRow>

      <StatRow label="LAUNCH">
        <Chip label={launch.short} color={launch.color} />
      </StatRow>

      {result.bestOvertakeName === null ? null : (
        <StatRow label="MVP MOVE">
          <span
            className="font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p10, letterSpacing: "1px", color: cyan }}
          >
            PASSED {result.bestOvertakeName.toUpperCase()}
          </span>
        </StatRow>
      )}
    </div>
  );
}

function StatRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p9, letterSpacing: "1.6px" }}
      >
        {label}
      </span>
      <span className="flex-1" />
      {children}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-1.5 py-0.5 font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p8,
        letterSpacing: "1.2px",
        color,
        border: `1px solid ${withAlpha(color, 0.5)}`,
      }}
    >
      {label}
    </span>
  );
}

/** Where this race left the Grand Prix track. */
function XpPanel({
  trackXp,
  earned,
  animate,
}: {
  trackXp: number;
  earned: number;
  animate: boolean;
}) {
  const before = Math.max(0, trackXp - earned);
  const gained = useCountUp(animate ? earned : undefined);
  const shownXp = animate ? gained : earned;
  const band = levelProgress(animate ? before + gained : trackXp);

  return (
    <div
      className="p-4"
      style={{
        background: withAlpha("#1d293d", 0.85),
        border: `1px solid ${withAlpha(racing, 0.4)}`,
      }}
    >
      <p
        className="font-display font-black leading-none tabular-nums"
        style={{ fontSize: typography.sizeRem.p26, letterSpacing: "1px", color: racing }}
      >
        +{shownXp} XP
      </p>
      <Progress
        className="mt-3"
        value={band.fraction}
        height={6}
        accent={racing}
        label={`Grand Prix track, level ${band.level}`}
      />
      <p
        className="mt-2 font-display font-black leading-none text-muted tabular-nums"
        style={{ fontSize: typography.sizeRem.p9, letterSpacing: "0.5px" }}
      >
        {band.intoLevel} / {band.levelSpan} XP · LEVEL {band.level}
      </p>
    </div>
  );
}

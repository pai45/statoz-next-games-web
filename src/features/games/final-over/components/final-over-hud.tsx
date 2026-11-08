"use client";

import { accentVar, feedbackVar, hudChamferPath, withAlpha } from "@statoz/design-system/games";

import type { HudSnapshot } from "../state/use-match-engine";
import { isWicket, resultTotalRuns, type BallResult } from "../types";

import styles from "./final-over.module.css";

/**
 * The chase, read at a glance — the web port of `final_over_hud.dart`.
 *
 * Flutter rebuilds each piece from a `ValueNotifier` the Flame loop pushes once
 * a frame. Here the whole bar takes one `HudSnapshot`, which only changes
 * identity when something it shows has actually moved, so a frame where nothing
 * happened re-renders nothing.
 */

export type FinalOverHudProps = {
  hud: HudSnapshot;
  onExit: () => void;
};

const ballsPerOver = 6;

export function FinalOverHud({ hud, onExit }: FinalOverHudProps) {
  return (
    <div
      className="pointer-events-none pl-1 pr-3.5 pt-1 pb-4"
      style={{
        background: `linear-gradient(to bottom, ${withAlpha(
          "var(--ds-color-background-primary)",
          0.94,
        )}, ${withAlpha("var(--ds-color-background-primary)", 0)})`,
      }}
    >
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={onExit}
          aria-label="Leave the chase"
          className="pointer-events-auto grid size-11 shrink-0 cursor-pointer place-items-center"
          style={{ color: "var(--ds-color-text-muted)" }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </button>

        <ScoreBlock hud={hud} />
        <div className="w-2.5" />
        <Chip label={`OVER ${hud.currentOver + 1}/${hud.maximumOvers}`} color={accentVar("cyan")} />
        <div className="flex-1" />
        <ChaseCluster hud={hud} />
      </div>

      <div className="h-2" />
      <BallStrip hud={hud} />
      <BowlerLine hud={hud} />
    </div>
  );
}

/* ---- Pieces -------------------------------------------------------------- */

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="shrink-0 px-2 py-[3px] font-bold leading-compact"
      style={{
        color,
        background: withAlpha(color, 0.12),
        border: `1px solid ${withAlpha(color, 0.7)}`,
        fontSize: "var(--ds-text-2xs)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {label}
    </span>
  );
}

function ScoreBlock({ hud }: { hud: HudSnapshot }) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <div className="flex items-baseline">
        <span
          className="font-display font-black leading-compact ds-tabular"
          style={{ fontSize: "var(--ds-text-3xl)", letterSpacing: "var(--ds-tracking-display)" }}
        >
          {hud.score}
        </span>
        <span
          className="font-display font-black leading-compact text-muted ds-tabular"
          style={{ fontSize: "var(--ds-text-lg)", letterSpacing: "var(--ds-tracking-display)" }}
        >
          /{hud.wickets}
        </span>
      </div>
      <span
        className="font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
      >
        TARGET {hud.target}
      </span>
    </div>
  );
}

/**
 * The one number that matters. Goes red when the required rate has passed the
 * point where a boundary an over saves you.
 */
function ChaseCluster({ hud }: { hud: HudSnapshot }) {
  const desperate = hud.ballsLeft > 0 && hud.runsNeeded > hud.ballsLeft * 6;
  const color = desperate ? feedbackVar("danger") : "var(--ds-color-text-default)";

  return (
    <div className="flex shrink-0 flex-col items-end">
      <span
        className="font-display font-black leading-compact ds-tabular"
        style={{ color, fontSize: "var(--ds-text-xl)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {hud.runsNeeded <= 0 ? "DONE" : `NEED ${hud.runsNeeded}`}
      </span>
      <span
        className="font-bold leading-compact"
        style={{
          color: desperate ? feedbackVar("danger") : "var(--ds-color-text-muted)",
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        OFF {hud.ballsLeft} {hud.ballsLeft === 1 ? "BALL" : "BALLS"}
      </span>

      {hud.freeHit || hud.combo > 1 ? (
        <div className="mt-[5px] flex items-center gap-[5px]">
          {hud.combo > 1 ? (
            <Chip label={`×${hud.combo} COMBO`} color={accentVar("violet")} />
          ) : null}
          {hud.freeHit ? <Chip label="FREE HIT" color={accentVar("gold")} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function BowlerLine({ hud }: { hud: HudSnapshot }) {
  return (
    <div className="flex items-center gap-2 pl-3 pt-1.5">
      <span
        className="font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
      >
        BOWLING · {hud.bowlerName}
      </span>
    </div>
  );
}

/** Six tokens for the current over, plus a tick for every over in the match. */
function BallStrip({ hud }: { hud: HudSnapshot }) {
  const legal = hud.history.filter((ball) => ball.legal);
  const start = hud.currentOver * ballsPerOver;
  const overBalls = legal.slice(start, start + ballsPerOver);
  const extras = hud.history
    .filter(
      (ball) =>
        !ball.legal &&
        ball.legalBallsBefore >= start &&
        ball.legalBallsBefore < start + ballsPerOver,
    )
    .slice(0, 3);

  return (
    <div className="flex items-center pl-2">
      {Array.from({ length: hud.maximumOvers }, (_unused, over) => (
        <span key={over} className={over > 0 ? "ml-1" : undefined}>
          <OverTick done={over < hud.currentOver} live={over === hud.currentOver} />
        </span>
      ))}

      <div className="w-2.5" />

      {Array.from({ length: ballsPerOver }, (_unused, index) => (
        <span key={index} className={index > 0 ? "ml-[5px]" : undefined}>
          <BallToken
            result={index < overBalls.length ? overBalls[index] : null}
            next={index === overBalls.length}
          />
        </span>
      ))}

      <div className="flex-1" />

      {extras.map((extra) => (
        <span key={extra.deliveryOrdinal} className="ml-1">
          <ExtraToken result={extra} />
        </span>
      ))}
    </div>
  );
}

function OverTick({ done, live }: { done: boolean; live: boolean }) {
  const color = live ? accentVar("cyan") : done ? feedbackVar("success") : "var(--ds-color-border-default)";
  return (
    <span
      className={live ? styles.liveOver : undefined}
      style={{
        display: "block",
        width: 8,
        height: 8,
        background: live || done ? withAlpha(color, 0.35) : "var(--ds-color-background-elevated)",
        border: `1px solid ${withAlpha(color, live ? 0.95 : 0.45)}`,
      }}
    />
  );
}

function tokenFor(result: BallResult | null): { label: string; color: string } {
  if (result === null) return { label: "·", color: "var(--ds-color-border-default)" };
  if (isWicket(result)) return { label: "W", color: feedbackVar("danger") };
  if (result.boundary === 6) return { label: "6", color: accentVar("gold") };
  if (result.boundary === 4) return { label: "4", color: accentVar("cyan") };
  const runs = resultTotalRuns(result);
  if (runs === 0) return { label: "0", color: "var(--ds-color-text-muted)" };
  return { label: String(runs), color: feedbackVar("success") };
}

function BallToken({ result, next }: { result: BallResult | null; next: boolean }) {
  const { label, color } = tokenFor(result);
  const filled = result !== null;

  return (
    <span
      className="grid place-items-center font-display font-black leading-compact ds-tabular"
      style={{
        width: 26,
        height: 24,
        clipPath: hudChamferPath(5, 2),
        background: filled
          ? withAlpha(color, 0.2)
          : withAlpha("var(--ds-color-background-elevated)", 0.7),
        // The ball about to be bowled is the live one — the only token with a
        // bright edge.
        border: `${next ? 1.4 : 1}px solid ${
          next ? withAlpha(accentVar("cyan"), 0.9) : withAlpha(color, filled ? 0.75 : 0.35)
        }`,
        color: filled ? color : "var(--ds-color-text-muted)",
        fontSize: "var(--ds-text-xs)",
      }}
    >
      {label}
    </span>
  );
}

function ExtraToken({ result }: { result: BallResult }) {
  const amber = accentVar("orange");
  return (
    <span
      className="px-[5px] py-[2px] font-bold leading-compact"
      style={{
        color: amber,
        background: withAlpha(amber, 0.14),
        border: `1px solid ${withAlpha(amber, 0.5)}`,
        fontSize: "var(--ds-text-2xs)",
        letterSpacing: "var(--ds-tracking-tight)",
      }}
    >
      {result.extra === "noBall" ? "NB" : "WD"}
    </span>
  );
}

/* ---- OVERDRIVE ----------------------------------------------------------- */

export type OverdriveRailProps = {
  hud: HudSnapshot;
  onArm: () => void;
};

/**
 * Charge banked by middling the ball. Armed, it turns gold and the next shot
 * leaves the bat harder.
 */
export function OverdriveRail({ hud, onArm }: OverdriveRailProps) {
  if (!hud.canConfigureShot) return null;

  const requirement = hud.powerShotRequirement;
  const segments = Math.min(Math.max(hud.powerSegments, 0), requirement);
  const armed = hud.powerShotArmed;
  const ready = segments >= requirement && !armed;
  const canArm = ready;
  const lit = canArm || armed;
  const gold = accentVar("gold");

  const label = armed
    ? "OVERDRIVE ARMED"
    : ready
      ? "OVERDRIVE READY • TAP TO ARM"
      : "OVERDRIVE";

  return (
    <div className={`px-3.5 ${styles.railEnter}`}>
      <button
        type="button"
        onClick={canArm ? onArm : undefined}
        disabled={!canArm}
        aria-label={
          armed
            ? "Overdrive armed"
            : ready
              ? "Overdrive ready. Tap to arm"
              : `Overdrive ${segments} of ${requirement} charged`
        }
        className={`flex h-11 w-full items-center gap-1.5 px-2.5 py-1.5 text-left ${
          canArm ? "cursor-pointer" : "cursor-default"
        }`}
        style={{
          clipPath: hudChamferPath(9, 3),
          background: lit ? withAlpha(gold, 0.12) : withAlpha("var(--ds-color-background-elevated)", 0.84),
          border: `${lit ? 1.5 : 1}px solid ${
            canArm ? withAlpha(gold, 0.9) : armed ? withAlpha(gold, 0.7) : "var(--ds-color-border-strong)"
          }`,
          filter: canArm ? `drop-shadow(0 0 10px ${withAlpha(gold, 0.45)})` : undefined,
          color: lit ? gold : "var(--ds-color-text-muted)",
        }}
      >
        <svg width={15} height={15} viewBox="0 -960 960 960" aria-hidden fill="currentColor">
          <path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Z" />
        </svg>

        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <span
            className="truncate font-bold leading-compact"
            style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
          >
            {label}
          </span>
          <span
            className="block h-1 w-full overflow-hidden"
            style={{ background: withAlpha("var(--ds-color-border-default)", 0.6) }}
          >
            <span
              className="block h-full"
              style={{
                width: `${requirement === 0 ? 0 : (segments / requirement) * 100}%`,
                background: lit ? gold : accentVar("cyan"),
              }}
            />
          </span>
        </span>

        <span
          className="shrink-0 font-bold leading-compact ds-tabular"
          style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
        >
          {segments}/{requirement}
        </span>
      </button>
    </div>
  );
}

/* ---- Stings -------------------------------------------------------------- */

export type Sting = { label: string; color: string; major: boolean };

/**
 * SIX / FOUR / OUT / PERFECT. Majors land with an elastic pop and a glow — this
 * is a moment, and moments are allowed to glow.
 */
export function StingLayer({ sting }: { sting: Sting | null }) {
  if (sting === null) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[34%] grid place-items-center">
      <span
        key={sting.label}
        className={sting.major ? styles.stingMajor : styles.stingMinor}
        style={{
          clipPath: hudChamferPath(13, 4),
          padding: sting.major ? "11px 24px" : "8px 17px",
          background: withAlpha("var(--ds-color-background-primary)", 0.92),
          border: `1.4px solid ${withAlpha(sting.color, 0.85)}`,
          color: sting.color,
          fontSize: sting.major ? "var(--ds-text-2xl)" : "var(--ds-text-md)",
          letterSpacing: "var(--ds-tracking-mega)",
          filter: sting.major ? `drop-shadow(0 0 22px ${withAlpha(sting.color, 0.4)})` : undefined,
        }}
      >
        {sting.label}
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import {
  accentVar,
  Button,
  feedbackVar,
  Glyph,
  hudChamferPath,
  withAlpha,
} from "@statoz/design-system/games";

import { resultStageMs, xpCountUpMs } from "../constants";
import { gradeFor, type FinalOverStats } from "../state/final-over-progress";
import { isWicket, resultTotalRuns, type BallResult } from "../types";

import styles from "./final-over.module.css";

/**
 * The result cinematic — the web port of `final_over_result.dart`.
 *
 * Four stages on a 750 ms interval: the outcome, the score and grade, the chase
 * ball by ball, then what it paid. A tap anywhere skips to the end, because a
 * player who has seen it twice should not have to sit through it a third time.
 */

export type FinalOverResultProps = {
  won: boolean;
  runs: number;
  wickets: number;
  target: number;
  legalBalls: number;
  maximumLegalBalls: number;
  stars: number;
  objectiveCompleted: boolean;
  sixes: number;
  fours: number;
  bestCombo: number;
  history: readonly BallResult[];
  xpGained: number;
  stats: FinalOverStats;
  onPlayAgain: () => void;
  onExit: () => void;
};

const stageCount = 4;

export function FinalOverResult(props: FinalOverResultProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= stageCount - 1) return;
    const timer = window.setInterval(() => {
      setStage((value) => Math.min(stageCount - 1, value + 1));
    }, resultStageMs);
    return () => window.clearInterval(timer);
  }, [stage]);

  const {
    won,
    runs,
    wickets,
    target,
    legalBalls,
    maximumLegalBalls,
    stars,
    objectiveCompleted,
    sixes,
    fours,
    bestCombo,
    history,
    xpGained,
    stats,
    onPlayAgain,
    onExit,
  } = props;

  const accent = won ? feedbackVar("success") : feedbackVar("danger");
  const ballsToSpare = won ? Math.min(Math.max(maximumLegalBalls - legalBalls, 0), maximumLegalBalls) : 0;
  const grade = gradeFor(won, stars, ballsToSpare);

  const reason = won
    ? ballsToSpare === 0
      ? "Off the last ball."
      : `With ${ballsToSpare} ball${ballsToSpare === 1 ? "" : "s"} to spare.`
    : wickets > 0
      ? "Wickets gone with the chase alive."
      : `${target - runs} run${target - runs === 1 ? "" : "s"} short.`;

  return (
    <div
      className="absolute inset-0 z-10 overflow-y-auto"
      style={{ background: withAlpha("var(--ds-color-background-primary)", 0.97) }}
      role="dialog"
      aria-modal="true"
      aria-label={won ? "Chase complete" : "Chase failed"}
      onClick={() => setStage(stageCount - 1)}
    >
      <div className="mx-auto flex min-h-full w-full max-w-105 flex-col justify-center gap-4 px-6 py-[18px]">
        {/* Stage 0 — what happened. */}
        <Reveal visible={stage >= 0} delay={0}>
          <div className="text-center">
            <p
              className="font-display font-black leading-compact"
              style={{
                color: accent,
                fontSize: "var(--ds-text-3xl)",
                letterSpacing: "var(--ds-tracking-mega)",
                textShadow: `0 0 22px ${withAlpha(accent, 0.55)}`,
              }}
            >
              {won ? "CHASE COMPLETE" : "CHASE FAILED"}
            </p>
            <p className="mt-2 leading-body text-muted" style={{ fontSize: "var(--ds-text-sm)" }}>
              {reason}
            </p>
          </div>
        </Reveal>

        {/* Stage 1 — the score, the stars, the grade. */}
        <Reveal visible={stage >= 1} delay={0}>
          <div className="flex items-center justify-center gap-5">
            <div className="text-center">
              <p
                className="font-display font-black leading-compact ds-tabular"
                style={{ fontSize: "var(--ds-text-hero)", letterSpacing: "var(--ds-tracking-display)" }}
              >
                {runs}/{wickets}
              </p>
              <p
                className="mt-1 font-bold leading-compact text-muted"
                style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
              >
                CHASING {target}
              </p>
              <div className="mt-2 flex justify-center gap-[3px]">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    style={{
                      color: index < stars ? accentVar("gold") : "var(--ds-color-border-default)",
                    }}
                  >
                    <Glyph name={index < stars ? "star" : "star_outline"} size={20} />
                  </span>
                ))}
              </div>
            </div>

            <span
              className="grid size-18 place-items-center font-display font-black leading-compact"
              style={{
                clipPath: hudChamferPath(12, 4),
                background: withAlpha(accent, 0.12),
                border: `1.4px solid ${withAlpha(accent, 0.7)}`,
                color: accent,
                fontSize: "var(--ds-text-hero)",
                letterSpacing: "var(--ds-tracking-tight)",
              }}
            >
              {grade}
            </span>
          </div>
        </Reveal>

        {/* Stage 2 — the chase, ball by ball. */}
        <Reveal visible={stage >= 2} delay={0}>
          <div
            className="p-3"
            style={{
              clipPath: hudChamferPath(14, 4),
              background: withAlpha("var(--ds-color-background-secondary)", 0.72),
              border: `1px solid ${withAlpha(accentVar("cyan"), 0.28)}`,
            }}
          >
            <p
              className="font-bold leading-compact text-muted"
              style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
            >
              THE CHASE
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {history.map((ball) => (
                <HistoryToken key={ball.deliveryOrdinal} result={ball} />
              ))}
            </div>

            <span
              className="my-3.5 block h-px w-full"
              style={{ background: "var(--ds-color-border-default)" }}
            />

            <div className="flex items-start justify-between gap-2">
              <Stat label="SIXES" value={String(sixes)} />
              <Stat label="FOURS" value={String(fours)} />
              <Stat label="BEST COMBO" value={`×${bestCombo}`} />
              <Stat label="OBJECTIVE" value={objectiveCompleted ? "✓" : "—"} />
            </div>
          </div>
        </Reveal>

        {/* Stage 3 — what it paid. */}
        <Reveal visible={stage >= 3} delay={0}>
          <div className="text-center">
            <XpLine xp={xpGained} />
            <p
              className="mt-1 font-bold leading-compact text-muted"
              style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
            >
              BEST {stats.bestScore} · {stats.wins}/{stats.chases} CHASES WON
            </p>

            <div
              className="mt-5 flex flex-col gap-3"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                accent={accentVar("gold")}
                variant="solid"
                fullWidth
                leadingIcon={<Glyph name="replay" size={18} />}
                onClick={onPlayAgain}
              >
                CHASE AGAIN
              </Button>
              <button
                type="button"
                onClick={onExit}
                className="w-full cursor-pointer py-2 font-bold leading-compact text-muted"
                style={{
                  fontSize: "var(--ds-text-xs)",
                  letterSpacing: "var(--ds-tracking-label)",
                }}
              >
                BACK TO FINAL OVER
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ---- Pieces --------------------------------------------------------------- */

function Reveal({
  visible,
  delay,
  children,
}: {
  visible: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <div className={styles.revealIn} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ fontSize: "var(--ds-text-lg)", letterSpacing: "var(--ds-tracking-display)" }}
      >
        {value}
      </p>
      <p
        className="mt-1 truncate font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {label}
      </p>
    </div>
  );
}

/** The dot ball prints as a bullet here, where the HUD strip prints a zero. */
function HistoryToken({ result }: { result: BallResult }) {
  const { label, color } = (() => {
    if (isWicket(result)) return { label: "W", color: feedbackVar("danger") };
    if (result.boundary === 6) return { label: "6", color: accentVar("gold") };
    if (result.boundary === 4) return { label: "4", color: accentVar("cyan") };
    if (!result.legal) return { label: result.extra === "noBall" ? "NB" : "WD", color: accentVar("orange") };
    const runs = resultTotalRuns(result);
    if (runs === 0) return { label: "•", color: "var(--ds-color-text-muted)" };
    return { label: String(runs), color: feedbackVar("success") };
  })();

  return (
    <span
      className="grid size-7.5 place-items-center font-display font-black leading-compact"
      style={{
        background: withAlpha(color, 0.14),
        border: `1px solid ${withAlpha(color, 0.6)}`,
        color,
        fontSize: "var(--ds-text-md)",
      }}
    >
      {label}
    </span>
  );
}

/**
 * The XP counts up rather than appearing — it should feel earned.
 *
 * Mounted only once the final stage arrives, so the count always starts from
 * zero and the effect never has to reconcile a value it did not animate.
 */
function XpLine({ xp }: { xp: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (xp <= 0) return;
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / xpCountUpMs);
      // easeOutCubic, matching the Flutter tween.
      setShown(Math.round(xp * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [xp]);

  const violet = accentVar("violet");

  return (
    <p
      className="font-display font-black leading-compact ds-tabular"
      style={{
        color: violet,
        fontSize: "var(--ds-text-2xl)",
        letterSpacing: "var(--ds-tracking-mega)",
        textShadow: `0 0 18px ${withAlpha(violet, 0.5)}`,
      }}
    >
      +{shown} XP
    </p>
  );
}

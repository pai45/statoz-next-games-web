"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useCallback, useEffect, useRef, useState } from "react";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/games";

import { resultStageMs, xpCountUpMs } from "../constants";
import type { HoopDuelStats } from "../state/hoop-duel-progress";
import {
  fgPercent,
  summaryGrade,
  summaryWon,
  type BasketballMatchSummary,
} from "../types";

import styles from "./hoop-duel.module.css";

/**
 * Full-time — the web port of `basketball_result.dart`.
 *
 * Four beats, timer-driven: the verdict, the score and its grade, the box
 * score, then the XP and the career line. A tap skips to the end, and skipping
 * changes nothing — the XP was credited the moment the match was decided, not
 * when the number finished counting.
 */

const gold = accentVar("gold");
const cyan = accentVar("cyan");
const violet = accentVar("violet");
const lime = accentVar("lime");
const amber = accentVar("orange");
const success = feedbackVar("success");
const danger = feedbackVar("danger");

const lastStage = 3;

export type HoopDuelResultProps = {
  summary: BasketballMatchSummary;
  xp: number;
  stats: HoopDuelStats;
  onRematch: () => void;
  onExit: () => void;
};

export function HoopDuelResult({
  summary,
  xp,
  stats,
  onRematch,
  onExit,
}: HoopDuelResultProps) {
  const [stage, setStage] = useState(0);
  const timer = useRef(0);

  useEffect(() => {
    timer.current = window.setInterval(() => {
      setStage((current) => {
        if (current >= lastStage) {
          window.clearInterval(timer.current);
          return current;
        }
        return current + 1;
      });
    }, resultStageMs);
    return () => window.clearInterval(timer.current);
  }, []);

  const skip = useCallback(() => {
    window.clearInterval(timer.current);
    setStage(lastStage);
  }, []);

  const won = summaryWon(summary);
  const accent = won ? success : danger;
  const grade = summaryGrade(summary);

  return (
    <div
      className="absolute inset-0 z-40 overflow-y-auto"
      style={{ backgroundColor: withAlpha("#0d111a", 0.97) }}
      onClick={stage < lastStage ? skip : undefined}
      role={stage < lastStage ? "button" : undefined}
      tabIndex={stage < lastStage ? 0 : undefined}
      onKeyDown={
        stage < lastStage
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") skip();
            }
          : undefined
      }
      aria-label={stage < lastStage ? "Skip the result reveal" : undefined}
    >
      <div className="mx-auto flex min-h-full w-full max-w-105 flex-col justify-center px-6 py-5">
        {/* Beat 1 — the verdict. */}
        <Reveal visible={stage >= 0}>
          <div className="flex flex-col items-center">
            <h2
              className="font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p32,
                letterSpacing: "4px",
                color: accent,
                textShadow: `0 0 22px ${withAlpha(accent, 0.55)}`,
              }}
            >
              {won ? "VICTORY" : "DEFEAT"}
            </h2>
            {summary.buzzerBeater || summary.overtime ? (
              <span
                className="mt-2 px-2 py-0.5 font-display font-black leading-none"
                style={{
                  fontSize: typography.sizeRem.p8,
                  letterSpacing: "1.4px",
                  color: gold,
                  border: `1px solid ${withAlpha(gold, 0.5)}`,
                }}
              >
                {summary.buzzerBeater ? "BUZZER BEATER" : "OVERTIME"}
              </span>
            ) : null}
          </div>
        </Reveal>

        {/* Beat 2 — the scoreline and what it was worth. */}
        <div className="mt-4">
          <Reveal visible={stage >= 1}>
            <div className="flex items-center justify-center gap-3">
              <span
                className="font-display font-black leading-none tabular-nums"
                style={{ fontSize: typography.sizeRem.p40, color: cyan }}
              >
                {summary.playerScore}
              </span>
              <span
                className="font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p20 }}
              >
                —
              </span>
              <span
                className="font-display font-black leading-none tabular-nums"
                style={{ fontSize: typography.sizeRem.p40, color: violet }}
              >
                {summary.cpuScore}
              </span>
              <GradePlate grade={grade} />
            </div>
          </Reveal>
        </div>

        {/* Beat 3 — the box score. */}
        <div className="mt-4.5">
          <Reveal visible={stage >= 2}>
            <BoxScoreGrid summary={summary} />
          </Reveal>
        </div>

        {/* Beat 4 — what it paid, and where you stand. */}
        <div className="mt-4.5">
          <Reveal visible={stage >= 3}>
            <div className="flex flex-col">
              <XpLine xp={xp} run={stage >= 3} />
              <p
                className="mt-2 text-center font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p9, letterSpacing: "1.6px" }}
              >
                RECORD {stats.wins}W — {stats.losses}L
                {stats.currentStreak > 1 ? ` · ${stats.currentStreak} STRAIGHT` : ""}
              </p>

              <button
                type="button"
                onClick={onRematch}
                className="mt-4.5 flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-3"
                style={{
                  backgroundColor: withAlpha(gold, 0.14),
                  border: `1.6px solid ${gold}`,
                  color: gold,
                }}
              >
                <Glyph name="replay" size={16} />
                <span
                  className="font-display font-black leading-none"
                  style={{ fontSize: typography.sizeRem.p13, letterSpacing: "1.6px" }}
                >
                  REMATCH
                </span>
              </button>

              <button
                type="button"
                onClick={onExit}
                className="mt-2.5 cursor-pointer py-2 font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p10, letterSpacing: "2px" }}
              >
                BACK TO COURT LOBBY
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function Reveal({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={visible ? styles.revealIn : undefined}
      style={{ opacity: visible ? undefined : 0 }}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}

/** D through S. The letter is the whole point, so it gets a plate of its own. */
function GradePlate({ grade }: { grade: string }) {
  const color =
    grade === "S" ? gold : grade === "A" ? lime : grade === "B" ? cyan : grade === "C" ? amber : "var(--ds-color-text-muted)";
  return (
    <span
      className="ml-3 grid size-13 place-items-center"
      aria-label={`Grade ${grade}`}
      style={{
        backgroundColor: withAlpha("#0d111a", 0.6),
        border: `1.6px solid ${color}`,
        boxShadow: grade === "S" ? `0 0 16px -2px ${withAlpha(color, 0.5)}` : undefined,
      }}
    >
      <span
        className="font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p26, color }}
      >
        {grade}
      </span>
    </span>
  );
}

function BoxScoreGrid({ summary }: { summary: BasketballMatchSummary }) {
  const box = summary.box;
  const entries: [string, string][] = [
    ["FG", box.attempts === 0 ? "—" : `${fgPercent(box)}%`],
    ["PERFECT", `${box.perfectReleases}`],
    ["3PT MADE", `${box.threesMade}`],
    ["DUNKS", `${box.dunks}`],
    ["BLOCKS", `${box.blocks}`],
    ["STEALS", `${box.steals}`],
    ["BOARDS", `${box.rebounds}`],
    ["BEST RUN", `${box.bestRun}`],
  ];

  return (
    <div
      className="px-3.5 py-3"
      style={{
        backgroundColor: "var(--ds-color-background-elevated)",
        border: "1px solid var(--ds-color-border-default)",
      }}
    >
      {[0, 1].map((row) => (
        <div key={row}>
          {row > 0 ? (
            <div
              aria-hidden
              className="my-2.5 h-px w-full"
              style={{ backgroundColor: "var(--ds-color-border-muted)" }}
            />
          ) : null}
          <div className="flex">
            {entries.slice(row * 4, row * 4 + 4).map(([label, value]) => (
              <div key={label} className="flex flex-1 flex-col items-center">
                <span
                  className="font-display font-black leading-none tabular-nums"
                  style={{ fontSize: typography.sizeRem.p15 }}
                >
                  {value}
                </span>
                <span
                  className="mt-1 whitespace-nowrap font-display font-black leading-none text-muted"
                  style={{ fontSize: typography.sizeRem.p6_8, letterSpacing: "0.6px" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The XP figure counts up, because a number that lands is worth more than one that appears. */
function XpLine({ xp, run }: { xp: number; run: boolean }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / xpCountUpMs);
      // easeOutCubic, so it decelerates into its final value.
      setShown(Math.round(xp * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [run, xp]);

  return (
    <p
      className="text-center font-display font-black leading-none tabular-nums"
      style={{
        fontSize: typography.sizeRem.p22,
        color: gold,
        textShadow: `0 0 14px ${withAlpha(gold, 0.5)}`,
      }}
    >
      +{shown} XP
    </p>
  );
}

"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  accentVar,
  ArrowRightIcon,
  BoltIcon,
  CloseIcon,
  Glyph,
  LockIcon,
  QuizIcon,
  withAlpha,
} from "@statoz/design-system/games";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { usePrefersReducedMotion } from "@/shared/hooks";

import { modeAccent, modeGlyph, modeLabels, modeRewards } from "@/mocks/games/quiz";
import { labelFor } from "../state/question-bank";
import type { AnswerResult, QuizMode, TriviaQuestion } from "../types";

import { QuizDebrief } from "./quiz-debrief";
import { QuizOption } from "./quiz-option";
import styles from "./quiz.module.css";
import {
  autoAdvanceMs,
  GlitchTear,
  scanEndMs,
  VerdictScanline,
  verdictStreakAccent,
} from "./signal-lock";

/**
 * A run through one set: ten questions, one at a time.
 *
 * The loop is pick → LOCK IN → SIGNAL LOCK → verdict → NEXT. Streak and XP
 * deliberately stay put while the scan runs; moving them the moment the answer
 * is locked would leak the verdict through the HUD before the cinematic gets to
 * deliver it.
 *
 * The last question never auto-advances — walking into the summary is the
 * player's call, not a timer's.
 */

const gold = accentVar("gold");

type Phase = "picking" | "resolving" | "resolved";

export type QuizPlayProps = {
  sport: Sport;
  mode: QuizMode;
  setNumber: number;
  questions: TriviaQuestion[];
  onExit: (earnedXp: number) => void;
  onFinish: (run: {
    results: AnswerResult[];
    correct: number;
    earnedXp: number;
    bestStreak: number;
  }) => void;
};

export function QuizPlay({
  sport,
  mode,
  setNumber,
  questions,
  onExit,
  onFinish,
}: QuizPlayProps) {
  const accent = modeAccent(mode);
  const reduced = usePrefersReducedMotion();
  const reward = modeRewards[mode];

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("picking");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);

  const timers = useRef<number[]>([]);
  const question = questions[index];
  const isLast = index >= questions.length - 1;
  const picked = answers[index];
  const answered = picked !== undefined;

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /** Null until this question has been locked in. */
  const verdict =
    picked === undefined || phase !== "resolved"
      ? null
      : picked === question.correctIndex;

  function select(option: number) {
    if (phase !== "picking") return;
    setAnswers((current) => ({ ...current, [index]: option }));
  }

  function finish() {
    const results: AnswerResult[] = questions.map((item, position) => {
      const pick = answers[position];
      const correct = pick === item.correctIndex;
      return {
        prompt: item.prompt,
        pickedLabel: labelFor(item, pick),
        correctLabel: item.options[item.correctIndex],
        correct,
        earnedXp: correct ? reward : 0,
      };
    });

    onFinish({
      results,
      correct: results.filter((result) => result.correct).length,
      earnedXp,
      bestStreak,
    });
  }

  function advance() {
    if (phase !== "resolved") return;
    clearTimers();
    if (isLast) {
      finish();
      return;
    }
    setIndex((current) => current + 1);
    setPhase("picking");
  }

  function land(correct: boolean) {
    setPhase("resolved");
    if (correct) {
      setStreak((current) => {
        const next = current + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      setEarnedXp((current) => current + reward);
    } else {
      setStreak(0);
    }
  }

  function lockAnswer() {
    if (phase !== "picking" || picked === undefined) return;
    const correct = picked === question.correctIndex;

    if (reduced) {
      land(correct);
      return;
    }

    setPhase("resolving");
    // The verdict lands only once the scan completes: the sweep is identical
    // either way, so nothing before this point gives the answer away.
    timers.current.push(
      window.setTimeout(() => land(correct), scanEndMs),
    );
  }

  /**
   * Once a verdict is on screen the next question is dealt on its own. The
   * button's fill is the timer, so the wait is visible rather than a surprise.
   */
  useEffect(() => {
    if (phase !== "resolved" || isLast || reduced) return;
    const id = window.setTimeout(() => advance(), autoAdvanceMs);
    timers.current.push(id);
    return () => window.clearTimeout(id);
    // `advance` closes over this question's state, which is exactly the state
    // this timer belongs to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, isLast, reduced]);

  function requestExit() {
    if (Object.keys(answers).length === 0) {
      onExit(earnedXp);
      return;
    }
    clearTimers();
    setConfirmExit(true);
  }

  const scanning = phase === "resolving";
  const wrong = phase === "resolved" && verdict === false;
  const remaining = questions.length - Object.keys(answers).length;

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* ---- Top bar ---- */}
      <header
        className="flex shrink-0 items-center gap-1 px-2 py-2.5"
        style={{ borderBottom: "1px solid var(--ds-color-border-muted)" }}
      >
        <button
          type="button"
          onClick={requestExit}
          aria-label="Exit quiz"
          className="grid size-11 shrink-0 cursor-pointer place-items-center text-subtle"
        >
          <CloseIcon size={20} />
        </button>
        <h1
          className="min-w-0 flex-1 truncate font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          {sportModuleFor(sport).label.toUpperCase()} QUIZ
        </h1>
        <span
          className="mr-2 shrink-0 border px-2 py-1 font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p9,
            letterSpacing: "var(--ds-tracking-ultra)",
            color: accent,
            background: withAlpha(accent, 0.12),
            borderColor: withAlpha(accent, 0.55),
          }}
        >
          {modeLabels[mode]} · SET {setNumber}
        </span>
      </header>

      {/* ---- HUD ---- */}
      <div className="mt-2 shrink-0 px-4">
        <div className="relative px-2 py-2.25">
          <CornerBrackets accent={accent} />
          <div className="flex items-stretch">
            <HudMetric
              label="QUESTION"
              value={`${index + 1}/${questions.length}`}
              color={accent}
              icon={<Glyph name={modeGlyph(mode, sport)} size={12} />}
            />
            <MetricDivider />
            <HudMetric
              label="STREAK"
              value={streak > 0 ? `×${streak}` : "—"}
              color={streak >= 2 ? verdictStreakAccent(streak) : "var(--ds-color-text-muted)"}
              icon={<BoltIcon size={12} />}
            />
            <MetricDivider />
            <HudMetric
              label="XP EARNED"
              value={`${earnedXp} XP`}
              color={gold}
              icon={<BoltIcon size={12} />}
            />
          </div>
        </div>
      </div>

      {/* ---- Question ---- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-4">
        <div
          key={question.id}
          className={`${styles.questionIn} ${wrong ? styles.tear : ""} relative mx-auto w-full max-w-107.5 pt-4`}
        >
          <div
            className="relative border px-4.5 pb-4.5 pt-7.75"
            style={{
              background: "var(--ds-gradient-fixture-card)",
              borderColor: withAlpha(accent, 0.34),
            }}
          >
            <p
              className="font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p8_5,
                letterSpacing: "var(--ds-tracking-ultra)",
                color: scanning ? accentVar("cyan") : accent,
              }}
            >
              {phase === "resolved"
                ? "ANSWER LOCKED"
                : scanning
                  ? "VERIFYING SIGNAL..."
                  : "SELECT ONE ANSWER"}
            </p>

            <p className="mt-2.5 font-display text-lg font-black leading-snug">
              {question.prompt}
            </p>

            <div className="relative mt-5.5 flex flex-col gap-2.5">
              {question.options.map((option, position) => (
                <QuizOption
                  key={position}
                  letter={String.fromCharCode(65 + position)}
                  label={option}
                  selected={picked === position}
                  accent={accent}
                  verdict={
                    phase === "resolved" && picked === position ? verdict : null
                  }
                  isAnswerKey={wrong && position === question.correctIndex}
                  dimmed={scanning && picked !== position}
                  streak={streak}
                  disabled={phase !== "picking"}
                  onSelect={() => select(position)}
                />
              ))}
              {scanning ? <VerdictScanline /> : null}
            </div>

            {wrong ? <GlitchTear /> : null}
          </div>

          {/* The question number rides the panel's top edge. */}
          <span
            className="absolute left-3.5 top-0 grid min-h-8.5 min-w-10.5 place-items-center border px-2.25 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p14,
              color: accent,
              background: `color-mix(in srgb, ${accent} 14%, var(--ds-color-background-elevated))`,
              borderColor: accent,
              boxShadow: `0 0 10px 0 ${withAlpha(accent, 0.16)}`,
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* ---- Dock ---- */}
      <div
        className="shrink-0 px-4 pb-[max(1.125rem,env(safe-area-inset-bottom))] pt-3.5"
        style={{
          background: withAlpha("var(--ds-color-background-primary)", 0.96),
          borderTop: "1px solid var(--ds-color-border-muted)",
        }}
      >
        <div className="mx-auto w-full max-w-107.5">
          <div className="flex gap-1.25">
            {questions.map((item, position) => (
              <Segment
                key={item.id}
                answered={answers[position] !== undefined}
                current={position === index}
                verdict={
                  answers[position] === undefined ||
                  (position === index && phase !== "resolved")
                    ? null
                    : answers[position] === item.correctIndex
                }
              />
            ))}
          </div>

          {verdict !== null ? (
            <div className="mt-3">
              <QuizDebrief
                correct={verdict}
                xp={reward}
                streak={streak}
                correctLabel={question.options[question.correctIndex]}
              />
            </div>
          ) : null}

          <div className="mt-3">
            <PrimaryAction
              label={
                phase !== "resolved" ? "LOCK IN" : isLast ? "SEE RESULTS" : "NEXT"
              }
              accent={accent}
              enabled={phase === "picking" ? answered : phase === "resolved"}
              charging={phase === "resolved" && !isLast && !reduced}
              icon={
                phase !== "resolved" ? (
                  <LockIcon size={18} />
                ) : isLast ? (
                  <QuizIcon size={18} />
                ) : (
                  <ArrowRightIcon size={18} />
                )
              }
              onPress={phase === "picking" ? lockAnswer : advance}
            />
          </div>

          <p className="mt-2.25 text-center text-2xs leading-snug text-muted">
            {streak >= 2
              ? `Streak ×${streak} · ${remaining} of ${questions.length} left · +${reward} XP per correct`
              : `${remaining} of ${questions.length} left · +${reward} XP per correct · max ${questions.length * reward} XP`}
          </p>
        </div>
      </div>

      {confirmExit ? (
        <ExitDialog
          setNumber={setNumber}
          banked={earnedXp}
          onKeepPlaying={() => setConfirmExit(false)}
          onExit={() => onExit(earnedXp)}
        />
      ) : null}
    </div>
  );
}

/* ---- HUD parts ------------------------------------------------------------ */

function CornerBrackets({ accent }: { accent: string }) {
  const edge = `1.5px solid ${withAlpha(accent, 0.4)}`;
  return (
    <>
      <span
        aria-hidden
        className="absolute left-0 top-0 size-4"
        style={{ borderTop: edge, borderLeft: edge }}
      />
      <span
        aria-hidden
        className="absolute right-0 top-0 size-4"
        style={{ borderTop: edge, borderRight: edge }}
      />
    </>
  );
}

function HudMetric({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <span className="flex items-center gap-1">
        <span aria-hidden style={{ color }}>
          {icon}
        </span>
        <span
          className="truncate font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p7_5, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          {label}
        </span>
      </span>
      <span
        className="ds-tabular mt-1.25 truncate font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p11_5, letterSpacing: "var(--ds-tracking-label)", color }}
      >
        {value}
      </span>
    </div>
  );
}

function MetricDivider() {
  return (
    <span
      aria-hidden
      className="mx-1.25 my-auto h-8.5 w-px shrink-0"
      style={{ background: "var(--ds-color-border-default)" }}
    />
  );
}

/** One question's place in the run: graded, current, answered or ahead. */
function Segment({
  answered,
  current,
  verdict,
}: {
  answered: boolean;
  current: boolean;
  verdict: boolean | null;
}) {
  const background =
    verdict !== null
      ? verdict
        ? "var(--ds-gradient-step-passed)"
        : "var(--ds-gradient-step-failed)"
      : current
        ? "var(--ds-gradient-step-current)"
        : answered
          ? "var(--ds-gradient-step-passed)"
          : "var(--ds-color-border-default)";

  return (
    <span
      aria-hidden
      className="h-2 flex-1 transition-[background,box-shadow] duration-200"
      style={{
        background,
        boxShadow:
          current && verdict === null
            ? `0 0 8px 0 ${withAlpha(accentVar("orange"), 0.35)}`
            : undefined,
      }}
    />
  );
}

/* ---- The primary action --------------------------------------------------- */

/**
 * LOCK IN, then NEXT — and while a verdict is up, a charging cell: a bright
 * focal fill sweeps across it over the auto-advance window and fires the next
 * question when it tops up. Tapping any time skips the wait.
 */
function PrimaryAction({
  label,
  accent,
  enabled,
  charging,
  icon,
  onPress,
}: {
  label: string;
  accent: string;
  enabled: boolean;
  charging: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const face = (focal: boolean) => (
    <span
      className="flex h-13 items-center justify-center gap-2 font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p13,
        letterSpacing: "var(--ds-tracking-ultra)",
        clipPath: "var(--ds-clip-hud)",
        background: focal ? accent : "var(--ds-color-background-elevated)",
        color: focal ? "var(--ds-color-text-inverse)" : accent,
        border: focal ? "none" : `1px solid ${withAlpha(accent, 0.55)}`,
      }}
    >
      {label}
      <span aria-hidden>{icon}</span>
    </span>
  );

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onPress}
      className={`relative block w-full ${enabled ? "cursor-pointer" : "cursor-default opacity-50"}`}
    >
      {charging ? (
        <>
          {face(false)}
          <span
            aria-hidden
            className={`${styles.charge} absolute inset-0`}
          >
            {face(true)}
          </span>
          <span
            aria-hidden
            className={`${styles.chargeEdge} absolute inset-y-0 w-0.75 -translate-x-1/2`}
            style={{
              background: "var(--ds-color-text-default)",
              filter: "blur(3px)",
              opacity: 0.85,
            }}
          />
        </>
      ) : (
        face(enabled)
      )}
    </button>
  );
}

/* ---- Leaving mid-run ------------------------------------------------------ */

function ExitDialog({
  setNumber,
  banked,
  onKeepPlaying,
  onExit,
}: {
  setNumber: number;
  banked: number;
  onKeepPlaying: () => void;
  onExit: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-40 grid place-items-center px-6"
      style={{ background: "var(--ds-color-overlay-scrim)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Exit quiz"
        className="w-full max-w-90 border p-5"
        style={{
          background: "var(--ds-color-background-elevated)",
          borderColor: "var(--ds-color-border-default)",
        }}
      >
        <h2
          className="font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p17, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          EXIT QUIZ?
        </h2>
        <p className="mt-3 text-xs leading-snug text-muted">
          {banked > 0
            ? `Your +${banked} XP is banked, but SET ${setNumber} will not clear and the entry fee will not be refunded.`
            : `SET ${setNumber} will not clear and the entry fee will not be refunded.`}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onKeepPlaying}
            className="cursor-pointer px-3 py-2 font-display text-2xs font-black tracking-ultra text-muted transition-colors hover:text-foreground"
          >
            KEEP PLAYING
          </button>
          <button
            type="button"
            onClick={onExit}
            className="cursor-pointer px-4 py-2 font-display text-2xs font-black tracking-ultra text-inverse"
            style={{ background: "var(--ds-color-danger)" }}
          >
            EXIT QUIZ
          </button>
        </div>
      </div>
    </div>
  );
}

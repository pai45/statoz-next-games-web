"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  CloseIcon,
  FlagIcon,
  LockIcon,
  PlusIcon,
  ScheduleIcon,
  SwapHorizIcon,
} from "@statoz/design-system/games";
import type { SportMatch } from "@/domain/matches";
import {
  applyMultiplier,
  isScoreQuestion,
  predictionMultipliers,
  type PredictionMultiplierId,
  type QuizQuestion,
} from "@/domain/predictions";

import type { QuizSession } from "../state/use-quiz-session";
import styles from "./predictions.module.css";

/**
 * The question flow: one question at a time, a numbered panel with its XP
 * stake and boosts, and the dock that carries the progress segments and the
 * forward action.
 */

/* ---- Chrome ---------------------------------------------------------------- */

export function LockLine({
  match,
  untilLockMs,
  hydrated,
  trailing,
}: {
  match: SportMatch;
  untilLockMs: number;
  hydrated: boolean;
  trailing?: React.ReactNode;
}) {
  const upcoming = match.status === "scheduled" && untilLockMs > 0;
  const [Icon, text, color] = upcoming
    ? [ScheduleIcon, `QUIZ LOCKS IN ${formatCountdown(untilLockMs)}`, "var(--ds-color-accent-gold)"] as const
    : match.status === "finished"
      ? [FlagIcon, "MATCH ENDED", "var(--ds-color-text-muted)"] as const
      : [LockIcon, "PREDICTIONS LOCKED", "var(--ds-color-danger)"] as const;

  const line = (
    <span className={styles.lockLine} style={{ color }} role="status">
      <Icon size={13} aria-hidden="true" />
      <span className={styles.tabular} suppressHydrationWarning>
        {hydrated || !upcoming ? text : "QUIZ LOCKS IN --:--:--"}
      </span>
    </span>
  );

  return trailing ? (
    <span className={styles.lockLineStack}>
      {line}
      {trailing}
    </span>
  ) : (
    line
  );
}

/** The running pot: counts up as answers land and boosts arm. */
export function XpPotTicker({ value, max }: { value: number; max: number }) {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (value > previous.current) {
      setBump(true);
      const release = window.setTimeout(() => setBump(false), 320);
      previous.current = value;
      setShown(value);
      return () => window.clearTimeout(release);
    }
    previous.current = value;
    setShown(value);
  }, [value]);

  return (
    <span className={styles.xpPot}>
      POTENTIAL
      <BoltIcon size={13} aria-hidden="true" style={{ color: "var(--ds-color-accent-gold)" }} />
      <b className={[styles.xpPotValue, styles.tabular, bump ? styles.xpPotBump : ""].filter(Boolean).join(" ")}>
        {shown}
      </b>
      <span className={styles.tabular}>/{max} XP</span>
    </span>
  );
}

export function AllQuizzesButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.allQuizzes} onClick={onClick}>
      <ArrowLeftIcon size={16} aria-hidden="true" />
      ALL QUIZZES
    </button>
  );
}

/* ---- The question ---------------------------------------------------------- */

export function QuestionStage({
  match,
  question,
  index,
  session,
}: {
  match: SportMatch;
  question: QuizQuestion;
  index: number;
  session: QuizSession;
}) {
  const multiplier = session.multipliers[question.id];
  const reward = applyMultiplier(question.reward, multiplier);
  const optionsVisible = session.revealPhase === "optionsReveal" || session.revealPhase === "ready";
  const questionVisible = session.revealPhase !== "numberIntro";

  return (
    <div
      className={[styles.questionStage, question.backgroundAsset ? styles.hasBackdrop : ""]
        .filter(Boolean)
        .join(" ")}
      key={question.id}
    >
      <div className={styles.stageInner}>
      <span className={[styles.questionIndex, styles.tabular].join(" ")}>{index + 1}</span>
      <div className={styles.questionPanel}>
        <h2 className={styles.questionText}>
          {questionVisible
            ? question.text.split(/\s+/).filter(Boolean).map((word, wordIndex) => (
                <span
                  key={`${word}-${wordIndex}`}
                  className={styles.revealWord}
                  style={{ animationDelay: `${wordIndex * 40}ms` }}
                >
                  {word}
                </span>
              ))
            : null}
        </h2>

        {isScoreQuestion(question) ? (
          <ScorePicker match={match} question={question} session={session} />
        ) : (
          <div className={styles.optionList}>
            {optionsVisible
              ? question.options.map((option, optionIndex) => (
                  <div
                    key={option}
                    className={styles.optionReveal}
                    style={{ animationDelay: `${optionIndex * 70}ms` }}
                  >
                    <OptionTile
                      letter={String.fromCharCode(65 + optionIndex)}
                      label={option}
                      state={optionState(question, session.answers[question.id], optionIndex, session.settled)}
                      disabled={!session.editable || session.revealing}
                      onSelect={() => session.select(question.id, optionIndex)}
                    />
                  </div>
                ))
              : null}
          </div>
        )}
      </div>

      <div className={styles.questionMeta}>
        <BoostSelector
          questionId={question.id}
          session={session}
          enabled={session.editable && !session.revealing && session.questionAnswered(question.id)}
        />
        <XpPill reward={reward} multiplier={multiplier} />
      </div>
      </div>
    </div>
  );
}

type OptionVisual = "idle" | "selected" | "correct" | "wrong";

function optionState(
  question: QuizQuestion,
  selected: number | undefined,
  index: number,
  settled: boolean,
): OptionVisual {
  if (settled) {
    if (index === question.settledOptionIndex) return "correct";
    if (index === selected) return "wrong";
    return "idle";
  }
  return index === selected ? "selected" : "idle";
}

const optionAccents: Record<OptionVisual, string> = {
  idle: "var(--ds-color-text-muted)",
  selected: "var(--ds-color-accent-cyan)",
  correct: "var(--ds-color-success)",
  wrong: "var(--ds-color-danger)",
};

function OptionTile({
  letter,
  label,
  state,
  disabled,
  onSelect,
}: {
  letter: string;
  label: string;
  state: OptionVisual;
  disabled: boolean;
  onSelect: () => void;
}) {
  const active = state !== "idle";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={state === "selected"}
      className={[
        styles.optionTile,
        active ? styles.optionActive : "",
        state === "selected" ? styles.optionSelected : "",
      ].filter(Boolean).join(" ")}
      style={{ "--option-accent": optionAccents[state] } as CSSProperties}
    >
      <span className={styles.optionLetter}>{letter}</span>
      <span className={styles.optionLabel}>{label.toUpperCase()}</span>
      {state === "correct" ? <CheckIcon size={18} aria-hidden="true" style={{ color: "var(--ds-color-success)" }} /> : null}
      {state === "wrong" ? <CloseIcon size={18} aria-hidden="true" style={{ color: "var(--ds-color-danger)" }} /> : null}
    </button>
  );
}

/* ---- Boosts ---------------------------------------------------------------- */

const boostAccents: Record<PredictionMultiplierId, string> = {
  x2: "var(--ds-color-accent-gold)",
  x15: "var(--ds-color-accent-cyan)",
};

export function BoostSelector({
  questionId,
  session,
  enabled,
  showLabel = false,
}: {
  questionId: string;
  session: QuizSession;
  enabled: boolean;
  showLabel?: boolean;
}) {
  return (
    <div className={styles.boostRow}>
      {showLabel ? <span className={styles.boostLabel}>BOOST</span> : null}
      {predictionMultipliers.map((multiplier) => {
        const owner = session.multiplierOwners[multiplier.id];
        const active = session.multipliers[questionId] === multiplier.id;
        const claimedElsewhere = owner != null && owner !== questionId;
        const Glyph = active ? BoltIcon : claimedElsewhere ? SwapHorizIcon : BoltIcon;
        return (
          <button
            key={multiplier.id}
            type="button"
            disabled={!enabled}
            aria-pressed={active}
            aria-label={`${multiplier.label} boost`}
            onClick={() => session.toggleMultiplier(questionId, multiplier.id)}
            className={[
              styles.boostChip,
              active ? styles.boostChipActive : "",
              claimedElsewhere ? styles.boostChipClaimed : "",
            ].filter(Boolean).join(" ")}
            style={{ "--boost-accent": boostAccents[multiplier.id] } as CSSProperties}
          >
            <Glyph size={14} aria-hidden="true" />
            {multiplier.label}
          </button>
        );
      })}
    </div>
  );
}

export function XpPill({
  reward,
  multiplier,
}: {
  reward: number;
  multiplier: PredictionMultiplierId | undefined;
}) {
  const accent = multiplier ? boostAccents[multiplier] : "var(--ds-color-accent-violet)";
  const label = predictionMultipliers.find((entry) => entry.id === multiplier)?.label;
  return (
    <span className={[styles.xpPill, styles.tabular].join(" ")} style={{ "--pill-accent": accent } as CSSProperties}>
      {reward}
      <small>xp</small>
      {label ? <b>{label}</b> : null}
    </span>
  );
}

/* ---- The exact-score picker ------------------------------------------------ */

const maxGoals = 15;

export function ScorePicker({
  match,
  question,
  session,
  compact = false,
}: {
  match: SportMatch;
  question: QuizQuestion;
  session: QuizSession;
  compact?: boolean;
}) {
  const { home, away } = session.scoreFor(question.id);
  const correct =
    session.settled &&
    question.settledHomeScore === home &&
    question.settledAwayScore === away;
  const editable = session.editable && !session.revealing;

  return (
    <>
      <div className={styles.scorePicker} style={compact ? { marginTop: 0 } : undefined}>
        <ScoreHalf
          name={match.home.name}
          color={match.home.color}
          score={home}
          correct={correct}
          editable={editable}
          onChange={(value) => session.setScore(question.id, value, away)}
        />
        <ScoreHalf
          away
          name={match.away.name}
          /* The app paints the away half a flat dark plate, not the team's own
             colour, so the two halves never fight for attention. */
          color="var(--ds-color-background-primary)"
          score={away}
          correct={correct}
          editable={editable}
          onChange={(value) => session.setScore(question.id, home, value)}
        />
      </div>
      {session.settled ? (
        <div
          className={styles.scoreVerdict}
          style={{ color: correct ? "var(--ds-color-success)" : "var(--ds-color-danger)" }}
        >
          {correct ? <CheckIcon size={16} aria-hidden="true" /> : <CloseIcon size={16} aria-hidden="true" />}
          {correct
            ? "EXACT SCORE — CORRECT"
            : `ACTUAL: ${question.settledHomeScore}–${question.settledAwayScore}`}
        </div>
      ) : null}
    </>
  );
}

function ScoreHalf({
  name,
  color,
  score,
  correct,
  editable,
  away = false,
  onChange,
}: {
  name: string;
  color: string;
  score: number;
  correct: boolean;
  editable: boolean;
  away?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={[styles.scoreHalf, away ? styles.scoreHalfAway : ""].filter(Boolean).join(" ")}
      style={{ "--half-color": color } as CSSProperties}
    >
      <span className={styles.scoreName}>{name}</span>
      <span className={styles.scoreControls}>
        <button
          type="button"
          className={styles.stepButton}
          disabled={!editable || score <= 0}
          aria-label={`Remove a goal from ${name}`}
          onClick={() => onChange(score - 1)}
        >
          <span aria-hidden="true">–</span>
        </button>
        <b className={[styles.scoreValue, correct ? styles.scoreValueCorrect : ""].filter(Boolean).join(" ")}>
          {score}
        </b>
        <button
          type="button"
          className={styles.stepButton}
          disabled={!editable || score >= maxGoals}
          aria-label={`Add a goal for ${name}`}
          onClick={() => onChange(score + 1)}
        >
          <PlusIcon size={16} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

/* ---- The dock -------------------------------------------------------------- */

export type PrimaryAction = {
  label: string;
  enabled: boolean;
  isNext?: boolean;
  onSelect?: () => void;
};

export function BottomDock({
  questions,
  answers,
  index,
  canGoPrevious,
  onPrevious,
  primary,
  helper,
}: {
  questions: QuizQuestion[];
  answers: Record<string, number>;
  index: number;
  canGoPrevious: boolean;
  onPrevious: () => void;
  primary: PrimaryAction;
  helper: string;
}) {
  return (
    <div className={styles.dock}>
      <div className={styles.segments}>
        {questions.map((question, questionIndex) => (
          <span
            key={question.id}
            className={[
              styles.segment,
              answers[question.id] != null || isScoreQuestion(question) ? styles.segmentAnswered : "",
              questionIndex === index ? styles.segmentCurrent : "",
            ].filter(Boolean).join(" ")}
          />
        ))}
      </div>

      <div className={styles.pagerRow}>
        {canGoPrevious ? (
          <button type="button" className={styles.pagerButton} onClick={onPrevious}>
            <ArrowLeftIcon size={16} aria-hidden="true" />
            PREVIOUS
          </button>
        ) : null}
        <button
          type="button"
          className={[styles.pagerButton, primary.enabled ? styles.pagerFocal : ""].filter(Boolean).join(" ")}
          disabled={!primary.enabled}
          onClick={primary.onSelect}
        >
          {primary.label}
          {primary.isNext ? <ArrowRightIcon size={16} aria-hidden="true" /> : null}
        </button>
      </div>

      <p className={styles.dockHelper}>{helper}</p>
    </div>
  );
}

/** The lime number that flashes over the screen as a question arrives. */
export function QuizNumberBurst({ number, run }: { number: number; run: number }) {
  return (
    <div key={run} className={styles.numberBurst} aria-hidden="true">
      {number}
    </div>
  );
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

"use client";


import { typography } from "@statoz/design-system/games/tokens/typography";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import {
  BoltIcon,
  CheckIcon,
  CloseIcon,
  ExpandMoreIcon,
  InsightsIcon,
  LockIcon,
  RadioBlankIcon,
  RadioCheckedIcon,
  ReplayIcon,
  StarOutlineIcon,
  VerifiedIcon,
} from "@statoz/design-system/games";
import type { SportMatch } from "@/domain/matches";
import {
  answerLabel,
  applyMultiplier,
  isScoreQuestion,
  settledAnswerFor,
  totalVotes,
  voteShare,
  votesFor,
  type PredictionMultiplierId,
  type PredictionVoteBreakdown,
  type QuizQuestion,
} from "@/domain/predictions";

import type { DraftSaveStatus, QuizSession } from "../state/use-quiz-session";
import { BoostSelector, ScorePicker } from "./quiz-flow";
import styles from "./predictions.module.css";

/**
 * The draft summary and, once a card is sealed, the read-only review: each
 * question with the pick that was locked in and how the crowd voted on it.
 */

export function ReviewNotice({ text }: { text: string }) {
  return <p className={styles.reviewNotice}>{text}</p>;
}

/** The final read for a player who never entered: how the crowd did. */
export function CommunityTelemetry({
  crowdCorrectVotes,
  crowdTotalVotes,
  fieldSize,
}: {
  crowdCorrectVotes: number;
  crowdTotalVotes: number;
  fieldSize: number;
}) {
  const hasVotes = crowdTotalVotes > 0;
  const accuracy = hasVotes ? Math.round((crowdCorrectVotes / crowdTotalVotes) * 100) : 0;
  const accent = hasVotes ? "var(--ds-color-accent-cyan)" : "var(--ds-color-text-muted)";
  return (
    <section
      className="mx-5 mt-2 p-3"
      style={{
        border: `1px solid color-mix(in srgb, ${accent} 34%, transparent)`,
        background: "var(--ds-color-background-secondary)",
      }}
    >
      <header className="flex items-center gap-2" style={{ color: accent }}>
        <InsightsIcon size={15} aria-hidden="true" />
        <span className={styles.pollMeta} style={{ flex: 1 }}>COMMUNITY // FINAL</span>
        <span className={[styles.pollMeta, styles.tabular].join(" ")}>
          {fieldSize > 0 ? `${fieldSize} FIELD ENTRIES` : "FIELD PENDING"}
        </span>
      </header>
      <p
        className={[styles.display, styles.tabular].join(" ")}
        style={{ margin: "9px 0 0", color: accent, fontSize: typography.sizeRem.p15 }}
      >
        {hasVotes ? `${accuracy}% CROWD ACCURACY` : "NO CROWD VOTES"}
      </p>
      <p className="mt-1" style={{ color: "var(--ds-color-text-muted)", fontSize: typography.sizeRem.p11_5 }}>
        {hasVotes
          ? `${crowdCorrectVotes} / ${crowdTotalVotes} votes matched the final answers.`
          : "Vote data will appear when the community feed is available."}
      </p>
    </section>
  );
}

export type ReviewQuestionCardProps = {
  index: number;
  question: QuizQuestion;
  match: SportMatch;
  session: QuizSession;
  votes: PredictionVoteBreakdown | undefined;
  expanded: boolean;
  expandable?: boolean;
  /** The read for a player who never entered: the actual answer, not a pick. */
  communityOnly?: boolean;
  editable: boolean;
  finished: boolean;
  onToggle: () => void;
};

export function ReviewQuestionCard({
  index,
  question,
  match,
  session,
  votes,
  expanded,
  expandable = true,
  communityOnly = false,
  editable,
  finished,
  onToggle,
}: ReviewQuestionCardProps) {
  const selected = communityOnly ? undefined : session.answers[question.id];
  const correct = settledAnswerFor(question);
  const shownAnswer = communityOnly ? correct : selected;
  const shownLabel = shownAnswer == null
    ? communityOnly ? "RESULT UNAVAILABLE" : answerLabel(question, selected ?? null)
    : answerLabel(question, shownAnswer);
  const selectedCorrect = communityOnly
    ? correct != null
    : selected != null && selected === correct;
  const multiplier = communityOnly ? undefined : session.multipliers[question.id];

  return (
    <article className={styles.reviewCard}>
      <button
        type="button"
        className={styles.reviewHead}
        disabled={!expandable}
        aria-expanded={expanded}
        onClick={expandable ? onToggle : undefined}
      >
        <span className="flex items-start gap-2.5">
          <span className={styles.reviewIndex}>Q{index}</span>
          <span className={`${styles.reviewQuestion} flex-1`}>{question.text}</span>
          {expandable ? (
            <ExpandMoreIcon
              size={20}
              aria-hidden="true"
              style={{
                color: "var(--ds-color-text-muted)",
                transform: expanded ? "rotate(180deg)" : undefined,
                transition: "transform 180ms ease",
              }}
            />
          ) : (
            <VerifiedIcon size={20} aria-hidden="true" style={{ color: "var(--ds-color-success)" }} />
          )}
        </span>

        <span className="mt-2.5 flex items-center gap-2">
          <span className={styles.reviewPickLabel}>{communityOnly ? "ACTUAL RESULT" : "YOUR PICK"}</span>
          <span
            className={styles.reviewPickValue}
            style={{
              color: shownAnswer == null
                ? "var(--ds-color-text-muted)"
                : selectedCorrect && finished
                  ? "var(--ds-color-success)"
                  : "var(--ds-color-text-default)",
            }}
          >
            {shownLabel}
          </span>
          {multiplier ? <MultiplierBadge multiplier={multiplier} /> : null}
          {!communityOnly && finished && correct != null ? (
            selectedCorrect
              ? <CheckIcon size={16} aria-hidden="true" style={{ color: "var(--ds-color-success)" }} />
              : <CloseIcon size={16} aria-hidden="true" style={{ color: "var(--ds-color-danger)" }} />
          ) : null}
        </span>
      </button>

      {expanded ? (
        <div className={styles.reviewBody}>
          <div className={styles.reviewBodyInner}>
            {editable ? (
              <EditableBody question={question} match={match} session={session} />
            ) : (
              <PollBody
                question={question}
                votes={votes}
                selected={selected}
                multiplier={multiplier}
                finished={finished}
              />
            )}

            {!communityOnly && !editable && finished && correct != null ? (
              <>
                <p className={styles.pollMeta} style={{ marginTop: "10px", color: "var(--ds-color-success)", display: "block" }}>
                  CORRECT ANSWER: {answerLabel(question, correct)}
                </p>
                <EarnedXpLine
                  earned={selectedCorrect ? applyMultiplier(question.reward, multiplier) : 0}
                  boosted={multiplier != null}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function EditableBody({
  question,
  match,
  session,
}: {
  question: QuizQuestion;
  match: SportMatch;
  session: QuizSession;
}) {
  const selected = session.answers[question.id];
  return (
    <div className="grid gap-3">
      {isScoreQuestion(question) ? (
        <ScorePicker match={match} question={question} session={session} compact />
      ) : (
        <div className="grid gap-2.5">
          {question.options.map((option, optionIndex) => (
            <button
              key={option}
              type="button"
              onClick={() => session.select(question.id, optionIndex)}
              aria-pressed={selected === optionIndex}
              className={[
                styles.reviewChoice,
                selected === optionIndex ? styles.reviewChoiceSelected : "",
              ].filter(Boolean).join(" ")}
            >
              {selected === optionIndex ? <RadioCheckedIcon size={18} aria-hidden="true" /> : <RadioBlankIcon size={18} aria-hidden="true" />}
              <span className={styles.optionLabel}>{option.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
      <BoostSelector
        questionId={question.id}
        session={session}
        enabled={session.editable && selected != null}
        showLabel
      />
    </div>
  );
}

function PollBody({
  question,
  votes,
  selected,
  multiplier,
  finished,
}: {
  question: QuizQuestion;
  votes: PredictionVoteBreakdown | undefined;
  selected: number | undefined;
  multiplier: PredictionMultiplierId | undefined;
  finished: boolean;
}) {
  const answers = pollAnswers(question, votes, selected);
  const total = totalVotes(votes);
  if (answers.length === 0 || total === 0) {
    return <p style={{ color: "var(--ds-color-text-muted)", fontSize: typography.sizeRem.p12 }}>NO CROWD VOTES YET</p>;
  }
  const correct = settledAnswerFor(question);

  return (
    <div className="grid gap-2">
      {multiplier ? <span className="justify-self-start"><MultiplierBadge multiplier={multiplier} /></span> : null}
      <div className={styles.pollMeta}>
        <span>CROWD PICK %</span>
        <span className={styles.tabular}>{total} TOTAL VOTES</span>
      </div>
      {answers.map((answer) => (
        <PollResultRow
          key={answer}
          label={answerLabel(question, answer)}
          votes={votesFor(votes, answer)}
          share={voteShare(votes, answer)}
          selected={selected === answer}
          correct={finished && correct === answer}
        />
      ))}
    </div>
  );
}

function PollResultRow({
  label,
  votes,
  share,
  selected,
  correct,
}: {
  label: string;
  votes: number;
  share: number;
  selected: boolean;
  correct: boolean;
}) {
  const accent = correct
    ? "var(--ds-color-success)"
    : selected
      ? "var(--ds-color-accent-cyan)"
      : "var(--ds-color-text-muted)";
  return (
    <div className={styles.pollRow}>
      <div className={styles.pollHead}>
        <span
          className="min-w-0 flex-1 truncate"
          style={{ color: correct || selected ? "var(--ds-color-text-default)" : "var(--ds-color-text-muted)" }}
        >
          {label.toUpperCase()}
        </span>
        {selected ? <span className={styles.pollMeta} style={{ color: "var(--ds-color-accent-cyan)" }}>YOU</span> : null}
        {correct ? <span className={styles.pollMeta} style={{ color: "var(--ds-color-success)" }}>RIGHT</span> : null}
        <span className={styles.tabular} style={{ color: accent, fontWeight: typography.weight.bold }}>
          {Math.round(share * 100)}% · {votes} VOTES
        </span>
      </div>
      <span className={styles.pollTrack} style={{ "--poll-accent": accent } as CSSProperties}>
        <i style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
    </div>
  );
}

export function MultiplierBadge({ multiplier }: { multiplier: PredictionMultiplierId }) {
  const accent = multiplier === "x2" ? "var(--ds-color-accent-gold)" : "var(--ds-color-accent-cyan)";
  return (
    <span className={styles.multiplierBadge} style={{ "--badge-accent": accent } as CSSProperties}>
      {multiplier === "x2" ? "2x" : "1.5x"}
    </span>
  );
}

function EarnedXpLine({ earned, boosted }: { earned: number; boosted: boolean }) {
  const color = earned > 0 ? "var(--ds-color-accent-gold)" : "var(--ds-color-text-muted)";
  const Glyph = boosted ? BoltIcon : StarOutlineIcon;
  return (
    <p className="mt-2 flex items-center gap-2" style={{ color }}>
      <Glyph size={15} aria-hidden="true" />
      <span className={[styles.pollMeta, styles.tabular].join(" ")} style={{ color }}>
        EARNED XP: {earned}
      </span>
    </p>
  );
}

/**
 * Which answers a poll shows. A multiple-choice question shows every option; an
 * exact-score question shows the five most-backed scorelines, always including
 * the player's own and the real result.
 */
function pollAnswers(
  question: QuizQuestion,
  votes: PredictionVoteBreakdown | undefined,
  selected: number | undefined,
): number[] {
  if (!isScoreQuestion(question)) return question.options.map((_, index) => index);

  const correct = settledAnswerFor(question);
  const pool = new Set<number>(Object.keys(votes?.totals ?? {}).map(Number));
  if (selected != null) pool.add(selected);
  if (correct != null) pool.add(correct);

  const byVotes = (a: number, b: number) => {
    const difference = votesFor(votes, b) - votesFor(votes, a);
    return difference !== 0 ? difference : a - b;
  };
  const visible = new Set<number>([...(selected != null ? [selected] : []), ...(correct != null ? [correct] : [])]);
  for (const answer of [...pool].sort(byVotes)) {
    if (visible.size >= 5) break;
    visible.add(answer);
  }
  return [...visible].sort(byVotes);
}

/* ---- The two docks --------------------------------------------------------- */

const holdToLockMs = 1200;

/**
 * Sealing a draft is deliberate: the button charges while it is held and only
 * fires when the charge completes, so a lock is never one stray tap away.
 */
export function PredictionLockDock({
  saveStatus,
  locking,
  onLock,
  onRetry,
}: {
  saveStatus: DraftSaveStatus;
  locking: boolean;
  onLock: () => void;
  onRetry: () => void;
}) {
  const [charge, setCharge] = useState(0);
  const [armed, setArmed] = useState(false);
  const frame = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const start = useCallback(() => {
    if (locking || armed) return;
    const began = performance.now();
    const tick = () => {
      const value = Math.min(1, (performance.now() - began) / holdToLockMs);
      setCharge(value);
      if (value >= 1) {
        setArmed(true);
        stop();
        onLock();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [locking, armed, onLock, stop]);

  const cancel = useCallback(() => {
    if (armed) return;
    stop();
    setCharge(0);
  }, [armed, stop]);

  useEffect(() => stop, [stop]);

  const charging = charge > 0 && !armed && !locking;
  const telemetry = {
    saving: ["SAVING...", "var(--ds-color-accent-cyan)"],
    failed: ["SAVE FAILED • RETRY", "var(--ds-color-danger)"],
    saved: ["ALL CHANGES SAVED", "var(--ds-color-success)"],
  }[saveStatus];

  return (
    <div className={styles.lockDock}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className={styles.lockDockLabel}
          style={{ color: telemetry[1], border: 0, background: "none", cursor: saveStatus === "failed" ? "pointer" : "default" }}
          disabled={saveStatus !== "failed"}
          onClick={onRetry}
        >
          {saveStatus === "failed" ? <ReplayIcon size={13} aria-hidden="true" /> : null}
          {telemetry[0]}
        </button>
        <span className={styles.lockDockLabel}>LOCK PROTOCOL // 01</span>
      </div>

      <div className={styles.lockCharge} aria-hidden="true">
        <span className={styles.lockChargeTrack}><i style={{ width: `${charge * 100}%` }} /></span>
        <LockIcon size={14} style={{ color: "var(--ds-color-accent-cyan)" }} />
        <span className={styles.lockChargeTrack}><i style={{ width: `${charge * 100}%` }} /></span>
      </div>

      <button
        type="button"
        className={styles.holdButton}
        disabled={locking}
        aria-label="Hold to lock prediction"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onKeyDown={(event) => {
          // A keyboard has no hold, so Enter or Space seals it outright.
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!locking) onLock();
          }
        }}
      >
        <span className={styles.holdLabel}>
          {locking ? "LOCKING..." : charging ? "SEALING PREDICTION" : "HOLD TO LOCK"}
        </span>
        <span className={styles.holdHelper}>{charging ? "KEEP HOLDING" : "FINAL • CANNOT BE EDITED"}</span>
      </button>
    </div>
  );
}

export function SettleDock({ onSettle }: { onSettle: () => void }) {
  return (
    <div className={styles.settleDock}>
      <button type="button" className={[styles.pagerButton, styles.pagerFocal].join(" ")} onClick={onSettle}>
        REVEAL RESULTS
      </button>
    </div>
  );
}

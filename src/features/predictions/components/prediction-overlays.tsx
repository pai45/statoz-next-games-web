"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  CloseIcon,
  PaidIcon,
  TrophyIcon,
} from "@statoz/design-system/games";
import type { SportMatch } from "@/domain/matches";
import type { SettlementQuestionResult } from "@/domain/predictions";
import { useFullScreenMoment, usePrefersReducedMotion } from "@/shared/hooks";

import type { SettlementOutcome } from "../state/prediction-store";
import styles from "./predictions.module.css";

/**
 * The two moments the PREDICT tab earns: sealing a card, and revealing what it
 * was worth. Both are full-bleed over the tab, both can be skipped, and neither
 * decides anything — the XP and any prize are credited before they play.
 */

/* ---- Sealing --------------------------------------------------------------- */

/**
 * The seal cinematic, on the app's 4.5s clock: the plate slams in with a cyan
 * flash and one confirm ring, a radar arc sweeps its ring, the check draws
 * itself, and the headline resolves a letter at a time while the XP charges.
 *
 * It is the tab's one focal moment, so it is the one thing here that glows.
 */
const lockedHoldMs = 4500;

export function PredictionLockedOverlay({
  potentialXp,
  count,
  automatic,
  onDone,
}: {
  potentialXp: number;
  count: number;
  automatic: boolean;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  useFullScreenMoment();
  const [xp, setXp] = useState(reduced ? potentialXp : 0);
  const headline = automatic ? "KICKOFF LOCK ACTIVATED" : "PREDICTION LOCKED";

  // The countdown above re-renders this tab every second; the cinematic runs on
  // its own clock, so its finish handler is held rather than depended on.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (reduced) {
      const skip = window.setTimeout(() => done.current(), 400);
      return () => window.clearTimeout(skip);
    }
    // The XP charges over the app's window: 24% to 54% of the run.
    const chargeFrom = lockedHoldMs * 0.24;
    const chargeMs = lockedHoldMs * 0.3;
    const began = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const elapsed = performance.now() - began;
      const progress = Math.min(1, Math.max(0, (elapsed - chargeFrom) / chargeMs));
      setXp(Math.round(potentialXp * (1 - (1 - progress) ** 2)));
      if (elapsed < chargeFrom + chargeMs) frame = requestAnimationFrame(tick);
    });
    const finish = window.setTimeout(() => done.current(), lockedHoldMs);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(finish);
    };
  }, [reduced, potentialXp]);

  const letters = [...headline];

  return (
    <div className={`${styles.overlay} ${styles.lockOverlay}`} role="status" aria-label={headline}>
      <SubmitSeal />

      <div className={styles.lockCopy}>
        <h2 className={styles.lockHeadline} aria-hidden>
          {letters.map((char, index) => (
            <span
              key={`${char}-${index}`}
              style={{ animationDelay: `${lockedHoldMs * 0.14 + (index / letters.length) * lockedHoldMs * 0.14}ms` }}
            >
              {char === " " ? " " : char}
            </span>
          ))}
        </h2>
        <p className={styles.lockSealed}>{count} ANSWERS SEALED</p>
        <span className={styles.lockMeter} aria-hidden>
          <i />
        </span>
        <p className={`${styles.lockXp} ${styles.tabular}`}>UP TO {xp} XP</p>
      </div>
    </div>
  );
}

/**
 * The seal itself: a chamfered plate ringed by corner brackets, a radar arc
 * that closes into a glowing ring, and a checkmark that draws itself in.
 */
function SubmitSeal() {
  return (
    <div className={styles.sealSlot} aria-hidden>
      <span className={styles.sealFlash} />
      <span className={styles.sealPulse} />
      <svg className={styles.sealArt} viewBox="0 0 240 240">
        <defs>
          <linearGradient id="seal-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ds-color-accent-cyan)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--ds-color-accent-cyan)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* The radar track, and the arc that sweeps it. */}
        <circle className={styles.sealTrack} cx="120" cy="120" r="72" />
        <circle className={styles.sealSweep} cx="120" cy="120" r="72" />

        {/* The plate: cut at the top-right and bottom-left, never square. */}
        <path
          className={styles.sealPlate}
          d="M76 76 H151 L164 89 V164 H89 L76 151 Z"
          fill="url(#seal-fill)"
        />

        {/* Corner brackets, just outside the plate. */}
        <path className={styles.sealBracket} d="M64 78 V64 H78 M176 78 V64 H162 M176 162 V176 H162 M64 162 V176 H78" />

        {/* The check, drawn on. */}
        <path className={styles.sealCheck} d="M100 121 L114 136 L142 102" />
      </svg>
    </div>
  );
}

/* ---- Revealing ------------------------------------------------------------- */

const verdictStepMs = 820;
const headerHoldMs = 1100;

export function SettlementRevealOverlay({
  match,
  outcome,
  isContest,
  onDone,
}: {
  match: SportMatch;
  outcome: SettlementOutcome;
  isContest: boolean;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  useFullScreenMoment();
  const results = outcome.results;
  const summaryStage = results.length + 1;
  const [stage, setStage] = useState(reduced ? summaryStage : 0);

  useEffect(() => {
    if (reduced || stage >= summaryStage) return;
    const delay = stage === 0 ? headerHoldMs : verdictStepMs;
    const timer = window.setTimeout(() => setStage((value) => value + 1), delay);
    return () => window.clearTimeout(timer);
  }, [reduced, stage, summaryStage]);

  const onSummary = stage >= summaryStage;
  const revealedXp = onSummary
    ? outcome.xp
    : results.slice(0, Math.max(0, stage - 1)).reduce((sum, result) => sum + result.earnedXp, 0);
  const perfect = results.length > 0 && outcome.correctCount === results.length;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-label="Prediction settled"
      onClick={() => !onSummary && setStage(summaryStage)}
    >
      {onSummary ? (
        <div className={styles.revealSheet}>
          <header className={styles.revealHead}>
            <h2 className={styles.revealTitle} style={perfect ? undefined : { color: "var(--ds-color-text-default)" }}>
              {perfect ? "PERFECT QUIZ" : "PREDICTION SETTLED"}
            </h2>
            <p className={`${styles.revealFixture} ${styles.tabular}`}>
              {outcome.correctCount} / {results.length} CORRECT
            </p>
          </header>

          <dl className={styles.revealTotals}>
            <Cell label="XP EARNED" value={`+${outcome.xp}`} color="var(--ds-color-accent-gold)" />
            <Cell label="CORRECT" value={`${outcome.correctCount}/${results.length}`} />
            <Cell
              label="FIELD"
              value={isContest ? `#${outcome.rank} of ${outcome.fieldSize}` : `${outcome.fieldSize}`}
              color="var(--ds-color-accent-cyan)"
            />
          </dl>

          {isContest ? <ContestPrizeBeat rank={outcome.rank} field={outcome.fieldSize} prizeOz={outcome.prizeOz} /> : null}

          {outcome.beatenShare != null ? (
            <p className={`${styles.beatenLine} ${styles.tabular}`}>
              YOU BEAT {Math.round(outcome.beatenShare * 100)}% OF PREDICTORS
            </p>
          ) : null}

          <button type="button" className={[styles.pagerButton, styles.pagerFocal].join(" ")} onClick={onDone}>
            CONTINUE
            <ArrowRightIcon size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className={styles.revealSheet}>
          <header className={styles.revealHead}>
            <h2 className={styles.revealTitle} style={{ color: "var(--ds-color-text-default)" }}>RESULTS ARE IN</h2>
            <p className={styles.revealFixture}>
              {match.home.shortName} vs {match.away.shortName}
            </p>
            <p className={styles.revealFixture}>
              <span className={styles.tabular}>SETTLING {results.length} FUTURES</span>
              {"  ·  "}
              <b className={styles.tabular} style={{ color: "var(--ds-color-accent-gold)" }}>+{revealedXp} XP</b>
            </p>
          </header>

          <div className={styles.verdictList}>
            {results.slice(0, Math.min(stage, results.length)).map((result, index) => (
              <VerdictRow key={result.text} index={index + 1} result={result} />
            ))}
          </div>

          <p className={styles.revealFixture} style={{ textAlign: "center" }}>TAP TO SKIP</p>
        </div>
      )}
    </div>
  );
}

function VerdictRow({ index, result }: { index: number; result: SettlementQuestionResult }) {
  const accent = result.correct ? "var(--ds-color-success)" : "var(--ds-color-danger)";
  return (
    <div className={styles.verdictRow} style={{ "--verdict-accent": accent } as CSSProperties}>
      <span className={styles.reviewIndex} style={{ borderColor: accent, color: accent }}>Q{index}</span>
      <span className={styles.verdictCopy}>
        <span className={styles.verdictText}>{result.text}</span>
        <span className={styles.verdictAnswer}>
          {result.pickedLabel}
          {result.correct ? "" : ` → ${result.correctLabel}`}
        </span>
      </span>
      {result.multiplier ? <BoltIcon size={14} aria-hidden="true" style={{ color: "var(--ds-color-accent-gold)" }} /> : null}
      {result.correct ? <CheckIcon size={16} aria-hidden="true" style={{ color: accent }} /> : <CloseIcon size={16} aria-hidden="true" style={{ color: accent }} />}
      <span className={styles.verdictStamp}>{result.correct ? `+${result.earnedXp}` : "0"}</span>
    </div>
  );
}

/**
 * The paid contest's payoff. On the podium this is the gold moment; off it, a
 * calm muted readout, so the glow keeps its meaning.
 */
function ContestPrizeBeat({ rank, field, prizeOz }: { rank: number; field: number; prizeOz: number }) {
  const won = prizeOz > 0;
  const accent = won ? "var(--ds-color-accent-gold)" : "var(--ds-color-text-muted)";
  return (
    <section
      className={[styles.prizeBeat, won ? styles.prizeBeatWon : ""].filter(Boolean).join(" ")}
      style={{ "--prize-accent": accent } as CSSProperties}
    >
      <span className={styles.pollMeta} style={{ justifyContent: "center", color: accent }}>
        {won ? <TrophyIcon size={13} aria-hidden="true" /> : null}
        SCORELINE CONTEST
      </span>
      <strong className={[styles.display, styles.tabular].join(" ")} style={{ color: accent, fontSize: typography.sizeRem.p18 }}>
        FINISHED #{rank} OF {field}
      </strong>
      <span className={[styles.pollMeta, styles.tabular].join(" ")} style={{ justifyContent: "center", color: accent }}>
        {won ? <PaidIcon size={13} aria-hidden="true" /> : null}
        {won ? `+${prizeOz} OZ CREDITED` : "OFF THE PODIUM — NO PRIZE"}
      </span>
    </section>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={styles.revealCell} style={{ "--cell-color": color } as CSSProperties}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

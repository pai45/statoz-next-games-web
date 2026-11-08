"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useEffect, useState, type CSSProperties } from "react";

import {
  accentVar,
  ArrowRightIcon,
  Button,
  ExpandMoreIcon,
  feedbackVar,
  hudChamferPath,
  LockIcon,
  PremiumIcon,
  Progress,
  ReplayIcon,
  StarIcon,
  StarOutlineIcon,
  withAlpha,
} from "@statoz/design-system/games";
import { levelProgress } from "@/domain/progression";
import { PackRevealBackdrop, RayBurst } from "@/features/packs";
import { useCountUp, usePrefersReducedMotion } from "@/shared/hooks";

import { entryCost, setCount } from "../constants";
import { modeAccent, modeLabels } from "@/mocks/games/quiz";
import type { AnswerResult, QuizMode, SetOutcome } from "../types";

import styles from "./quiz.module.css";

/**
 * The end of a run.
 *
 * Every answer was already judged in play by the SIGNAL LOCK cinematic, so this
 * is a payoff rather than a settlement: the mastery stars stamp in one at a
 * time, the XP total counts up, and the level bar catches up behind it.
 *
 * There is no fail state. Finishing a set always clears it and always pays for
 * what you got right; the stars are the reason to come back.
 */

const gold = accentVar("gold");
const orange = accentVar("orange");

/** Each beat arrives a fraction behind the one above it. */
function beat(factor: number): CSSProperties {
  return { "--enter-delay": `${Math.round(420 * factor)}ms` } as CSSProperties;
}

export type QuizRevealProps = {
  mode: QuizMode;
  setNumber: number;
  results: AnswerResult[];
  totalXp: number;
  /** The player's XP before this run, so the level bar can travel. */
  xpBefore: number;
  outcome: SetOutcome;
  bestStreak: number;
  onReplay: () => void;
  onDone: () => void;
};

export function QuizReveal({
  mode,
  setNumber,
  results,
  totalXp,
  xpBefore,
  outcome,
  bestStreak,
  onReplay,
  onDone,
}: QuizRevealProps) {
  const accent = modeAccent(mode);
  const reduced = usePrefersReducedMotion();
  const correct = results.filter((result) => result.correct).length;
  const perfect = outcome.stars >= 3;
  const newBest = correct > outcome.bestBefore;

  const before = levelProgress(xpBefore);
  const after = levelProgress(xpBefore + totalXp);
  const leveled = after.level > before.level;

  return (
    <div
      className="absolute inset-0 z-50 overflow-y-auto overscroll-contain"
      style={{ background: withAlpha("var(--ds-color-background-primary)", 0.98) }}
    >
      {/* A flawless run earns the pack reveal's own celebration. */}
      {perfect && !reduced ? (
        <>
          <PackRevealBackdrop tier="platinum" />
          <RayBurst tier="platinum" />
        </>
      ) : null}

      <div className="relative mx-auto w-full max-w-107.5 px-5 py-7">
        <h2
          className={`${styles.revealIn} text-center font-display font-black leading-none`}
          style={{
            ...beat(0),
            fontSize: typography.sizeRem.p25,
            letterSpacing: "var(--ds-tracking-mega)",
            color: perfect ? gold : feedbackVar("success"),
            textShadow: reduced
              ? undefined
              : `0 0 20px ${withAlpha(perfect ? gold : feedbackVar("success"), 0.55)}`,
          }}
        >
          {perfect ? "FLAWLESS SET" : "SET CLEARED"}
        </h2>

        <div
          className={`${styles.revealIn} mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5`}
          style={beat(0.2)}
        >
          <span
            className="ds-tabular font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {correct} / {results.length} CORRECT
          </span>
          {bestStreak >= 2 ? (
            <span
              className="ds-tabular font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p12,
                letterSpacing: "var(--ds-tracking-ultra)",
                color: bestStreak >= 5 ? gold : orange,
              }}
            >
              BEST STREAK ×{bestStreak}
            </span>
          ) : null}
          {newBest ? (
            <span
              className="border px-1.75 py-0.75 font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p9,
                letterSpacing: "var(--ds-tracking-ultra)",
                color: gold,
                background: withAlpha(gold, 0.13),
                borderColor: withAlpha(gold, 0.6),
              }}
            >
              NEW BEST
            </span>
          ) : null}
        </div>

        <StarAward stars={outcome.stars} gained={outcome.starsGained} />

        <div className={`${styles.revealIn} mt-6`} style={beat(0.35)}>
          <XpTotal xp={totalXp} />
        </div>

        {outcome.newlyCleared ? (
          <div className={`${styles.revealIn} mt-4.5`} style={beat(0.5)}>
            <ClearBanner mode={mode} setNumber={setNumber} accent={accent} />
          </div>
        ) : null}

        <div className={`${styles.revealIn} mt-6`} style={beat(0.65)}>
          <div className="flex items-baseline justify-between">
            <span
              className="font-display font-black leading-none"
              style={{
                fontSize: typography.sizeRem.p10,
                letterSpacing: "var(--ds-tracking-ultra)",
                color: leveled ? gold : "var(--ds-color-text-muted)",
              }}
            >
              LEVEL {after.level}
            </span>
            <span
              className="ds-tabular font-display font-black leading-none text-muted"
              style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-wide)" }}
            >
              {after.intoLevel} / {after.levelSpan} XP
            </span>
          </div>
          <div className="mt-1.75">
            <Progress
              value={after.fraction}
              accent={leveled ? gold : accentVar("cyan")}
              label={`${after.intoLevel} of ${after.levelSpan} XP into level ${after.level}`}
              height={8}
            />
          </div>
        </div>

        <div className={`${styles.revealIn} mt-4.5`} style={beat(0.75)}>
          <AnswerReview results={results} accent={accent} />
        </div>

        <div className={`${styles.revealIn} mt-6`} style={beat(0.85)}>
          <Button
            accent={accent}
            glow
            fullWidth
            trailingIcon={<ArrowRightIcon size={18} />}
            onClick={onDone}
          >
            CONTINUE TO SETS
          </Button>
        </div>

        {!perfect ? (
          <div className={`${styles.revealIn} mt-2.5`} style={beat(0.95)}>
            <Button
              accent={accent}
              variant="tonal"
              fullWidth
              leadingIcon={<ReplayIcon size={18} />}
              onClick={onReplay}
            >
              REPLAY FOR 3 STARS · {entryCost} COINS
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---- Stars ---------------------------------------------------------------- */

/**
 * Three chamfered plates, each stamping down as it is awarded. Only earned
 * plates light, and only a full sweep glows.
 */
function StarAward({ stars, gained }: { stars: number; gained: number }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? stars : 0);

  /**
   * The stars land one after another rather than all at once, which is the
   * whole beat. Timers rather than staggered CSS, because the caption below
   * counts up with them.
   */
  useEffect(() => {
    if (reduced || stars === 0) return;
    const ids = Array.from({ length: stars }, (_, index) =>
      window.setTimeout(() => setShown(index + 1), 420 + index * 260),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [reduced, stars]);

  return (
    <div className="mt-5.5">
      <div className="flex items-center justify-center gap-3">
        {[0, 1, 2].map((index) => (
          <StarPlate
            key={index}
            earned={index < shown}
            complete={shown >= 3}
            index={index}
          />
        ))}
      </div>
      <p
        className="mt-2.5 text-center font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p9_5,
          letterSpacing: "var(--ds-tracking-ultra)",
          color: gained > 0 ? gold : "var(--ds-color-text-muted)",
        }}
      >
        {gained > 0
          ? `+${gained} ${gained === 1 ? "STAR" : "STARS"} EARNED`
          : shown === 0
            ? "NO STARS YET · REPLAY TO EARN"
            : "SET RECORD HELD"}
      </p>
    </div>
  );
}

function StarPlate({
  earned,
  complete,
  index,
}: {
  earned: boolean;
  complete: boolean;
  index: number;
}) {
  const clip = { clipPath: hudChamferPath(9, 3) };

  return (
    <span
      className={`relative block h-14 w-15.5 ${earned ? styles.stamp : ""}`}
      style={{ "--enter-delay": `${index * 20}ms` } as CSSProperties}
    >
      {earned && complete ? (
        <span
          aria-hidden
          className="absolute -inset-1 blur-[8px]"
          style={{ ...clip, background: withAlpha(gold, 0.3) }}
        />
      ) : null}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          ...clip,
          background: earned ? withAlpha(gold, 0.75) : "var(--ds-color-border-muted)",
        }}
      />
      <span
        aria-hidden
        className="absolute inset-px"
        style={{
          ...clip,
          background: earned
            ? `color-mix(in srgb, ${gold} 14%, var(--ds-color-background-elevated))`
            : "var(--ds-color-background-elevated)",
        }}
      />
      <span className="relative grid h-full place-items-center">
        {earned ? (
          <StarIcon size={30} style={{ color: gold }} />
        ) : (
          <StarOutlineIcon
            size={30}
            style={{ color: "var(--ds-color-border-default)" }}
          />
        )}
      </span>
    </span>
  );
}

/* ---- XP, banner and review ------------------------------------------------ */

function XpTotal({ xp }: { xp: number }) {
  const shown = useCountUp(xp);
  return (
    <p
      className="ds-tabular text-center font-display font-black leading-none"
      style={{
        fontSize: typography.sizeRem.p40,
        letterSpacing: "var(--ds-tracking-ultra)",
        color: gold,
        textShadow: `0 0 26px ${withAlpha(gold, 0.55)}`,
      }}
    >
      +{shown} XP
    </p>
  );
}

/** The capstone naming what this run just opened. */
function ClearBanner({
  mode,
  setNumber,
  accent,
}: {
  mode: QuizMode;
  setNumber: number;
  accent: string;
}) {
  const last = setNumber >= setCount;
  return (
    <div
      className="flex items-center justify-center gap-2 border px-3.5 py-2.75"
      style={{
        background: withAlpha(accent, 0.1),
        borderColor: withAlpha(accent, 0.6),
        boxShadow: `0 0 14px 0 ${withAlpha(accent, 0.28)}`,
      }}
    >
      {last ? (
        <PremiumIcon size={16} style={{ color: accent }} />
      ) : (
        <LockIcon size={16} style={{ color: accent }} />
      )}
      <span
        className="truncate font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p13,
          letterSpacing: "var(--ds-tracking-ultra)",
          color: accent,
        }}
      >
        {last
          ? `${modeLabels[mode]} LADDER COMPLETE`
          : `SET ${setNumber + 1} UNLOCKED`}
      </span>
    </div>
  );
}

function AnswerReview({
  results,
  accent,
}: {
  results: AnswerResult[];
  accent: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border"
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.92),
        borderColor: withAlpha(accent, 0.42),
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span
            className="block font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p11,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: accent,
            }}
          >
            REVIEW RESULTS
          </span>
          <span className="mt-1 block text-2xs leading-snug text-muted">
            Selected and correct answers
          </span>
        </span>
        <ExpandMoreIcon
          size={22}
          style={{
            color: accent,
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 200ms ease-out",
          }}
        />
      </button>

      {open ? (
        <ul className="px-2.5 pb-2.5">
          {results.map((result, index) => (
            <li
              key={index}
              className="flex items-start gap-2.25 px-2.5 py-2.25"
              style={{ borderTop: "1px solid var(--ds-color-border-muted)" }}
            >
              <span
                aria-hidden
                className="mt-0.5 size-2 shrink-0"
                style={{
                  background: result.correct
                    ? feedbackVar("success")
                    : feedbackVar("danger"),
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-2xs font-bold leading-snug">
                  Q{index + 1} · {result.prompt}
                </span>
                <span
                  className="mt-1 block text-2xs leading-snug"
                  style={{
                    color: result.correct
                      ? feedbackVar("success")
                      : feedbackVar("danger"),
                  }}
                >
                  {result.correct
                    ? `YOUR ANSWER · ${result.pickedLabel}`
                    : `YOUR ANSWER · ${result.pickedLabel}  /  CORRECT · ${result.correctLabel}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

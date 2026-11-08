"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import {
  CheckIcon,
  CloseIcon,
  feedbackVar,
  RadioBlankIcon,
  RadioCheckedIcon,
  VerifiedUserIcon,
  withAlpha,
} from "@statoz/design-system/games";

import styles from "./quiz.module.css";
import { SignalLockFx, verdictStreakAccent } from "./signal-lock";

/**
 * One answer.
 *
 * Under the glow rule exactly one tile is live at a time: before the lock it is
 * whichever the player picked, and after it the verdict tile — or, on a miss,
 * the answer key, which powers on only once the tear has played out.
 */

export type QuizOptionProps = {
  /** A, B, C, D. */
  letter: string;
  label: string;
  selected: boolean;
  accent: string;
  /** Null while the question is open; true or false once it is locked. */
  verdict: boolean | null;
  /** The right answer on a question the player got wrong. */
  isAnswerKey: boolean;
  /** Held back while the scan runs, so nothing but the pick stands out. */
  dimmed: boolean;
  streak: number;
  disabled: boolean;
  onSelect: () => void;
};

export function QuizOption({
  letter,
  label,
  selected,
  accent,
  verdict,
  isAnswerKey,
  dimmed,
  streak,
  disabled,
  onSelect,
}: QuizOptionProps) {
  const locked = verdict !== null || isAnswerKey;

  const ink =
    verdict === true
      ? verdictStreakAccent(streak)
      : verdict === false
        ? feedbackVar("danger")
        : isAnswerKey
          ? feedbackVar("success")
          : accent;

  const border = locked || selected ? ink : "var(--ds-color-border-default)";

  const background =
    verdict !== null
      ? withAlpha(ink, 0.16)
      : isAnswerKey
        ? withAlpha(ink, 0.1)
        : selected
          ? withAlpha(ink, 0.15)
          : "var(--ds-color-background-primary)";

  const glow =
    verdict === true
      ? `0 0 18px 0 ${withAlpha(ink, 0.28)}`
      : selected && verdict === null && !isAnswerKey
        ? `0 0 12px 0 ${withAlpha(ink, 0.18)}`
        : undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        styles.optionPress,
        "relative flex min-h-14.5 w-full items-center px-3.25 py-3 text-left transition-[opacity,background,border-color] duration-150",
        disabled ? "cursor-default" : "cursor-pointer",
        // A wrong pick's border flickers like broken neon through the impact.
        verdict === false ? styles.flicker : "",
        isAnswerKey ? styles.bootIn : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background,
        border: `${locked || selected ? 1.6 : 1}px solid ${border}`,
        boxShadow: glow,
        opacity: dimmed ? 0.55 : 1,
      }}
      aria-label={
        verdict === null
          ? `Answer ${letter}: ${label}`
          : `Answer ${letter}: ${label}, ${verdict ? "correct" : "wrong"}`
      }
    >
      <span
        aria-hidden
        className="grid size-7.5 shrink-0 place-items-center border transition-colors duration-150"
        style={{
          background: locked || selected ? withAlpha(ink, 0.22) : withAlpha("var(--ds-color-text-default)", 0.04),
          borderColor: border,
        }}
      >
        {verdict === null ? (
          <span
            className="font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p12,
              color: selected || isAnswerKey ? ink : "var(--ds-color-text-muted)",
            }}
          >
            {letter}
          </span>
        ) : verdict ? (
          <CheckIcon size={17} style={{ color: ink }} />
        ) : (
          <CloseIcon size={17} style={{ color: ink }} />
        )}
      </span>

      <span
        className="ml-3.25 flex-1 text-sm leading-snug"
        style={{
          color: locked || selected ? undefined : "var(--ds-color-text-subtle)",
          fontWeight: locked || selected ? 700 : 600,
        }}
      >
        {label}
      </span>

      {isAnswerKey ? (
        <span
          className="ml-2 shrink-0 font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p8,
            letterSpacing: "var(--ds-tracking-ultra)",
            color: ink,
          }}
        >
          {"// CORRECT"}
        </span>
      ) : (
        <span aria-hidden className="ml-2 shrink-0">
          {verdict === true ? (
            <VerifiedUserIcon size={20} style={{ color: ink }} />
          ) : verdict === false ? (
            <CloseIcon size={20} style={{ color: ink }} />
          ) : selected ? (
            <RadioCheckedIcon size={20} style={{ color: ink }} />
          ) : (
            <RadioBlankIcon size={20} style={{ color: "var(--ds-color-border-default)" }} />
          )}
        </span>
      )}

      {/* The lock cinematic rides over the tile the player got right. */}
      {verdict === true ? (
        <SignalLockFx accent={ink} chevrons={streak >= 3 ? 5 : 3} />
      ) : null}
    </button>
  );
}

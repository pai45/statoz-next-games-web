"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useState } from "react";

import {
  AccentPanel,
  accentVar,
  feedbackVar,
  Glyph,
  PremiumIcon,
  ScheduleIcon,
  StarIcon,
  LightbulbIcon,
  withAlpha,
} from "@statoz/design-system/games";
import type { Sport } from "@/domain/sports";

import { questionsPerSet, setCount } from "../constants";
import { bandNames, firstSetOfBand, modeAccent, modeGlyph, modeLabels } from "@/mocks/games/quiz";
import {
  completedCount,
  maxStars,
  nextChallenge,
  setProgressOf,
  starCount,
  starsFor,
  visualStateFor,
} from "../state/ladder";
import type { QuizMode, QuizModeProgress, QuizSetProgress } from "../types";

import { QuizSetTile } from "./quiz-set-tile";
import styles from "./quiz.module.css";

/**
 * The fifty-set ladder of one mode.
 *
 * Sets are gated one behind the next, and the five chapters are the difficulty
 * bands the questions are actually authored in — so the selector is not a
 * paginator, it is the ladder's shape.
 *
 * On a phone one chapter shows at a time, as in the app. Once there is room all
 * fifty sets are on screen together with the chapters as headings, because the
 * thing a wide screen can do here is let you see the whole climb at once.
 */

const gold = accentVar("gold");

export type QuizLadderProps = {
  sport: Sport;
  mode: QuizMode;
  progress: QuizModeProgress;
  /** How many of the fifty sets the question file actually reaches. */
  authoredSets: number;
  launchingSet: number | null;
  onOpenSet: (setNumber: number) => void;
};

export function QuizLadder({
  sport,
  mode,
  progress,
  authoredSets,
  launchingSet,
  onOpenSet,
}: QuizLadderProps) {
  const accent = modeAccent(mode);
  const next = nextChallenge(progress, authoredSets);
  const [chapter, setChapter] = useState<number | null>(null);
  const selected = chapter ?? Math.floor((next - 1) / 10);

  const cleared = completedCount(progress);
  const stars = starCount(progress);

  return (
    <div className="mx-auto w-full max-w-107.5 px-4 pb-7 pt-4 lg:max-w-240 lg:px-6">
      <NextChallenge
        sport={sport}
        mode={mode}
        setNumber={next}
        progress={setProgressOf(progress, next)}
        ladderComplete={authoredSets > 0 && cleared >= authoredSets}
        awaitingContent={authoredSets === 0}
      />

      <div className="mt-5 flex items-center gap-2">
        <h2
          className="flex-1 font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          SET CHAPTERS
        </h2>
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p9,
            letterSpacing: "var(--ds-tracking-ultra)",
            color: accent,
          }}
        >
          {cleared}/{setCount} CLEARED
        </span>
        <StarIcon size={12} style={{ color: gold }} />
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p9,
            letterSpacing: "var(--ds-tracking-label)",
            color: gold,
          }}
        >
          {stars}/{maxStars}
        </span>
      </div>

      {/* Phone: one chapter at a time, chosen from a row of five tabs. */}
      <div className="lg:hidden">
        <div className="mt-2.5 grid grid-cols-5 gap-1.5">
          {bandNames.map((name, index) => (
            <ChapterTab
              key={name}
              name={name}
              index={index}
              selected={index === selected}
              authored={index * 10 < authoredSets}
              accent={accent}
              onSelect={() => setChapter(index)}
            />
          ))}
        </div>

        <div className="mt-3.5 grid grid-cols-5 gap-2 max-[382px]:grid-cols-4">
          {Array.from({ length: 10 }, (_, offset) => {
            const setNumber = firstSetOfBand(selected) + offset;
            return (
              <QuizSetTile
                key={setNumber}
                mode={mode}
                setNumber={setNumber}
                progress={setProgressOf(progress, setNumber)}
                state={visualStateFor(progress, setNumber, authoredSets)}
                launching={launchingSet === setNumber}
                onOpen={() => onOpenSet(setNumber)}
              />
            );
          })}
        </div>
      </div>

      {/* Wide: the whole climb, chapter by chapter. */}
      <div className="hidden lg:block">
        {bandNames.map((name, index) => (
          <section key={name} className="mt-5 first:mt-3">
            <div className="flex items-baseline gap-2">
              <h3
                className="font-display font-black leading-none"
                style={{
                  fontSize: typography.sizeRem.p9,
                  letterSpacing: "var(--ds-tracking-ultra)",
                  color:
                    index * 10 < authoredSets
                      ? accent
                      : "var(--ds-color-text-muted)",
                }}
              >
                {name}
              </h3>
              <span
                className="ds-tabular font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-label)" }}
              >
                {String(firstSetOfBand(index)).padStart(2, "0")}–
                {firstSetOfBand(index) + 9}
              </span>
              <span
                aria-hidden
                className="ml-1 h-px flex-1"
                style={{ background: "var(--ds-color-border-subtle)" }}
              />
            </div>

            <div className="mt-2 grid grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, offset) => {
                const setNumber = firstSetOfBand(index) + offset;
                return (
                  <QuizSetTile
                    key={setNumber}
                    mode={mode}
                    setNumber={setNumber}
                    progress={setProgressOf(progress, setNumber)}
                    state={visualStateFor(progress, setNumber, authoredSets)}
                    launching={launchingSet === setNumber}
                    onOpen={() => onOpenSet(setNumber)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <LadderRule accent={accent} />
    </div>
  );
}

/* ---- Next challenge ------------------------------------------------------ */

function NextChallenge({
  sport,
  mode,
  setNumber,
  progress,
  ladderComplete,
  awaitingContent,
}: {
  sport: Sport;
  mode: QuizMode;
  setNumber: number;
  progress: QuizSetProgress;
  ladderComplete: boolean;
  awaitingContent: boolean;
}) {
  const accent = awaitingContent
    ? "var(--ds-color-text-muted)"
    : ladderComplete
      ? feedbackVar("success")
      : modeAccent(mode);

  const stars = starsFor(progress.bestCorrect);
  const replay = progress.attempts > 0 && stars < 3;

  const heading = awaitingContent
    ? "IN DEVELOPMENT"
    : ladderComplete
      ? "LADDER COMPLETE"
      : "NEXT CHALLENGE";

  const chip = awaitingContent
    ? "SOON"
    : ladderComplete
      ? "CLEARED"
      : `SET ${setNumber}`;

  const title = awaitingContent
    ? `${modeLabels[mode]} LADDER LOADING`
    : ladderComplete
      ? `${modeLabels[mode]} KNOWLEDGE MASTERED`
      : `${modeLabels[mode]} · SET ${setNumber}`;

  const body = awaitingContent
    ? "This ladder is still being written. Try another mode or sport."
    : ladderComplete
      ? "Replay any set to chase a flawless 3-star run."
      : replay
        ? `Best ${progress.bestCorrect}/${questionsPerSet} · ${stars}/3 stars · replay for a perfect run.`
        : `${questionsPerSet} questions · instant verdict after every answer.`;

  return (
    <AccentPanel accent={accent} className={styles.riseIn}>
      <div className="p-4">
        <div className="flex items-center gap-2.25">
          {awaitingContent ? (
            <ScheduleIcon size={22} style={{ color: accent }} />
          ) : ladderComplete ? (
            <PremiumIcon size={22} style={{ color: accent }} />
          ) : (
            <Glyph name={modeGlyph(mode, sport)} size={22} style={{ color: accent }} />
          )}
          <h2
            className="flex-1 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p10,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: accent,
            }}
          >
            {heading}
          </h2>
          <span
            className="shrink-0 border px-2 py-1 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p9,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: accent,
              background: withAlpha(accent, 0.12),
              borderColor: withAlpha(accent, 0.55),
            }}
          >
            {chip}
          </span>
        </div>

        <p
          className="mt-3.75 font-display font-black leading-tight"
          style={{ fontSize: typography.sizeRem.p20, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          {title}
        </p>
        <p className="mt-1.75 text-xs leading-snug text-muted">{body}</p>
      </div>
    </AccentPanel>
  );
}

/* ---- Chapters and the rule ------------------------------------------------ */

function ChapterTab({
  name,
  index,
  selected,
  authored,
  accent,
  onSelect,
}: {
  name: string;
  index: number;
  selected: boolean;
  /** A band nobody can reach yet stays legible but reads as inert. */
  authored: boolean;
  accent: string;
  onSelect: () => void;
}) {
  const first = firstSetOfBand(index);
  const ink = selected
    ? accent
    : authored
      ? "var(--ds-color-text-muted)"
      : withAlpha("var(--ds-color-text-muted)", 0.55);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex h-11.5 cursor-pointer flex-col items-center justify-center gap-0.5 border px-0.5 transition-colors duration-200"
      style={{
        background: selected
          ? withAlpha(accent, 0.16)
          : "var(--ds-color-background-secondary)",
        borderColor: selected ? accent : "var(--ds-color-border-default)",
      }}
      aria-label={`${name}, sets ${first} through ${first + 9}`}
    >
      <span
        className="w-full truncate font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p7_5,
          letterSpacing: "var(--ds-tracking-tight)",
          color: ink,
        }}
      >
        {name}
      </span>
      <span
        className="ds-tabular font-display font-black leading-none"
        style={{
          fontSize: typography.sizeRem.p8_5,
          letterSpacing: "var(--ds-tracking-label)",
          color: selected ? accent : withAlpha(ink, authored ? 0.75 : 0.45),
        }}
      >
        {String(first).padStart(2, "0")}–{first + 9}
      </span>
    </button>
  );
}

function LadderRule({ accent }: { accent: string }) {
  return (
    <div
      className="mt-3.5 flex items-start gap-2.5 border p-3"
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.88),
        borderColor: "var(--ds-color-border-default)",
      }}
    >
      <LightbulbIcon size={18} style={{ color: accent }} />
      <p className="text-2xs leading-snug text-muted">
        Finish all {questionsPerSet} questions to unlock the next set — any score
        clears it. Score {questionsPerSet}/{questionsPerSet} for 3 stars.
      </p>
    </div>
  );
}

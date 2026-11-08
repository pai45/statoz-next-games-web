"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { DailyDrop } from "@/features/packs";

import type { CSSProperties } from "react";

import {
  AccentPanel,
  accentVar,
  feedbackVar,
  Glyph,
  hudChamferPath,
  Progress,
  StarIcon,
  TurnRightIcon,
  withAlpha,
} from "@statoz/design-system/games";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";

import { questionsPerSet, setCount } from "../constants";
import {
  modeAccent,
  modeBlurb,
  modeGlyph,
  modeLabels,
  modeRewards,
  quizModes,
} from "@/mocks/games/quiz";
import {
  clearedAcross,
  completedCount,
  isSetUnlocked,
  modeProgressOf,
  setProgressOf,
  starCount,
} from "../state/ladder";
import type { QuizMode, QuizProgress } from "../types";

import styles from "./quiz.module.css";

/**
 * KNOWLEDGE ARENA — where a sport's four ladders are chosen from.
 *
 * The hero is a readout, not a control: how far through the two hundred sets
 * this browser has got. Under it, one tile per mode, dealt in as the screen
 * opens. Nothing is locked — every category is open from the start, and the
 * gate that bites is the numbered sets inside each one.
 *
 * The app centres a 430px column, which is all a phone has. Here the tiles use
 * the room once there is any, because a browse grid is exactly what a wide
 * screen is for; the play screen keeps its measure.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");

export type QuizLobbyProps = {
  sport: Sport;
  progress: QuizProgress;
  onPickMode: (mode: QuizMode) => void;
};

export function QuizLobby({ sport, progress, onPickMode }: QuizLobbyProps) {
  return (
    <div className="mx-auto w-full max-w-107.5 px-4 pb-7 pt-4 lg:max-w-240 lg:px-6">
      <div className={styles.riseIn}>
        <ArenaHero sport={sport} progress={progress} />
      </div>

      <h2
        className="mt-5 font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        CHOOSE A CATEGORY
      </h2>

      <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quizModes.map((mode, index) => (
          <div
            key={mode}
            className={styles.dealIn}
            style={{ "--enter-delay": `${120 + index * 75}ms` } as CSSProperties}
          >
            <ModeTile
              sport={sport}
              mode={mode}
              progress={progress}
              onPick={() => onPickMode(mode)}
            />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <GameLeaderboardCta gameId={`${sport}-quiz` as import("../../types").GameId} />
      </div>
        <DailyDrop sport={sport} />
    </div>
  );
}

/* ---- Hero ---------------------------------------------------------------- */

function ArenaHero({
  sport,
  progress,
}: {
  sport: Sport;
  progress: QuizProgress;
}) {
  const cleared = clearedAcross(progress, quizModes);
  const total = quizModes.length * setCount;
  const fraction = total === 0 ? 0 : cleared / total;
  const percent = Math.round(fraction * 100);
  const label = sportModuleFor(sport).label.toUpperCase();

  return (
    <AccentPanel accent={cyan}>
      <div className="flex items-center gap-1.75 px-4 pt-3.25">
        <span aria-hidden className="size-1.25" style={{ background: cyan }} />
        <span
          className="min-w-0 flex-1 truncate font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p7_5,
            letterSpacing: "var(--ds-tracking-ultra)",
            color: cyan,
          }}
        >
          QUIZ GRID // {label}
        </span>
        <span
          aria-hidden
          className="mx-2 h-px w-4.5 shrink-0"
          style={{ background: withAlpha(cyan, 0.16) }}
        />
        <span
          className="ds-tabular shrink-0 font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p7_5, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          0{quizModes.length} TRACKS
        </span>
      </div>

      <div className="flex items-center px-4 pt-3.5">
        <SportPlate sport={sport} />

        <div className="ml-3 min-w-0 flex-1">
          <p
            className="truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p15_5, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            KNOWLEDGE
          </p>
          <p
            className="mt-0.75 truncate font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p22,
              letterSpacing: "var(--ds-tracking-mega)",
              color: cyan,
            }}
          >
            ARENA
          </p>
          <p
            className="mt-1.75 truncate font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p7, letterSpacing: "var(--ds-tracking-wide)" }}
          >
            CLEAR SETS // CLIMB THE LADDER
          </p>
        </div>

        <span
          aria-hidden
          className="mx-2.5 h-13.5 w-px shrink-0"
          style={{ background: "var(--ds-color-border-default)" }}
        />

        <div className="flex w-13 shrink-0 flex-col items-end">
          <span
            className="ds-tabular font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p27, color: cyan }}
          >
            {cleared}
          </span>
          <span
            className="ds-tabular mt-0.5 font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p9, letterSpacing: "var(--ds-tracking-label)" }}
          >
            / {total}
          </span>
          <span
            className="mt-1.25 text-right font-display font-black leading-tight text-muted"
            style={{ fontSize: typography.sizeRem.p6, letterSpacing: "var(--ds-tracking-wide)" }}
          >
            SETS CLEARED
          </span>
        </div>
      </div>

      <div className="px-4 pb-3.5 pt-4">
        <div className="flex items-baseline">
          <span
            className="font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p7_5, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            TOTAL MASTERY
          </span>
          <span
            className="ds-tabular ml-auto font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p8_5,
              letterSpacing: "var(--ds-tracking-label)",
              color: cyan,
            }}
          >
            {percent}%
          </span>
        </div>
        <div className="relative mt-1.75">
          <Progress
            value={fraction}
            accent={cyan}
            label={`${cleared} of ${total} sets cleared`}
            height={8}
          />
          {/* Quarter marks, so the bar reads as a run of four ladders. */}
          {[0.25, 0.5, 0.75].map((mark) => (
            <span
              key={mark}
              aria-hidden
              className="absolute inset-y-px w-px"
              style={{
                left: `${mark * 100}%`,
                background: withAlpha("var(--ds-color-background-primary)", 0.82),
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="flex items-center gap-2.25 px-3.25 pb-3 pt-2.5"
        style={{
          background: withAlpha("var(--ds-color-background-secondary)", 0.72),
        }}
      >
        <TurnRightIcon size={17} style={{ color: cyan }} />
        <div className="min-w-0 flex-1">
          <p
            className="font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p7,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: cyan,
            }}
          >
            MISSION BRIEF
          </p>
          <p className="mt-1 text-2xs leading-snug text-muted">
            Clear sets to advance each category ladder.
          </p>
        </div>
        <QuestionCount />
      </div>
    </AccentPanel>
  );
}

/** The sport's own glyph on a chamfered plate, with the panel's greebles. */
function SportPlate({ sport }: { sport: Sport }) {
  return (
    <div className="relative h-18 w-15.5 shrink-0">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: hudChamferPath(12, 4),
          background: withAlpha(cyan, 0.58),
        }}
      />
      <span
        aria-hidden
        className="absolute inset-px"
        style={{
          clipPath: hudChamferPath(12, 4),
          background: withAlpha(cyan, 0.08),
        }}
      />
      <div className="relative grid h-full place-items-center">
        <Glyph name={modeGlyph("easy", sport)} size={30} style={{ color: cyan }} />
      </div>
      <span
        aria-hidden
        className="absolute right-2.25 top-2.25 size-1.25"
        style={{ background: cyan }}
      />
      <span
        className="absolute bottom-2 left-2.25 font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p6_5, letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        TRIVIA
      </span>
    </div>
  );
}

function QuestionCount() {
  return (
    <div className="relative h-9.5 w-14.5 shrink-0">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: hudChamferPath(8, 3),
          background: withAlpha(cyan, 0.42),
        }}
      />
      <span
        aria-hidden
        className="absolute inset-px"
        style={{
          clipPath: hudChamferPath(8, 3),
          background: withAlpha("var(--ds-color-background-primary)", 0.6),
        }}
      />
      <div className="relative grid h-full place-items-center">
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p14, color: cyan }}
        >
          {questionsPerSet}
        </span>
        <span
          className="font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p5_8, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          Q / RUN
        </span>
      </div>
    </div>
  );
}

/* ---- Mode tile ----------------------------------------------------------- */

function ModeTile({
  sport,
  mode,
  progress,
  onPick,
}: {
  sport: Sport;
  mode: QuizMode;
  progress: QuizProgress;
  onPick: () => void;
}) {
  const accent = modeAccent(mode);
  const ladder = modeProgressOf(progress, mode);
  const cleared = completedCount(ladder);
  const stars = starCount(ladder);
  const complete = cleared === setCount;

  let nextSet = setCount;
  for (let set = 1; set <= setCount; set += 1) {
    if (isSetUnlocked(ladder, set) && !setProgressOf(ladder, set).completed) {
      nextSet = set;
      break;
    }
  }

  return (
    <button
      type="button"
      onClick={onPick}
      className={`${styles.pressable} block h-full w-full cursor-pointer text-left`}
      aria-label={`${modeLabels[mode]} category, ${cleared} of ${setCount} sets cleared, ${stars} stars, ${complete ? "complete" : `next set ${nextSet}`}`}
    >
      <AccentPanel accent={accent} className="h-full">
        <div className="flex h-full flex-col p-3">
          <div className="flex items-start gap-2">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center border"
              style={{
                background: withAlpha(accent, 0.12),
                borderColor: withAlpha(accent, 0.42),
              }}
            >
              <Glyph name={modeGlyph(mode, sport)} size={22} style={{ color: accent }} />
            </span>
            <span
              className="flex-1 text-right font-display font-black leading-tight"
              style={{
                fontSize: typography.sizeRem.p7,
                letterSpacing: "var(--ds-tracking-label)",
                color: gold,
              }}
            >
              +{modeRewards[mode]} XP / CORRECT
            </span>
          </div>

          <p
            className="mt-3 truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {modeLabels[mode]}
          </p>
          <p
            className="mt-1 truncate font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p7_5, letterSpacing: "var(--ds-tracking-wide)" }}
          >
            {modeBlurb(mode, sport)}
          </p>
          <p
            className="mt-0.75 truncate font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p7_5,
              letterSpacing: "var(--ds-tracking-wide)",
              color: complete ? feedbackVar("success") : withAlpha(accent, 0.9),
            }}
          >
            {complete ? "LADDER COMPLETE" : `NEXT SET ${nextSet}`}
          </p>

          <div className="mt-auto pt-3">
            <Progress
              value={cleared / setCount}
              accent={accent}
              label={`${cleared} of ${setCount} sets cleared`}
              height={6}
            />
            <div className="mt-1.5 flex items-center gap-0.75">
              <StarIcon size={11} style={{ color: gold }} />
              <span
                className="ds-tabular font-display font-black leading-none"
                style={{ fontSize: typography.sizeRem.p8_5, color: gold }}
              >
                {stars}
              </span>
              <span
                className="ds-tabular ml-auto font-display font-black leading-none"
                style={{ fontSize: typography.sizeRem.p11, color: accent }}
              >
                {cleared}/{setCount}
              </span>
            </div>
          </div>
        </div>
      </AccentPanel>
    </button>
  );
}

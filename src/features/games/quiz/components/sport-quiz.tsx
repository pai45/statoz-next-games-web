"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useState } from "react";

import {
  accentVar,
  ArrowLeftIcon,
  BrandIcon,
  withAlpha,
} from "@statoz/design-system/games";
import { totalTrackXp } from "@/domain/progression";
import { sportModuleFor } from "@/domain/sports";
import { spendCoins, useEconomy } from "@/features/economy";
import { collectionFromIds } from "@/features/packs";
import { formatInt } from "@/shared/utils";

import type { GameLauncherProps } from "../../components/game-launcher";
import { GameLandingAd } from "../../shared/components/game-landing-ad";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import { sportForGame } from "@/mocks/games";
import { useGameCareer } from "../../state/game-career";
import { entryCost } from "../constants";
import { modeLabels } from "@/mocks/games/quiz";
import {
  authoredSetCount,
  buildQuizSet,
  ensureLoaded,
} from "../state/question-bank";
import { modeProgressOf } from "../state/ladder";
import {
  progressForSport,
  recordSetResult,
  useIsQuizHydrated,
  useQuizRecord,
} from "../state/quiz-progress";
import type { AnswerResult, QuizMode, SetOutcome, TriviaQuestion } from "../types";

import { QuizBriefing } from "./quiz-briefing";
import { QuizLadder } from "./quiz-ladder";
import { QuizLobby } from "./quiz-lobby";
import { QuizPlay } from "./quiz-play";
import { QuizReveal } from "./quiz-reveal";

/**
 * One sport's Knowledge Arena, end to end.
 *
 * The app spreads this across three pushed routes; here it is one screen with
 * four views, because a game owns the whole window and there is nothing to
 * navigate away to. Backing out of a ladder returns to the categories rather
 * than leaving the quiz.
 *
 * The question pool is fetched when a mode is opened, not when the sport is —
 * four files is 400 KB, and nobody plays four ladders at once.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");

type View =
  | { name: "lobby" }
  | { name: "ladder"; mode: QuizMode }
  | { name: "play"; mode: QuizMode; setNumber: number; questions: TriviaQuestion[] }
  | {
      name: "reveal";
      mode: QuizMode;
      setNumber: number;
      results: AnswerResult[];
      totalXp: number;
      xpBefore: number;
      outcome: SetOutcome;
      bestStreak: number;
    };

export function SportQuiz({ game }: GameLauncherProps) {
  const sport = sportForGame(game);
  const hydrated = useIsQuizHydrated();
  const record = useQuizRecord();
  const progress = progressForSport(record, sport);
  const economy = useEconomy();
  const career = useGameCareer();
  const goBack = useGameReturn();

  const [view, setView] = useState<View>({ name: "lobby" });
  const [authored, setAuthored] = useState<Record<string, number>>({});
  const [loadingMode, setLoadingMode] = useState<QuizMode | null>(null);
  const [briefing, setBriefing] = useState<{ mode: QuizMode; setNumber: number } | null>(
    null,
  );

  /**
   * The same fold the profile does, minus the achievements: every track the
   * games have earned, plus what opening packs was worth. The quiz repeats it
   * rather than reading the profile because a game must not depend on the
   * dossier that reports on it.
   */
  const totalXp =
    totalTrackXp(career.xpByTrack) +
    collectionFromIds(economy.owned.playerCardIds, economy.owned.actionCardIds).xp;

  /**
   * Opening a mode fetches its pool first, so the ladder can say how many of
   * the fifty sets actually exist rather than offering ten that do not.
   */
  async function openMode(mode: QuizMode) {
    setLoadingMode(mode);
    await ensureLoaded(sport, mode);
    setAuthored((current) => ({
      ...current,
      [mode]: authoredSetCount(sport, mode),
    }));
    setLoadingMode(null);
    setView({ name: "ladder", mode });
  }

  function startSet(mode: QuizMode, setNumber: number) {
    const questions = buildQuizSet(sport, mode, setNumber);
    if (questions.length === 0) return;
    setBriefing(null);
    setView({ name: "play", mode, setNumber, questions });
  }

  function confirmEntry() {
    if (!briefing) return;
    const paid = spendCoins({
      id: `quiz-${sport}-${briefing.mode}-${briefing.setNumber}`,
      coins: entryCost,
      title: `${sportModuleFor(sport).label.toUpperCase()} QUIZ ENTRY`,
      subtitle: `${modeLabels[briefing.mode]} SET ${briefing.setNumber}`,
    });
    if (!paid.ok) return;
    startSet(briefing.mode, briefing.setNumber);
  }

  if (view.name === "play") {
    return (
      <QuizPlay
        key={`${view.mode}-${view.setNumber}-${view.questions[0]?.id}`}
        sport={sport}
        mode={view.mode}
        setNumber={view.setNumber}
        questions={view.questions}
        onExit={() => setView({ name: "ladder", mode: view.mode })}
        onFinish={({ results, correct, earnedXp, bestStreak }) => {
          // Recorded before the reveal reads it, so the outcome the summary
          // plays is the one that was actually saved.
          const outcome = recordSetResult(sport, view.mode, view.setNumber, correct);
          setView({
            name: "reveal",
            mode: view.mode,
            setNumber: view.setNumber,
            results,
            totalXp: earnedXp,
            xpBefore: totalXp,
            outcome,
            bestStreak,
          });
        }}
      />
    );
  }

  if (view.name === "reveal") {
    return (
      <QuizReveal
        mode={view.mode}
        setNumber={view.setNumber}
        results={view.results}
        totalXp={view.totalXp}
        xpBefore={view.xpBefore}
        outcome={view.outcome}
        bestStreak={view.bestStreak}
        onReplay={() => setBriefing({ mode: view.mode, setNumber: view.setNumber })}
        onDone={() => setView({ name: "ladder", mode: view.mode })}
      />
    );
  }

  const ladderMode = view.name === "ladder" ? view.mode : null;

  return (
    <>
      <div className="relative flex min-h-dvh flex-col">
      <QuizHeader
        title={
          ladderMode
            ? `${modeLabels[ladderMode]} SETS`
            : `${sportModuleFor(sport).label.toUpperCase()} QUIZ`
        }
        subtitle={ladderMode ? "KNOWLEDGE LADDER" : "KNOWLEDGE ARENA"}
        coins={economy.coins}
        showCoins={ladderMode !== null}
        onBack={ladderMode ? () => setView({ name: "lobby" }) : null}
        onLeave={goBack}
      />

      {!hydrated ? (
        <Loading />
      ) : ladderMode ? (
        <QuizLadder
          sport={sport}
          mode={ladderMode}
          progress={modeProgressOf(progress, ladderMode)}
          authoredSets={authored[ladderMode] ?? 0}
          launchingSet={briefing?.setNumber ?? null}
          onOpenSet={(setNumber) =>
            setBriefing({ mode: ladderMode, setNumber })
          }
        />
      ) : (
        <QuizLobby
          sport={sport}
          progress={progress}
          onPickMode={(mode) => {
            if (loadingMode) return;
            void openMode(mode);
          }}
        />
      )}

        {briefing ? (
          <QuizBriefing
            sport={sport}
            mode={briefing.mode}
            setNumber={briefing.setNumber}
            coins={economy.coins}
            onCancel={() => setBriefing(null)}
            onStart={confirmEntry}
          />
        ) : null}
      </div>
      {view.name === "lobby" && hydrated ? <GameLandingAd /> : null}
    </>
  );
}

/** The bar above every browse view: a way out, the title, and the wallet. */
function QuizHeader({
  title,
  subtitle,
  coins,
  showCoins,
  onBack,
  onLeave,
}: {
  title: string;
  subtitle: string;
  coins: number;
  showCoins: boolean;
  /** Null on the lobby, whose back button leaves the quiz altogether. */
  onBack: (() => void) | null;
  onLeave: () => void;
}) {
  return (
    <header
      className="flex shrink-0 items-center gap-2 px-3 py-3"
      style={{ borderBottom: `1px solid ${withAlpha(cyan, 0.16)}` }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to categories"
          className="grid size-10 shrink-0 cursor-pointer place-items-center"
          style={{ color: cyan }}
        >
          <ArrowLeftIcon size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onLeave}
          aria-label="Leave the quiz"
          className="grid size-10 shrink-0 place-items-center"
          style={{ color: cyan }}
        >
          <ArrowLeftIcon size={18} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <h1
          className="truncate font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          {title}
        </h1>
        <p
          className="mt-1 truncate font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p8, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          {subtitle}
        </p>
      </div>

      {showCoins ? (
        <span
          className="flex shrink-0 items-center gap-1.5 border px-2.25 py-1.75"
          style={{
            background: withAlpha(gold, 0.08),
            borderColor: withAlpha(gold, 0.38),
          }}
          aria-label={`${coins} coins available`}
        >
          <BrandIcon name="ozCoins" size={16} alt="" />
          <span
            className="ds-tabular font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p11, color: gold }}
          >
            {formatInt(coins)}
          </span>
        </span>
      ) : null}
    </header>
  );
}

/** The beat before the browser's own record has been read. */
function Loading() {
  return (
    <div className="grid flex-1 place-items-center">
      <p
        className="font-display font-black leading-none text-muted"
        style={{ fontSize: typography.sizeRem.p10, letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        LOADING...
      </p>
    </div>
  );
}

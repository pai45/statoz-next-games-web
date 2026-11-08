"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SportMatch } from "@/domain/matches";
import {
  isContestQuiz,
  isQuizSettleable,
  settledAnswerFor,
  totalVotes,
  votesFor,
  type PredictionQuiz,
} from "@/domain/predictions";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { useEconomy } from "@/features/economy";
import { matchBoardRivals, matchDemoAnchor, votesForQuestion } from "@/mocks/matches";
import { holdFullScreenMoment, useDemoNow } from "@/shared/hooks";

import {
  chargeContestEntry,
  settlePrediction,
  usePredictions,
  predictionFor,
  type SettlementOutcome,
} from "../state/prediction-store";
import { useQuizSession } from "../state/use-quiz-session";
import {
  AllQuizzesButton,
  BottomDock,
  LockLine,
  QuestionStage,
  QuizNumberBurst,
  XpPotTicker,
  type PrimaryAction,
} from "./quiz-flow";
import { PredictionLockedOverlay, SettlementRevealOverlay } from "./prediction-overlays";
import { QuizHubCard } from "./quiz-hub-card";
import {useEditorialSingleColumn} from "@/features/matches/editorial-layout";
import editorial from "@/features/matches/components/editorial-discovery.module.css";
import {
  CommunityTelemetry,
  PredictionLockDock,
  ReviewNotice,
  ReviewQuestionCard,
  SettleDock,
} from "./quiz-review";
import styles from "./predictions.module.css";

/**
 * The PREDICT tab.
 *
 * The tab owns the quiz-set hub. Opening a quiz pushes the dedicated fullscreen
 * route, matching the app while keeping each quiz directly addressable on web.
 */

export function MatchPredictTab({
  match,
  quizzes,
}: {
  match: SportMatch;
  quizzes: PredictionQuiz[];
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  if (quizzes.length === 0) {
    return (
      <EmptyState
        title="Quiz not live yet"
        message="Prediction questions will appear here when this match opens."
      />
    );
  }

  return (
    <QuizHub
      match={match}
      quizzes={quizzes}
      notice={notice}
      onNotice={setNotice}
      onOpen={(quizId) => {
        setNotice(null);
        router.push(`/matches/${match.id}/predict/${quizId}`);
      }}
    />
  );
}

/* ---- The hub --------------------------------------------------------------- */

function QuizHub({
  match,
  quizzes,
  notice,
  onNotice,
  onOpen,
}: {
  match: SportMatch;
  quizzes: PredictionQuiz[];
  notice: string | null;
  onNotice: (message: string | null) => void;
  onOpen: (quizId: string) => void;
}) {
  const singleColumn=useEditorialSingleColumn();
  const predictions = usePredictions();
  const economy = useEconomy();
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const now = useDemoNow(matchDemoAnchor);
  const untilLockMs = Math.max(0, Date.parse(match.kickoff) - (now ?? Date.parse(matchDemoAnchor)));

  const open = (quiz: PredictionQuiz) => {
    if (session.status === "guest") {
      requireAuth({
        intent: "predict",
        message: "Log in to answer match missions and save your prediction history.",
      });
      return;
    }
    const entry = predictionFor(predictions, match.id, quiz.id);
    const communityResults = entry == null && match.status === "finished";
    if (entry == null && match.status !== "scheduled" && !communityResults) {
      onNotice("Kickoff has passed. New predictions are closed.");
      return;
    }
    onOpen(quiz.id);
  };

  return (
    <div className={styles.flowScroll}>
      <LockLine match={match} untilLockMs={untilLockMs} hydrated={now != null} />
      {notice ? <ReviewNotice text={notice} /> : null}
      <div data-single={singleColumn||undefined} className={`${styles.hubList} ${match.status === "finished" && match.sport !== "tennis" && quizzes.every(q => {const p=predictionFor(predictions,match.id,q.id);return p!=null && p.status!=="settled";}) ? editorial.pairedReveals : ""} px-5 pt-4 pb-16`}>
        {quizzes.map((quiz, index) => (
          <QuizHubCard
            key={quiz.id}
            match={match}
            quiz={quiz}
            index={index + 1}
            prediction={predictionFor(predictions, match.id, quiz.id)}
            coins={isContestQuiz(quiz) ? economy.coins : undefined}
            now={now ?? undefined}
            onOpen={() => open(quiz)}
            onBlocked={onNotice}
          />
        ))}
      </div>
    </div>
  );
}

/* ---- One quiz -------------------------------------------------------------- */

export function PredictionQuizScreen({
  match,
  quiz,
  showAllQuizzes,
  onBackToHub,
  onOpenPicks,
}: {
  match: SportMatch;
  quiz: PredictionQuiz;
  showAllQuizzes: boolean;
  onBackToHub: () => void;
  onOpenPicks?: () => void;
}) {
  const predictions = usePredictions();
  const prediction = predictionFor(predictions, match.id, quiz.id);
  const session = useQuizSession(match, quiz, prediction);

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    prediction && prediction.status !== "open"
      ? new Set(quiz.questions.map((question) => question.id))
      : new Set(),
  );
  const [lockOverlay, setLockOverlay] = useState<{ automatic: boolean } | null>(null);
  const [settlement, setSettlement] = useState<SettlementOutcome | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);

  /*
   * Submitting a card ticks the daily streak, which has a celebration of its
   * own. A submitted card is mid-decision until it is locked, so the draft
   * summary and the seal keep the screen and the streak follows them — the app
   * holds its celebrations across this same transition.
   */
  const submitted = session.justSubmitted;
  useEffect(() => (submitted ? holdFullScreenMoment() : undefined), [submitted]);

  const votes = useMemo(
    () =>
      Object.fromEntries(
        quiz.questions.map((question) => [question.id, votesForQuestion(match.id, quiz.id, question)]),
      ),
    [match.id, quiz],
  );

  const canSettle =
    match.status === "finished" && isQuizSettleable(quiz) && prediction?.status === "locked";

  const reveal = useCallback(() => {
    const outcome = settlePrediction(match, quiz);
    if (outcome) setSettlement(outcome);
  }, [match, quiz]);

  const toggle = (questionId: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(questionId)) next.add(questionId);
      return next;
    });

  const chrome = (
    <>
      {showAllQuizzes ? <AllQuizzesButton onClick={onBackToHub} /> : null}
      <LockLine
        match={match}
        untilLockMs={session.untilLockMs}
        hydrated={session.hydrated}
        trailing={
          session.editable ? <XpPotTicker value={session.bankedXp} max={session.potentialXp} /> : undefined
        }
      />
    </>
  );

  const overlays = (
    <>
      {lockOverlay ? (
        <PredictionLockedOverlay
          potentialXp={session.potentialXp}
          count={quiz.questions.length}
          automatic={lockOverlay.automatic}
          onDone={() => {
            setLockOverlay(null);
            if (canSettle) reveal();
          }}
        />
      ) : null}
      {settlement ? (
        <SettlementRevealOverlay
          match={match}
          outcome={settlement}
          isContest={isContestQuiz(quiz)}
          onDone={() => setSettlement(null)}
        />
      ) : null}
    </>
  );

  // A card that exists — draft, locked or settled — always reads as a review.
  if (prediction) {
    const editable = prediction.status === "open" && session.editable;
    return (
      <div className={`${styles.flow} relative`}>
        <div className={styles.flowScroll}>
          {chrome}
          <ReviewNotice text={reviewNotice(match, prediction.status, editable, canSettle, session.justSubmitted)} />
          {onOpenPicks && editable ? (
            <button type="button" className={styles.allQuizzes} onClick={onOpenPicks}>
              OPEN SAME-MATCH PICKS
            </button>
          ) : null}
          <div className={`${styles.reviewList} pt-5`}>
            {quiz.questions.map((question, index) => (
              <ReviewQuestionCard
                key={question.id}
                index={index + 1}
                question={question}
                match={match}
                session={session}
                votes={votes[question.id]}
                expanded={expanded.has(question.id)}
                editable={editable}
                finished={match.status === "finished"}
                onToggle={() => toggle(question.id)}
              />
            ))}
          </div>
        </div>
        {editable ? (
          <PredictionLockDock
            saveStatus={session.saveStatus}
            locking={session.locking}
            onLock={() => {
              if (session.lock()) setLockOverlay({ automatic: false });
            }}
            onRetry={session.retrySave}
          />
        ) : canSettle ? (
          <SettleDock onSettle={reveal} />
        ) : null}
        {overlays}
      </div>
    );
  }

  // No entry, and the fixture is over: the crowd's final read, no answer path.
  if (match.status === "finished") {
    const crowd = crowdAccuracy(quiz, votes);
    return (
      <div className={styles.flowScroll}>
        {chrome}
        <ReviewNotice text="You did not enter this quiz. Study the final answers and the crowd signal." />
        <CommunityTelemetry
          crowdCorrectVotes={crowd.correct}
          crowdTotalVotes={crowd.total}
          fieldSize={matchBoardRivals(match.id, quiz.id).length}
        />
        <div className={`${styles.reviewList} ${styles.communityReviewList}`}>
          {quiz.questions.map((question, index) => (
            <ReviewQuestionCard
              key={question.id}
              index={index + 1}
              question={question}
              match={match}
              session={session}
              votes={votes[question.id]}
              expanded
              expandable={false}
              communityOnly
              editable={false}
              finished
              onToggle={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }

  // No entry and the deadline has passed: closed, with nothing to answer.
  if (!session.beforeDeadline) {
    return (
      <EmptyState
        title="PREDICTIONS CLOSED"
        message="Kickoff has passed. New quiz entries are no longer available."
      />
    );
  }

  const question = quiz.questions[session.index];
  const primary = primaryAction(session, () => {
    const entry = chargeContestEntry(match, quiz);
    if (!entry.ok) {
      setEntryError(`Need ${quiz.entryFee} Oz to enter this contest.`);
      return;
    }
    setEntryError(null);
    session.submit();
  });

  return (
    <div className={`${styles.flow} relative`}>
      {/* The question is asked over its own art, which the number burst covers
          on its way in. */}
      {question?.backgroundAsset && session.revealPhase !== "numberIntro" ? (
        <span
          key={question.backgroundAsset}
          aria-hidden
          className={styles.questionBackdrop}
          style={{ backgroundImage: `url(${question.backgroundAsset})` }}
        />
      ) : null}
      {session.revealPhase === "numberIntro" ? (
        <QuizNumberBurst number={session.index + 1} run={session.index} />
      ) : null}
      <div className={styles.flowScroll}>
        {chrome}
        {entryError ? <ReviewNotice text={entryError} /> : null}
        {question ? (
          <QuestionStage match={match} question={question} index={session.index} session={session} />
        ) : null}
      </div>
      <BottomDock
        questions={quiz.questions}
        answers={session.answers}
        index={session.index}
        canGoPrevious={session.index > 0 && !session.revealing}
        onPrevious={session.previous}
        primary={primary}
        helper={helperText(session, quiz.questions.length)}
      />
      {overlays}
    </div>
  );
}

/* ---- Copy ------------------------------------------------------------------ */

function primaryAction(
  session: ReturnType<typeof useQuizSession>,
  onSubmit: () => void,
): PrimaryAction {
  if (!session.editable) {
    return session.isLast
      ? { label: "DONE", enabled: !session.revealing }
      : { label: "NEXT", enabled: !session.revealing, isNext: true, onSelect: session.next };
  }
  if (session.isLast) {
    return {
      label: "SUBMIT QUIZ",
      enabled: session.allAnswered && !session.revealing,
      onSelect: session.allAnswered && !session.revealing ? onSubmit : undefined,
    };
  }
  const canAdvance = session.currentAnswered && !session.revealing;
  return { label: "NEXT", enabled: canAdvance, isNext: true, onSelect: canAdvance ? session.next : undefined };
}

function helperText(session: ReturnType<typeof useQuizSession>, total: number): string {
  if (session.settled) return `${total} futures settled`;
  if (!session.editable) return "Predictions are locked — match in progress";
  return session.allAnswered
    ? `All ${total} futures locked in - ${session.remainingBoostText}`
    : `Complete all ${total} futures - ${session.remainingBoostText}`;
}

function reviewNotice(
  match: SportMatch,
  status: "open" | "locked" | "settled",
  editable: boolean,
  canSettle: boolean,
  justSubmitted: boolean,
): string {
  if (status === "open" && editable) {
    return justSubmitted
      ? "Draft auto-saved. Fine-tune any pick, then hold to lock."
      : "Changes auto-save. Hold to lock before kickoff.";
  }
  if (canSettle) return "Results are in. Reveal your verdicts to claim XP.";
  if (match.status === "finished" || status === "settled") {
    return "Final answers are in. Review results and crowd votes.";
  }
  if (match.status === "scheduled") return "Prediction locked. Crowd signal unlocked.";
  return "Locked picks are in play. Track the crowd as the match unfolds.";
}

function crowdAccuracy(
  quiz: PredictionQuiz,
  votes: Record<string, ReturnType<typeof votesForQuestion>>,
): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  for (const question of quiz.questions) {
    if (question.forcedVoid) continue;
    const actual = settledAnswerFor(question);
    if (actual == null) continue;
    correct += votesFor(votes[question.id], actual);
    total += totalVotes(votes[question.id]);
  }
  return { correct, total };
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="grid h-full place-items-center px-8 text-center">
      <div>
        <h2 className={styles.overlayHeadline} style={{ fontSize: typography.sizeRem.p16 }}>{title}</h2>
        <p className={styles.overlayBody}>{message}</p>
      </div>
    </div>
  );
}

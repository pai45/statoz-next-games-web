"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDemoNow, usePrefersReducedMotion } from "@/shared/hooks";
import { matchDemoAnchor } from "@/mocks/matches";

import type { SportMatch } from "@/domain/matches";
import {
  ScoreAnswer,
  applyMultiplier,
  isScoreQuestion,
  predictionMultipliers,
  type PredictionMultiplierId,
  type PredictionQuiz,
  type UserPrediction,
} from "@/domain/predictions";

import { lockPrediction, saveDraft } from "./prediction-store";

/**
 * One sitting at a quiz.
 *
 * Holds the answers being edited, where the player is in the flow, and the
 * autosave that keeps the draft in step. The app drives its reveal with three
 * animation controllers; here the phases are timers and the motion is CSS, so
 * this only has to say which phase the flow is in.
 */

export type RevealPhase = "numberIntro" | "questionReveal" | "optionsReveal" | "ready";
export type DraftSaveStatus = "saved" | "saving" | "failed";

/** The app's reveal beats, in milliseconds. */
const numberIntroMs = 900;
const questionRevealMs = 720;
const optionsRevealMs = 620;
const autoSaveDelayMs = 300;

export type QuizSession = ReturnType<typeof useQuizSession>;

export function useQuizSession(
  match: SportMatch,
  quiz: PredictionQuiz,
  prediction: UserPrediction | undefined,
) {
  const questions = quiz.questions;

  const [answers, setAnswers] = useState<Record<string, number>>(() => seedAnswers(quiz, prediction));
  const [multipliers, setMultipliers] = useState<Record<string, PredictionMultiplierId>>(
    () => ({ ...prediction?.multipliersByQuestion }),
  );
  /** A 0-0 default should not fill the pot until the picker is touched. */
  const [touchedScores, setTouchedScores] = useState<Set<string>>(() => {
    const touched = new Set<string>();
    for (const question of questions) {
      if (isScoreQuestion(question) && prediction?.answers[question.id] != null) {
        touched.add(question.id);
      }
    }
    return touched;
  });

  const [index, setIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  // A first sitting opens on the reveal; a revisit renders straight away.
  const [revealPhase, setRevealPhase] = useState<RevealPhase>(() =>
    prediction == null && match.status === "scheduled" ? "numberIntro" : "ready",
  );
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>("saved");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [locking, setLocking] = useState(false);

  /** Null until the client hydrates, which keeps the server render stable. */
  const now = useDemoNow(matchDemoAnchor);

  const kickoff = Date.parse(match.kickoff);
  const beforeDeadline = match.status === "scheduled" && (now == null || kickoff > now);
  const editable =
    beforeDeadline && prediction?.status !== "locked" && prediction?.status !== "settled";
  const settled = prediction?.status === "settled";
  const revealing = revealPhase !== "ready";

  /* ---- Derived numbers ----------------------------------------------------- */

  const boostedReward = useCallback(
    (questionId: string, reward: number) => applyMultiplier(reward, multipliers[questionId]),
    [multipliers],
  );

  const potentialXp = useMemo(
    () => questions.reduce((sum, question) => sum + boostedReward(question.id, question.reward), 0),
    [questions, boostedReward],
  );

  const bankedXp = useMemo(
    () =>
      questions.reduce((sum, question) => {
        const banked = isScoreQuestion(question)
          ? touchedScores.has(question.id)
          : answers[question.id] != null;
        return banked ? sum + boostedReward(question.id, question.reward) : sum;
      }, 0),
    [questions, answers, touchedScores, boostedReward],
  );

  const allAnswered = questions.every(
    (question) => isScoreQuestion(question) || answers[question.id] != null,
  );
  const currentQuestion = questions[Math.min(index, questions.length - 1)];
  const currentAnswered =
    currentQuestion != null &&
    (isScoreQuestion(currentQuestion) || answers[currentQuestion.id] != null);
  const isLast = index >= questions.length - 1;

  /** questionId that owns each boost, so a chip can say it is claimed. */
  const multiplierOwners = useMemo(() => {
    const owners: Partial<Record<PredictionMultiplierId, string>> = {};
    for (const [questionId, id] of Object.entries(multipliers)) owners[id] = questionId;
    return owners;
  }, [multipliers]);

  const remainingBoostText = useMemo(() => {
    const remaining = predictionMultipliers
      .filter((multiplier) => multiplierOwners[multiplier.id] == null)
      .map((multiplier) => multiplier.label);
    return remaining.length === 0 ? "Boosts armed" : `Boosts left: ${remaining.join(", ")}`;
  }, [multiplierOwners]);

  const untilLockMs = now == null ? Math.max(0, kickoff - Date.parse(match.kickoff)) : Math.max(0, kickoff - now);

  /* ---- Autosave ------------------------------------------------------------ */

  const autoSaveTimer = useRef<number | null>(null);

  const writeDraft = useCallback(
    (
      nextAnswers: Record<string, number>,
      nextMultipliers: Record<string, PredictionMultiplierId>,
    ) => {
      const saved = saveDraft({
        match,
        quizId: quiz.id,
        answers: nextAnswers,
        multipliersByQuestion: nextMultipliers,
      });
      setSaveStatus(saved ? "saved" : "failed");
      return saved;
    },
    [match, quiz.id],
  );

  /**
   * Debounced autosave. The values are snapshotted by the caller at the moment
   * of the edit, so a write always persists the answers that caused it rather
   * than whatever state has landed by the time the timer fires.
   */
  const scheduleAutoSave = useCallback(
    (
      nextAnswers: Record<string, number>,
      nextMultipliers: Record<string, PredictionMultiplierId>,
    ) => {
      // Only an existing, still-open draft autosaves; a first entry is created
      // by the explicit submit.
      if (prediction == null || prediction.status !== "open" || !beforeDeadline) return;
      setSaveStatus("saving");
      if (autoSaveTimer.current != null) window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = window.setTimeout(() => {
        autoSaveTimer.current = null;
        writeDraft(nextAnswers, nextMultipliers);
      }, autoSaveDelayMs);
    },
    [prediction, beforeDeadline, writeDraft],
  );

  useEffect(
    () => () => {
      if (autoSaveTimer.current != null) window.clearTimeout(autoSaveTimer.current);
    },
    [],
  );

  /* ---- Editing ------------------------------------------------------------- */

  const select = useCallback(
    (questionId: string, option: number) => {
      if (!editable || revealing) return;
      const nextAnswers = { ...answers, [questionId]: option };
      setAnswers(nextAnswers);
      scheduleAutoSave(nextAnswers, multipliers);
    },
    [editable, revealing, answers, multipliers, scheduleAutoSave],
  );

  const setScore = useCallback(
    (questionId: string, home: number, away: number) => {
      if (!editable || revealing) return;
      const nextAnswers = { ...answers, [questionId]: ScoreAnswer.encode(home, away) };
      setTouchedScores((previous) => new Set(previous).add(questionId));
      setAnswers(nextAnswers);
      scheduleAutoSave(nextAnswers, multipliers);
    },
    [editable, revealing, answers, multipliers, scheduleAutoSave],
  );

  const questionAnswered = useCallback(
    (questionId: string) => {
      const question = questions.find((candidate) => candidate.id === questionId);
      if (!question) return false;
      return isScoreQuestion(question) || answers[questionId] != null;
    },
    [questions, answers],
  );

  /**
   * Arming a boost takes it off whatever question held it — there is one of
   * each, and tapping the armed chip disarms it.
   */
  const toggleMultiplier = useCallback(
    (questionId: string, id: PredictionMultiplierId) => {
      if (!editable || revealing || !questionAnswered(questionId)) return;
      const active = multipliers[questionId] === id;
      const next: Record<string, PredictionMultiplierId> = {};
      for (const [key, value] of Object.entries(multipliers)) {
        if (key === questionId || value === id) continue;
        next[key] = value;
      }
      if (!active) next[questionId] = id;
      setMultipliers(next);
      scheduleAutoSave(answers, next);
    },
    [editable, revealing, questionAnswered, answers, multipliers, scheduleAutoSave],
  );

  /* ---- Moving through the flow --------------------------------------------- */

  /**
   * The reveal beats. Each phase schedules the next one, so the sequence is
   * three timers rather than three animation controllers; the motion itself is
   * CSS on the panel.
   */
  useEffect(() => {
    if (revealPhase === "ready") return;
    if (reducedMotion) {
      const skip = window.setTimeout(() => setRevealPhase("ready"), 0);
      return () => window.clearTimeout(skip);
    }
    const nextPhase: RevealPhase =
      revealPhase === "numberIntro"
        ? "questionReveal"
        : revealPhase === "questionReveal"
          ? "optionsReveal"
          : "ready";
    const delay =
      revealPhase === "numberIntro"
        ? numberIntroMs
        : revealPhase === "questionReveal"
          ? questionRevealMs
          : optionsRevealMs;
    const timer = window.setTimeout(() => setRevealPhase(nextPhase), delay);
    return () => window.clearTimeout(timer);
  }, [revealPhase, reducedMotion]);

  const next = useCallback(() => {
    if (isLast || revealing || (editable && !currentAnswered)) return;
    setIndex((value) => value + 1);
    setRevealPhase(reducedMotion ? "ready" : "numberIntro");
  }, [isLast, revealing, editable, currentAnswered, reducedMotion]);

  const previous = useCallback(() => {
    if (index <= 0) return;
    setIndex((value) => value - 1);
    setRevealPhase("ready");
  }, [index]);

  /* ---- Committing ---------------------------------------------------------- */

  const submit = useCallback((): boolean => {
    if (!allAnswered) return false;
    setSaveStatus("saving");
    const saved = saveDraft({
      match,
      quizId: quiz.id,
      answers,
      multipliersByQuestion: multipliers,
    });
    setSaveStatus(saved ? "saved" : "failed");
    if (saved) setJustSubmitted(true);
    return saved;
  }, [allAnswered, match, quiz.id, answers, multipliers]);

  const lock = useCallback((): boolean => {
    if (locking) return false;
    setLocking(true);
    if (autoSaveTimer.current != null) {
      window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    const locked = lockPrediction({
      match,
      quizId: quiz.id,
      answers,
      multipliersByQuestion: multipliers,
    });
    setLocking(false);
    if (!locked) setSaveStatus("failed");
    else setJustSubmitted(false);
    return locked;
  }, [locking, match, quiz.id, answers, multipliers]);

  const retrySave = useCallback(() => {
    setSaveStatus("saving");
    writeDraft(answers, multipliers);
  }, [writeDraft, answers, multipliers]);

  /**
   * Kickoff passing seals an open draft where it stands, exactly as the app's
   * deadline lock does.
   */
  useEffect(() => {
    if (now == null || kickoff > now) return;
    if (prediction?.status !== "open") return;
    lockPrediction({ match, quizId: quiz.id, answers, multipliersByQuestion: multipliers });
  }, [now, kickoff, prediction, match, quiz.id, answers, multipliers]);

  return {
    answers,
    multipliers,
    multiplierOwners,
    index,
    revealPhase,
    revealing,
    saveStatus,
    justSubmitted,
    locking,
    editable,
    settled,
    beforeDeadline,
    allAnswered,
    currentAnswered,
    isLast,
    potentialXp,
    bankedXp,
    remainingBoostText,
    untilLockMs,
    hydrated: now != null,
    questionAnswered,
    scoreFor: (questionId: string) =>
      answers[questionId] == null ? { home: 0, away: 0 } : ScoreAnswer.decode(answers[questionId]),
    select,
    setScore,
    toggleMultiplier,
    next,
    previous,
    submit,
    lock,
    retrySave,
  };
}

function seedAnswers(
  quiz: PredictionQuiz,
  prediction: UserPrediction | undefined,
): Record<string, number> {
  const answers: Record<string, number> = { ...prediction?.answers };
  // An exact-score question always has a value; 0-0 is where the picker starts.
  for (const question of quiz.questions) {
    if (isScoreQuestion(question) && answers[question.id] == null) {
      answers[question.id] = ScoreAnswer.encode(0, 0);
    }
  }
  return answers;
}

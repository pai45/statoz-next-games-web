import type { SportMatch } from "@/domain/matches";
import {
  isContestQuiz,
  isQuizSettleable,
  quizMaxReward,
  settledAnswerFor,
  type PredictionQuiz,
  type UserPrediction,
} from "@/domain/predictions";

/**
 * The resolved look of one quiz-set hub card.
 *
 * Every state reads as an objective: a status tag, a reward stake, a
 * completion or accuracy meter and a call to action. This is the whole of the
 * card's logic — the component below it only draws what this returns.
 */
export type QuizHubVisual = {
  accent: string;
  tag: string;
  /** 0..1. */
  progress: number;
  progressAccent: string;
  ctaText: string;
  ctaIcon: QuizHubIcon;
  rewardText: string;
  rewardColor: string;
  /** The reward-reveal moment, and the only card that ever glows. */
  glow: boolean;
  showChevron: boolean;
  /** Entry is barred; the tap is intercepted and the card reads muted. */
  blocked: boolean;
  blockedMessage?: string;
  contest?: ContestMeta;
  /** Per-question verdict dots, once a card is settled. */
  outcomes?: Array<"correct" | "wrong" | "void">;
};

export type QuizHubIcon =
  | "bolt"
  | "edit"
  | "lock"
  | "lockClock"
  | "vote"
  | "reveal"
  | "medal"
  | "done"
  | "stats";

export type ContestMeta = {
  fee: number;
  paid: boolean;
  affordable: boolean;
  /** Finish position once settled; zero before that. */
  rank: number;
  prizeOz: number;
  settled: boolean;
};

const cyan = "var(--ds-color-accent-cyan)";
const gold = "var(--ds-color-accent-gold)";
const muted = "var(--ds-color-text-muted)";
const success = "var(--ds-color-success)";
const danger = "var(--ds-color-danger)";
const amber = "var(--ds-color-warning)";

/** Per-question verdicts on a settled card, for the outcome dots. */
export function questionOutcomes(
  quiz: PredictionQuiz,
  prediction: UserPrediction,
): Array<"correct" | "wrong" | "void"> {
  return quiz.questions.map((question) => {
    if (question.forcedVoid) return "void";
    const actual = settledAnswerFor(question);
    if (actual == null) return "void";
    return prediction.answers[question.id] === actual ? "correct" : "wrong";
  });
}

export function resolveQuizHubVisual(
  match: SportMatch,
  quiz: PredictionQuiz,
  prediction: UserPrediction | undefined,
  options: { coins?: number; now?: number } = {},
): QuizHubVisual {
  const total = quiz.questions.length;
  const answered = prediction ? Object.keys(prediction.answers).length : 0;
  const potentialXp = quizMaxReward(quiz);
  const settled = prediction?.status === "settled";
  const locked = prediction?.status === "locked";
  const now = options.now ?? Date.now();

  const contest = isContestQuiz(quiz);
  const affordable = options.coins == null || options.coins >= quiz.entryFee;
  const contestFor = (
    over: Partial<ContestMeta> = {},
  ): ContestMeta | undefined =>
    contest
      ? {
          fee: quiz.entryFee,
          paid: prediction != null,
          affordable,
          rank: 0,
          prizeOz: 0,
          settled: false,
          ...over,
        }
      : undefined;

  // Finished and settled: the verdict card, calm — the moment already happened.
  if (match.status === "finished" && settled && prediction) {
    const correct = prediction.correctCount ?? 0;
    const won = correct > 0;
    const earned = prediction.rewardEarned;
    const wonCoins = prediction.contestPrizeOz > 0;
    return {
      accent: won || wonCoins ? gold : muted,
      tag: wonCoins ? "PRIZE WON" : "SETTLED",
      progress: total === 0 ? 0 : correct / total,
      progressAccent: won ? success : muted,
      ctaIcon: won || wonCoins ? "medal" : "done",
      ctaText: `${correct} / ${total} CORRECT`,
      rewardText: earned > 0 ? `+${earned} XP` : "NO XP",
      rewardColor: earned > 0 ? success : muted,
      glow: false,
      showChevron: false,
      blocked: false,
      contest: contestFor({
        settled: true,
        rank: prediction.contestRank ?? 0,
        prizeOz: prediction.contestPrizeOz,
      }),
      outcomes: questionOutcomes(quiz, prediction),
    };
  }

  // Finished with rewards waiting: the one glowing focal moment on the screen.
  if (match.status === "finished" && prediction) {
    return {
      accent: gold,
      tag: "REWARD READY",
      progress: 1,
      progressAccent: gold,
      ctaIcon: "reveal",
      ctaText: contest ? "TAP TO REVEAL RESULT · PRIZE" : "TAP TO REVEAL RESULTS",
      rewardText: "REVEAL",
      rewardColor: gold,
      glow: true,
      showChevron: true,
      blocked: false,
      contest: contestFor(),
    };
  }

  // Finished with no entry: closed, but the crowd is still worth reading.
  if (match.status === "finished") {
    const settleable = isQuizSettleable(quiz);
    return {
      accent: settleable ? cyan : amber,
      tag: settleable ? "FINAL RESULTS" : "RESULT VERIFYING",
      progress: 0,
      progressAccent: settleable ? cyan : amber,
      ctaIcon: "stats",
      ctaText: settleable ? "VIEW COMMUNITY RESULTS" : "VIEW CROWD SIGNAL",
      rewardText: "VIEW",
      rewardColor: settleable ? cyan : amber,
      glow: false,
      showChevron: true,
      blocked: false,
    };
  }

  // Live: every saved entry is frozen while the match runs.
  if (match.status === "live") {
    return {
      accent: danger,
      tag: "LIVE",
      progress: total === 0 ? 0 : answered / total,
      progressAccent: danger,
      ctaIcon: "lock",
      ctaText: "LOCKED PICKS · MATCH IN PROGRESS",
      rewardText: prediction ? "IN PLAY" : "CLOSED",
      rewardColor: danger,
      glow: false,
      showChevron: false,
      blocked: prediction == null,
      blockedMessage: prediction ? undefined : "Kickoff has passed. New predictions are closed.",
      contest: contestFor(),
    };
  }

  // A just-started fixture can still read as scheduled. The kickoff clock closes
  // fresh entry only; an existing draft stays open so the deadline lock can seal
  // its last saved answers.
  if (Date.parse(match.kickoff) <= now && prediction == null) {
    return {
      accent: muted,
      tag: "CLOSED",
      progress: 0,
      progressAccent: muted,
      ctaIcon: "lockClock",
      ctaText: "KICKOFF PASSED · NO ENTRY",
      rewardText: "MISSED",
      rewardColor: muted,
      glow: false,
      showChevron: false,
      blocked: true,
      blockedMessage: "Kickoff has passed. New predictions are closed.",
      contest: contestFor(),
    };
  }

  // Sealed before kickoff: the crowd signal is already unlocked.
  if (locked) {
    return {
      accent: success,
      tag: "LOCKED IN",
      progress: total === 0 ? 0 : answered / total,
      progressAccent: success,
      ctaIcon: "vote",
      ctaText: "VIEW CROWD VOTES",
      rewardText: `+${potentialXp} XP`,
      rewardColor: gold,
      glow: false,
      showChevron: true,
      blocked: false,
      contest: contestFor(),
    };
  }

  // Scheduled with a draft: editable, auto-saved.
  if (prediction) {
    const complete = answered >= total;
    return {
      accent: cyan,
      tag: complete ? "DRAFT ACTIVE" : "IN PROGRESS",
      progress: total === 0 ? 0 : answered / total,
      progressAccent: cyan,
      ctaIcon: "edit",
      ctaText: complete ? "REVIEW & LOCK" : `RESUME · ${answered}/${total} ANSWERED`,
      rewardText: `+${potentialXp} XP`,
      rewardColor: gold,
      glow: false,
      showChevron: true,
      blocked: false,
      contest: contestFor(),
    };
  }

  // Scheduled, contest entry unaffordable: barred until they top up.
  if (contest && !affordable) {
    return {
      accent: muted,
      tag: "ENTRY LOCKED",
      progress: 0,
      progressAccent: muted,
      ctaIcon: "lock",
      ctaText: `NEED ${quiz.entryFee} OZ TO ENTER`,
      rewardText: `+${potentialXp} XP`,
      rewardColor: muted,
      glow: false,
      showChevron: false,
      blocked: true,
      blockedMessage: `Need ${quiz.entryFee} Oz to enter this contest.`,
      contest: contestFor(),
    };
  }

  // Scheduled and fresh: the actionable entry point.
  return {
    accent: cyan,
    tag: "OBJECTIVE",
    progress: 0,
    progressAccent: cyan,
    ctaIcon: "bolt",
    ctaText: `TAP TO PREDICT · ${total} QUESTIONS`,
    rewardText: `+${potentialXp} XP`,
    rewardColor: gold,
    glow: false,
    showChevron: true,
    blocked: false,
    contest: contestFor(),
  };
}

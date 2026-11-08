/**
 * The prediction quiz — the contract behind the match detail's PREDICT tab.
 *
 * A quiz is a set of questions attached to one fixture. The player answers them
 * as an editable draft, seals that draft into an immutable lock before kickoff,
 * and once the fixture is over the lock is settled against the questions' known
 * answers for XP.
 *
 * Everything here is data and pure rules. The store that persists a player's
 * answers lives in `features/predictions`; the fixtures' questions live in
 * `mocks/matches`.
 */

/** The default quiz set every fixture carries. */
export const defaultPredictionQuizId = "main";

/** Oz charged once when a player first enters the paid Scoreline Quiz. */
export const scorelineQuizEntryFee = 25;

/** The Scoreline Quiz prize pool, indexed by finish rank. */
export const scorelineContestPrizes = [2000, 1000, 500];

/** Prize for finishing a contest at `rank` (1-based). Zero off the podium. */
export function scorelineContestPrizeFor(rank: number): number {
  return rank >= 1 && rank <= scorelineContestPrizes.length
    ? scorelineContestPrizes[rank - 1]
    : 0;
}

/**
 * Where a player's entry sits in its lifecycle.
 *
 * open    → an auto-saved draft, still editable until kickoff.
 * locked  → sealed by hand or at the deadline; answers are immutable.
 * settled → the result is known, `correctCount` and `rewardEarned` are filled.
 */
export type PredictionStatus = "open" | "locked" | "settled";

export type QuizQuestionType = "multipleChoice" | "exactScore";

/* ---- Boosts ---------------------------------------------------------------- */

/** The two boosts a player can arm, one question each. */
export type PredictionMultiplierId = "x2" | "x15";

export type PredictionMultiplier = {
  id: PredictionMultiplierId;
  label: string;
  factor: number;
};

export const predictionMultipliers: PredictionMultiplier[] = [
  { id: "x2", label: "2x", factor: 2 },
  { id: "x15", label: "1.5x", factor: 1.5 },
];

export function predictionMultiplierById(
  id: PredictionMultiplierId | undefined,
): PredictionMultiplier | undefined {
  return predictionMultipliers.find((multiplier) => multiplier.id === id);
}

/** A boost always rounds up, so 1.5x of an odd reward never loses a point. */
export function applyMultiplier(
  reward: number,
  id: PredictionMultiplierId | undefined,
): number {
  const multiplier = predictionMultiplierById(id);
  return multiplier ? Math.ceil(reward * multiplier.factor) : reward;
}

/* ---- Score answers --------------------------------------------------------- */

/**
 * A predicted scoreline packed into the single integer an answer slot holds:
 * home x 100 + away, which covers 0-99 a side.
 */
export const ScoreAnswer = {
  encode(home: number, away: number): number {
    return home * 100 + away;
  },
  decode(encoded: number): { home: number; away: number } {
    return { home: Math.floor(encoded / 100), away: encoded % 100 };
  },
};

/* ---- Questions and quizzes ------------------------------------------------- */

export type QuizQuestion = {
  id: string;
  text: string;
  /** Empty on an exact-score question, which has a picker instead. */
  options: string[];
  type: QuizQuestionType;
  /** XP credited when this question is called correctly. */
  reward: number;
  /** The right option once the fixture is settled. */
  settledOptionIndex?: number;
  /** The real full-time score once settled, on an exact-score question. */
  settledHomeScore?: number;
  settledAwayScore?: number;
  /**
   * Set when a finished fixture cannot support this question. A void question
   * counts as settled — so the quiz as a whole can still be revealed — but is
   * excluded from scoring, in either direction.
   */
  forcedVoid?: boolean;
  /** Art the question is asked over. A URL, so it is content rather than a token. */
  backgroundAsset?: string;
};

export type PredictionQuiz = {
  id: string;
  matchId: string;
  title: string;
  subtitle?: string;
  prizeLabel?: string;
  questions: QuizQuestion[];
  /** Oz to enter as a paid contest. Zero is a free, XP-only quiz. */
  entryFee: number;
};

export function isScoreQuestion(question: QuizQuestion): boolean {
  return question.type === "exactScore";
}

/** The correct answer in the encoding an answer slot uses, or null. */
export function settledAnswerFor(question: QuizQuestion): number | null {
  if (question.forcedVoid) return null;
  if (isScoreQuestion(question)) {
    if (question.settledHomeScore == null || question.settledAwayScore == null) {
      return null;
    }
    return ScoreAnswer.encode(question.settledHomeScore, question.settledAwayScore);
  }
  return question.settledOptionIndex ?? null;
}

export function isQuestionSettled(question: QuizQuestion): boolean {
  return question.forcedVoid === true || settledAnswerFor(question) !== null;
}

/** Every question's reward added up — the quiz's advertised XP. */
export function quizMaxReward(quiz: PredictionQuiz): number {
  return quiz.questions.reduce((sum, question) => sum + question.reward, 0);
}

/** True once every question can be marked, so the quiz can be revealed. */
export function isQuizSettleable(quiz: PredictionQuiz): boolean {
  return quiz.questions.every(isQuestionSettled);
}

/** A paid coin contest — the top three finishers win the prize pool. */
export function isContestQuiz(quiz: PredictionQuiz): boolean {
  return quiz.entryFee > 0;
}

/** How an answer reads on a review card, for either question type. */
export function answerLabel(
  question: QuizQuestion,
  answer: number | null | undefined,
): string {
  if (answer == null) return "—";
  if (isScoreQuestion(question)) {
    const { home, away } = ScoreAnswer.decode(answer);
    return `${home} - ${away}`;
  }
  return question.options[answer] ?? "—";
}

/* ---- A player's entry ------------------------------------------------------ */

export type UserPrediction = {
  matchId: string;
  quizId: string;
  /** questionId → the selected option index, or an encoded scoreline. */
  answers: Record<string, number>;
  /** questionId → the boost armed on it. At most one of each boost. */
  multipliersByQuestion: Record<string, PredictionMultiplierId>;
  /** ISO 8601. */
  submittedAt: string;
  status: PredictionStatus;
  correctCount?: number;
  rewardEarned: number;
  /** Finish position in a paid contest's field once settled (1-based). */
  contestRank?: number;
  /** Oz won from the prize pool. Zero off the podium and on free quizzes. */
  contestPrizeOz: number;
};

export function predictionStorageKey(matchId: string, quizId: string): string {
  return `${matchId}::${quizId}`;
}

/** One question's verdict, as the settlement reveal reads it. */
export type SettlementQuestionResult = {
  text: string;
  pickedLabel: string;
  correctLabel: string;
  correct: boolean;
  earnedXp: number;
  multiplier?: PredictionMultiplierId;
};

/**
 * Marks a sealed entry against the quiz's answers.
 *
 * Pure, and the single definition of what a settled card is worth: the store
 * persists what this returns, and the reveal cinematic reads the same rows.
 */
export function settleQuiz(
  quiz: PredictionQuiz,
  prediction: UserPrediction,
): { results: SettlementQuestionResult[]; correctCount: number; xp: number } {
  const results: SettlementQuestionResult[] = [];
  let correctCount = 0;
  let xp = 0;

  for (const question of quiz.questions) {
    const picked = prediction.answers[question.id];
    const actual = settledAnswerFor(question);
    const correct = picked != null && actual != null && picked === actual;
    const multiplier = prediction.multipliersByQuestion[question.id];
    const earnedXp = correct ? applyMultiplier(question.reward, multiplier) : 0;
    if (correct) correctCount += 1;
    xp += earnedXp;
    results.push({
      text: question.text,
      pickedLabel: answerLabel(question, picked ?? null),
      correctLabel: answerLabel(question, actual),
      correct,
      earnedXp,
      multiplier,
    });
  }

  return { results, correctCount, xp };
}

/* ---- The crowd ------------------------------------------------------------- */

/**
 * Aggregate answers for one question. The key is the option index, or an
 * encoded scoreline on an exact-score question.
 */
export type PredictionVoteBreakdown = {
  questionId: string;
  totals: Record<number, number>;
};

export function totalVotes(votes: PredictionVoteBreakdown | undefined): number {
  if (!votes) return 0;
  return Object.values(votes.totals).reduce((sum, count) => sum + count, 0);
}

export function votesFor(
  votes: PredictionVoteBreakdown | undefined,
  answer: number,
): number {
  return votes?.totals[answer] ?? 0;
}

export function voteShare(
  votes: PredictionVoteBreakdown | undefined,
  answer: number,
): number {
  const total = totalVotes(votes);
  return total === 0 ? 0 : votesFor(votes, answer) / total;
}

/* ---- The in-match board ---------------------------------------------------- */

/**
 * One row on a match's prediction board. Identities come from the shared rival
 * roster, so a player reads the same here as on the season leaderboard.
 */
export type MatchPredictionLeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  correct: number;
  /** >0 climbed, <0 dropped, 0 held. */
  movement: number;
  badge?: string;
  isUser: boolean;
  isNew: boolean;
};

/** Re-ranks a field by points, highest first. */
export function rankedBoard(
  entries: MatchPredictionLeaderboardEntry[],
): MatchPredictionLeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * The player's score once their card is settled, on the same curve the rivals
 * sit on: a perfect card lands at the top of their band.
 */
export function boardPointsFor(
  correct: number,
  total: number,
  answered: number,
): number {
  return (total === 0 ? 0 : Math.round((620 * correct) / total)) + answered * 6;
}

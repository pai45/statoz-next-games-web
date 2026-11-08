import type { SportMatch } from "@/domain/matches";
import {
  ScoreAnswer,
  quizMaxReward,
  scorelineContestPrizes,
  scorelineQuizEntryFee,
  type MatchPredictionLeaderboardEntry,
  type PredictionQuiz,
  type PredictionVoteBreakdown,
  type QuizQuestion,
} from "@/domain/predictions";

import { matchDetailRivals } from "../detail-rivals";
import { buildFootballQuiz, questionBackground, quizSeed } from "./football-bank";

/**
 * The prediction quiz sets behind every fixture's PREDICT tab.
 *
 * The app authors one quiz per fixture in its mock repository, with the
 * finished fixtures carrying real settled answers so the reveal cinematic has
 * something to reveal. This does the same, except that a finished fixture's
 * answers are read out of the fixture itself wherever the scoreline decides
 * them — the mock never has to restate a result it already holds. Anything the
 * fixture cannot decide (corners, cards, the toss) is marked void, which is the
 * app's own escape hatch: it counts as settled so the quiz can be revealed, but
 * scores nothing either way.
 */

/* ---- Quiz sets ------------------------------------------------------------- */

function withMeta(
  base: Pick<PredictionQuiz, "matchId" | "questions">,
  meta: { id?: string; title: string; subtitle: string; entryFee?: number },
): PredictionQuiz {
  const entryFee = meta.entryFee ?? 0;
  const quiz: PredictionQuiz = {
    id: meta.id ?? "main",
    matchId: base.matchId,
    title: meta.title,
    subtitle: meta.subtitle,
    questions: base.questions,
    entryFee,
  };
  return {
    ...quiz,
    prizeLabel: entryFee > 0
      ? `${scorelineContestPrizes.join(" / ")} Oz prize pool`
      : `${quizMaxReward(quiz)} XP available`,
  };
}

function mcq(id: string, text: string, options: string[], reward: number): QuizQuestion {
  return { id, text, options, type: "multipleChoice", reward, backgroundAsset: questionBackground(id) };
}

function footballQuizzes(match: SportMatch): PredictionQuiz[] {
  const home = match.home.name;
  const away = match.away.name;
  return [
    withMeta(buildFootballQuiz(match.id, home, away), {
      title: "Scoreline Quiz",
      subtitle: "Final score and scoring market",
      entryFee: scorelineQuizEntryFee,
    }),
    withMeta(
      {
        matchId: match.id,
        questions: [
          mcq("q1", `Who wins ${home} vs ${away}?`, [home, "Draw", away], 90),
          mcq("q2", "Which team scores first?", [home, away, "No goal"], 80),
          mcq("q3", "Will a red card be shown?", ["Yes", "No"], 60),
        ],
      },
      { id: "events", title: "Match Events Quiz", subtitle: "Winner, first goal, and discipline" },
    ),
  ];
}

function cricketQuizzes(match: SportMatch): PredictionQuiz[] {
  const home = match.home.shortName;
  const away = match.away.shortName;
  return [
    withMeta(
      {
        matchId: match.id,
        questions: [
          mcq("q1", "Who wins the toss?", [home, away], 50),
          mcq("q2", "Total sixes over/under 12.5?", ["Over 12.5", "Under 12.5"], 100),
          mcq("q3", `Who will win ${home} vs ${away}?`, [home, "Tie", away], 100),
          mcq("q4", "Will either opener score 50+?", ["Yes", "No"], 75),
        ],
      },
      { title: "Match Basics Quiz", subtitle: "Toss, sixes, and match winner" },
    ),
    withMeta(
      {
        matchId: match.id,
        questions: [
          mcq("q1", "Who has the higher powerplay score?", [home, away, "Tie"], 80),
          mcq("q2", "Total wickets over/under 12.5?", ["Over 12.5", "Under 12.5"], 70),
          mcq("q3", "Will the match be decided in the final over?", ["Yes", "No"], 60),
        ],
      },
      { id: "events", title: "Match Events Quiz", subtitle: "Powerplay, wickets, and final-over drama" },
    ),
  ];
}

function tennisQuizzes(match: SportMatch): PredictionQuiz[] {
  const home = match.home.name;
  const away = match.away.name;
  // Wimbledon and the ATP tour play best-of-five; the WTA tour best-of-three.
  const bestOfFive = match.leagueId !== "wta";
  return [
    withMeta(
      {
        matchId: match.id,
        questions: [
          mcq("q1", "Who will win the match?", [home, away], 100),
          mcq(
            "q2",
            "Total sets played?",
            bestOfFive ? ["3 sets", "4 sets", "5 sets"] : ["2 sets", "3 sets"],
            50,
          ),
          mcq("q3", "Will there be a tiebreak in the match?", ["Yes", "No"], 75),
        ],
      },
      { title: "Match Basics Quiz", subtitle: "Winner, sets, and tiebreaks" },
    ),
  ];
}

function basketballQuizzes(match: SportMatch): PredictionQuiz[] {
  const home = match.home.shortName;
  const away = match.away.shortName;
  return [
    withMeta(
      {
        matchId: match.id,
        questions: [
          mcq("q1", "Who will win the game?", [home, away], 100),
          mcq("q2", "Total points scored?", ["Under 150", "150 - 164", "165 - 179", "180 or more"], 90),
          mcq("q3", "Winning margin?", ["1 - 5", "6 - 10", "11 - 15", "16 or more"], 75),
        ],
      },
      { title: "Match Basics Quiz", subtitle: "Winner, total points, and margins" },
    ),
  ];
}

const grandPrixField = [
  "Max Verstappen",
  "Charles Leclerc",
  "Lando Norris",
  "George Russell",
];

function motorsportQuizzes(match: SportMatch): PredictionQuiz[] {
  const eventName = match.home.name;
  return [
    withMeta(
      {
        matchId: match.id,
        questions: [
          mcq("q1", `Who will win the ${eventName}?`, grandPrixField, 100),
          mcq("q2", "Will there be a safety car?", ["Yes", "No"], 50),
        ],
      },
      { title: "Race Predictions", subtitle: "Race winner and safety-car call" },
    ),
    withMeta(
      {
        matchId: match.id,
        questions: [
          mcq("b1", "Who takes pole position?", grandPrixField, 75),
          mcq("b2", "Who sets the fastest lap?", grandPrixField, 75),
        ],
      },
      { id: "bonus", title: "Bonus Predictions", subtitle: "Pole position and the fastest lap" },
    ),
  ];
}

const buildersBySport = {
  football: footballQuizzes,
  cricket: cricketQuizzes,
  tennis: tennisQuizzes,
  basketball: basketballQuizzes,
  motorsport: motorsportQuizzes,
};

/** The quiz sets for one fixture, with a finished fixture's answers filled in. */
export function quizzesForMatch(match: SportMatch): PredictionQuiz[] {
  const quizzes = buildersBySport[match.sport](match);
  if (match.status !== "finished") return quizzes;
  return quizzes.map((quiz) => ({
    ...quiz,
    questions: quiz.questions.map((question) => settleQuestion(question, quiz.id, match)),
  }));
}

export function quizForMatch(match: SportMatch, quizId: string): PredictionQuiz | undefined {
  return quizzesForMatch(match).find((quiz) => quiz.id === quizId);
}

/* ---- Settlement ------------------------------------------------------------ */

type Scoreline = { home: number; away: number };

/** Football and basketball fixtures carry plain numbers. */
function numericScore(match: SportMatch): Scoreline | null {
  const home = Number(match.homeScore);
  const away = Number(match.awayScore);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home, away };
}

/** Cricket fixtures read `202/6 (20 ov)`; the runs and wickets both matter. */
function cricketInnings(score: SportMatch["homeScore"]): { runs: number; wickets: number } | null {
  if (typeof score !== "string") return null;
  const parsed = /^(\d+)\/(\d+)/.exec(score.trim());
  if (!parsed) return null;
  return { runs: Number(parsed[1]), wickets: Number(parsed[2]) };
}

function bucket(value: number, bounds: number[]): number {
  for (let index = 0; index < bounds.length; index += 1) {
    if (value <= bounds[index]) return index;
  }
  return bounds.length;
}

/** True/False questions answer 0 for True. */
function truth(value: boolean): number {
  return value ? 0 : 1;
}

function voided(question: QuizQuestion): QuizQuestion {
  return { ...question, forcedVoid: true };
}

function settled(question: QuizQuestion, optionIndex: number): QuizQuestion {
  return { ...question, settledOptionIndex: optionIndex };
}

function settleQuestion(question: QuizQuestion, quizId: string, match: SportMatch): QuizQuestion {
  const answer = resolve(question, quizId, match);
  if (answer == null) return voided(question);
  if (question.type === "exactScore") {
    const { home, away } = ScoreAnswer.decode(answer);
    return { ...question, settledHomeScore: home, settledAwayScore: away };
  }
  return settled(question, answer);
}

function resolve(question: QuizQuestion, quizId: string, match: SportMatch): number | null {
  switch (match.sport) {
    case "football":
      return resolveFootball(question, quizId, match);
    case "cricket":
      return resolveCricket(question, quizId, match);
    case "basketball":
      return resolveBasketball(question, match);
    case "tennis":
      return resolveTennis(question, match);
    case "motorsport":
      return resolveMotorsport(question, match);
  }
}

function resolveFootball(question: QuizQuestion, quizId: string, match: SportMatch): number | null {
  const score = numericScore(match);
  if (!score) return null;
  const total = score.home + score.away;

  if (quizId === "events") {
    // Winner, then the two event calls the fixture cannot decide on its own.
    if (question.id === "q1") {
      return score.home > score.away ? 0 : score.home < score.away ? 2 : 1;
    }
    return null;
  }

  switch (question.id) {
    case "exact_score":
      return ScoreAnswer.encode(score.home, score.away);
    case "match_result_mcq":
      return score.home > score.away ? 0 : score.home < score.away ? 1 : 2;
    case "match_three_or_more_goals":
      return truth(total >= 3);
    case "match_ends_in_draw":
      return truth(score.home === score.away);
    case "both_teams_to_score":
      return truth(score.home > 0 && score.away > 0);
    case "total_goals_range_mcq":
      return bucket(total, [1, 3, 5]);
    case "team_goals_range_mcq":
      return bucket(score.home, [0, 1, 2]);
    case "team_wins_match":
      return truth(score.home > score.away);
    case "team_clean_sheet":
      return truth(score.away === 0);
    case "team_scores_two_plus":
      return truth(score.away >= 2);
    default:
      return null;
  }
}

function resolveCricket(question: QuizQuestion, quizId: string, match: SportMatch): number | null {
  const home = cricketInnings(match.homeScore);
  const away = cricketInnings(match.awayScore);
  if (!home || !away) return null;

  if (quizId === "events") {
    if (question.id === "q2") return truth(home.wickets + away.wickets > 12.5);
    return null;
  }
  if (question.id === "q3") {
    return home.runs > away.runs ? 0 : home.runs < away.runs ? 2 : 1;
  }
  return null;
}

function resolveBasketball(question: QuizQuestion, match: SportMatch): number | null {
  const score = numericScore(match);
  if (!score) return null;
  switch (question.id) {
    case "q1":
      return score.home > score.away ? 0 : 1;
    case "q2":
      return bucket(score.home + score.away, [149, 164, 179]);
    case "q3":
      return bucket(Math.abs(score.home - score.away), [5, 10, 15]);
    default:
      return null;
  }
}

function resolveTennis(question: QuizQuestion, match: SportMatch): number | null {
  const sets = match.tennisSets;
  if (!sets || sets.length === 0) return null;
  const homeSets = sets.filter((set) => set.homeScore > set.awayScore).length;
  const awaySets = sets.length - homeSets;
  switch (question.id) {
    case "q1":
      return homeSets > awaySets ? 0 : 1;
    case "q2": {
      // The option list starts at the shortest possible match for the format.
      const shortest = match.leagueId === "wta" ? 2 : 3;
      const index = sets.length - shortest;
      return index >= 0 ? index : null;
    }
    case "q3":
      return truth(sets.some((set) => Math.max(set.homeScore, set.awayScore) >= 7));
    default:
      return null;
  }
}

/**
 * A finished race weekend keeps only its headline in the fixture, so the winner
 * and pole settle from that one line and the rest of the card is void.
 */
function resolveMotorsport(question: QuizQuestion, match: SportMatch): number | null {
  const result = match.resultLine;
  if (!result) return null;
  const winner = grandPrixField.findIndex((driver) => {
    const surname = driver.split(" ").at(-1) ?? driver;
    return result.toLowerCase().includes(surname.toLowerCase());
  });
  if (winner < 0) return null;
  if (question.id === "q1") return winner;
  if (question.id === "b1" && result.toLowerCase().includes("from pole")) return winner;
  return null;
}

/* ---- The crowd ------------------------------------------------------------- */

/**
 * Aggregate votes for one question, seeded so the same question always shows
 * the same crowd. An exact-score question polls the settled scoreline plus the
 * four scorelines a crowd always backs.
 */
export function votesForQuestion(
  matchId: string,
  quizId: string,
  question: QuizQuestion,
): PredictionVoteBreakdown {
  const seed = quizSeed(`${matchId}:${quizId}:${question.id}`);
  const totals: Record<number, number> = {};

  if (question.type === "exactScore") {
    const correct = question.settledHomeScore != null && question.settledAwayScore != null
      ? ScoreAnswer.encode(question.settledHomeScore, question.settledAwayScore)
      : null;
    const scores = [
      ...(correct == null ? [] : [correct]),
      ScoreAnswer.encode(1, 0),
      ScoreAnswer.encode(1, 1),
      ScoreAnswer.encode(2, 1),
      ScoreAnswer.encode(0, 0),
    ];
    scores.forEach((score, index) => {
      if (totals[score] == null) totals[score] = 28 + ((seed + index * 23) % 72);
    });
    return { questionId: question.id, totals };
  }

  question.options.forEach((_, index) => {
    totals[index] = 34 + ((seed + index * 29) % 96);
  });
  return { questionId: question.id, totals };
}

/* ---- The board ------------------------------------------------------------- */

/**
 * The rivals a match board fields, rotated by the fixture so each match and
 * quiz draws a different lineup from the shared roster.
 *
 * The app's roster carries the player as a permanent seed at index 0, which the
 * cubit then overwrites with their real result. The web has a real profile
 * instead, so this returns the rivals alone and the store splices the player in
 * once their card is settled — but the points curve is the app's, untouched,
 * because the Scoreline contest ranks the player against these numbers for
 * real coin prizes.
 */
export function matchBoardRivals(
  matchId: string,
  quizId: string,
): MatchPredictionLeaderboardEntry[] {
  const seed = quizSeed(`${matchId}:${quizId}`);
  return Array.from({ length: 6 }, (_, index) => {
    const rival = matchDetailRivals[(seed + index * 5) % matchDetailRivals.length];
    // Index 0 is the player's slot in the app's field, so a rival at position
    // `index` here sits at `index + 1` on that curve.
    const slot = index + 1;
    return {
      rank: slot,
      name: rival.name,
      points: 620 - slot * 47 + ((seed + slot * 13) % 31),
      correct: 5 - (slot % 3),
      movement: rival.movement,
      badge: "badge" in rival ? rival.badge : undefined,
      isUser: false,
      isNew: "isNew" in rival ? rival.isNew === true : false,
    };
  });
}

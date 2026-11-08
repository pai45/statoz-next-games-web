import type { PredictionQuiz, QuizQuestion } from "@/domain/predictions";

/**
 * The shared football prediction-question bank.
 *
 * `buildFootballQuiz` assembles a per-fixture set: an exact-score centrepiece,
 * the compulsory match-winner pick, then one seeded match-level question and
 * one seeded team-level question, so every fixture reads differently while the
 * flow stays four questions long.
 *
 * The app keys a full-bleed backdrop off each question id. The web has no
 * prediction backdrop art, so the panels carry the same layout without one —
 * see the port notes on the match feature.
 */

type BankCategory = "matchBool" | "matchMcq" | "teamBool" | "teamMcq";

type BankQuestion = {
  id: string;
  category: BankCategory;
  /** May carry `{teamA}` / `{teamB}`, bound to the fixture's sides. */
  template: string;
  options: (home: string, away: string) => string[];
};

const trueFalse = ["True", "False"];
const bool = () => trueFalse;
const winnerOptions = (home: string, away: string) => [home, away, "Draw"];
const firstGoalOptions = (home: string, away: string) => [home, away, "No goal scored"];

/**
 * The art each question is asked over, keyed by question id. Several questions
 * deliberately share one image; anything absent falls back to the default.
 */
const backgroundById: Record<string, string> = {
  exact_score: "match_result_mcq",
  match_result_mcq: "match_result_mcq",
  match_ends_in_draw: "match_ends_in_draw",
  both_teams_to_score: "both_teams_to_score",
  first_scorer_wins: "first_scorer_wins",
  halftime_leader_wins: "halftime_leader_wins",
  match_has_red_card: "match_has_red_card",
  team_red_card_b: "match_has_red_card",
  match_over_4_yellow_cards: "match_over_4_yellow_cards",
  first_goal_before_30: "first_goal_before_30",
  match_over_8_corners: "match_over_8_corners",
  total_corners_range_mcq: "match_over_8_corners",
  team_corners_range_mcq: "match_over_8_corners",
  team_five_plus_corners: "match_over_8_corners",
  team_wins_match: "team_wins_match",
  team_clean_sheet: "team_clean_sheet",
  team_possession_over_60: "team_possession_over_60",
  team_five_plus_shots_on_target: "team_five_plus_shots_on_target",
  team_red_card_a: "team_gets_red_card",
  team_yellow_card_a: "total_yellow_cards_range_mcq",
  team_yellow_card_b: "total_yellow_cards_range_mcq",
  total_yellow_cards_range_mcq: "total_yellow_cards_range_mcq",
  team_ten_plus_fouls: "team_ten_plus_fouls",
  total_cards_range_mcq: "team_ten_plus_fouls",
  halftime_leader_mcq: "halftime_leader_mcq",
  first_goal_team_mcq: "first_goal_team_mcq",
  first_goal_window_mcq: "first_goal_team_mcq",
  total_goals_range_mcq: "total_goals_range_mcq",
  team_shots_range_mcq: "team_shots_range_mcq",
  team_goals_range_mcq: "team_goals_range_mcq",
  team_scores_two_plus: "team_goals_range_mcq",
};

export function questionBackground(id: string): string {
  return `/assets/backgrounds/predictions/${backgroundById[id] ?? "default"}.webp`;
}

const rewardByCategory: Record<BankCategory, number> = {
  matchMcq: 90,
  teamMcq: 90,
  matchBool: 60,
  teamBool: 60,
};

/** The compulsory match-winner question; always included. */
const matchResult: BankQuestion = {
  id: "match_result_mcq",
  category: "matchMcq",
  template: "Which team will win the match?",
  options: winnerOptions,
};

const bank: BankQuestion[] = [
  // Match-level booleans.
  { id: "match_three_or_more_goals", category: "matchBool", template: "There will be 3 or more total goals in the match.", options: bool },
  { id: "match_ends_in_draw", category: "matchBool", template: "The match will end in a draw.", options: bool },
  { id: "both_teams_to_score", category: "matchBool", template: "Both teams will score at least one goal.", options: bool },
  { id: "first_scorer_wins", category: "matchBool", template: "The team that scores first will go on to win the match.", options: bool },
  { id: "halftime_leader_wins", category: "matchBool", template: "The team leading at half time will win the match.", options: bool },
  { id: "match_has_red_card", category: "matchBool", template: "At least one red card will be shown in the match.", options: bool },
  { id: "match_over_4_yellow_cards", category: "matchBool", template: "The match will produce 4 or more yellow cards in total.", options: bool },
  { id: "first_goal_before_30", category: "matchBool", template: "The first goal of the match will be scored before the 30-minute mark.", options: bool },
  { id: "match_over_8_corners", category: "matchBool", template: "There will be more than 8 corner kicks in the match.", options: bool },
  // Team-specific booleans.
  { id: "team_wins_match", category: "teamBool", template: "{teamA} will win the match.", options: bool },
  { id: "team_clean_sheet", category: "teamBool", template: "{teamA} will keep a clean sheet (concede 0 goals).", options: bool },
  { id: "team_scores_two_plus", category: "teamBool", template: "{teamB} will score 2 or more goals in the match.", options: bool },
  { id: "team_possession_over_60", category: "teamBool", template: "{teamA} will have more than 60% possession.", options: bool },
  { id: "team_five_plus_shots_on_target", category: "teamBool", template: "{teamB} will register 5 or more shots on target.", options: bool },
  { id: "team_red_card_a", category: "teamBool", template: "{teamA} will receive a red card in the match.", options: bool },
  { id: "team_red_card_b", category: "teamBool", template: "{teamB} will receive a red card in the match.", options: bool },
  { id: "team_yellow_card_a", category: "teamBool", template: "{teamA} will receive a yellow card in the match.", options: bool },
  { id: "team_yellow_card_b", category: "teamBool", template: "{teamB} will receive a yellow card in the match.", options: bool },
  { id: "team_ten_plus_fouls", category: "teamBool", template: "{teamA} will commit 10 or more fouls in the match.", options: bool },
  { id: "team_five_plus_corners", category: "teamBool", template: "{teamA} will win 5 or more corner kicks.", options: bool },
  // Match-level MCQs.
  { id: "halftime_leader_mcq", category: "matchMcq", template: "Which team will be leading at half time?", options: winnerOptions },
  { id: "first_goal_team_mcq", category: "matchMcq", template: "Which team will score the first goal of the match?", options: firstGoalOptions },
  { id: "total_goals_range_mcq", category: "matchMcq", template: "How many total goals will be scored in the match?", options: () => ["0 - 1", "2 - 3", "4 - 5", "6 or more"] },
  { id: "total_yellow_cards_range_mcq", category: "matchMcq", template: "How many yellow cards will be shown in total?", options: () => ["0 - 2", "3 - 4", "5 - 6", "7 or more"] },
  { id: "total_cards_range_mcq", category: "matchMcq", template: "How many total cards (yellow + red) will be shown in the match?", options: () => ["0 - 3", "4 - 5", "6 - 7", "8 or more"] },
  { id: "total_corners_range_mcq", category: "matchMcq", template: "How many total corner kicks will the match have?", options: () => ["0 - 5", "6 - 9", "10 - 13", "14 or more"] },
  { id: "first_goal_window_mcq", category: "matchMcq", template: "When will the first goal of the match be scored?", options: () => ["1 - 15 min", "16 - 30 min", "31 - 45 min", "46 - 60 min", "61 - 75 min", "76 - 90+ min", "No goal scored"] },
  // Team-specific MCQs.
  { id: "team_goals_range_mcq", category: "teamMcq", template: "How many goals will {teamA} score in the match?", options: () => ["0", "1", "2", "3 or more"] },
  { id: "team_shots_range_mcq", category: "teamMcq", template: "How many shots will {teamA} take in the match?", options: () => ["Under 5", "5 - 9", "10 - 14", "15 or more"] },
  { id: "team_corners_range_mcq", category: "teamMcq", template: "How many corner kicks will {teamA} win?", options: () => ["0 - 2", "3 - 5", "6 - 8", "9 or more"] },
];

/** The repository's stable hash, so a fixture's quiz is fixed but varied. */
export function quizSeed(value: string): number {
  let hash = 17;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return hash;
}

function toQuestion(entry: BankQuestion, home: string, away: string): QuizQuestion {
  const text = entry.template.replaceAll("{teamA}", home).replaceAll("{teamB}", away);
  return {
    id: entry.id,
    text,
    options: entry.options(home, away),
    type: "multipleChoice",
    reward: rewardByCategory[entry.category],
    backgroundAsset: questionBackground(entry.id),
  };
}

/** Deterministically pick one entry of `category` from the bank. */
function pick(seed: number, salt: number, category: BankCategory): BankQuestion {
  const pool = bank.filter((entry) => entry.category === category);
  return pool[(seed + salt) % pool.length];
}

export function buildFootballQuiz(
  matchId: string,
  home: string,
  away: string,
): Pick<PredictionQuiz, "matchId" | "questions"> {
  const seed = quizSeed(matchId);
  const matchCategory: BankCategory = seed % 2 === 0 ? "matchMcq" : "matchBool";
  const teamCategory: BankCategory = seed % 2 === 0 ? "teamBool" : "teamMcq";
  return {
    matchId,
    questions: [
      {
        id: "exact_score",
        text: "Predict the full-time score",
        options: [],
        type: "exactScore",
        reward: 125,
        backgroundAsset: questionBackground("exact_score"),
      },
      toQuestion(matchResult, home, away),
      toQuestion(pick(seed, 1, matchCategory), home, away),
      toQuestion(pick(seed, 2, teamCategory), home, away),
    ],
  };
}

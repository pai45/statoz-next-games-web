import type { Sport } from "@/domain/sports";
import type { GameId } from "@/features/games/types";

/** The three archives exposed from the player dossier. */
export type HistorySection = "predict" | "pick" | "games";

export type HistoryStatus =
  | "won"
  | "lost"
  | "live"
  | "pending"
  | "unresolved"
  | "voided";

export type PredictionHistoryRecord = {
  id: string;
  sport: Sport;
  matchId: string;
  status: Exclude<HistoryStatus, "voided">;
  submittedAt: string;
  answered: number;
  questions: number;
  correct: number;
  potentialXp: number;
  note: string;
};

export type PickHistoryRecord = {
  id: string;
  sport: Sport;
  matchId: string;
  marketId: string;
  market: string;
  outcome: string;
  status: HistoryStatus;
  submittedAt: string;
  stakeOz: number;
  probability: number;
  payoutOz: number;
  note: string;
};

export type GameHistoryRecord = {
  id: string;
  sport: Sport;
  game: GameId;
  opponent: string;
  result: "won" | "draw" | "lost";
  playedAt: string;
  playerScore: string;
  opponentScore: string;
  streak: number;
  note: string;
  isDemo?: boolean;
  sourceResultLabel?: string;
  sourceClassification?: string;
  xpDelta?: number;
  badge?: string;
  position?: { place: number; field: number };
  rounds?: Array<{ round: number; scenario: string; outcome: "Goal" | "Saved" | "Blocked" | "Missed" | "Foul" | "Red Card"; playerAttacking: boolean }>;
};

/**
 * Presentation fixtures for the first web archive pass. The ids deliberately
 * point at the existing match catalog, which means these can be replaced by a
 * repository later without changing the history card contract.
 */
export const predictionHistoryRecords: PredictionHistoryRecord[] = [
  {
    id: "prediction-cfc-newcastle",
    sport: "football",
    matchId: "epl_cfc_new",
    status: "live",
    submittedAt: "2026-08-28T08:40:00.000Z",
    answered: 3,
    questions: 5,
    correct: 2,
    potentialXp: 120,
    note: "Locked while the match is in play.",
  },
  {
    id: "prediction-liverpool-city",
    sport: "football",
    matchId: "epl_liv_mci",
    status: "pending",
    submittedAt: "2026-08-27T18:10:00.000Z",
    answered: 5,
    questions: 5,
    correct: 0,
    potentialXp: 110,
    note: "All answers are in. Kickoff is next.",
  },
  {
    id: "prediction-france-england",
    sport: "football",
    matchId: "fifa_fra_eng_result",
    status: "won",
    submittedAt: "2026-08-24T16:20:00.000Z",
    answered: 5,
    questions: 5,
    correct: 4,
    potentialXp: 160,
    note: "Prediction settled with a clean read.",
  },
  {
    id: "prediction-mumbai-chennai",
    sport: "cricket",
    matchId: "1496576",
    status: "live",
    submittedAt: "2026-08-28T07:55:00.000Z",
    answered: 2,
    questions: 4,
    correct: 1,
    potentialXp: 140,
    note: "Live innings data is still updating.",
  },
  {
    id: "prediction-india-pakistan",
    sport: "cricket",
    matchId: "t20i_ind_pak",
    status: "lost",
    submittedAt: "2026-08-24T11:30:00.000Z",
    answered: 4,
    questions: 4,
    correct: 1,
    potentialXp: 130,
    note: "The result did not clear the prediction line.",
  },
  {
    id: "prediction-liberty-aces",
    sport: "basketball",
    matchId: "wnba_nyl_lva",
    status: "unresolved",
    submittedAt: "2026-08-25T17:12:00.000Z",
    answered: 4,
    questions: 5,
    correct: 2,
    potentialXp: 95,
    note: "Review is available while settlement catches up.",
  },
  {
    id: "prediction-phoenix-dallas",
    sport: "basketball",
    matchId: "wnba_phx_dal_result",
    status: "won",
    submittedAt: "2026-08-23T18:20:00.000Z",
    answered: 5,
    questions: 5,
    correct: 5,
    potentialXp: 75,
    note: "Perfect card on the finished fixture.",
  },
  {
    id: "prediction-alcaraz-djokovic",
    sport: "tennis",
    matchId: "atp_alc_djo_result",
    status: "won",
    submittedAt: "2026-08-24T10:04:00.000Z",
    answered: 4,
    questions: 4,
    correct: 3,
    potentialXp: 160,
    note: "Straight-sets call confirmed.",
  },
  {
    id: "prediction-swiatek-gauff",
    sport: "tennis",
    matchId: "wta_swi_gau",
    status: "pending",
    submittedAt: "2026-08-27T11:40:00.000Z",
    answered: 3,
    questions: 5,
    correct: 0,
    potentialXp: 125,
    note: "Finish the remaining questions before lock.",
  },
  {
    id: "prediction-belgian-gp",
    sport: "motorsport",
    matchId: "f1_belgian_gp",
    status: "unresolved",
    submittedAt: "2026-08-22T09:35:00.000Z",
    answered: 3,
    questions: 5,
    correct: 2,
    potentialXp: 180,
    note: "Race result is waiting for final review.",
  },
];

export const pickHistoryRecords: PickHistoryRecord[] = [
  {
    id: "pick-chelsea-live",
    sport: "football",
    matchId: "epl_cfc_new",
    marketId: "epl_cfc_new_result",
    market: "Chelsea vs Newcastle — full-time result?",
    outcome: "Chelsea",
    status: "live",
    submittedAt: "2026-08-25T18:42:00.000Z",
    stakeOz: 240,
    probability: 57,
    payoutOz: 0,
    note: "Position is live until the final whistle.",
  },
  {
    id: "pick-liverpool-pending",
    sport: "football",
    matchId: "epl_liv_mci",
    marketId: "epl_liv_mc_winner",
    market: "Liverpool vs Man City — full-time result?",
    outcome: "Liverpool",
    status: "pending",
    submittedAt: "2026-08-27T18:22:00.000Z",
    stakeOz: 180,
    probability: 41,
    payoutOz: 0,
    note: "Position is locked and waiting for kickoff.",
  },
  {
    id: "pick-philadelphia-won",
    sport: "football",
    matchId: "mls_phi_rbny",
    marketId: "mls_phi_rbny_result",
    market: "Philadelphia Union vs Red Bull New York result",
    outcome: "Philadelphia Union",
    status: "won",
    submittedAt: "2026-08-23T18:50:00.000Z",
    stakeOz: 200,
    probability: 56,
    payoutOz: 357,
    note: "Philadelphia's 3-1 win settled the position.",
  },
  {
    id: "pick-columbus-lost",
    sport: "football",
    matchId: "mls_clb_nyc",
    marketId: "mls_clb_nyc_result",
    market: "Columbus Crew vs New York City FC result",
    outcome: "Columbus Crew",
    status: "lost",
    submittedAt: "2026-08-24T00:48:00.000Z",
    stakeOz: 120,
    probability: 48,
    payoutOz: 0,
    note: "New York City FC took the settled result 2-1.",
  },
  {
    id: "pick-opener-review",
    sport: "cricket",
    matchId: "t20i_ind_pak",
    marketId: "ipl_opener_50",
    market: "Will the opener score 50+?",
    outcome: "Yes",
    status: "unresolved",
    submittedAt: "2026-08-24T15:40:00.000Z",
    stakeOz: 110,
    probability: 62,
    payoutOz: 0,
    note: "Awaiting official scorer confirmation.",
  },
  {
    id: "pick-ipl-sixes-live",
    sport: "cricket",
    matchId: "1496576",
    marketId: "ipl_sixes_over_12_5",
    market: "Over 12.5 sixes in tonight's innings?",
    outcome: "Over",
    status: "live",
    submittedAt: "2026-08-25T15:58:00.000Z",
    stakeOz: 180,
    probability: 58,
    payoutOz: 0,
    note: "The innings is live and the sixes total is updating.",
  },
  {
    id: "pick-lakers-pending",
    sport: "basketball",
    matchId: "nba_lal_gsw",
    marketId: "nba_lal_gsw_winner",
    market: "Lakers vs Warriors result",
    outcome: "Warriors",
    status: "pending",
    submittedAt: "2026-08-25T20:14:00.000Z",
    stakeOz: 150,
    probability: 52,
    payoutOz: 0,
    note: "The market is open and the pick is locked.",
  },
  {
    id: "pick-alcaraz-pending",
    sport: "tennis",
    matchId: "atp_alc_sin",
    marketId: "atp_alc_sin_winner",
    market: "Carlos Alcaraz vs Jannik Sinner result",
    outcome: "Carlos Alcaraz",
    status: "pending",
    submittedAt: "2026-08-25T11:48:00.000Z",
    stakeOz: 300,
    probability: 55,
    payoutOz: 0,
    note: "Pick is locked ahead of first serve.",
  },
  {
    id: "pick-belgian-gp-won",
    sport: "motorsport",
    matchId: "f1_belgian_gp",
    marketId: "f1_belgian_gp_winner",
    market: "Who wins at Spa?",
    outcome: "Verstappen",
    status: "won",
    submittedAt: "2026-08-21T14:05:00.000Z",
    stakeOz: 160,
    probability: 36,
    payoutOz: 444,
    note: "Verstappen's win settled the position.",
  },
  {
    id: "pick-gateway-refund",
    sport: "motorsport",
    matchId: "indy_gateway_500",
    marketId: "indy_gateway_fastest_lap",
    market: "Who sets the fastest lap at Gateway?",
    outcome: "Pato O'Ward",
    status: "voided",
    submittedAt: "2026-08-30T16:24:00.000Z",
    stakeOz: 90,
    probability: 34,
    payoutOz: 90,
    note: "Timing feed unavailable. Full stake returned.",
  },
];

/** Representative records across the playable catalog. */
const storedGameHistoryRecords: GameHistoryRecord[] = [
  {
    id: "game-pitch-duel-01",
    sport: "football",
    game: "pitch-duel",
    opponent: "CPU // PRESSING 07",
    result: "won",
    playedAt: "2026-08-27T20:42:00.000Z",
    playerScore: "3",
    opponentScore: "1",
    streak: 4,
    note: "Won the midfield battle with a late counter.",
  },
  {
    id: "game-shootout-01",
    sport: "football",
    game: "penalty-shootout",
    opponent: "CPU // KEEPER 03",
    result: "lost",
    playedAt: "2026-08-26T18:04:00.000Z",
    playerScore: "3",
    opponentScore: "4",
    streak: 0,
    note: "The final kick found the wrong corner.",
  },
  {
    id: "game-football-quiz-01",
    sport: "football",
    game: "football-quiz",
    opponent: "SET 04 // CLASSIC",
    result: "draw",
    playedAt: "2026-08-25T12:16:00.000Z",
    playerScore: "7",
    opponentScore: "7",
    streak: 0,
    note: "A dead heat after the final question.",
  },
  {
    id: "game-final-over-01",
    sport: "cricket",
    game: "final-over",
    opponent: "CPU // SWING KING",
    result: "won",
    playedAt: "2026-08-27T16:38:00.000Z",
    playerScore: "186/2",
    opponentScore: "179/7",
    streak: 3,
    note: "Six runs from the last ball sealed the chase.",
  },
  {
    id: "game-cricket-quiz-01",
    sport: "cricket",
    game: "cricket-quiz",
    opponent: "SET 02 // POWERPLAY",
    result: "won",
    playedAt: "2026-08-24T09:12:00.000Z",
    playerScore: "9",
    opponentScore: "6",
    streak: 2,
    note: "A sharp read on the powerplay record.",
  },
  {
    id: "game-hoop-duel-01",
    sport: "basketball",
    game: "hoop-duel",
    opponent: "CPU // RIM RUNNER",
    result: "won",
    playedAt: "2026-08-27T10:40:00.000Z",
    playerScore: "21",
    opponentScore: "17",
    streak: 5,
    note: "Perfect release timing carried the fourth quarter.",
  },
  {
    id: "game-basketball-quiz-01",
    sport: "basketball",
    game: "basketball-quiz",
    opponent: "SET 03 // DYNASTIES",
    result: "lost",
    playedAt: "2026-08-23T13:28:00.000Z",
    playerScore: "5",
    opponentScore: "8",
    streak: 0,
    note: "The final buzzer ended a three-question slide.",
  },
  {
    id: "game-tennis-rally-01",
    sport: "tennis",
    game: "tennis-rally",
    opponent: "CPU // BASELINER 11",
    result: "won",
    playedAt: "2026-08-26T14:22:00.000Z",
    playerScore: "2",
    opponentScore: "1",
    streak: 3,
    note: "Turned a long rally into a deciding-set break.",
  },
  {
    id: "game-tennis-quiz-01",
    sport: "tennis",
    game: "tennis-quiz",
    opponent: "SET 01 // GRAND SLAMS",
    result: "draw",
    playedAt: "2026-08-22T08:50:00.000Z",
    playerScore: "6",
    opponentScore: "6",
    streak: 0,
    note: "Neither side gave up a point in the tiebreaker.",
  },
  {
    id: "game-grand-prix-01",
    sport: "motorsport",
    game: "grand-prix-dash",
    opponent: "CPU // RALLYCROSS 02",
    result: "won",
    playedAt: "2026-08-27T06:20:00.000Z",
    playerScore: "01:42.8",
    opponentScore: "01:44.1",
    streak: 2,
    note: "A clean final split made the difference at the flag.",
  },
  {
    id: "game-motorsport-quiz-01",
    sport: "motorsport",
    game: "motorsport-quiz",
    opponent: "SET 05 // CIRCUITS",
    result: "lost",
    playedAt: "2026-08-21T11:05:00.000Z",
    playerScore: "4",
    opponentScore: "8",
    streak: 0,
    note: "One corner too late on the final lap history set.",
  },
];

type DemoSeed = readonly [string, Sport, GameId, string, string, string, number?];

const demoSeeds: DemoSeed[] = [
  ["demo-match-victory", "football", "pitch-duel", "Victory", "2", "1", 13],
  ["demo-match-shutout", "football", "pitch-duel", "Victory", "2", "0", 21],
  ["demo-match-draw", "football", "pitch-duel", "Draw", "1", "1", 4],
  ["demo-match-defeat", "football", "pitch-duel", "Defeat", "0", "2", -9],
  ["demo-match-legacy-penalties", "football", "pitch-duel", "Victory", "4", "3", 10],
  ["demo-match-legacy-bare", "football", "pitch-duel", "Defeat", "0", "1"],
  ["demo-shootout-victory", "football", "penalty-shootout", "Victory", "5", "3", 10],
  ["demo-shootout-sudden-death", "football", "penalty-shootout", "Victory", "7", "6", 8],
  ["demo-shootout-whitewash", "football", "penalty-shootout", "Victory", "5", "0", 12],
  ["demo-shootout-defeat", "football", "penalty-shootout", "Defeat", "2", "4", 0],
  ["demo-grandprix-win", "motorsport", "grand-prix-dash", "Victory", "1", "6", 26],
  ["demo-grandprix-endurance-pb", "motorsport", "grand-prix-dash", "Victory", "1", "6", 81],
  ["demo-grandprix-podium", "motorsport", "grand-prix-dash", "Podium", "3", "6", 36],
  ["demo-grandprix-points", "motorsport", "grand-prix-dash", "Points", "4", "6", 12],
  ["demo-grandprix-finished", "motorsport", "grand-prix-dash", "Finished", "5", "6", 12],
  ["demo-grandprix-retired", "motorsport", "grand-prix-dash", "Retired", "6", "6", 4],
  ["demo-basketball-win", "basketball", "hoop-duel", "Victory", "21", "17", 24],
  ["demo-basketball-overtime-win", "basketball", "hoop-duel", "Victory", "32", "30", 22],
  ["demo-basketball-overtime-loss", "basketball", "hoop-duel", "Defeat", "28", "30", 6],
  ["demo-basketball-loss", "basketball", "hoop-duel", "Defeat", "18", "24", 4],
  ["demo-finalover-chase-complete", "cricket", "final-over", "CHASE COMPLETE", "42", "40", 95],
  ["demo-finalover-last-ball", "cricket", "final-over", "CHASE COMPLETE", "51", "50", 131],
  ["demo-finalover-close-loss", "cricket", "final-over", "CHASE FAILED", "47", "49", 119],
  ["demo-finalover-chase-failed", "cricket", "final-over", "CHASE FAILED", "33", "41", 51],
  ["demo-tennis-win", "tennis", "tennis-rally", "Victory", "6", "4", 34],
  ["demo-tennis-tournament-loss", "tennis", "tennis-rally", "Defeat", "4", "6", 24],
  ["demo-tennis-endless-rally", "tennis", "tennis-rally", "Completed", "1180", "0", 11],
  ["demo-tennis-target-practice", "tennis", "tennis-rally", "Completed", "640", "0", 6],
];

export const demoGameHistoryRecords: GameHistoryRecord[] = demoSeeds.map(([id, sport, game, label, playerScore, opponentScore, xpDelta], index) => {
  const won = ["Victory", "CHASE COMPLETE", "Completed", "Podium", "Points", "Finished"].includes(label);
  return {
    id, sport, game, opponent: "STATIC DEMO // CARD_GAME", result: label === "Draw" ? "draw" : won ? "won" : "lost",
    playedAt: new Date(Date.UTC(2026, 8, 9, 12) - index * 3_600_000).toISOString(), playerScore, opponentScore, streak: won ? Math.max(1, index % 5) : 0,
    note: "Bundled demonstration result from the card_game history package.", isDemo: true, sourceResultLabel: label,
    sourceClassification: label.toUpperCase(), ...(xpDelta === undefined ? {} : { xpDelta }),
    ...(game === "grand-prix-dash" ? { position: { place: Number(playerScore), field: Number(opponentScore) } } : {}),
    ...(id === "demo-match-shutout" ? { rounds: [
      { round: 1, scenario: "Set Piece Chance", outcome: "Goal" as const, playerAttacking: true },
      { round: 2, scenario: "Penalty Box Chaos", outcome: "Foul" as const, playerAttacking: false },
      { round: 3, scenario: "Wide Break", outcome: "Goal" as const, playerAttacking: true },
      { round: 4, scenario: "Box Defense", outcome: "Red Card" as const, playerAttacking: false },
    ] } : {}),
  };
});

/** Stored results win by id; each writing mode keeps its twelve newest rows. */
export function mergeGameHistory(stored: GameHistoryRecord[], demos = demoGameHistoryRecords): GameHistoryRecord[] {
  const seen = new Set<string>();
  const counts = new Map<GameId, number>();
  return [...stored, ...demos].filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    const count = counts.get(record.game) ?? 0;
    if (count >= 12) return false;
    counts.set(record.game, count + 1);
    return true;
  });
}

export const gameHistoryRecords = mergeGameHistory(storedGameHistoryRecords);

/** Achievement callers must use real writes only; demos remain visible in archive summaries. */
export const achievementGameHistoryRecords = gameHistoryRecords.filter((record) => !record.isDemo);

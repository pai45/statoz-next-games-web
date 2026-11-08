import type { Sport } from "@/domain/sports";
import type {
  BoxScore,
  FeedEvent,
  InningsLine,
  MatchIntel,
  MatchPulse,
  MatchScorer,
  MatchTrace,
  StatLeader,
  MatchPlayerDossier,
  MatchShot,
  RunRatePoint,
  BasketballScoringEvent,
} from "./report";
import type {
  MatchPredictionLeaderboardEntry,
  PredictionQuiz,
} from "@/domain/predictions";
import type { F1RaceReport } from "./race";

export type MatchDetailOutcome = {
  id: string;
  label: string;
  code: string;
  probability: number;
  delta: number;
  color: string;
  ink: string;
};

export type MatchDetailMarket = {
  id: string;
  leagueId: string;
  leagueLabel: string;
  type: "match" | "future";
  question: string;
  context?: string;
  status: "open" | "live" | "closed";
  liveLabel?: string;
  closesLabel?: string;
  volumeOz: number;
  outcomes: MatchDetailOutcome[];
};

export type MatchDetailStat = {
  label: string;
  home: string;
  away: string;
  homeValue: number;
  awayValue: number;
};

export type MatchDetailTimelineEvent = {
  minute: string;
  side?: "home" | "away";
  type: "goal" | "yellow" | "red" | "substitution" | "score";
  player: string;
  secondary?: string;
  marker?: boolean;
  label?: string;
  scoreDisplay?: string;
  description?: string;
};

export type MatchDetailCommentary = {
  minute: string;
  text: string;
  sequence?: number;
  kind?: string;
  side?: "home" | "away";
  teamName?: string;
  players?: string[];
};

export type MatchDetailPlayer = {
  name: string;
  shortName?: string;
  number: number;
  role: string;
  captain?: boolean;
  formationPlace?: number;
};

export type MatchDetailLineup = {
  formation: string;
  players: MatchDetailPlayer[];
  /** The bench, in the order a manager would use it. */
  substitutes: MatchDetailPlayer[];
  /** A team sheet the competition has confirmed, rather than a projection. */
  confirmed: boolean;
};

export type MatchDetailScoreboard = {
  facts: Array<{ label: string; value: string }>;
  stats: MatchDetailStat[];
  timeline: MatchDetailTimelineEvent[];
  commentary: MatchDetailCommentary[];
  homeLineup: MatchDetailLineup;
  awayLineup: MatchDetailLineup;
  scoreRows: Array<{ label: string; home: string; away: string }>;
  sessions?: Array<{ label: string; results: string[] }>;
  driverStandings?: string[];
  /** The report the STATS tab leads with. */
  pulse: MatchPulse;
  intel: MatchIntel;
  /** Football momentum, basketball win probability, a cricket run race. */
  trace?: MatchTrace;
  /** Cricket only: the chase against the required rate. */
  chase?: MatchTrace;
  scorers?: MatchScorer[];
  leaders?: StatLeader[];
  boxScore?: BoxScore;
  innings?: InningsLine[];
  feed?: FeedEvent[];
  shots?: MatchShot[];
  runRate?: Array<{
    innings: 1 | 2;
    teamId: string;
    points: RunRatePoint[];
  }>;
  players?: MatchPlayerDossier[];
  basketballShots?: BasketballScoringEvent[];
  race?: F1RaceReport;
};

/** Static, feature-owned data that makes a fixture's match-detail tabs complete. */
export type MatchDetailData = {
  /** The quiz sets the PREDICT tab lists, and the TOPS tab ranks. */
  quizzes: PredictionQuiz[];
  /** quizId -> the rivals already on that quiz's board. */
  leaderboard: Record<string, MatchPredictionLeaderboardEntry[]>;
  scoreboard: MatchDetailScoreboard;
};

/** Presentation data for one fixture competition. Its accent is brand data. */
export type MatchLeague = {
  id: string;
  sport: Sport;
  name: string;
  shortCode: string;
  accent: string;
};

export type SportFixtureCount = {
  live: number;
  total: number;
};

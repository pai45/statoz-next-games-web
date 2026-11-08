import type { SportTeam } from "../matches";
import type { Sport } from "../sports";

export type LeagueHubTab =
  | "table"
  | "rounds"
  | "leaders"
  | "stats"
  | "games"
  | "picks";

export type LeagueStandingColumn = {
  id: string;
  label: string;
  /** The last/result column is brighter than supporting metrics. */
  emphasis?: boolean;
};

export type LeagueStandingRow = {
  rank: number;
  competitor: SportTeam;
  tableName?: string;
  rankChange?: number;
  form?: string;
  metrics: Record<string, string | number>;
  zone?: { label: string; color: string };
};

export type LeagueStandingGroup = {
  id: string;
  label: string;
  shortLabel: string;
  rows: LeagueStandingRow[];
};

export type LeagueLeader = {
  id: string;
  name: string;
  competitor: SportTeam;
  value: number;
  displayValue: string;
  detail?: string;
};

export type LeagueLeaderCategory = {
  id: string;
  label: string;
  unitLabel: string;
  accent: "league" | "success" | "orange" | "danger";
  leaders: LeagueLeader[];
};

export type LeagueStatEntry = {
  competitor: SportTeam;
  value: string;
};

export type LeagueStatBoard = {
  id: string;
  label: string;
  description: string;
  entries: LeagueStatEntry[];
};

export type LeagueStatGroup = {
  id: string;
  label: string;
  boards: LeagueStatBoard[];
};

export type LeagueSeason = {
  year: number;
  label: string;
  current: boolean;
};

export type LeagueRound = {
  id: string;
  label: string;
  code: string;
  driverPoints: Array<{ name: string; points: number }>;
};

export type LeaguePlayerProfile = {
  id: string;
  leagueId: string;
  name: string;
  shortName: string;
  role: string;
  number?: string;
  nationality?: string;
  age?: number;
  image?: string;
  team: SportTeam;
  stats: Array<{ group: string; label: string; value: string }>;
};

type LeagueHubBase = {
  id: string;
  sport: Sport;
  name: string;
  shortCode: string;
  accent: string;
  seasonLabel: string;
  columns: LeagueStandingColumn[];
  groups: LeagueStandingGroup[];
  leaderCategories: LeagueLeaderCategory[];
  statGroups: LeagueStatGroup[];
  seasons: LeagueSeason[];
};

export type TeamLeagueHubSnapshot = LeagueHubBase & {
  kind: "team";
};

export type F1LeagueHubSnapshot = LeagueHubBase & {
  kind: "f1";
  rounds: LeagueRound[];
};

export type LeagueHubSnapshot = TeamLeagueHubSnapshot | F1LeagueHubSnapshot;

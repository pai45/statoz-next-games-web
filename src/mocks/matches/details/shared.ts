import type {
  MatchDetailData,
  MatchDetailLineup,
  MatchDetailScoreboard,
  SportMatch,
} from "@/domain/matches";
import { formatKickoffDate, formatKickoffTime } from "@/shared/utils";

import { matchBoardRivals, quizzesForMatch } from "../quizzes";
import { buildReport } from "./report";

export type DetailConfig = {
  lineup: { formation: string; roles: string[] };
  statLabels: string[];
  scoreRows: (match: SportMatch, seed: number) => MatchDetailScoreboard["scoreRows"];
  motorsport?: boolean;
  sessions?: MatchDetailScoreboard["sessions"];
  driverStandings?: string[];
};

export function buildMatchDetail(
  match: SportMatch,
  config: DetailConfig,
): MatchDetailData {
  const quizzes = quizzesForMatch(match);
  const seed = stableSeed(`${match.id}:scoreboard`);
  const stats = config.statLabels.map((label, index) => statFor(label, seed, index));
  const scoreRows = config.scoreRows(match, seed);
  const report = buildReport({ match, seed, stats, scoreRows });

  return {
    quizzes,
    leaderboard: Object.fromEntries(
      quizzes.map((quiz) => [quiz.id, matchBoardRivals(match.id, quiz.id)]),
    ),
    scoreboard: {
      facts: [
        {
          label: "STATUS",
          value: match.status === "live"
            ? `LIVE ${match.liveMinute ?? ""}`.trim()
            : match.status === "finished"
              ? "FULL TIME"
              : "PRE-MATCH",
        },
        {
          label: "KICKOFF",
          value: `${formatKickoffDate(match.kickoff)} · ${formatKickoffTime(match.kickoff)}`,
        },
        { label: "LEAGUE", value: match.leagueId.toUpperCase() },
        { label: "SPORT", value: match.sport.toUpperCase() },
      ],
      stats,
      timeline: timelineFor(match, config.motorsport === true),
      commentary: commentaryFor(match, config.motorsport === true),
      homeLineup: lineupFor(match.home.name, config.lineup, seed),
      awayLineup: lineupFor(match.away.name, config.lineup, seed + 19),
      scoreRows,
      sessions: config.sessions,
      driverStandings: config.driverStandings,
      ...report,
    },
  };
}

function statFor(label: string, seed: number, index: number) {
  const homeValue = 36 + ((seed + index * 11) % 45);
  const awayValue = 35 + ((seed + index * 17) % 44);
  return {
    label,
    home: String(homeValue),
    away: String(awayValue),
    homeValue,
    awayValue,
  };
}

const lineupNames = [
  "Mason", "Jordan", "Alex", "Riley", "Taylor", "Morgan",
  "Casey", "Cameron", "Jamie", "Avery", "Drew",
  "Quinn", "Reese", "Sage", "Blake", "Emery", "Rowan",
];

/** The bench roles a squad carries behind whatever it starts with. */
const benchRoles = ["GK", "DF", "DF", "MF", "MF", "FW"];

function lineupFor(
  team: string,
  config: DetailConfig["lineup"],
  seed: number,
): MatchDetailLineup {
  const prefix = team.split(" ")[0];
  const player = (role: string, index: number) => ({
    name: `${prefix} ${lineupNames[index % lineupNames.length]}`,
    number: 1 + ((seed + index * 7) % 45),
    role,
    captain: index === 2,
  });
  return {
    formation: config.formation,
    players: config.roles.map(player),
    substitutes: benchRoles.map((role, index) => player(role, config.roles.length + index)),
    // A fixture still to start is a projection; once it is under way the sheet
    // is what the teams actually named.
    confirmed: seed % 3 !== 0,
  };
}

function timelineFor(match: SportMatch, motorsport: boolean) {
  if (match.status === "scheduled") return [];
  if (motorsport) {
    return [
      { minute: "LAP 12", side: "home" as const, type: "score" as const, player: "Fastest lap posted" },
      { minute: "LAP 27", side: "away" as const, type: "substitution" as const, player: "Pit window opens" },
    ];
  }
  return [
    { minute: "18'", side: "home" as const, type: "goal" as const, player: match.home.name },
    { minute: "34'", side: "away" as const, type: "yellow" as const, player: match.away.name },
    { minute: "67'", side: "home" as const, type: "substitution" as const, player: "Impact substitute", secondary: "Tactical change" },
  ];
}

function commentaryFor(match: SportMatch, motorsport: boolean) {
  if (match.status === "scheduled") return [];
  const first = motorsport ? "LAP 12" : "18'";
  const second = motorsport ? "LAP 27" : "34'";
  return [
    { minute: first, text: `${match.home.name} take control with a decisive phase of play.` },
    { minute: second, text: `${match.away.name} respond as the pace of the match rises.` },
    {
      minute: match.status === "live" ? "LIVE" : "FT",
      text: match.status === "live"
        ? "Live data remains active as the fixture develops."
        : match.resultLine ?? "Final match data has been recorded.",
    },
  ];
}

function stableSeed(value: string): number {
  let hash = 17;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return hash;
}

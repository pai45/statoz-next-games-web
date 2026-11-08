import type {
  F1LeagueHubSnapshot,
  LeagueHubSnapshot,
  LeagueLeaderCategory,
  LeaguePlayerProfile,
  LeagueStandingColumn,
  LeagueStatGroup,
  TeamLeagueHubSnapshot,
} from "@/domain/leagues";
import type { SportTeam } from "@/domain/matches";
import { cardGamePortraitFor } from "@/features/packs/data/portrait-assets.card-game.generated";

import cricketPackage from "../snapshots/card-game/cricket-league-stats.json";
import f1Package from "../snapshots/card-game/f1-italian-gp.json";
import footballPackage from "../snapshots/card-game/football-league-stats.json";
import nbaPackage from "../snapshots/card-game/nba-league-stats.json";

type RawTeam = {
  id: string;
  name?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  color?: string;
  alternateColor?: string;
};

type RawAthlete = {
  id?: string;
  name?: string;
  displayName?: string;
  fullName?: string;
  shortName?: string;
  teamId?: string;
};

type RawLeaderBoard = {
  key: string;
  displayName?: string;
  shortDisplayName?: string;
  unit?: string;
  qualifier?: string;
  leaders: Array<{
    rank?: number;
    athleteId: string;
    teamId: string;
    value: number;
    displayValue?: string;
  }>;
};

const cyan = "var(--ds-color-accent-cyan)";
const gold = "var(--ds-color-accent-gold)";
const racing = "var(--ds-color-accent-racing)";

function team(raw: RawTeam): SportTeam {
  return {
    id: String(raw.id),
    name: raw.displayName ?? raw.name ?? raw.shortDisplayName ?? String(raw.id),
    shortName: raw.abbreviation ?? raw.shortDisplayName ?? raw.name ?? String(raw.id),
    color: normalizeColor(raw.color, "#5cdfff"),
    secondaryColor: normalizeColor(raw.alternateColor, "#0f172b"),
    badgeTextColor: "#ffffff",
    secondaryTextColor: "#ffffff",
  };
}

function normalizeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.startsWith("#") ? value : `#${value}`;
}

function athleteMap(raw: unknown): Map<string, RawAthlete> {
  const values = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw)
      : [];
  return new Map(
    values
      .filter((entry): entry is RawAthlete => Boolean(entry && typeof entry === "object"))
      .map((entry) => [String(entry.id ?? ""), entry]),
  );
}

function leaderCategories(
  boards: RawLeaderBoard[],
  athletes: Map<string, RawAthlete>,
  teams: Map<string, SportTeam>,
): LeagueLeaderCategory[] {
  return boards.map((board, boardIndex) => ({
    id: board.key,
    label: (board.shortDisplayName ?? board.displayName ?? board.key).toUpperCase(),
    unitLabel: [board.unit, board.qualifier].filter(Boolean).join(" // ").toUpperCase(),
    accent: boardIndex % 4 === 1 ? "success" : boardIndex % 4 === 2 ? "orange" : "league",
    leaders: board.leaders.slice(0, 10).map((entry, index) => {
      const athlete = athletes.get(String(entry.athleteId));
      const competitor = teams.get(String(entry.teamId)) ?? team({ id: entry.teamId });
      return {
        id: `${board.key}-${entry.athleteId}`,
        name: athlete?.displayName ?? athlete?.name ?? athlete?.fullName ?? `Athlete ${entry.athleteId}`,
        competitor,
        value: Number(entry.value),
        displayValue: formatLeaderValue(entry.value),
        detail: index === 0 ? board.qualifier ?? entry.displayValue : undefined,
      };
    }),
  }));
}

function formatLeaderValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function statGroups(
  teamStats: Record<string, Record<string, unknown>>,
  teams: Map<string, SportTeam>,
  sport: "football" | "cricket" | "basketball",
): LeagueStatGroup[] {
  const definitions = sport === "football"
    ? [
        ["attack", "ATTACK", ["totalGoals", "totalShots", "shotsOnTarget", "goalAssists"]],
        ["control", "CONTROL", ["possessionPct", "passPct", "totalPasses", "wonCorners"]],
        ["defence", "DEFENCE", ["cleanSheet", "interceptions", "totalTackles", "saves"]],
        ["discipline", "DISCIPLINE", ["foulsCommitted", "yellowCards", "redCards", "offsides"]],
      ]
    : sport === "cricket"
      ? [
          ["batting", "BATTING", ["runs", "sixes", "fours", "fiftyPlus"]],
          ["bowling", "BOWLING", ["wickets", "dots", "maidens", "fourPlusWickets"]],
          ["dismissals", "DISMISSALS", ["caught", "bowled", "stumped", "dismissals"]],
          ["extras", "DISCIPLINE", ["wides", "noballs", "conceded", "sixesConceded"]],
        ]
      : [
          ["scoring", "SCORING", ["avgPoints", "fieldGoalPct", "threePointPct", "freeThrowPct"]],
          ["creation", "CREATION", ["avgAssists", "assistTurnoverRatio", "avgTurnovers", "paceFactor"]],
          ["glass", "REBOUNDING", ["avgRebounds", "avgOffensiveRebounds", "avgDefensiveRebounds", "reboundRate"]],
          ["discipline", "DISCIPLINE", ["avgSteals", "avgBlocks", "avgFouls", "avgTechnicalFouls"]],
        ];

  return definitions.map(([id, label, keys]) => ({
    id: String(id),
    label: String(label),
    boards: (keys as string[]).map((key) => {
      const entries = Object.entries(teamStats)
        .map(([teamId, stats]) => {
          const raw = stats[key];
          const value = Array.isArray(raw) ? raw[1] : raw;
          return { competitor: teams.get(teamId), numeric: Number(Array.isArray(raw) ? raw[0] : raw), value: String(value ?? "—") };
        })
        .filter((entry): entry is { competitor: SportTeam; numeric: number; value: string } => Boolean(entry.competitor) && Number.isFinite(entry.numeric))
        .sort((a, b) => b.numeric - a.numeric)
        .slice(0, 10)
        .map(({ competitor, value }) => ({ competitor, value }));
      return {
        id: key,
        label: key.replace(/([A-Z])/g, " $1").trim().toUpperCase(),
        description: `Season ${key.replace(/([A-Z])/g, " $1").toLowerCase()} leaders`,
        entries,
      };
    }),
  }));
}

function footballHubs(): TeamLeagueHubSnapshot[] {
  return (footballPackage.leagues as unknown as Array<{
    slug: string;
    name: string;
    aliases: string[];
    season: { year: number; displayName: string };
    teams: RawTeam[];
    standings: Array<{ teamId: string; rank: number; stats: Record<string, [number | null, string]>; note?: { description: string; color: string } }>;
    leaders: RawLeaderBoard[];
    athletes: Record<string, RawAthlete>;
    teamStats: Record<string, Record<string, unknown>>;
  }>).map((league) => {
    const id = league.slug === "eng.1" ? "epl" : "laliga";
    const teams = new Map(league.teams.map((entry) => [String(entry.id), team(entry)]));
    const columns: LeagueStandingColumn[] = [
      { id: "p", label: "P" }, { id: "w", label: "W" }, { id: "d", label: "D" },
      { id: "l", label: "L" }, { id: "f", label: "F" }, { id: "a", label: "A" },
      { id: "gd", label: "GD" }, { id: "pts", label: "PTS", emphasis: true },
    ];
    const rows = league.standings.map((row) => ({
      rank: row.rank,
      competitor: teams.get(String(row.teamId)) ?? team({ id: row.teamId }),
      metrics: {
        p: row.stats.gamesPlayed?.[1] ?? "—", w: row.stats.wins?.[1] ?? "—",
        d: row.stats.ties?.[1] ?? "—", l: row.stats.losses?.[1] ?? "—",
        f: row.stats.pointsFor?.[1] ?? "—", a: row.stats.pointsAgainst?.[1] ?? "—",
        gd: row.stats.pointDifferential?.[1] ?? "—", pts: row.stats.points?.[1] ?? "—",
      },
      zone: row.note ? { label: row.note.description.toUpperCase(), color: row.note.color } : undefined,
    }));
    return {
      kind: "team",
      id,
      sport: "football",
      name: league.name,
      shortCode: id === "epl" ? "EPL" : "LAL",
      accent: cyan,
      seasonLabel: league.season.displayName,
      seasons: [{ year: league.season.year, label: league.season.displayName, current: true }],
      columns,
      groups: [{ id: "all", label: league.name, shortLabel: "TABLE", rows }],
      leaderCategories: leaderCategories(league.leaders, athleteMap(league.athletes), teams),
      statGroups: statGroups(league.teamStats, teams, "football"),
    };
  });
}

function cricketHub(): TeamLeagueHubSnapshot {
  const league = cricketPackage.leagues[0] as unknown as {
    id: string; name: string; abbreviation: string; season: string; seasonYear: number;
    teams: RawTeam[]; standings: Array<Record<string, number | string>>;
    leaders: RawLeaderBoard[]; athletes: Record<string, RawAthlete>; teamStats: Record<string, Record<string, unknown>>;
  };
  const teams = new Map(league.teams.map((entry) => [String(entry.id), team(entry)]));
  return {
    kind: "team", id: "ipl", sport: "cricket", name: league.name,
    shortCode: league.abbreviation, accent: gold, seasonLabel: `IPL ${league.seasonYear}`,
    seasons: [{ year: league.seasonYear, label: `IPL ${league.seasonYear}`, current: true }],
    columns: [
      { id: "p", label: "P" }, { id: "w", label: "W" }, { id: "l", label: "L" },
      { id: "nrr", label: "NRR" }, { id: "pts", label: "PTS", emphasis: true },
    ],
    groups: [{ id: "all", label: league.name, shortLabel: "TABLE", rows: league.standings.map((row) => ({
      rank: Number(row.rank), competitor: teams.get(String(row.teamId)) ?? team({ id: String(row.teamId) }),
      metrics: { p: row.matchesPlayed, w: row.matchesWon, l: row.matchesLost, nrr: Number(row.netrr) >= 0 ? `+${row.netrr}` : row.netrr, pts: row.matchPoints },
      zone: Number(row.rank) === 4 ? { label: "PLAYOFFS", color: gold } : undefined,
    })) }],
    leaderCategories: leaderCategories(league.leaders, athleteMap(league.athletes), teams),
    statGroups: statGroups(league.teamStats, teams, "cricket"),
  };
}

function nbaHub(): TeamLeagueHubSnapshot {
  const league = nbaPackage.leagues[0] as unknown as {
    name: string; abbreviation: string; season: string; seasonYear: number; teams: RawTeam[];
    conferences: Array<{ label: string; rows: Array<Record<string, number | string>> }>;
    leaders: RawLeaderBoard[]; athletes: Record<string, RawAthlete>; teamStats: Record<string, Record<string, unknown>>;
  };
  const teams = new Map(league.teams.map((entry) => [String(entry.id), team(entry)]));
  return {
    kind: "team", id: "nba", sport: "basketball", name: league.name,
    shortCode: league.abbreviation, accent: gold, seasonLabel: league.season,
    seasons: [{ year: league.seasonYear, label: league.season, current: true }],
    columns: [
      { id: "w", label: "W" }, { id: "l", label: "L" }, { id: "pct", label: "PCT", emphasis: true },
      { id: "gb", label: "GB" }, { id: "l10", label: "L10" }, { id: "strk", label: "STRK" },
    ],
    groups: league.conferences.map((conference, conferenceIndex) => ({
      id: conferenceIndex === 0 ? "east" : "west", label: conference.label,
      shortLabel: conferenceIndex === 0 ? "EAST" : "WEST",
      rows: conference.rows.map((row) => ({
        rank: Number(row.rank), competitor: teams.get(String(row.teamId)) ?? team({ id: String(row.teamId) }),
        metrics: { w: row.wins, l: row.losses, pct: Number(row.winPercent).toFixed(3).replace(/^0/, ""), gb: row["gamesBehind.display"], l10: row["record.lasttengames"], strk: row["streak.display"] },
        zone: Number(row.rank) === 6 ? { label: "PLAYOFFS", color: gold } : Number(row.rank) === 10 ? { label: "PLAY-IN", color: cyan } : undefined,
      })),
    })),
    leaderCategories: leaderCategories(league.leaders, athleteMap(league.athletes), teams),
    statGroups: statGroups(league.teamStats, teams, "basketball"),
  };
}

function f1Hub(): F1LeagueHubSnapshot {
  const constructors = new Map(Object.values(f1Package.constructors).map((entry) => [String(entry.id), entry]));
  const drivers = f1Package.drivers as Record<string, { id: string; displayName: string; abbreviation: string; constructorId: string }>;
  const driverRows = f1Package.standings.drivers.map((row) => {
    const driver = drivers[String(row.driverId)];
    const constructor = constructors.get(driver?.constructorId ?? "");
    return {
      rank: row.rank,
      competitor: team({ id: String(row.driverId), displayName: row.name, abbreviation: driver?.abbreviation, color: constructor?.color }),
      metrics: { pts: row.points, gap: row.rank === 1 ? "—" : `-${f1Package.standings.drivers[0].points - row.points}` },
    };
  });
  const constructorRows = f1Package.standings.constructors.map((row) => {
    const constructor = constructors.get(String(row.constructorId));
    return {
      rank: row.rank,
      competitor: team({ id: String(row.constructorId), displayName: constructor?.displayName, abbreviation: constructor?.name, color: constructor?.color }),
      metrics: { pts: row.points, gap: row.rank === 1 ? "—" : `-${f1Package.standings.constructors[0].points - row.points}` },
    };
  });
  const rounds = f1Package.standings.raceCodes.map((code, index) => ({
    id: `${index + 1}-${code.toLowerCase()}`, label: `ROUND ${index + 1}`, code,
    driverPoints: f1Package.standings.drivers
      .map((row) => ({ name: row.name, points: row.byRace[code as keyof typeof row.byRace] ?? 0 }))
      .sort((a, b) => b.points - a.points).slice(0, 10),
  }));
  return {
    kind: "f1", id: "f1", sport: "motorsport", name: "Formula 1 Championship",
    shortCode: "F1", accent: racing, seasonLabel: `SEASON ${f1Package.standings.season}`,
    seasons: [{ year: f1Package.standings.season, label: String(f1Package.standings.season), current: true }],
    columns: [{ id: "gap", label: "GAP" }, { id: "pts", label: "PTS", emphasis: true }],
    groups: [
      { id: "wdc", label: "World Drivers' Championship", shortLabel: "WDC", rows: driverRows },
      { id: "wcc", label: "World Constructors' Championship", shortLabel: "WCC", rows: constructorRows },
    ],
    leaderCategories: [], statGroups: [], rounds,
  };
}

export const snapshotLeagueHubs: LeagueHubSnapshot[] = [
  ...footballHubs(),
  cricketHub(),
  nbaHub(),
  f1Hub(),
];

type ProfileAthlete = RawAthlete & {
  jersey?: string;
  position?: string;
  role?: string;
  citizenship?: string;
  age?: number;
  headshot?: string;
  stats?: Record<string, number | string>;
};

function statRows(stats: unknown): LeaguePlayerProfile["stats"] {
  if (!stats || typeof stats !== "object") return [];
  const source = stats as Record<string, unknown>;
  const flattened: LeaguePlayerProfile["stats"] = [];
  for (const [group, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [label, raw] of Object.entries(value as Record<string, unknown>)) {
        const display = Array.isArray(raw) ? raw[1] : raw;
        if (display !== null && display !== undefined && display !== "") {
          flattened.push({ group: group.toUpperCase(), label: label.replace(/([A-Z])/g, " $1").trim().toUpperCase(), value: String(display) });
        }
      }
    } else if (value !== null && value !== undefined && value !== "") {
      flattened.push({ group: "SEASON", label: group.replace(/([A-Z])/g, " $1").trim().toUpperCase(), value: String(value) });
    }
  }
  return flattened.slice(0, 24);
}

function profileFromLeague(leagueId: string, rawLeague: unknown, playerId: string): LeaguePlayerProfile | undefined {
  const league = rawLeague as { teams: RawTeam[]; athletes: Record<string, ProfileAthlete>; teamStats?: Record<string, unknown> };
  const athlete = league.athletes?.[playerId];
  if (!athlete) return undefined;
  const teamId = String(athlete.teamId ?? "");
  const rawTeam = league.teams.find((entry) => String(entry.id) === teamId) ?? { id: teamId || "unknown" };
  const name = athlete.displayName ?? athlete.name ?? athlete.fullName ?? `Athlete ${playerId}`;
  const sport = leagueId === "ipl" ? "cricket" : leagueId === "nba" ? "basketball" : "football";
  return {
    id: playerId,
    leagueId,
    name,
    shortName: athlete.shortName ?? athlete.name ?? athlete.displayName ?? `Athlete ${playerId}`,
    role: athlete.position ?? athlete.role ?? "Competitor",
    number: athlete.jersey,
    nationality: athlete.citizenship,
    age: athlete.age,
    image: cardGamePortraitFor(sport, name),
    team: team(rawTeam),
    stats: statRows(athlete.stats),
  };
}

export function leaguePlayerById(leagueId: string, playerId: string): LeaguePlayerProfile | undefined {
  if (leagueId === "epl" || leagueId === "laliga") {
    const slug = leagueId === "epl" ? "eng.1" : "esp.1";
    const league = footballPackage.leagues.find((entry) => entry.slug === slug);
    return league ? profileFromLeague(leagueId, league, playerId) : undefined;
  }
  if (leagueId === "ipl") return profileFromLeague(leagueId, cricketPackage.leagues[0], playerId);
  if (leagueId === "nba") return profileFromLeague(leagueId, nbaPackage.leagues[0], playerId);
  if (leagueId === "f1") {
    const raw = f1Package.drivers[playerId as keyof typeof f1Package.drivers];
    if (!raw) return undefined;
    const constructor = f1Package.constructors[raw.constructorId as keyof typeof f1Package.constructors];
    const standing = f1Package.standings.drivers.find((entry) => String(entry.driverId) === playerId);
    return {
      id: playerId, leagueId, name: raw.displayName, shortName: raw.shortName,
      role: "Formula 1 Driver", number: raw.number, nationality: raw.countryName,
      image: cardGamePortraitFor("motorsport", raw.displayName),
      team: team({ id: raw.constructorId, displayName: constructor?.displayName, abbreviation: constructor?.name, color: constructor?.color }),
      stats: standing ? [
        { group: "CHAMPIONSHIP", label: "RANK", value: `P${standing.rank}` },
        { group: "CHAMPIONSHIP", label: "POINTS", value: String(standing.points) },
        { group: "CHAMPIONSHIP", label: "BEST WEEKEND", value: Math.max(...Object.values(standing.byRace)).toString() },
      ] : [],
    };
  }
  return undefined;
}

export const allLeaguePlayerParams = [
  ...footballPackage.leagues.flatMap((league) => Object.keys(league.athletes).map((playerId) => ({ leagueId: league.slug === "eng.1" ? "epl" : "laliga", playerId }))),
  ...Object.keys(cricketPackage.leagues[0].athletes).map((playerId) => ({ leagueId: "ipl", playerId })),
  ...Object.keys(nbaPackage.leagues[0].athletes).map((playerId) => ({ leagueId: "nba", playerId })),
  ...Object.keys(f1Package.drivers).map((playerId) => ({ leagueId: "f1", playerId })),
];

export function leaguePlayersForTeam(leagueId: string, teamId: string): LeaguePlayerProfile[] {
  return allLeaguePlayerParams
    .filter((entry) => entry.leagueId === leagueId)
    .map((entry) => leaguePlayerById(entry.leagueId, entry.playerId))
    .filter((entry): entry is LeaguePlayerProfile => entry !== undefined && entry.team.id === teamId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

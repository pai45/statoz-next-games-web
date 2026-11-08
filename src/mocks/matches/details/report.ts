import type {
  BattingLine,
  BowlingLine,
  BoxScore,
  FeedEvent,
  InningsLine,
  MatchDetailStat,
  MatchIntel,
  MatchPulse,
  MatchScorer,
  MatchTrace,
  SportMatch,
  StatLeader,
} from "@/domain/matches";

import { matchLeagues } from "../definitions";

/**
 * The demo match report behind the STATS tab.
 *
 * The app reads a live provider package per sport; the web has fixtures, so
 * every figure here is either read straight off the fixture or expanded from
 * its seed. That keeps a report stable between renders and consistent with the
 * scoreline it sits under — a trace never disagrees with the final score.
 */

const venues: Record<string, { venue: string; city: string; country: string; capacity: number }> = {
  epl: { venue: "Stamford Bridge", city: "London", country: "England", capacity: 40173 },
  fifa: { venue: "MetLife Stadium", city: "East Rutherford", country: "USA", capacity: 82500 },
  ipl: { venue: "Wankhede Stadium", city: "Mumbai", country: "India", capacity: 33108 },
  t20i: { venue: "Melbourne Cricket Ground", city: "Melbourne", country: "Australia", capacity: 100024 },
  wnba: { venue: "College Park Center", city: "Arlington", country: "USA", capacity: 7000 },
  nba: { venue: "Crypto.com Arena", city: "Los Angeles", country: "USA", capacity: 19068 },
  wimbledon: { venue: "Centre Court", city: "London", country: "England", capacity: 14979 },
  atp: { venue: "Court Philippe-Chatrier", city: "Paris", country: "France", capacity: 15225 },
  wta: { venue: "Court Philippe-Chatrier", city: "Paris", country: "France", capacity: 15225 },
  f1: { venue: "Circuit de Spa-Francorchamps", city: "Stavelot", country: "Belgium", capacity: 70000 },
  indy: { venue: "World Wide Technology Raceway", city: "Madison", country: "USA", capacity: 62000 },
};

const seasons: Record<string, string> = {
  epl: "Premier League 2026/27",
  fifa: "FIFA World Cup 2026",
  ipl: "Indian Premier League 2026",
  t20i: "T20 International Series 2026",
  wnba: "WNBA 2026 Regular Season",
  nba: "NBA 2026/27 Regular Season",
  wimbledon: "Wimbledon 2026",
  atp: "ATP Tour 2026",
  wta: "WTA Tour 2026",
  f1: "FIA Formula One World Championship 2026",
  indy: "IndyCar Series 2026",
};

export type ReportInput = {
  match: SportMatch;
  seed: number;
  stats: MatchDetailStat[];
  scoreRows: Array<{ label: string; home: string; away: string }>;
};

export type MatchReport = {
  pulse: MatchPulse;
  intel: MatchIntel;
  trace?: MatchTrace;
  chase?: MatchTrace;
  scorers?: MatchScorer[];
  leaders?: StatLeader[];
  boxScore?: BoxScore;
  innings?: InningsLine[];
  feed?: FeedEvent[];
};

export function buildReport(input: ReportInput): MatchReport {
  switch (input.match.sport) {
    case "football":
      return footballReport(input);
    case "basketball":
      return basketballReport(input);
    case "cricket":
      return cricketReport(input);
    case "tennis":
      return tennisReport(input);
    case "motorsport":
      return motorsportReport(input);
  }
}

/* ---- Shared pieces --------------------------------------------------------- */

function statusLabel(match: SportMatch): string {
  if (match.status === "live") return match.liveMinute != null ? `LIVE ${match.liveMinute}'` : "LIVE";
  return match.status === "finished" ? "FULL TIME" : "PRE-MATCH";
}

function leagueName(match: SportMatch): string {
  return matchLeagues.find((league) => league.id === match.leagueId)?.name ?? match.leagueId.toUpperCase();
}

function ground(match: SportMatch) {
  return venues[match.leagueId] ?? { venue: "Venue awaiting feed", city: "—", country: "—", capacity: 0 };
}

function intelFor(match: SportMatch, seed: number, extra: Array<{ label: string; value: string }> = []): MatchIntel {
  const place = ground(match);
  const attendance = match.status === "scheduled" || place.capacity === 0
    ? undefined
    : compact(Math.round(place.capacity * (0.82 + ((seed % 17) / 100))));
  return {
    competition: leagueName(match),
    season: seasons[match.leagueId] ?? "Live competition feed",
    venue: `${place.venue} // ${place.city}, ${place.country}`,
    attendance,
    facts: [
      { label: "STATUS", value: statusLabel(match) },
      ...extra,
    ],
    resultNote: match.resultLine,
  };
}

/** The 24-hour clock label a report heads its kickoff metric with. */
function clockLabel(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function compact(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

/** A stable pseudo-random walk, so a trace looks played rather than drawn. */
function walk(seed: number, length: number, start: number, swing: number): number[] {
  const out: number[] = [];
  let value = start;
  let state = seed | 0;
  for (let index = 0; index < length; index += 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    value += ((state % 1000) / 1000 - 0.5) * swing;
    out.push(Math.round(Math.max(0, value) * 10) / 10);
  }
  return out;
}

/**
 * A cumulative run curve that lands exactly on `total`.
 *
 * A straight line between 0 and the final score is not a worm — the shape is
 * the point. Overs are weighted so the powerplay and the death carry more than
 * the middle, then jittered from the seed and normalised back onto the total.
 */
function runCurve(total: number, overs: number, seed: number): number[] {
  const weights: number[] = [];
  let state = seed | 0;
  for (let over = 0; over < overs; over += 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const phase = over < 6 ? 1.25 : over >= overs - 5 ? 1.4 : 0.85;
    weights.push(phase * (0.6 + (state % 1000) / 1250));
  }
  const sum = weights.reduce((carry, weight) => carry + weight, 0) || 1;
  let running = 0;
  return weights.map((weight, index) => {
    running += (weight / sum) * total;
    return index === overs - 1 ? total : Math.round(running);
  });
}

const firstNames = ["Mason", "Jordan", "Alex", "Riley", "Taylor", "Morgan", "Casey", "Cameron", "Jamie", "Avery", "Drew"];

function player(team: string, seed: number, offset: number): string {
  return `${team.split(" ")[0]} ${firstNames[(seed + offset) % firstNames.length]}`;
}

/* ---- Football -------------------------------------------------------------- */

function footballReport({ match, seed, stats }: ReportInput): MatchReport {
  const possession = stats[0] ?? { label: "POSSESSION", homeValue: 50, awayValue: 50, home: "50", away: "50" };
  const total = possession.homeValue + possession.awayValue || 1;
  const homeShare = Math.round((possession.homeValue / total) * 100);
  const homeLeads = homeShare >= 50;
  const homeScore = Number(match.homeScore ?? 0);
  const awayScore = Number(match.awayScore ?? 0);

  const ticks = Array.from({ length: 19 }, (_, index) => `${index * 5}'`);
  const trace: MatchTrace = {
    title: "TERRITORIAL PRESSURE",
    unit: "PRESSURE",
    ticks,
    home: walk(seed, ticks.length, 52, 26),
    away: walk(seed + 977, ticks.length, 48, 26),
    markers: [],
  };

  const scorers: MatchScorer[] = [];
  if (match.status !== "scheduled") {
    const minutes = [12, 27, 38, 54, 63, 71, 78, 84, 90];
    let cursor = 0;
    for (let goal = 0; goal < homeScore; goal += 1) {
      const minute = minutes[(seed + cursor * 3) % minutes.length];
      scorers.push({ minute: `${minute}'`, player: player(match.home.name, seed, goal), side: "home", note: goal === 0 ? "Opened the scoring" : "Assisted" });
      cursor += 1;
    }
    for (let goal = 0; goal < awayScore; goal += 1) {
      const minute = minutes[(seed + cursor * 5) % minutes.length];
      scorers.push({ minute: `${minute}'`, player: player(match.away.name, seed, goal + 4), side: "away", note: "From open play" });
      cursor += 1;
    }
    scorers.sort((a, b) => Number.parseInt(a.minute, 10) - Number.parseInt(b.minute, 10));
    trace.markers = scorers.map((scorer, index) => ({
      index: Math.min(ticks.length - 1, Math.round(Number.parseInt(scorer.minute, 10) / 5)),
      label: `${scorer.player} ${scorer.minute}`,
      side: scorer.side,
      decisive: index === scorers.length - 1,
    }));
  }

  return {
    pulse: {
      value: `${homeLeads ? homeShare : 100 - homeShare}%`,
      label: `${homeLeads ? match.home.shortName : match.away.shortName} CONTROL`,
      caption: "SHARE OF POSSESSION",
      side: homeLeads ? "home" : "away",
      statusLabel: statusLabel(match),
      delta: match.status === "live" ? Math.round((homeShare - 50) * 10) / 10 : undefined,
      deltaSuffix: "PRESSURE",
      deltaDecimals: 1,
      subtitle: seasons[match.leagueId] ?? "Live competition feed",
      metrics: [
        { label: "SCORE", value: `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}` },
        { label: "KICKOFF", value: clockLabel(match.kickoff) },
      ],
    },
    intel: intelFor(match, seed, [
      { label: "SHOTS", value: `${stats[1]?.home ?? "—"} - ${stats[1]?.away ?? "—"}` },
      { label: "ON TARGET", value: `${stats[2]?.home ?? "—"} - ${stats[2]?.away ?? "—"}` },
    ]),
    trace,
    scorers,
  };
}

/* ---- Basketball ------------------------------------------------------------ */

function basketballReport({ match, seed, scoreRows }: ReportInput): MatchReport {
  const homeScore = Number(match.homeScore ?? 0);
  const awayScore = Number(match.awayScore ?? 0);
  const margin = homeScore - awayScore;
  const homeFavoured = margin >= 0;
  const probability = match.status === "scheduled"
    ? 50 + ((seed % 13) - 6)
    : Math.min(97, Math.max(3, 50 + margin * 3));

  const ticks = ["Q1", "Q1", "Q2", "Q2", "HT", "Q3", "Q3", "Q4", "Q4", "FIN"];
  const home = walk(seed, ticks.length, 50, 18).map((value) => Math.min(97, Math.max(3, value)));
  const trace: MatchTrace = {
    title: "WIN PROBABILITY",
    unit: "%",
    ticks,
    home: [...home.slice(0, -1), homeFavoured ? probability : 100 - probability],
    away: [...home.slice(0, -1).map((value) => 100 - value), homeFavoured ? 100 - probability : probability],
  };

  const leaders: StatLeader[] = [
    { name: player(match.home.name, seed, 1), side: "home", line: `${18 + (seed % 11)} PTS`, note: `${4 + (seed % 5)} REB · ${3 + (seed % 4)} AST` },
    { name: player(match.away.name, seed, 2), side: "away", line: `${16 + ((seed >> 2) % 12)} PTS`, note: `${5 + (seed % 4)} REB · ${2 + (seed % 6)} AST` },
    { name: player(match.home.name, seed, 5), side: "home", line: `${9 + (seed % 7)} AST`, note: "Playmaker of the night" },
  ];

  const boxScore: BoxScore = {
    columns: ["MIN", "PTS", "REB", "AST"],
    rows: Array.from({ length: 8 }, (_, index) => {
      const side = index < 4 ? ("home" as const) : ("away" as const);
      const team = side === "home" ? match.home.name : match.away.name;
      return {
        name: player(team, seed, index),
        side,
        values: [
          String(22 + ((seed + index * 3) % 16)),
          String(6 + ((seed + index * 7) % 18)),
          String(1 + ((seed + index * 5) % 9)),
          String(((seed + index * 11) % 8)),
        ],
      };
    }),
  };

  return {
    pulse: {
      value: `${Math.round(probability)}%`,
      label: `${homeFavoured ? match.home.shortName : match.away.shortName} WIN CHANCE`,
      caption: match.status === "finished" ? "FINAL MODEL READ" : "LIVE MODEL READ",
      side: homeFavoured ? "home" : "away",
      statusLabel: statusLabel(match),
      delta: match.status === "live" ? margin : undefined,
      deltaSuffix: "MARGIN",
      subtitle: seasons[match.leagueId] ?? "Live competition feed",
      metrics: [
        { label: "SCORE", value: `${match.homeScore ?? "-"} - ${match.awayScore ?? "-"}` },
        { label: "PERIOD", value: scoreRows.at(-1)?.label ?? "—" },
      ],
    },
    intel: intelFor(match, seed, [
      { label: "MARGIN", value: match.status === "scheduled" ? "—" : `${Math.abs(margin)} PTS` },
      { label: "PACE", value: `${92 + (seed % 14)} POSS` },
    ]),
    trace,
    leaders,
    boxScore,
  };
}

/* ---- Cricket --------------------------------------------------------------- */

function parseInnings(score: SportMatch["homeScore"]): { runs: number; wickets: number; overs: number } | null {
  if (typeof score !== "string") return null;
  const parsed = /^(\d+)\/(\d+)(?:\s*\(([\d.]+)\s*ov\))?/.exec(score.trim());
  if (!parsed) return null;
  return { runs: Number(parsed[1]), wickets: Number(parsed[2]), overs: Number(parsed[3] ?? 20) };
}

const dismissals = ["c & b", "b", "lbw", "c keeper b", "run out", "st keeper b", "c mid-on b"];

/**
 * The batting card behind an innings summary: the wickets that fell, in order,
 * then whoever is still in. Runs are dealt down from the innings total so the
 * card always adds up to the score above it.
 */
function battingCard(
  batting: string,
  bowling: string,
  seed: number,
  runs: number,
  wickets: number,
): BattingLine[] {
  const out = Math.min(wickets, 9);
  const lines: BattingLine[] = [];
  let left = runs;
  const count = Math.min(out + 2, 11);
  for (let index = 0; index < count; index += 1) {
    const last = index === count - 1;
    const share = last ? left : Math.max(1, Math.round((left * (3 + ((seed + index * 7) % 5))) / 14));
    const scored = Math.max(0, Math.min(left, share));
    left -= scored;
    lines.push({
      name: player(batting, seed, index + 1),
      dismissal:
        index < out
          ? `${dismissals[(seed + index) % dismissals.length]} ${player(bowling, seed, (index % 4) + 1)}`
          : undefined,
      runs: scored,
      balls: Math.max(1, scored + ((seed + index * 5) % 9) - 3),
      fours: Math.floor(scored / 9),
      sixes: Math.floor(scored / 22),
    });
  }
  return lines;
}

/** Four bowlers, sharing the wickets that fell. */
function bowlingCard(bowling: string, seed: number, runs: number, wickets: number): BowlingLine[] {
  return Array.from({ length: 4 }, (_, index) => ({
    name: player(bowling, seed, index + 1),
    overs: `${3 + ((seed + index) % 2)}.${(seed + index) % 6}`,
    maidens: (seed + index) % 3 === 0 ? 1 : 0,
    runs: Math.max(6, Math.round(runs / 4) + ((seed + index * 3) % 11) - 5),
    wickets: index < wickets % 4 ? 1 + ((seed + index) % 2) : 0,
  }));
}

function cricketReport({ match, seed }: ReportInput): MatchReport {
  const home = parseInnings(match.homeScore);
  const away = parseInnings(match.awayScore);
  const chasing = home && away && away.runs < home.runs ? "away" : "home";
  const target = home && away ? Math.max(home.runs, away.runs) + 1 : 0;

  const innings: InningsLine[] = [];
  if (home) {
    innings.push({
      team: match.home.name,
      side: "home",
      score: `${home.runs}/${home.wickets}`,
      overs: `${home.overs} ov`,
      runRate: (home.runs / Math.max(1, home.overs)).toFixed(2),
      topBat: `${player(match.home.name, seed, 1)} ${38 + (seed % 30)}`,
      topBowl: `${player(match.away.name, seed, 3)} ${2 + (seed % 3)}/${18 + (seed % 14)}`,
      batting: battingCard(match.home.name, match.away.name, seed, home.runs, home.wickets),
      bowling: bowlingCard(match.away.name, seed, home.runs, home.wickets),
    });
  }
  if (away) {
    innings.push({
      team: match.away.name,
      side: "away",
      score: `${away.runs}/${away.wickets}`,
      overs: `${away.overs} ov`,
      runRate: (away.runs / Math.max(1, away.overs)).toFixed(2),
      topBat: `${player(match.away.name, seed, 2)} ${31 + (seed % 26)}`,
      topBowl: `${player(match.home.name, seed, 4)} ${2 + ((seed >> 1) % 3)}/${16 + (seed % 17)}`,
      batting: battingCard(match.away.name, match.home.name, seed + 5, away.runs, away.wickets),
      bowling: bowlingCard(match.home.name, seed + 5, away.runs, away.wickets),
      // The side batting second is chasing whatever the first innings set.
      target: home ? home.runs + 1 : undefined,
    });
  }

  const overs = Array.from({ length: 20 }, (_, index) => `${index + 1}`);
  const homeCurve = runCurve(home?.runs ?? 150, overs.length, seed);
  const awayCurve = runCurve(away?.runs ?? 140, overs.length, seed + 613);
  const trace: MatchTrace = {
    title: "RUN RACE",
    unit: "RUNS",
    ticks: overs,
    home: homeCurve,
    away: awayCurve,
    markers: home
      ? Array.from({ length: Math.min(4, home.wickets) }, (_, index) => ({
          index: 3 + ((seed + index * 4) % 15),
          label: `Wicket ${index + 1}`,
          side: "home" as const,
          decisive: index === Math.min(4, home.wickets) - 1,
        }))
      : [],
  };

  const chase: MatchTrace = {
    title: "CHASE VS REQUIRED",
    unit: "RUN RATE",
    ticks: overs,
    // What the chase was actually scoring at, over by over.
    home: awayCurve.map((runs, index) => Math.round((runs / (index + 1)) * 10) / 10),
    // And what it needed from there — the two lines crossing is the story.
    away: awayCurve.map((runs, index) => {
      const remaining = Math.max(1, overs.length - index - 1);
      return Math.round((Math.max(0, target - runs) / remaining) * 10) / 10;
    }),
  };

  const feed: FeedEvent[] = Array.from({ length: 8 }, (_, index) => {
    const over = 20 - index;
    const runs = (seed + index * 7) % 7;
    const wicket = runs === 5;
    return {
      marker: `${over}.${(index % 6) + 1}`,
      text: wicket
        ? `${player(match.away.name, seed, index)} b ${player(match.home.name, seed, index + 2)}`
        : `${runs} run${runs === 1 ? "" : "s"} to ${player(match.away.name, seed, index)}`,
      kind: wicket ? "wicket" : runs >= 4 ? "score" : "note",
    };
  });

  const chaseRate = away && chasing === "away" ? away.runs / Math.max(1, away.overs) : home ? home.runs / Math.max(1, home.overs) : 0;

  return {
    pulse: {
      // The hero is the innings itself — runs for wickets, without the overs,
      // which ride the caption instead.
      value: chasing === "away" && away
        ? `${away.runs}/${away.wickets}`
        : home
          ? `${home.runs}/${home.wickets}`
          : "—",
      label: `${chasing === "away" ? match.away.shortName : match.home.shortName} INNINGS`,
      caption: target > 0 ? `CHASING ${target}` : "FIRST INNINGS",
      side: chasing,
      statusLabel: statusLabel(match),
      delta: Math.round(chaseRate * 100) / 100,
      deltaSuffix: "RUN RATE",
      deltaDecimals: 2,
      subtitle: seasons[match.leagueId] ?? "Live competition feed",
      metrics: [
        { label: "FORMAT", value: "T20" },
        { label: "TARGET", value: target > 0 ? String(target) : "—", gold: true },
      ],
    },
    intel: intelFor(match, seed, [
      { label: "TOSS", value: `${match.home.shortName} chose to bat` },
      { label: "SITE", value: "HOME" },
    ]),
    trace,
    chase,
    innings,
    feed,
  };
}

/* ---- Tennis ---------------------------------------------------------------- */

function tennisReport({ match, seed, stats }: ReportInput): MatchReport {
  const sets = match.tennisSets ?? [];
  const homeSets = sets.filter((set) => set.homeScore > set.awayScore).length;
  const awaySets = sets.length - homeSets;
  const homeLeads = homeSets >= awaySets;

  const ticks = sets.length > 0 ? sets.map((_, index) => `SET ${index + 1}`) : ["SET 1", "SET 2", "SET 3"];
  return {
    pulse: {
      value: sets.length > 0 ? `${homeSets}-${awaySets}` : "0-0",
      label: `${homeLeads ? match.home.shortName : match.away.shortName} SETS`,
      caption: match.status === "finished" ? "MATCH COMPLETE" : "SETS WON",
      side: homeLeads ? "home" : "away",
      statusLabel: statusLabel(match),
      subtitle: seasons[match.leagueId] ?? "Live competition feed",
      metrics: [
        { label: "GAMES", value: `${sets.reduce((sum, set) => sum + set.homeScore, 0)} - ${sets.reduce((sum, set) => sum + set.awayScore, 0)}` },
        { label: "START", value: clockLabel(match.kickoff) },
      ],
    },
    intel: intelFor(match, seed, [
      { label: "ACES", value: `${stats[0]?.home ?? "—"} - ${stats[0]?.away ?? "—"}` },
      { label: "1ST SERVE", value: `${stats[3]?.home ?? "—"}% - ${stats[3]?.away ?? "—"}%` },
    ]),
    trace: {
      title: "GAMES WON BY SET",
      unit: "GAMES",
      ticks,
      home: sets.length > 0 ? sets.map((set) => set.homeScore) : [0, 0, 0],
      away: sets.length > 0 ? sets.map((set) => set.awayScore) : [0, 0, 0],
    },
  };
}

/* ---- Motorsport ------------------------------------------------------------ */

function motorsportReport({ match, seed }: ReportInput): MatchReport {
  const laps = 44 + (seed % 20);
  return {
    pulse: {
      value: match.status === "scheduled" ? "P1" : "1:12.844",
      label: match.status === "scheduled" ? "POLE SITTER" : "FASTEST LAP",
      caption: match.home.name.toUpperCase(),
      side: "gold",
      statusLabel: statusLabel(match),
      subtitle: seasons[match.leagueId] ?? "Live competition feed",
      metrics: [
        { label: "LAPS", value: String(laps) },
        { label: "LIGHTS OUT", value: clockLabel(match.kickoff) },
      ],
    },
    intel: intelFor(match, seed, [
      { label: "LAPS", value: String(laps) },
      { label: "PIT WINDOW", value: `LAP ${18 + (seed % 8)}-${26 + (seed % 8)}` },
    ]),
  };
}

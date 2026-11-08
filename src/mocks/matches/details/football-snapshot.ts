import type { MatchDetailScoreboard, MatchShot, SportMatch } from "@/domain/matches";

import snapshot from "../../snapshots/card-game/football-revamp.json";

function placement(text: string): MatchShot["goalPlacement"] {
  if (/blocked/i.test(text)) return null;
  const horizontal = /left/i.test(text) ? 24 : /right/i.test(text) ? 76 : 50;
  const vertical = /top|high/i.test(text) ? 24 : /bottom|low/i.test(text) ? 76 : 50;
  const label = [/top/i.test(text) ? "TOP" : /bottom/i.test(text) ? "BOTTOM" : "CENTRE", /left/i.test(text) ? "LEFT" : /right/i.test(text) ? "RIGHT" : "CENTRE"].join(" ");
  return { x: horizontal, y: vertical, label };
}

function outcome(kind: string): MatchShot["outcome"] {
  if (kind === "goal") return "goal";
  if (kind.includes("blocked")) return "blocked";
  if (kind.includes("on-target")) return "saved";
  return "missed";
}

function heatmapPoints(values: number[], period: 1 | 2) {
  return values.reduce<Array<{ x: number; y: number; intensity: number; period: 1 | 2 }>>((points, value, index) => {
    if (index % 2 === 0 && values[index + 1] !== undefined) {
      points.push({ x: Number(value), y: Number(values[index + 1]), intensity: 1, period });
    }
    return points;
  }, []);
}

const shots: MatchShot[] = snapshot.commentary
  .filter((entry) => entry.fieldPositionX !== null && entry.fieldPositionX !== undefined && (entry.kind === "goal" || String(entry.kind).startsWith("shot-")))
  .map((entry) => ({
    id: String(entry.playId),
    minute: Number.parseInt(entry.minute ?? "0", 10),
    period: entry.period === 2 ? 2 : 1,
    side: entry.side === "away" ? "away" : "home",
    player: entry.players?.[0] ?? "Unknown player",
    x: Number(entry.fieldPositionX),
    y: Number(entry.fieldPositionY),
    outcome: outcome(String(entry.kind)),
    detail: entry.text,
    goalPlacement: placement(entry.text),
  }));

export const footballSnapshotPlayerIds = snapshot.teams.flatMap((source) => source.players.map((player) => String(player.id)));

export function applyFootballSnapshot(match: SportMatch, scoreboard: MatchDetailScoreboard): void {
  if (match.id !== snapshot.espnEventId) return;
  scoreboard.facts = [
    { label: "VENUE", value: snapshot.matchDetails.location.venue },
    { label: "ATTENDANCE", value: String(snapshot.matchDetails.attendance) },
  ];
  scoreboard.intel = {
    competition: snapshot.matchDetails.league,
    season: snapshot.matchDetails.season,
    venue: snapshot.matchDetails.location.venue,
    attendance: String(snapshot.matchDetails.attendance),
    facts: [],
  };
  scoreboard.stats = snapshot.topStats.filter((stat) => stat.available).map((stat) => ({
    label: stat.label.toUpperCase(),
    home: stat.home.display,
    away: stat.away.display,
    homeValue: stat.home.share,
    awayValue: stat.away.share,
  }));
  scoreboard.timeline = snapshot.timeline.filter((entry) => entry.kind !== "start-2nd-half").map((entry) => ({
    minute: entry.minute,
    ...(entry.side === "home" || entry.side === "away" ? { side: entry.side } : {}),
    type: entry.kind === "goal" ? "goal" : entry.kind === "red-card" ? "red" : entry.kind === "substitution" ? "substitution" : "yellow",
    player: entry.player ?? entry.playerIn ?? entry.team ?? entry.label ?? "Match event",
    ...(entry.kind === "substitution" && entry.playerOut
      ? { secondary: entry.playerOut }
      : entry.assist
        ? { secondary: entry.assist }
        : {}),
    marker: entry.marker,
    label: entry.label,
    scoreDisplay: entry.score?.display,
    ...(entry.text ? { description: entry.text } : {}),
  }));
  scoreboard.commentary = snapshot.commentary.map((entry, index) => ({
    minute: entry.minute ?? "—",
    text: entry.text,
    sequence: entry.sequence ?? index,
    ...(entry.kind ? { kind: String(entry.kind) } : {}),
    ...(entry.side === "home" || entry.side === "away" ? { side: entry.side } : {}),
    ...(entry.team ? { teamName: entry.team } : {}),
    ...(entry.players?.length ? { players: entry.players } : {}),
  }));
  scoreboard.trace = {
    title: "TERRITORIAL PRESSURE",
    unit: "PRESSURE",
    ticks: snapshot.momentum.series.map((entry) => `${entry.minute}'`),
    home: snapshot.momentum.series.map((entry) => entry.home),
    away: snapshot.momentum.series.map((entry) => entry.away),
    markers: snapshot.momentum.goals.map((goal, index) => ({ index: goal.axis, label: `${goal.player} ${goal.clock}`, side: goal.side === "away" ? "away" : "home", decisive: index === snapshot.momentum.goals.length - 1 })),
  };
  scoreboard.shots = shots;
  const lineups = snapshot.teams.map((source) => ({
    formation: source.formation ?? "4-3-3",
    confirmed: source.lineupsConfirmed,
    players: source.players.filter((player) => player.starter).map((player) => ({
      name: player.name,
      shortName: player.shortName,
      number: Number(player.jersey) || 0,
      role: player.positionName,
      captain: false,
      formationPlace: Number(player.formationPlace) || undefined,
    })),
    substitutes: source.players.filter((player) => !player.starter).map((player) => ({
      name: player.name,
      shortName: player.shortName,
      number: Number(player.jersey) || 0,
      role: player.positionName,
    })),
  }));
  if (lineups[0]) scoreboard.homeLineup = lineups[0];
  if (lineups[1]) scoreboard.awayLineup = lineups[1];
  scoreboard.players = snapshot.teams.flatMap((source) => source.players.map((player) => ({
    id: String(player.id), name: player.name, shortName: player.shortName, teamId: source.id,
    role: player.positionName, number: player.jersey,
    stats: snapshot.playerStatKeys.map((label, index) => ({ label: label.replace(/([A-Z])/g, " $1").toUpperCase(), value: String(player.stats?.[index] ?? "—") })).filter((stat) => stat.value !== "—"),
    heatmap: [
      ...heatmapPoints(player.t1 ?? [], 1),
      ...heatmapPoints(player.t2 ?? [], 2),
    ],
  }))) as MatchDetailScoreboard["players"];
}

import type { MatchDetailScoreboard, MatchPlayerDossier, RunRatePoint, SportMatch } from "@/domain/matches";

import snapshot from "../../snapshots/card-game/cricket-revamp.json";

const statLabel = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
const display = (value: number | string | null) => value == null ? "—" : String(value);

function playerDossiers(): MatchPlayerDossier[] {
  return snapshot.teams.flatMap((team) => team.players.map((player) => {
    const values = snapshot.playerStats[player.id as keyof typeof snapshot.playerStats] as Array<number | string | null> | undefined;
    const tape = snapshot.commentary
      .filter((ball) => ball.batter === player.name || ball.bowler === player.name)
      .map((ball) => ({
        marker: ball.over,
        text: `${ball.shortText} // ${ball.score}`,
        kind: ball.wicket ? "wicket" as const : ball.boundary ? "score" as const : "note" as const,
      }));
    return {
      id: player.id,
      name: player.fullName || player.name,
      shortName: player.battingName,
      teamId: team.id,
      role: player.role,
      stats: (values ?? []).map((value, index) => ({ label: statLabel(snapshot.playerStatKeys[index] ?? `STAT ${index + 1}`), value: display(value) })).filter((stat) => stat.value !== "—"),
      inningsTape: tape,
    };
  }));
}

function ratePoint(point: (typeof snapshot.inningsRateProgress)[number]["points"][number], target?: number): RunRatePoint {
  const balls = Math.max(1, point.legalBall);
  const overs = balls / 6;
  const remaining = Math.max(1, 120 - balls);
  return {
    over: balls / 6,
    actual: Number((point.runs / overs).toFixed(2)),
    ...(target == null ? {} : { required: Number((Math.max(0, target - point.runs) / (remaining / 6)).toFixed(2)) }),
    ...(point.boundary === 4 || point.boundary === 6 ? { boundary: point.boundary } : {}),
  };
}

export const cricketSnapshotPlayerIds = snapshot.teams.flatMap((team) => team.players.map((player) => player.id));

export function applyCricketSnapshot(match: SportMatch, scoreboard: MatchDetailScoreboard): void {
  if (match.id !== snapshot.espnEventId) return;
  scoreboard.facts = [
    { label: "VENUE", value: snapshot.matchDetails.location.venue },
    { label: "TOSS", value: `${snapshot.matchDetails.toss.team} chose to ${snapshot.matchDetails.toss.decision}` },
    { label: "PLAYER OF THE MATCH", value: snapshot.matchDetails.playerOfTheMatch.name },
  ];
  scoreboard.intel = {
    competition: `${snapshot.matchDetails.league} // ${snapshot.matchDetails.stage}`,
    season: String(snapshot.matchDetails.season),
    venue: snapshot.matchDetails.location.venue,
    facts: [
      { label: "FORMAT", value: snapshot.matchDetails.format },
      { label: "TOSS", value: `${snapshot.matchDetails.toss.team} // ${snapshot.matchDetails.toss.decision.toUpperCase()}` },
    ],
    resultNote: snapshot.matchDetails.result,
  };
  scoreboard.stats = snapshot.teamStats.filter((stat) => stat.available).map((stat) => ({
    label: stat.label.toUpperCase(),
    home: display(stat.home),
    away: display(stat.away),
    homeValue: Number(stat.home),
    awayValue: Number(stat.away),
  }));
  scoreboard.scoreRows = snapshot.innings.map((entry) => ({ label: `${entry.innings === 1 ? "1ST" : "2ND"} INNINGS`, home: entry.teamId === match.home.id ? entry.score : "—", away: entry.teamId === match.away.id ? entry.score : "—" }));
  scoreboard.innings = snapshot.scorecard.map((card) => ({
    team: card.battingTeam,
    side: card.battingTeamId === match.home.id ? "home" : "away",
    score: card.score,
    overs: `${card.overs} ov`,
    runRate: String(card.runRate),
    topBat: card.batting.slice().sort((a, b) => b.runs - a.runs)[0]?.score ?? "—",
    topBowl: card.bowling.slice().sort((a, b) => b.wickets - a.wickets)[0]?.figures ?? "—",
    batting: card.batting.map((player) => ({ name: player.name, dismissal: player.notOut ? undefined : player.dismissal, runs: player.runs, balls: player.balls, fours: player.fours, sixes: player.sixes })),
    bowling: card.bowling.map((player) => ({ name: player.name, overs: String(player.overs), maidens: player.maidens, runs: player.runs, wickets: player.wickets })),
    ...(card.target == null ? {} : { target: card.target }),
  }));
  const scoreAtOver = (entry: (typeof snapshot.inningsProgress)[number], over: number) => entry.points.filter((point) => Number(point.over) <= over).at(-1)?.runs ?? 0;
  const maxOvers = Math.max(...snapshot.inningsProgress.map((entry) => Math.ceil(entry.points.at(-1)?.over ?? 0)), 1);
  const ticks = Array.from({ length: maxOvers }, (_, index) => String(index + 1));
  const homeProgress = snapshot.inningsProgress.find((entry) => entry.teamId === match.home.id);
  const awayProgress = snapshot.inningsProgress.find((entry) => entry.teamId === match.away.id);
  scoreboard.trace = homeProgress && awayProgress ? {
    title: "INNINGS RACE",
    unit: "RUNS",
    ticks,
    home: ticks.map((_, index) => scoreAtOver(homeProgress, index + 1)),
    away: ticks.map((_, index) => scoreAtOver(awayProgress, index + 1)),
    markers: [...homeProgress.points.map((point) => point.wicket ? { index: Math.max(0, Math.ceil(point.over) - 1), label: `${match.home.shortName} wicket ${point.over}`, side: "home" as const } : null), ...awayProgress.points.map((point) => point.wicket ? { index: Math.max(0, Math.ceil(point.over) - 1), label: `${match.away.shortName} wicket ${point.over}`, side: "away" as const } : null)].filter((value): value is NonNullable<typeof value> => value !== null),
  } : undefined;
  scoreboard.runRate = snapshot.inningsRateProgress.map((entry) => ({
    innings: entry.innings === 1 ? 1 : 2,
    teamId: entry.points[0]?.teamId ?? "",
    points: entry.points.map((point) => ({
      ...ratePoint(point, entry.innings === 2 ? snapshot.matchDetails.innings[1].target ?? undefined : undefined),
      ...(point.legalBall % 6 === 0 && snapshot.inningsProgress.find((progress) => progress.innings === entry.innings)?.points.find((progress) => progress.over === point.legalBall / 6)?.wicket ? { wicket: true } : {}),
    })),
  }));
  scoreboard.feed = snapshot.commentary.map((ball) => ({ marker: ball.over, text: `${ball.shortText} // ${ball.text}`, kind: ball.wicket ? "wicket" : ball.boundary ? "score" : "note", teamId: snapshot.matchDetails.innings[1].teamId }));
  scoreboard.players = playerDossiers();
}

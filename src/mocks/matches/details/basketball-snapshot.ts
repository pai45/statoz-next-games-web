import type { BasketballScoringEvent, MatchDetailScoreboard, SportMatch } from "@/domain/matches";

import snapshot from "../../snapshots/card-game/basketball-revamp.json";

const fixtureId = "basketball-revamp-20260614-ny-sa";
const shown = (value: number, percentage = false) => `${Number.isInteger(value) ? value : value.toFixed(1)}${percentage ? "%" : ""}`;

function scoringEvents(): BasketballScoringEvent[] {
  return snapshot.playByPlay
    .filter((play) => play.shootingPlay && play.coordinate && (play.points === 2 || play.points === 3))
    .map((play) => ({
      id: play.id,
      period: play.period,
      clock: play.clock,
      side: play.side === "home" ? "home" : "away",
      player: play.players[0] ?? "Unknown player",
      text: play.text,
      made: play.made,
      points: play.points as 2 | 3,
      x: play.coordinate!.x,
      y: play.coordinate!.y,
    }));
}

export function applyBasketballSnapshot(match: SportMatch, scoreboard: MatchDetailScoreboard): void {
  if (match.id !== fixtureId) return;
  scoreboard.intel = {
    competition: `${snapshot.matchDetails.league} // ${snapshot.matchDetails.gameNote}`,
    season: String(snapshot.matchDetails.season),
    venue: snapshot.matchDetails.location.venue,
    attendance: snapshot.matchDetails.attendance.toLocaleString("en-US"),
    facts: [
      { label: "BROADCAST", value: snapshot.matchDetails.broadcast },
      { label: "SERIES", value: snapshot.matchDetails.series.at(-1)?.summary ?? "—" },
    ],
    resultNote: `${snapshot.matchDetails.score.winner} won ${snapshot.matchDetails.score.away.score}-${snapshot.matchDetails.score.home.score}`,
  };
  scoreboard.stats = snapshot.topStats.filter((stat) => stat.available).map((stat) => ({
    label: stat.label.toUpperCase(),
    home: shown(stat.home, stat.name.toLowerCase().includes("pct")),
    away: shown(stat.away, stat.name.toLowerCase().includes("pct")),
    homeValue: stat.home,
    awayValue: stat.away,
  }));
  scoreboard.scoreRows = snapshot.matchDetails.periods.map((period) => ({ label: period.label, home: String(period.home), away: String(period.away) }));
  scoreboard.trace = {
    title: "SCORE RACE",
    unit: "POINTS",
    ticks: snapshot.playByPlay.map((play) => `Q${play.period} ${play.clock}`),
    home: snapshot.playByPlay.map((play) => play.homeScore),
    away: snapshot.playByPlay.map((play) => play.awayScore),
    markers: snapshot.turningPoints.map((turn) => {
      const index = Math.max(0, snapshot.playByPlay.findIndex((play) => play.id === turn.playId));
      return { index, label: turn.text, side: turn.swing >= 0 ? "home" as const : "away" as const, decisive: turn === snapshot.turningPoints.at(-1) };
    }),
  };
  scoreboard.timeline = snapshot.turningPoints.map((turn) => ({
    minute: `Q${turn.period} ${turn.clock}`,
    side: turn.swing >= 0 ? "home" : "away",
    type: "score",
    player: `${turn.homeScore}-${turn.awayScore}`,
    secondary: turn.text,
  }));
  scoreboard.commentary = snapshot.playByPlay.map((play) => ({ minute: `Q${play.period} ${play.clock}`, text: play.text }));
  scoreboard.leaders = snapshot.matchDetails.leaders.flatMap((group) => group.leaders.map((leader) => ({
    name: leader.name,
    side: group.teamId === match.home.id ? "home" as const : "away" as const,
    line: String(leader.value),
    note: leader.label.toUpperCase(),
  })));
  scoreboard.boxScore = {
    columns: ["MIN", "PTS", "FG", "3PT", "FT", "REB", "AST", "TO", "STL", "BLK", "+/-"],
    rows: snapshot.teams.flatMap((team) => team.players.map((player) => ({
      name: player.name,
      side: team.id === match.home.id ? "home" as const : "away" as const,
      values: [String(player.minutes ?? "DNP"), String(player.points ?? 0), `${player.fieldGoals?.made ?? 0}-${player.fieldGoals?.attempted ?? 0}`, `${player.threePointFieldGoals?.made ?? 0}-${player.threePointFieldGoals?.attempted ?? 0}`, `${player.freeThrows?.made ?? 0}-${player.freeThrows?.attempted ?? 0}`, String(player.rebounds ?? 0), String(player.assists ?? 0), String(player.turnovers ?? 0), String(player.steals ?? 0), String(player.blocks ?? 0), (player.plusMinus ?? 0) > 0 ? `+${player.plusMinus}` : String(player.plusMinus ?? 0)],
    }))),
  };
  const lineups = snapshot.teams.map((team) => ({
    formation: "STARTING 5",
    confirmed: true,
    players: team.players.filter((player) => player.starter).map((player) => ({ name: player.name, number: Number(player.jersey) || 0, role: player.position })),
    substitutes: team.players.filter((player) => !player.starter).map((player) => ({ name: player.name, number: Number(player.jersey) || 0, role: player.reason ?? player.position })),
  }));
  if (lineups[0]) scoreboard.homeLineup = lineups[0];
  if (lineups[1]) scoreboard.awayLineup = lineups[1];
  scoreboard.basketballShots = scoringEvents();
}

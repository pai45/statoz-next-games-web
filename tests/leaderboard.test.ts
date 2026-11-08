import test from "node:test";
import assert from "node:assert/strict";
import { isGameEnabled } from "../src/domain/demo-product";
import type { LeaderboardParticipant } from "../src/domain/leaderboard";
import { demoGameResults, leaderboardParticipants } from "../src/mocks/leaderboard/rank-points";
import { gameRegistry, sportGameDecks } from "../src/mocks/games";
import { leaderboardGameIds } from "../src/features/leaderboard/catalog";
import { leaderboardCountdown, leaderboardWindow, previousLeaderboardWindow } from "../src/features/leaderboard/periods";
import { bestFiveContributions, buildLeaderboard, rankStandings, searchStandings } from "../src/features/leaderboard/ranking";
import { leaderboardHref, parseLeaderboardSelection, searchBoardSelection } from "../src/features/leaderboard/selection";
import type { LeaderboardSelection } from "../src/features/leaderboard/types";

const now = Date.parse("2026-11-06T12:30:00Z");
const weekly: LeaderboardSelection = { ladder: "master", period: "weekly" };
function board(selection = weekly, participants = leaderboardParticipants, timestamp = now) {
  return buildLeaderboard({ participants, games: leaderboardGameIds, selection, window: leaderboardWindow(selection.period, timestamp) });
}

test("all active catalog decks have weekly and season boards, including golf and archery", () => {
  assert.deepEqual(new Set(leaderboardGameIds), new Set(Object.values(sportGameDecks).flat().filter(isGameEnabled)));
  for (const game of leaderboardGameIds) {
    assert.ok(gameRegistry[game]);
    for (const period of ["weekly", "season"] as const) {
      const entries = board({ ladder: game, period });
      assert.ok(entries.length > 0, `${game}/${period}`);
      assert.ok(entries.every((entry) => entry.rp > 0 && entry.rp <= 1000));
    }
  }
  assert.ok(leaderboardGameIds.includes("longbow"));
  assert.ok(leaderboardGameIds.includes("open-golf"));
  assert.ok(!leaderboardGameIds.includes("football-quiz"));
});

test("Master adds exactly the five best fixed-scale results; missing games count zero", () => {
  const best = bestFiveContributions([900, 0, 600, 1000, 800, 700, 500].map((rp, index) => ({ gameId: `game-${index}`, rp })));
  assert.deepEqual(best.map((result) => result.rp), [1000, 900, 800, 700, 600]);
  assert.equal(best.reduce((sum, result) => sum + result.rp, 0), 4000);
  assert.deepEqual(bestFiveContributions([]), []);
  assert.equal(bestFiveContributions([{ gameId: "longbow", rp: 400 }, { gameId: "open-golf", rp: 0 }]).length, 1);
  for (const entry of board()) {
    assert.equal(entry.rp, entry.contributions.reduce((sum, result) => sum + result.rp, 0));
    assert.ok(entry.rp <= 5000);
    assert.ok(entry.contributions.length <= 5);
    for (const result of entry.contributions) {
      const gameEntry = board({ ladder: result.gameId, period: "weekly" }).find((candidate) => candidate.id === entry.id);
      assert.equal(gameEntry?.rp, result.rp);
    }
  }
});

test("fixed points and tie ordering do not depend on XP, display name, or roster ordering", () => {
  assert.deepEqual(board(), board(weekly, [...leaderboardParticipants].reverse()));
  const changed = leaderboardParticipants.map((participant) => ({ ...participant, name: `${participant.name} renamed`, xp: participant.xp * 100 }));
  assert.deepEqual(board().map(({ id, rp, rank }) => ({ id, rp, rank })), board(weekly, changed).map(({ id, rp, rank }) => ({ id, rp, rank })));
  const tied = rankStandings(["b", "a"].map((id) => ({ id, name: id, xp: 0, rp: 500, contributions: [], gamesPlayed: 1 })));
  assert.deepEqual(tied.map(({ id, rank }) => [id, rank]), [["a", 1], ["b", 2]]);
});

test("sample scores are deterministic, vary by game and period, and contain missing results", () => {
  const first = demoGameResults("sample", leaderboardGameIds, "week:2026-11-02");
  assert.deepEqual(first, demoGameResults("sample", leaderboardGameIds, "week:2026-11-02"));
  assert.notDeepEqual(first, demoGameResults("sample", leaderboardGameIds, "week:2026-11-09"));
  assert.notDeepEqual(first, demoGameResults("sample", leaderboardGameIds, "season:2026-Q4"));
  assert.ok(new Set(first.map((entry) => entry.rp)).size > 1);
  assert.ok(leaderboardParticipants.some((participant) => demoGameResults(participant.id, leaderboardGameIds, "week:2026-11-02").some((result) => result.rp === 0)));
  assert.deepEqual(buildLeaderboard({ participants: [], games: [], selection: weekly, window: leaderboardWindow("weekly", now) }), []);
});

test("movement is the actual previous-period rank difference, including new entrants", () => {
  for (const selection of [weekly, { ladder: "longbow", period: "season" }] as LeaderboardSelection[]) {
    const currentWindow = leaderboardWindow(selection.period, now);
    const previous = new Map(board(selection, leaderboardParticipants, currentWindow.start - 1).map((entry) => [entry.id, entry.rank]));
    for (const entry of board(selection)) assert.equal(entry.movement, previous.has(entry.id) ? previous.get(entry.id)! - entry.rank : null);
  }
});

test("weekly reset is Monday UTC, independent of input offset and across New Year", () => {
  const sunday = leaderboardWindow("weekly", Date.parse("2027-01-03T23:59:59Z"));
  const monday = leaderboardWindow("weekly", Date.parse("2027-01-04T05:30:00+05:30"));
  assert.equal(sunday.id, "week:2026-12-28");
  assert.equal(monday.id, "week:2027-01-04");
  assert.equal(sunday.end, monday.start);
  assert.equal(previousLeaderboardWindow("weekly", monday).id, sunday.id);
  assert.equal(monday.end - monday.start, 7 * 86_400_000);
});

test("quarters have exact UTC half-open boundaries and season scores survive weekly rollover", () => {
  const before = leaderboardWindow("season", Date.parse("2026-12-31T23:59:59.999Z"));
  const after = leaderboardWindow("season", Date.parse("2027-01-01T00:00:00Z"));
  assert.equal(before.id, "season:2026-Q4");
  assert.equal(after.id, "season:2027-Q1");
  assert.equal(before.end, after.start);
  assert.equal(previousLeaderboardWindow("season", after).id, before.id);
  assert.equal(leaderboardWindow("season", Date.parse("2026-04-01T00:00:00Z")).id, "season:2026-Q2");
  const selection: LeaderboardSelection = { ladder: "master", period: "season" };
  assert.deepEqual(board(selection), board(selection, leaderboardParticipants, now + 7 * 86_400_000));
  assert.equal(leaderboardCountdown(now + 2 * 86_400_000 + 3 * 3_600_000, now), "2d 3h");
  assert.equal(leaderboardCountdown(now - 1, now), "0h 0m");
});

test("canonical URLs migrate legacy filters, reject disabled games, and preserve search context", () => {
  const parse = (query: string) => parseLeaderboardSelection(new URLSearchParams(query));
  assert.deepEqual(parse(""), weekly);
  assert.deepEqual(parse("type=games&sport=archery&mode=longbow&scope=season&league=epl"), { ladder: "longbow", period: "season" });
  assert.deepEqual(parse("ladder=removed&mode=longbow&period=weekly"), weekly);
  assert.deepEqual(parse("ladder=football-quiz&period=allTime"), { ladder: "master", period: "season" });
  assert.equal(leaderboardHref({ ladder: "open-golf", period: "season" }), "/leaderboard?ladder=open-golf&period=season");
  assert.deepEqual(searchBoardSelection(new URLSearchParams({ returnTo: "/leaderboard?mode=longbow&scope=season" })), { ladder: "longbow", period: "season" });
  assert.deepEqual(searchBoardSelection(new URLSearchParams({ returnTo: "https://evil.test/leaderboard?mode=longbow" })), weekly);
  assert.deepEqual(searchBoardSelection(new URLSearchParams({ returnTo: "http://[" })), weekly);
});

test("search preserves the selected ladder's actual points and rank, even with duplicate names", () => {
  const duplicate: LeaderboardParticipant = { id: "local:demo", name: "jarvis", xp: 999999, isUser: true };
  const entries = board({ ladder: "longbow", period: "season" }, [...leaderboardParticipants, duplicate]);
  const results = searchStandings(entries, "  JARVIS ");
  for (const result of results) assert.deepEqual(result, entries.find((entry) => entry.id === result.id));
  assert.ok(results.some((entry) => entry.id === "rival:jarvis"));
  assert.deepEqual(searchStandings(entries, "j"), []);
  assert.deepEqual(searchStandings(entries, "not a player"), []);
});

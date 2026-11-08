import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { botMove, botProfile, difficulties, personalities } from "../src/features/games/football-chess/engine/ai/bots";
import { search } from "../src/features/games/football-chess/engine/ai/search";
import { expectedScore, resultChances } from "../src/features/games/football-chess/engine/eval";
import { formatEntry } from "../src/features/games/football-chess/engine/notation";
import { positionFromDiagram } from "../src/features/games/football-chess/engine/notation";
import { seededSource } from "../src/features/games/football-chess/engine/rng";
import { createGame, draftSquad, type CardPools } from "../src/features/games/football-chess/engine/setup";
import { botPolicy, playMatch } from "../src/features/games/football-chess/engine/simulate";
import { threatOf } from "../src/features/games/football-chess/engine/threats";
import { step } from "../src/features/games/football-chess/engine/game";
import { matchConfig, type MatchSetup } from "../src/features/games/football-chess/engine/state";

const pools: CardPools = {
  attackers: footballPlayerCards.filter((card) => card.role === "attacker"),
  defenders: footballPlayerCards.filter((card) => card.role === "defender"),
  keepers: footballPlayerCards.filter((card) => card.role === "goalkeeper"),
};

function setupFor(seed: number): MatchSetup {
  const random = seededSource(seed);
  const home = draftSquad(82, pools, random);
  const away = draftSquad(82, pools, random, new Set(home.map((card) => card.id)));
  return {
    seed,
    home: { name: "Home", formation: "box", squad: home },
    away: { name: "Away", formation: "diamond", squad: away },
    config: matchConfig("short"),
    kickoff: "home",
  };
}

const empty = ".......";

test("every AI tier and personality distributes when the keeper setup has been used", () => {
  const fresh = positionFromDiagram({ rows: [empty, empty, ".S...s.", empty, empty], carrier: "ak" });
  const state = { ...fresh, keeperSetupUsed: true };
  for (const difficulty of difficulties) {
    for (const personality of personalities) {
      const { action } = botMove(state, botProfile(difficulty, personality), seededSource(1));
      assert.equal(action.kind, "pass", `${difficulty}/${personality}`);
      assert.equal(action.pieceId, "ak");
    }
  }
});

test("the same seed gives the same bot match", () => {
  const setup = setupFor(5);
  const play = () =>
    playMatch(setup, {
      home: botPolicy(botProfile("medium"), 1, "home"),
      away: botPolicy(botProfile("easy", "maverick"), 2, "away"),
    });
  const first = play();
  const second = play();
  assert.deepEqual(second.log, first.log);
  assert.equal(first.phase, "fullTime");
});

test("every tier and personality plays a legal match to full time", () => {
  for (const difficulty of difficulties.filter((tier) => tier !== "hard")) {
    for (const personality of personalities) {
      const final = playMatch(setupFor(difficulties.indexOf(difficulty) * 10 + personalities.indexOf(personality)), {
        home: botPolicy(botProfile(difficulty, personality), 3, "home"),
        away: botPolicy(botProfile("easy"), 4, "away"),
      });
      assert.equal(final.phase, "fullTime", `${difficulty}/${personality}`);
    }
  }
});

test("the search stays inside its budget", () => {
  const state = createGame(setupFor(8));
  const profile = botProfile("medium");
  const result = search(state, profile.params);
  assert.ok(result.nodes <= profile.params.budget, `${result.nodes} nodes`);
  assert.ok(result.depth >= 1);
  assert.equal(result.ranked.length > 0, true);
});

test("bots take a free goal when there is no time to improve it", () => {
  // Home Striker on f3, the away keeper stuck on row 2 (0-based 1), nobody in
  // the way, and one action left on the attack clock.
  const rows = ["......d", empty, ".....S.", empty, empty];
  const now = positionFromDiagram({ rows, carrier: "f3", keepers: { away: 1 }, attackClock: 1 });
  for (const difficulty of ["medium", "hard"] as const) {
    const { action } = botMove(now, botProfile(difficulty), seededSource(1));
    assert.equal(action.kind, "shoot", difficulty);
  }
});

test("with time to spare, a deep search walks in for a better shot and still takes it", () => {
  // As above, but home has a Defender back, as in any real match.
  const rows = ["......d", empty, "D....S.", empty, empty];
  let state = positionFromDiagram({ rows, carrier: "f3", keepers: { away: 1 } });
  const profile = botProfile("hard");
  const decide = seededSource(3);
  let shotTaken = false;
  for (let turn = 0; turn < 4 && !shotTaken; turn += 1) {
    const { action } = botMove(state, profile, decide);
    if (state.turn === "home" && action.kind === "shoot") shotTaken = true;
    state = step(state, action);
  }
  assert.ok(shotTaken, "the shot comes within two of its own moves");
});

test("bots deal with a shot on", () => {
  // Away Striker on b3 has an open look at the home goal; home has a Defender
  // goal-side on a3 and another on b5.
  const state = positionFromDiagram({
    rows: [".D.....", empty, "Ds.....", empty, "......r"],
    carrier: "b3",
    turn: "home",
    keepers: { home: 1 },
  });
  const before = threatOf(state, "away");
  assert.ok(before.on, "the setup has a shot on");
  const { action } = botMove(state, botProfile("medium"), seededSource(2));
  const after = step(state, action);
  const reduced = after.phase !== "play" || threatOf(after, "away").shot < before.shot || action.kind === "tackle" || action.kind === "slide";
  assert.ok(reduced, `answered with ${action.kind}`);
});

test("the win estimate is sensible", () => {
  const state = createGame(setupFor(3));
  const even = expectedScore(state, "home");
  assert.ok(even > 0.35 && even < 0.65, `${even}`);
  const ahead = { ...state, score: { home: 2, away: 0 } };
  assert.ok(expectedScore(ahead, "home") > 0.8);
  const chances = resultChances(ahead, "away");
  assert.ok(Math.abs(chances.win + chances.draw + chances.loss - 1) < 1e-9);
});

test("the move list marks goals with # and shots on with +", () => {
  const state = positionFromDiagram({
    rows: [empty, empty, ".....S.", empty, empty],
    carrier: "f3",
    keepers: { away: 1 },
    config: { allowForced: true },
  });
  const goal = step(state, { kind: "shoot", pieceId: "h0", target: 3 }, { forced: 0 });
  assert.equal(formatEntry(state, goal.log[0], goal), "ST f3xG4#");

  const build = positionFromDiagram({ rows: [empty, empty, "...S...", empty, "d......"], carrier: "d3", keepers: { away: 1 } });
  const moved = step(build, { kind: "move", pieceId: "h0", to: { col: 4, row: 2 } });
  assert.match(formatEntry(build, moved.log[0], moved), /^ST d3-e3\+?$/);
});

test("the new engine stays pure: no React, window or document", () => {
  const root = join(process.cwd(), "src/features/games/football-chess/engine");
  const files = [
    ...readdirSync(root).filter((name) => name.endsWith(".ts")).map((name) => join(root, name)),
    ...readdirSync(join(root, "ai")).map((name) => join(root, "ai", name)),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/from "react"|\bwindow\.|\bdocument\./.test(text), file);
    assert.ok(!/@\/design-system/.test(text), file);
  }
});

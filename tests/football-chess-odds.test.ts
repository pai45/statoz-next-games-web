import { test } from "node:test";
import assert from "node:assert/strict";

import { pieceById } from "../src/features/games/football-chess/engine/board";
import { step } from "../src/features/games/football-chess/engine/game";
import { legalActions } from "../src/features/games/football-chess/engine/moves";
import { positionFromDiagram, type DiagramOptions } from "../src/features/games/football-chess/engine/notation";
import {
  maxShot,
  minShot,
  passOdds,
  penaltyOdds,
  shotOdds,
  slideOdds,
  tackleOdds,
  takeOnOdds,
} from "../src/features/games/football-chess/engine/odds";
import { outcomes } from "../src/features/games/football-chess/engine/resolve";
import type { GameState, GoalTarget } from "../src/features/games/football-chess/engine/state";

const empty = ".......";

function shot(rows: DiagramOptions["rows"], carrier: string, target: GoalTarget, extra: Partial<DiagramOptions> = {}) {
  const state = positionFromDiagram({ rows, carrier, ...extra });
  return shotOdds(state, pieceById(state, state.carrierId), target);
}

test("shot odds stay inside their limits and the three results add up", () => {
  const lines = ["......S", ".....S.", "....S..", "...S...", "..dS...", "...Sd.d"];
  for (const line of lines) {
    for (const row of [0, 1, 2, 3, 4]) {
      const rows = [empty, empty, empty, empty, empty];
      rows[4 - row] = line;
      const col = line.indexOf("S");
      const carrier = `${"abcdefg"[col]}${row + 1}`;
      for (const target of [1, 2, 3] as const) {
        for (const keeper of [1, 2, 3]) {
          const odds = shot(rows, carrier, target, { keepers: { away: keeper } });
          assert.ok(odds.goal >= minShot - 1e-12 && odds.goal <= maxShot + 1e-12, `${line} r${row} t${target}`);
          assert.ok(Math.abs(odds.goal + odds.saved + odds.blocked - 1) < 1e-9);
        }
      }
    }
  }
});

test("closer shots are better, and a keeper on the line or a blocker makes them worse", () => {
  const at = (line: string, carrier: string) => shot([empty, empty, line, empty, empty], carrier, 2, { keepers: { away: 1 } }).goal;
  const one = at("......S", "g3");
  const two = at(".....S.", "f3");
  const three = at("....S..", "e3");
  const four = at("...S...", "d3");
  assert.ok(one > two && two > three && three > four, `${one} ${two} ${three} ${four}`);

  const onLine = shot([empty, empty, ".....S.", empty, empty], "f3", 2, { keepers: { away: 2 } }).goal;
  const offLine = shot([empty, empty, ".....S.", empty, empty], "f3", 2, { keepers: { away: 1 } }).goal;
  assert.ok(onLine < offLine);

  const clear = shot([empty, empty, "....S..", empty, empty], "e3", 2).goal;
  const oneBlock = shot([empty, empty, "....Ss.", empty, empty], "e3", 2).goal;
  const defenderBlock = shot([empty, empty, "....Sd.", empty, empty], "e3", 2).goal;
  const twoBlocks = shot([empty, empty, "....Sdd", empty, empty], "e3", 2).goal;
  assert.ok(clear > oneBlock && oneBlock > defenderBlock && defenderBlock > twoBlocks);
});

test("rating moves a shot by at most eight per cent", () => {
  const rows = [empty, empty, ".....S.", empty, empty];
  const even = shot(rows, "f3", 1, { keepers: { away: 3 } }).onTarget;
  const star = shot(rows, "f3", 1, { keepers: { away: 3 }, ratings: { f3: 99, ak: 60 } }).onTarget;
  const weak = shot(rows, "f3", 1, { keepers: { away: 3 }, ratings: { f3: 60, ak: 99 } }).onTarget;
  assert.ok(star > even && weak < even);
  assert.ok(star / even <= 1.08 + 1e-9 && weak / even >= 0.92 - 1e-9);
});

test("tackles get better with support, and position matters more than rating", () => {
  const state = (line4: string, line3: string, ratings?: Record<string, number>) =>
    positionFromDiagram({ rows: [empty, line4, line3, empty, empty], carrier: "d3", turn: "home", ratings });
  const alone = state(empty, "..Ds...");
  const helped = state("..D....", "..Ds...");
  const lone = tackleOdds(alone, pieceById(alone, "h0"), pieceById(alone, "a0")).win;
  const backed = tackleOdds(helped, pieceById(helped, "h1"), pieceById(helped, "a0")).win;
  assert.ok(backed > lone);

  const star = state(empty, "..Ds...", { c3: 99, d3: 60 });
  const starWin = tackleOdds(star, pieceById(star, "h0"), pieceById(star, "a0")).win;
  assert.ok(starWin - lone <= 0.06 + 1e-9, "rating is capped at +6%");
  assert.ok(backed - lone >= 0.12 - 1e-9, "one teammate is worth more than any rating gap");

  for (const odds of [lone, backed, starWin]) assert.ok(odds >= 0.15 && odds <= 0.75);
});

test("slides, take-ons and penalties stay inside their limits", () => {
  const s = positionFromDiagram({ rows: [empty, empty, ".D.s...", empty, empty], carrier: "d3", turn: "home" });
  const slide = slideOdds(s, pieceById(s, "h0"), pieceById(s, "a0")).win;
  assert.ok(slide >= 0.2 && slide <= 0.8);

  const t = positionFromDiagram({ rows: [empty, empty, "..Rd...", empty, empty], carrier: "c3" });
  const runnerVsDefender = takeOnOdds(t, pieceById(t, "h0"), pieceById(t, "a0")).win;
  const u = positionFromDiagram({ rows: [empty, empty, "..Sd...", empty, empty], carrier: "c3" });
  const strikerVsDefender = takeOnOdds(u, pieceById(u, "h0"), pieceById(u, "a0")).win;
  assert.ok(runnerVsDefender > strikerVsDefender, "Runners are better at take-ons");

  const p = positionFromDiagram({ rows: [empty, empty, ".....S.", empty, empty], carrier: "f3" });
  const penalty = penaltyOdds(p, pieceById(p, "h0")).goal;
  assert.ok(penalty >= 0.55 && penalty <= 0.85);
});

test("guarded lanes can be cut out; lofted passes and keepers only fear a marked receiver", () => {
  // Away Defender on d4 guards c3–e3 below it.
  const lane = positionFromDiagram({ rows: [empty, "...d...", ".R...S.", empty, empty], carrier: "b3" });
  const ground = passOdds(lane, pieceById(lane, "h0"), pieceById(lane, "h1"));
  assert.ok(ground.success < 1 && ground.interceptor?.id === "a0");

  const loft = positionFromDiagram({ rows: [empty, "...d...", ".P...S.", empty, empty], carrier: "b3" });
  assert.equal(passOdds(loft, pieceById(loft, "h0"), pieceById(loft, "h1")).success, 1);

  const marked = positionFromDiagram({ rows: [empty, ".....d.", ".P...S.", empty, empty], carrier: "b3" });
  assert.ok(passOdds(marked, pieceById(marked, "h0"), pieceById(marked, "h1")).success < 1);

  const keeper = positionFromDiagram({ rows: [empty, "...d...", ".....S.", empty, empty], carrier: "hk" });
  assert.equal(passOdds(keeper, pieceById(keeper, "hk"), pieceById(keeper, "h0")).success, 1);
  const markedThrow = positionFromDiagram({ rows: [empty, "....d..", ".....S.", empty, empty], carrier: "hk" });
  assert.ok(passOdds(markedThrow, pieceById(markedThrow, "hk"), pieceById(markedThrow, "h0")).success < 1);
});

test("the outcome a step plays is one of the listed outcomes, with its listed chance", () => {
  const state: GameState = positionFromDiagram({
    rows: [empty, "...d...", ".R..Sd.", empty, empty],
    carrier: "e3",
    seed: 77,
  });
  for (const action of legalActions(state)) {
    const list = outcomes(state, action);
    const after = step(state, action);
    const entry = after.log[after.log.length - 1];
    assert.ok(entry.outcome >= 0 && entry.outcome < list.length);
    assert.equal(entry.p, list[entry.outcome].p);
    assert.equal(entry.tag, list[entry.outcome].tag);
    if (list.length === 1) assert.equal(after.rng, state.rng, "a sure thing draws no roll");
    else assert.notEqual(after.rng, state.rng);
  }
});

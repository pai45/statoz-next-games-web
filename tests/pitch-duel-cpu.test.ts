import { test } from "node:test";
import assert from "node:assert/strict";

import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { relationOf } from "../src/features/games/pitch-duel/engine/actions";
import { createMatch, currentTurn, step } from "../src/features/games/pitch-duel/engine/match";
import { seededSource } from "../src/features/games/pitch-duel/engine/rng";
import { draftOpponent } from "../src/features/games/pitch-duel/engine/setup";
import { autoplay, familyMixPolicy, predictablePolicy, uniformPolicy, type Policy } from "../src/features/games/pitch-duel/engine/simulate";
import type { MatchSetup, MatchState } from "../src/features/games/pitch-duel/engine/types";

const pools = {
  attackers: footballPlayerCards.filter((c) => c.role === "attacker"),
  defenders: footballPlayerCards.filter((c) => c.role === "defender"),
  keepers: footballPlayerCards.filter((c) => c.role === "goalkeeper"),
};

function setupFor(seed: number, division: number): MatchSetup {
  const r = seededSource(seed * 17 + 3);
  const me = draftOpponent(division, pools, r);
  const op = draftOpponent(division, pools, r);
  return { seed, division, opponentName: op.name, home: { ...me.team, name: "YOU" }, away: op.team };
}

/** Share of the human's attacking duels that met a full counter. */
function fullCounterRate(division: number, policy: Policy, matches = 120): number {
  let duels = 0;
  let full = 0;
  for (let seed = 1; seed <= matches; seed += 1) {
    const random = seededSource(seed * 101);
    let s: MatchState = createMatch(setupFor(seed, division));
    for (let guard = 0; guard < 300; guard += 1) {
      const turn = currentTurn(s);
      if (turn.kind === "over") break;
      if (turn.kind === "attack" && s.cpuIntent?.kind === "defend") {
        const input = policy(turn, s, random);
        if (input.type === "attack") {
          duels += 1;
          if (relationOf(input.action, s.cpuIntent.action) === "full") full += 1;
        }
        s = step(s, input);
        continue;
      }
      s = step(s, turn.kind === "continue" ? { type: "continue" } : policy(turn, s, random));
    }
  }
  return full / duels;
}

test("the CPU commits its pick before the human chooses", () => {
  let s = createMatch(setupFor(3, 3));
  s = step(s, { type: "continue" });
  const turn = currentTurn(s);
  assert.equal(turn.kind, "attack");
  if (turn.kind !== "attack") return;
  const results = turn.options.map((action) => step(s, { type: "attack", action }).lastResolution?.defenseLabel);
  assert.equal(new Set(results).size, 1, "every human choice meets the same committed read");
});

test("predictable players get read; varied players keep it a guessing game", () => {
  const variedTop = fullCounterRate(5, familyMixPolicy);
  const predictableTop = fullCounterRate(5, predictablePolicy);
  const predictableBottom = fullCounterRate(1, predictablePolicy);
  assert.ok(variedTop <= 0.36, `varied vs div 5: ${variedTop}`);
  assert.ok(predictableTop >= 0.55, `predictable vs div 5: ${predictableTop}`);
  assert.ok(predictableTop > predictableBottom + 0.1, `div 5 ${predictableTop} vs div 1 ${predictableBottom}`);
  assert.ok(predictableTop > variedTop + 0.2);
});

test("division 1 is winnable for a player who just mixes it up", () => {
  let wins = 0;
  const n = 200;
  for (let seed = 1; seed <= n; seed += 1) {
    const s = autoplay(setupFor(seed, 1));
    if (s.score.home > s.score.away) wins += 1;
  }
  assert.ok(wins / n >= 0.35, `win rate ${wins / n}`);
});

test("the CPU shoots when it reaches the box", () => {
  let inBox = 0;
  let shots = 0;
  for (let seed = 1; seed <= 150; seed += 1) {
    const random = seededSource(seed);
    let s = createMatch(setupFor(seed, 4));
    for (let guard = 0; guard < 300; guard += 1) {
      const turn = currentTurn(s);
      if (turn.kind === "over") break;
      if (turn.kind === "defend" && s.possession.progress === 8 && s.cpuIntent?.kind === "attack") {
        inBox += 1;
        if (s.cpuIntent.action === "finish") shots += 1;
      }
      s = step(s, turn.kind === "continue" ? { type: "continue" } : uniformPolicy(turn, s, random));
    }
  }
  assert.ok(inBox > 20);
  assert.ok(shots / inBox >= 0.5, `shot rate in box ${shots / inBox}`);
});

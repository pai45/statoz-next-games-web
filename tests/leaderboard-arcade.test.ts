import test from "node:test";
import assert from "node:assert/strict";

import { nextTarget, ordinal, padScore } from "../src/features/leaderboard/arcade";
import type { LeaderboardEntry } from "../src/features/leaderboard/types";

function entry(rank: number, name: string, xp: number, isUser = false): LeaderboardEntry {
  return { rank, name, score: Math.round(xp / 55), movement: 0, isNew: false, isUser, xp, team: null };
}

test("ordinal suffixes follow English rules, including the teens", () => {
  const cases: [number, string][] = [
    [1, "1ST"], [2, "2ND"], [3, "3RD"], [4, "4TH"], [10, "10TH"],
    [11, "11TH"], [12, "12TH"], [13, "13TH"], [14, "14TH"],
    [21, "21ST"], [22, "22ND"], [23, "23RD"], [24, "24TH"],
    [101, "101ST"], [111, "111TH"], [112, "112TH"],
  ];
  for (const [rank, expected] of cases) assert.equal(ordinal(rank), expected, `rank ${rank}`);
});

test("scores are zero-padded to six digits by default", () => {
  assert.equal(padScore(71), "000071");
  assert.equal(padScore(0), "000000");
  assert.equal(padScore(1234567), "1234567");
  assert.equal(padScore(5, 3), "005");
  assert.equal(padScore(-4), "000000");
  assert.equal(padScore(12.6), "000013");
});

test("next target is the entry one place above the player", () => {
  const board = [entry(1, "jarvis", 3910), entry(2, "Vortex", 3905), entry(3, "PLAYER ONE", 3700, true), entry(4, "Comet", 2300)];
  const result = nextTarget(board);
  assert.ok(result);
  assert.equal(result.target.name, "Vortex");
  assert.equal(result.gapXp, 205);
});

test("there is no next target at first place or off the board", () => {
  assert.equal(nextTarget([entry(1, "PLAYER ONE", 5000, true), entry(2, "jarvis", 3910)]), null);
  assert.equal(nextTarget([entry(1, "jarvis", 3910), entry(2, "Vortex", 3905)]), null);
  assert.equal(nextTarget([]), null);
});

test("the gap is never negative when XP ties", () => {
  const board = [entry(1, "jarvis", 3910), entry(2, "PLAYER ONE", 3910, true)];
  assert.equal(nextTarget(board)?.gapXp, 0);
});

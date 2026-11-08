import test from "node:test";
import assert from "node:assert/strict";
import { isGameEnabled } from "../src/domain/demo-product";
import { gameForHref, gameRegistry, sportGameDecks } from "../src/mocks/games";
import { gameSportOrder as sportOrder } from "../src/domain/game-sports";
import {
  allGamesInFeedOrder,
  gameCoverPath,
  coverflowOffset,
  libraryCardLayout,
  sportGamesInDeckOrder,
} from "../src/features/games/home-catalog";

/** Column spans a layout produces on the six-column desktop bento. */
function spans(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const l = libraryCardLayout(count, i);
    return l.wide ? 6 : l.feature ? 3 : 2;
  });
}

/** Every row of the grid is filled exactly: no orphan cell. */
function rowsAreFull(widths: number[], columns: number) {
  let used = 0;
  for (const w of widths) {
    if (used + w > columns) return false;
    used = (used + w) % columns;
  }
  return used === 0;
}

test("home feed lists every enabled game once, curated order first", () => {
  const ids = allGamesInFeedOrder();
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(isGameEnabled));
  for (const sport of sportOrder) for (const id of sportGamesInDeckOrder(sport)) assert.ok(ids.includes(id));
});

test("coverflow centres the active game with games on both sides", () => {
  // Short lists do not wrap: the first game has nothing to its left.
  assert.deepEqual([0, 1, 2].map((i) => coverflowOffset(i, 0, 3)), [0, 1, 2]);
  assert.deepEqual([0, 1, 2].map((i) => coverflowOffset(i, 2, 3)), [-2, -1, 0]);
  // Longer lists wrap, so the first game has the last ones on its left.
  const count = allGamesInFeedOrder().length;
  assert.ok(count >= 5);
  assert.equal(coverflowOffset(0, 0, count), 0);
  assert.equal(coverflowOffset(count - 1, 0, count), -1);
  assert.equal(coverflowOffset(1, count - 1, count), 2);
  // Every game gets a distinct slot.
  for (const active of [0, 3, count - 1]) {
    const offsets = Array.from({ length: count }, (_, i) => coverflowOffset(i, active, count));
    assert.equal(new Set(offsets).size, count);
    assert.ok(offsets.every((offset) => Math.abs(offset) <= Math.ceil(count / 2)));
  }
  // Mid-drag the cards sit between slots, and the wrap point stays far from the centre.
  assert.equal(coverflowOffset(0, 0.4, count), -0.4);
  assert.equal(coverflowOffset(1, 0.4, count), 0.6);
  assert.ok(Math.abs(coverflowOffset(count - 1, 0.4, count) + 1.4) < 1e-9);
});

test("desktop bento fills every row for each catalog size", () => {
  for (let count = 1; count <= 16; count++) {
    const widths = spans(count);
    assert.ok(rowsAreFull(widths, 6), `six-column rows for ${count} games: ${widths}`);
  }
});

test("covers come from the shared folder unless the game bundles its own", () => {
  assert.equal(gameCoverPath("retro-hoops"), "/assets/games/covers/retro-hoops.webp");
  assert.equal(gameCoverPath("stick-cricket"), "/games/stick-cricket/cover.png");
});

test("Formula is a separate Motorsport game beside the unchanged Racer", () => {
  assert.ok(sportGameDecks.motorsport.includes("portfolio-formula"));
  assert.ok(sportGameDecks.motorsport.includes("f1-racing"));
  assert.equal(gameForHref("/play/portfolio-formula")?.game, "portfolio-formula");
  assert.equal(gameRegistry["f1-racing"].href, "/play/racer");
  assert.equal(gameCoverPath("portfolio-formula"), "/assets/games/covers/formula-2026-11-06/formula.webp");
});

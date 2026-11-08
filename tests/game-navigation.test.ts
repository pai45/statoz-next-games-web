import test from "node:test";
import assert from "node:assert/strict";
import { gameCatalogHref, gameLaunchHref, gameReturnHref } from "../src/features/games/shared/navigation";

test("launch URLs carry the actual catalog selection, including the full-list filter", () => {
  for (const origin of ["/", "/?sport=football", "/?view=all&listSport=football", "/?sport=cricket&view=all&listSport=all"]) {
    const launch = new URL(gameLaunchHref("/play/pitch-duel", origin), "https://example.test");
    assert.equal(launch.pathname, "/play/pitch-duel");
    assert.equal(gameReturnHref(launch.searchParams.get("returnTo")), origin);
  }
});

test("old catalogs resolve to the current hub and direct game visits return home", () => {
  assert.equal(gameReturnHref("/games/football"), "/?sport=football");
  assert.equal(gameReturnHref("/games/cricket/"), "/?sport=cricket");
  assert.equal(gameCatalogHref(null), "/");
  assert.equal(gameCatalogHref("football", true), "/?sport=football&view=all");
  for (const value of [undefined, null, "", "https://example.test", "//example.test", "/\\example.test", "/play/pitch-duel"]) {
    assert.equal(gameReturnHref(value), "/");
  }
});

test("catalog URLs retain spotlight and Library search without leaking Library-only state into home", () => {
  assert.equal(gameCatalogHref("football", true, { game: "pitch-duel", q: "duel", listSport: "football" }), "/?sport=football&view=all&game=pitch-duel&q=duel&listSport=football");
  assert.equal(gameCatalogHref(null, false, { game: "open-golf", q: "golf", listSport: "golf" }), "/?game=open-golf");
});

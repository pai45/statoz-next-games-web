import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { allGamesInFeedOrder, gameCoverPath } from "../src/features/games/home-catalog";
import { gameRegistry } from "../src/mocks/games";

test("every enabled home game has an eight-second local gameplay capture with verified bytes", () => {
  const root = "public/assets/games/home/gameplay/";
  const manifest = JSON.parse(readFileSync(root + "PROVENANCE.json", "utf8"));
  assert.deepEqual(manifest.assets.map((asset: {gameId: string}) => asset.gameId).sort(), [...allGamesInFeedOrder()].sort());
  for (const asset of manifest.assets) {
    assert.equal(asset.durationSeconds, 8);
    assert.deepEqual([asset.width, asset.height], [1280, 720]);
    assert.equal(asset.file, asset.gameId + ".mp4");
    const bytes = readFileSync(root + asset.file);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
    assert.ok(bytes.length > 50000 && bytes.length < 4 * 1048576);
    assert.ok(asset.source.startsWith("/"));
  }
});

test("Pitch Rush and Fot Duel have original cover variants and retain stable launch identities", () => {
  const root = "public/assets/games/home/covers/";
  const manifest = JSON.parse(readFileSync(root + "PROVENANCE.json", "utf8"));
  assert.equal(gameRegistry["pitch-duel"].title, "FOT DUEL");
  assert.equal(gameRegistry["pitch-duel"].href, "/play/pitch-duel");
  assert.equal(gameCoverPath("pitch-rush"), "/assets/games/home/covers/pitch-rush.webp");
  assert.equal(gameCoverPath("pitch-duel"), "/assets/games/home/covers/fot-duel.webp");
  assert.equal(manifest.assets.length, 2);
  for (const asset of manifest.assets) {
    assert.equal(createHash("sha256").update(readFileSync(root + asset.file)).digest("hex"), asset.sha256);
    assert.deepEqual([asset.width, asset.height], [1200, 800]);
  }
});

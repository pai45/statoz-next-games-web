import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { footballChessAcademy } from "../src/mocks/packs/football-chess-academy";
import { classOf } from "../src/features/games/football-chess/engine/classes";
import { legalActions } from "../src/features/games/football-chess/engine/moves";
import { previewAction } from "../src/features/games/football-chess/engine/preview";
import { outcomes } from "../src/features/games/football-chess/engine/resolve";
import { createGame } from "../src/features/games/football-chess/engine/setup";
import { positionFromDiagram } from "../src/features/games/football-chess/engine/notation";
import { matchConfig } from "../src/features/games/football-chess/engine/state";
import {
  applyResult,
  coinsFor,
  emptySave,
  historyLimit,
  legacyKey,
  migrateV1,
  sanitizeSave,
  saveKey,
} from "../src/features/games/football-chess/state/save-schema";

const entry = (id: string, scored: number, conceded: number) => ({
  id,
  at: "2026-11-04T10:00:00.000Z",
  mode: "quick" as const,
  opponent: "Rival",
  difficulty: "medium" as const,
  personality: "balanced" as const,
  scored,
  conceded,
});

test("the save keys are namespaced and distinct", () => {
  assert.equal(saveKey, "statoz.games.web.football-chess.v2");
  assert.equal(legacyKey, "statoz.games.web.footballchess.v1");
  const auth = readFileSync(join(process.cwd(), "src/features/auth/state/auth-session.ts"), "utf8");
  assert.ok(auth.includes(`"${saveKey}"`), "the v2 save moves with the account");
  assert.ok(auth.includes(`"${legacyKey}"`), "the v1 save still moves with the account");
});

test("a v1 record carries over and the tutorial counts as skipped", () => {
  const v1 = JSON.stringify({ wins: 7, losses: 3, draws: 2, currentStreak: 2, bestStreak: 4, formation: "diamond" });
  const save = migrateV1(v1);
  assert.equal(save.migratedFrom, 1);
  assert.equal(save.tutorial, "skipped");
  assert.deepEqual(
    { played: save.record.played, wins: save.record.wins, draws: save.record.draws, losses: save.record.losses },
    { played: 12, wins: 7, draws: 2, losses: 3 },
  );
  assert.equal(save.record.bestStreak, 4);
  assert.equal(save.quick.formation, "diamond");
  assert.deepEqual(save.byMode.quick, save.record);
});

test("no v1 record, or a broken one, starts fresh", () => {
  assert.equal(migrateV1(null), emptySave);
  assert.equal(migrateV1("not json"), emptySave);
  assert.equal(migrateV1(JSON.stringify({})), emptySave);
});

test("tampered saves are cleaned rather than trusted", () => {
  const save = sanitizeSave({
    version: 2,
    record: { played: 999, wins: 3, draws: -4, losses: "x", bestStreak: 50, currentStreak: 60, goalsFor: 1.7 },
    tutorial: "hacked",
    quick: { difficulty: "godlike", formation: "box", length: "forever" },
    history: [{ id: "a", scored: 3, conceded: 1, result: "L" }, { scored: 1 }],
    settings: { sound: "loud" },
  });
  assert.equal(save.record.played, 3, "played is rebuilt from the results");
  assert.equal(save.record.draws, 0);
  assert.equal(save.record.losses, 0);
  assert.ok(save.record.bestStreak <= save.record.wins);
  assert.ok(save.record.currentStreak <= save.record.bestStreak);
  assert.equal(save.tutorial, "new");
  assert.deepEqual(save.quick, { difficulty: "medium", formation: "box", length: "standard" });
  assert.equal(save.history.length, 1);
  assert.equal(save.history[0].result, "W", "the result follows the score, not the stored letter");
  assert.equal(save.settings.sound, true);
  assert.equal(sanitizeSave({ version: 3 }), emptySave);
});

test("a match settles once, and the record and history follow", () => {
  const first = applyResult(emptySave, entry("m1", 2, 1));
  assert.equal(first.duplicate, false);
  assert.equal(first.entry.result, "W");
  assert.equal(first.save.record.wins, 1);
  assert.equal(first.save.record.goalsFor, 2);
  assert.equal(first.save.record.currentStreak, 1);
  const again = applyResult(first.save, entry("m1", 2, 1));
  assert.equal(again.duplicate, true);
  assert.equal(again.save, first.save);

  const loss = applyResult(first.save, entry("m2", 0, 3));
  assert.equal(loss.save.record.losses, 1);
  assert.equal(loss.save.record.currentStreak, 0);
  assert.equal(loss.save.record.bestStreak, 1);
  assert.equal(loss.save.history[0].id, "m2");
  assert.deepEqual([coinsFor("W"), coinsFor("D"), coinsFor("L")], [50, 20, 10]);
});

test("history keeps the latest matches only", () => {
  let save = emptySave;
  for (let index = 0; index < historyLimit + 5; index += 1) save = applyResult(save, entry(`m${index}`, 1, 1)).save;
  assert.equal(save.history.length, historyLimit);
  assert.equal(save.history[0].id, `m${historyLimit + 4}`);
  assert.equal(save.record.draws, historyLimit + 5);
});

test("the academy five is a legal squad covering every class", () => {
  assert.equal(footballChessAcademy.length, 5);
  assert.deepEqual(
    footballChessAcademy.map((card) => classOf(card)),
    ["striker", "runner", "playmaker", "defender", "keeper"],
  );
  const game = createGame({
    seed: 1,
    home: { name: "You", formation: "box", squad: footballChessAcademy },
    away: { name: "Rival", formation: "diamond", squad: footballChessAcademy.map((card) => ({ ...card, id: `${card.id}-b` })) },
    config: matchConfig("short"),
    kickoff: "home",
  });
  assert.equal(game.pieces.length, 10);
});

test("the odds preview is the outcome list the game rolls", () => {
  const state = positionFromDiagram({
    rows: [".......", "....d..", ".....S.", ".......", "......."],
    carrier: "f3",
    keepers: { away: 2 },
  });
  for (const action of legalActions(state)) {
    const preview = previewAction(state, action);
    const total = preview.lines.reduce((sum, line) => sum + line.p, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `${action.kind} lines sum to 1`);
    const list = outcomes(state, action);
    assert.equal(preview.risky, new Set(list.map((outcome) => outcome.tag)).size > 1, action.kind);
    if (action.kind === "shoot") {
      const goal = list.filter((outcome) => outcome.tag === "goal").reduce((sum, outcome) => sum + outcome.p, 0);
      assert.ok(Math.abs(preview.chance - goal) < 1e-9);
      assert.ok(preview.factors.length >= 3, "a shot explains itself");
    }
  }
});

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

test("the game keeps its own look: no StatOz design system or shared match chrome", () => {
  const root = join(process.cwd(), "src/features/games/football-chess");
  const code = filesUnder(root).filter((file) => /\.(tsx?|css)$/.test(file));
  assert.ok(code.length > 10);
  for (const file of code) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/@\/design-system/.test(text), `${file} imports the StatOz design system`);
    assert.ok(!/GameMatchGate|GameLandingAd|matchmaking/.test(text), `${file} uses StatOz match chrome`);
    assert.ok(!/--ds-|Orbitron|Space Grotesk|chamfer/i.test(text), `${file} uses StatOz styling`);
  }
  const fonts = readdirSync(join(root, "fonts"));
  assert.ok(fonts.includes("OFL-fraunces.txt") && fonts.includes("OFL-ibm-plex-sans-condensed.txt"), "font licences ship with the fonts");
});

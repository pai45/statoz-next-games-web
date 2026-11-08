import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { debutBands, draftDebut, revealOrder, squadOvr } from "../src/features/games/pitch-duel/engine/debut";
import { createMatch, currentTurn, step } from "../src/features/games/pitch-duel/engine/match";
import { addMomentum, cpuSpendsSurge, momentumFull, surgeReady } from "../src/features/games/pitch-duel/engine/momentum";
import { formations, lineupErrors, positionFit } from "../src/features/games/pitch-duel/engine/lineup";
import { seededSource } from "../src/features/games/pitch-duel/engine/rng";
import { draftOpponent } from "../src/features/games/pitch-duel/engine/setup";
import { autoplay } from "../src/features/games/pitch-duel/engine/simulate";
import { PitchDuelInputError, type MatchSetup, type MatchState } from "../src/features/games/pitch-duel/engine/types";
import { emptyCareer, needsDebut, sanitizeCareer } from "../src/features/games/pitch-duel/state/career-schema";

const byId = new Map(footballPlayerCards.map((c) => [c.id, c]));
const cardFor = (id: string) => byId.get(id);
const rating = (id: string) => byId.get(id)?.rating ?? 0;
const pools = {
  outfield: footballPlayerCards.filter((c) => c.role !== "goalkeeper"),
  keepers: footballPlayerCards.filter((c) => c.role === "goalkeeper"),
};

test("the debut XI is a legal 4-3-3 with one marquee, two stars and natural positions", () => {
  let ovrTotal = 0;
  let platinum = 0;
  const n = 300;
  for (let seed = 1; seed <= n; seed += 1) {
    const squad = draftDebut(pools, seededSource(seed));
    const ids = [squad.keeperId, ...squad.outfield];
    assert.equal(squad.formation, "4-3-3");
    assert.equal(new Set(ids).size, 11, "eleven different players");
    assert.equal(cardFor(squad.keeperId)?.role, "goalkeeper");
    assert.ok(ids.includes(squad.marqueeId));
    assert.deepEqual(lineupErrors({ formation: squad.formation, keeperId: squad.keeperId, outfield: squad.outfield, tactics: [] }, ids, [], cardFor), []);

    const slots = formations[squad.formation].slots;
    squad.outfield.forEach((id, i) => assert.ok(positionFit(cardFor(id)!, slots[i].pos) >= 2, `${id} at ${slots[i].pos}`));

    const marquee = rating(squad.marqueeId);
    assert.ok(marquee >= debutBands.marquee[0], `marquee ${marquee}`);
    if (marquee >= 90) platinum += 1;
    const others = ids.filter((id) => id !== squad.marqueeId).map(rating);
    assert.ok(others.every((r) => r <= debutBands.star[1] + 4), `no second marquee: ${others}`);
    assert.ok(others.filter((r) => r >= 82).length >= 2, "two stars");
    ovrTotal += squadOvr(ids, rating);
  }
  const mean = ovrTotal / n;
  assert.ok(mean >= 78 && mean <= 82, `mean debut OVR ${mean}`);
  assert.ok(platinum / n > 0.04 && platinum / n < 0.25, `platinum rate ${platinum / n}`);
});

test("the debut draw is deterministic per seed and avoids owned cards when it can", () => {
  assert.deepEqual(draftDebut(pools, seededSource(42)), draftDebut(pools, seededSource(42)));
  const first = draftDebut(pools, seededSource(7));
  const owned = new Set([first.keeperId, ...first.outfield]);
  const second = draftDebut(pools, seededSource(7), owned);
  const repeats = [second.keeperId, ...second.outfield].filter((id) => owned.has(id));
  assert.ok(repeats.length <= 2, `repeats ${repeats.length}`);
});

test("the reveal runs lowest rated first and saves the marquee for last", () => {
  const squad = draftDebut(pools, seededSource(3));
  const order = revealOrder(squad, rating);
  assert.equal(order.length, 11);
  assert.equal(order.at(-1), squad.marqueeId);
  const rest = order.slice(0, -1).map(rating);
  assert.deepEqual(rest, [...rest].sort((a, b) => a - b));
});

test("only a first-time career gets the debut, and a saved debut survives a reload", () => {
  assert.equal(needsDebut(emptyCareer), true);
  assert.equal(needsDebut({ ...emptyCareer, played: 1 }), false);
  assert.equal(needsDebut({ ...emptyCareer, migratedFrom: 3 }), false);

  const squad = draftDebut(pools, seededSource(11));
  const saved = sanitizeCareer(JSON.parse(JSON.stringify({ ...emptyCareer, debut: { ...squad, claimed: false } })));
  assert.deepEqual(saved.debut, { ...squad, claimed: false });
  assert.equal(needsDebut(saved), true);
  assert.equal(needsDebut({ ...saved, debut: { ...squad, claimed: true } }), false);

  // A broken debut record is dropped, and sound defaults on.
  const broken = sanitizeCareer({ ...emptyCareer, debut: { ...squad, outfield: ["nobody"] } });
  assert.equal(broken.debut, undefined);
  assert.equal(broken.settings.sound, true);
  assert.equal(sanitizeCareer({ ...emptyCareer, settings: { haptics: true, sound: false } }).settings.sound, false);
});

/* ---- Momentum -------------------------------------------------------------- */

const opponentPools = {
  attackers: footballPlayerCards.filter((c) => c.role === "attacker"),
  defenders: footballPlayerCards.filter((c) => c.role === "defender"),
  keepers: footballPlayerCards.filter((c) => c.role === "goalkeeper"),
};

function setupFor(seed: number, division = 2): MatchSetup {
  const r = seededSource(seed * 13 + 5);
  const me = draftOpponent(division, opponentPools, r);
  const op = draftOpponent(division, opponentPools, r);
  return { seed, division, opponentName: op.name, home: { ...me.team, name: "YOU", tactics: [] }, away: op.team };
}

test("a full bar holds until spent, and momentum stays within 0–100", () => {
  const s = { momentum: { home: 90, away: 5 } };
  addMomentum(s, "home", 30);
  assert.equal(s.momentum.home, momentumFull);
  addMomentum(s, "home", -40);
  assert.equal(s.momentum.home, momentumFull, "a ready surge is not lost");
  addMomentum(s, "away", -40);
  assert.equal(s.momentum.away, 0);
  assert.equal(surgeReady(s, "home"), true);
});

test("a surge can only be played when ready, and spending it empties the bar", () => {
  let s: MatchState = step(createMatch({ ...setupFor(21), firstKickoff: "home" }), { type: "continue" });
  const turn = currentTurn(s);
  assert.equal(turn.kind, "attack");
  if (turn.kind !== "attack") return;
  assert.throws(() => step(s, { type: "attack", action: turn.options[0], surge: true }), PitchDuelInputError);

  s = { ...s, momentum: { home: 100, away: 0 } };
  const next = step(s, { type: "attack", action: turn.options[0], surge: true });
  assert.ok(next.lastResolution?.surges.includes("home"));
  assert.ok(next.log.some((e) => e.kind === "surge" && e.side === "home"));
  assert.ok(next.momentum.home < 100);
  assert.equal(typeof next.lastResolution?.margin, "number");
});

test("the CPU spends its surge only near your goal, and surges happen in real matches", () => {
  const s = createMatch(setupFor(4));
  const ready = { ...s, momentum: { home: 0, away: 100 }, pending: { kind: "open" as const } };
  assert.equal(cpuSpendsSurge({ ...ready, possession: { side: "away", progress: 3, lane: "center", bonus: 0 } }), false);
  assert.equal(cpuSpendsSurge({ ...ready, possession: { side: "away", progress: 6, lane: "center", bonus: 0 } }), true);
  assert.equal(cpuSpendsSurge({ ...ready, possession: { side: "home", progress: 7, lane: "center", bonus: 0 } }), true);

  let home = 0;
  let away = 0;
  for (let seed = 1; seed <= 80; seed += 1) {
    const done = autoplay(setupFor(seed));
    home += done.log.filter((e) => e.kind === "surge" && e.side === "home").length;
    away += done.log.filter((e) => e.kind === "surge" && e.side === "away").length;
    for (const side of ["home", "away"] as const) assert.ok(done.momentum[side] >= 0 && done.momentum[side] <= 100);
  }
  assert.ok(home / 80 >= 0.5 && home / 80 <= 3, `home surges ${home / 80}`);
  assert.ok(away / 80 >= 0.5 && away / 80 <= 3, `away surges ${away / 80}`);
});

/* ---- Sound provenance -------------------------------------------------------- */

test("every sound file matches its CC0 provenance record", () => {
  const root = path.resolve("public/games/pitch-duel");
  const provenance = JSON.parse(fs.readFileSync(path.join(root, "PROVENANCE.json"), "utf8")) as {
    audio: { file: string; sha256: string; bytes: number; license: string; source: string }[];
  };
  for (const entry of provenance.audio) {
    const bytes = fs.readFileSync(path.join(root, entry.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256, entry.file);
    assert.equal(bytes.length, entry.bytes, entry.file);
    assert.equal(entry.license, "CC0-1.0", entry.file);
    assert.match(entry.source, /^https:\/\/freesound\.org\//, entry.file);
  }
  const listed = new Set(provenance.audio.map((e) => e.file));
  const present = fs.readdirSync(path.join(root, "audio")).map((f) => `audio/${f}`);
  assert.deepEqual(present.filter((f) => !listed.has(f)), [], "every file in audio/ is recorded");
});

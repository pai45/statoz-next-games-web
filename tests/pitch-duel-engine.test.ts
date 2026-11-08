import { test } from "node:test";
import assert from "node:assert/strict";

import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { fictionalCards } from "../src/mocks/packs/pitch-duel-fictional";
import { attackMenu, attacks, defenseMenu, defenses, families, relationOf } from "../src/features/games/pitch-duel/engine/actions";
import { outcomeProbabilities } from "../src/features/games/pitch-duel/engine/duel";
import { createMatch, currentTurn, step } from "../src/features/games/pitch-duel/engine/match";
import { seededSource } from "../src/features/games/pitch-duel/engine/rng";
import { draftOpponent } from "../src/features/games/pitch-duel/engine/setup";
import { autoplay, sensiblePolicy, uniformPolicy } from "../src/features/games/pitch-duel/engine/simulate";
import { deriveStats } from "../src/features/games/pitch-duel/engine/stats";
import { duelOdds, duelists, sentOffSet } from "../src/features/games/pitch-duel/engine/situation";
import { PitchDuelInputError, type MatchSetup, type Progress } from "../src/features/games/pitch-duel/engine/types";
import { absoluteX } from "../src/features/games/pitch-duel/engine/zones";
import { pitchScene } from "../src/features/games/pitch-duel/components/pitch-layout";

const pools = {
  attackers: footballPlayerCards.filter((c) => c.role === "attacker"),
  defenders: footballPlayerCards.filter((c) => c.role === "defender"),
  keepers: footballPlayerCards.filter((c) => c.role === "goalkeeper"),
};

function setupFor(seed: number, division = 2, tactics: { id: string; power: number }[] = []): MatchSetup {
  const r = seededSource(seed * 31 + 7);
  const me = draftOpponent(division, pools, r);
  const op = draftOpponent(division, pools, r);
  return { seed, division, opponentName: op.name, home: { ...me.team, name: "YOU", tactics }, away: op.team };
}

test("derived stats are deterministic, bounded and shaped by position", () => {
  for (const card of [...footballPlayerCards, ...fictionalCards]) {
    const a = deriveStats(card);
    assert.deepEqual(a, deriveStats(card));
    for (const v of [a.pac, a.sho, a.pas, a.dri, a.def, a.phy, a.keep, a.composure]) assert.ok(v >= 35 && v <= 99, `${card.id} ${v}`);
  }
  const st = pools.attackers.find((c) => c.position === "ST")!;
  const cb = pools.defenders.find((c) => c.position === "CB")!;
  const gk = pools.keepers[0];
  assert.ok(deriveStats(st).sho - st.rating > deriveStats(cb).sho - cb.rating);
  assert.ok(deriveStats(cb).def - cb.rating > deriveStats(st).def - st.rating);
  assert.ok(Math.abs(deriveStats(gk).keep - gk.rating) <= 6);
});

test("menus are fixed per spot and follow Ballers' gating", () => {
  for (const p of [1, 2, 3, 4, 5, 6, 7, 8] as Progress[]) {
    for (const lane of ["left", "center", "right"] as const) {
      const menu = attackMenu(p, lane);
      assert.ok(menu.length >= 3 && menu.length <= 4);
      assert.ok(menu.some((a) => attacks[a].family === "CARRY"), "always a carry option");
      if (p <= 5) assert.ok(!menu.some((a) => attacks[a].family === "SHOT"), "no shots from deep");
      if (lane === "center") assert.ok(!menu.includes("cross"), "cross is wings-only");
    }
  }
  assert.ok(attackMenu(8, "center").includes("finish"));
  assert.ok(attackMenu(6, "left").includes("longShot") && attackMenu(7, "center").includes("longShot"));
  assert.ok(!defenseMenu(3).includes("block") && defenseMenu(7).includes("block"));
  assert.ok(defenseMenu(8).includes("clearance") && !defenseMenu(6).includes("clearance"));
});

test("counter matrix: every family has exactly one full counter", () => {
  const counted = Object.values(defenses).filter((d) => d.id !== "slide" && d.id !== "clearance");
  for (const family of families) assert.equal(counted.filter((d) => d.full.includes(family)).length, 1, family);
  assert.equal(relationOf("shortPass", "intercept"), "full");
  assert.equal(relationOf("dribble", "intercept"), "wrong");
  assert.equal(relationOf("throughBall", "intercept"), "partial");
});

test("duel odds are exact and counters bite", () => {
  for (const k of [-20, -5, 0, 4, 18]) {
    const p = outcomeProbabilities(k, 0.8);
    assert.ok(Math.abs(Object.values(p).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  }
  const win = (k: number) => {
    const p = outcomeProbabilities(k, 0.9);
    return p.success + p.success_high;
  };
  // A dribble (base 3) on equal stats: wrong read, partial, full counter.
  assert.ok(win(3 + 4) > 0.7);
  assert.ok(win(3 - 13) < 0.3);
  assert.ok(win(3 + 4) > win(3 - 4) && win(3 - 4) > win(3 - 13));
});

test("the same seed and inputs replay the same match", () => {
  const a = autoplay(setupFor(5));
  const b = autoplay(setupFor(5));
  assert.deepEqual(a, b);
  const c = autoplay(setupFor(6));
  assert.notDeepEqual(a.log.map((e) => e.text), c.log.map((e) => e.text));
});

test("clock runs to 90' in about thirty decisions, with one half-time", () => {
  let total = 0;
  for (let seed = 1; seed <= 150; seed += 1) {
    const s = autoplay(setupFor(seed));
    assert.equal(s.phase, "fulltime");
    assert.ok(s.minute >= 90);
    assert.ok(s.decisions >= 26 && s.decisions <= 36, `decisions ${s.decisions}`);
    assert.equal(s.log.filter((e) => e.kind === "halftime").length, 1);
    assert.equal(s.log.filter((e) => e.kind === "fulltime").length, 1);
    assert.equal(s.log.filter((e) => e.kind === "goal").length, s.score.home + s.score.away);
    total += s.decisions;
  }
  const mean = total / 150;
  assert.ok(mean >= 29 && mean <= 33, `mean ${mean}`);
});

test("calibration: goals and draws land in football's range", () => {
  let goals = 0;
  let draws = 0;
  let blowouts = 0;
  const n = 400;
  for (let seed = 1; seed <= n; seed += 1) {
    const s = autoplay(setupFor(seed, 2), sensiblePolicy);
    goals += s.score.home + s.score.away;
    if (s.score.home === s.score.away) draws += 1;
    if (s.score.home + s.score.away >= 7) blowouts += 1;
  }
  assert.ok(goals / n >= 1.8 && goals / n <= 3.2, `goals ${goals / n}`);
  assert.ok(draws / n >= 0.15 && draws / n <= 0.38, `draws ${draws / n}`);
  assert.ok(blowouts / n <= 0.04, `blowouts ${blowouts / n}`);
});

test("illegal input throws and the menu is enforced", () => {
  let s = createMatch(setupFor(9));
  assert.throws(() => step(s, { type: "attack", action: "finish" }), PitchDuelInputError);
  s = step(s, { type: "continue" });
  const turn = currentTurn(s);
  assert.equal(turn.kind, "attack");
  assert.throws(() => step(s, { type: "attack", action: "finish" }), PitchDuelInputError);
  assert.throws(() => step(s, { type: "defend", action: "tackle" }), PitchDuelInputError);
  assert.throws(() => step(s, { type: "continue" }), PitchDuelInputError);
});

test("tactics are single use and Mind Game reveals the CPU's committed pick", () => {
  let s = createMatch(setupFor(11, 2, [{ id: "act15-gold", power: 10 }, { id: "act1-gold", power: 15 }]));
  s = step(s, { type: "continue" });
  const intent = s.cpuIntent;
  assert.ok(intent);
  s = step(s, { type: "mindGame", tacticId: "act15-gold" });
  assert.equal(s.intentRevealed, true);
  assert.deepEqual(s.cpuIntent, intent, "revealing does not change the pick");
  assert.throws(() => step(s, { type: "mindGame", tacticId: "act15-gold" }), PitchDuelInputError);
  const turn = currentTurn(s);
  assert.equal(turn.kind, "attack");
  if (turn.kind === "attack") {
    s = step(s, { type: "attack", action: turn.options[0], tacticId: "act1-gold" });
    assert.ok(s.teams.home.tactics.every((t) => t.used));
  }
});

test("a foul in the box becomes a penalty the human can take", () => {
  // Drive until a penalty appears in some seeded match.
  let found = false;
  for (let seed = 1; seed <= 300 && !found; seed += 1) {
    const random = seededSource(seed);
    let s = createMatch(setupFor(seed));
    for (let guard = 0; guard < 200; guard += 1) {
      const turn = currentTurn(s);
      if (turn.kind === "over") break;
      if (turn.kind === "setPiece" && turn.setPiece.kind === "penalty") {
        assert.equal(turn.options.length, turn.role === "taker" ? 5 : 3);
        const before = s.decisions;
        s = step(s, { type: "setPiece", option: turn.options[0] });
        assert.equal(s.decisions, before + 1);
        found = true;
        break;
      }
      s = step(s, turn.kind === "continue" ? { type: "continue" } : uniformPolicy(turn, s, random));
    }
  }
  assert.ok(found);
});

test("a sent-off player stops duelling and gives the other side the man advantage", () => {
  const match = createMatch(setupFor(41));
  const before = duelOdds(match, "dribble", "tackle");
  const sent = structuredClone(match);
  sent.possession = { side: "home", progress: 4, lane: "center", bonus: 0 };
  const { defenderId } = duelists(sent);
  sent.players[`away:${defenderId}`].red = true;
  assert.notEqual(duelists(sent).defenderId, defenderId, "the red-carded player is replaced");
  assert.ok(sentOffSet(sent, "away").has(defenderId));
  assert.equal(sentOffSet(sent, "home").size, 0, "red cards are tracked per side");
  const fresh = structuredClone(match);
  fresh.possession = sent.possession;
  assert.ok(duelOdds(sent, "dribble", "tackle").k > duelOdds(fresh, "dribble", "tackle").k, "a man up adds to the attack");
  assert.ok(Number.isFinite(before.k));
});

test("the pitch view places every player on the pitch, with the duel at the ball", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const match = createMatch(setupFor(seed));
    const turn = structuredClone(match);
    for (const progress of [1, 4, 8] as Progress[]) {
      for (const side of ["home", "away"] as const) {
        turn.possession = { side, progress, lane: "center", bonus: 0 };
        const { attackerId, defenderId } = duelists(turn);
        const other = side === "home" ? "away" : "home";
        const scene = pitchScene(turn, { x: absoluteX(side, progress), lane: "center", possession: side, duel: { [side]: attackerId, [other]: defenderId } as Record<"home" | "away", string> });
        assert.equal(scene.tokens.length, 22);
        for (const t of scene.tokens) assert.ok(t.x >= 0 && t.x <= 1 && t.y >= 0 && t.y <= 1, `${t.id} at ${t.x},${t.y}`);
        const carrier = scene.tokens.find((t) => t.carrier)!;
        assert.equal(carrier.id, attackerId);
        assert.ok(Math.abs(carrier.x - scene.ball.x) < 0.06, "the carrier stands at the ball");
        const keepers = scene.tokens.filter((t) => t.keeper && !t.duel);
        for (const k of keepers) assert.ok(k.side === "home" ? k.x < 0.1 : k.x > 0.9, "keepers stay home");
      }
    }
    turn.players[`home:${turn.teams.home.outfield[0]}`].red = true;
    const fewer = pitchScene(turn, { x: 4, lane: "left", possession: "home", duel: duelistsFor(turn) });
    assert.equal(fewer.tokens.length, 21, "a sent-off player leaves the pitch");
  }
});

function duelistsFor(state: ReturnType<typeof createMatch>): Record<"home" | "away", string> {
  const { attackerId, defenderId } = duelists(state);
  return state.possession.side === "home" ? { home: attackerId, away: defenderId } : { home: defenderId, away: attackerId };
}

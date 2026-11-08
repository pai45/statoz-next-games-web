import { test } from "node:test";
import assert from "node:assert/strict";

import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { carrierOf, onBoard, pieceById } from "../src/features/games/football-chess/engine/board";
import { classOf, classTraits } from "../src/features/games/football-chess/engine/classes";
import { replay, step } from "../src/features/games/football-chess/engine/game";
import { sqName } from "../src/features/games/football-chess/engine/geometry";
import { actionKey, actionsOf, canAct, keeperMustRelease, legalActions } from "../src/features/games/football-chess/engine/moves";
import { positionFromDiagram } from "../src/features/games/football-chess/engine/notation";
import { outcomes } from "../src/features/games/football-chess/engine/resolve";
import { seededSource } from "../src/features/games/football-chess/engine/rng";
import { createGame, draftSquad, type CardPools } from "../src/features/games/football-chess/engine/setup";
import { playMatch, randomPolicy } from "../src/features/games/football-chess/engine/simulate";
import {
  formations,
  FootballChessInputError,
  matchConfig,
  other,
  type Action,
  type GameState,
  type MatchSetup,
  type Side,
} from "../src/features/games/football-chess/engine/state";

const pools: CardPools = {
  attackers: footballPlayerCards.filter((card) => card.role === "attacker"),
  defenders: footballPlayerCards.filter((card) => card.role === "defender"),
  keepers: footballPlayerCards.filter((card) => card.role === "goalkeeper"),
};

function setupFor(seed: number, overrides: Partial<MatchSetup> = {}): MatchSetup {
  const random = seededSource(seed * 7919 + 13);
  const home = draftSquad(82, pools, random);
  const away = draftSquad(82, pools, random, new Set(home.map((card) => card.id)));
  return {
    seed,
    home: { name: "Home", formation: formations[seed % 4], squad: home },
    away: { name: "Away", formation: formations[(seed + 1) % 4], squad: away },
    config: matchConfig("short"),
    kickoff: seed % 2 === 0 ? "home" : "away",
    ...overrides,
  };
}

const targets = (state: GameState, pieceId: string, kind: Action["kind"]) =>
  actionsOf(state, pieceId)
    .filter((action) => action.kind === kind)
    .map((action) => ("to" in action ? sqName(action.to) : actionKey(action)))
    .sort();

const empty = ".......";

test("every football card maps to an outfield class or the keeper", () => {
  const seen = new Set<string>();
  for (const card of footballPlayerCards) {
    const cls = classOf(card);
    assert.ok(cls in classTraits, card.id);
    assert.equal(cls === "keeper", card.role === "goalkeeper", card.id);
    seen.add(cls);
  }
  assert.deepEqual([...seen].sort(), ["defender", "keeper", "playmaker", "runner", "striker"]);
});

test("kick-off boards are legal for every pair of formations", () => {
  for (const home of formations) {
    for (const away of formations) {
      for (const kickoff of ["home", "away"] as Side[]) {
        const base = setupFor(3);
        const state = createGame({
          ...base,
          kickoff,
          home: { ...base.home, formation: home },
          away: { ...base.away, formation: away },
        });
        const squares = state.pieces.filter(onBoard).map((piece) => sqName(piece));
        assert.equal(new Set(squares).size, squares.length, `${home}/${away} overlap`);
        const carrier = carrierOf(state);
        assert.equal(carrier.side, kickoff);
        assert.equal(sqName(carrier), "d3");
        assert.equal(state.turn, kickoff);
        for (const piece of state.pieces.filter(onBoard)) {
          if (piece.id === carrier.id) continue;
          assert.ok(piece.side === "home" ? piece.col <= 2 : piece.col >= 4, `${piece.id} in its own half`);
        }
      }
    }
  }
});

test("a squad must be five cards ending with a goalkeeper", () => {
  const base = setupFor(1);
  assert.throws(
    () => createGame({ ...base, home: { ...base.home, squad: base.home.squad.slice(0, 4) } }),
    FootballChessInputError,
  );
  const swapped = [base.home.squad[4], ...base.home.squad.slice(1, 4), base.home.squad[0]];
  assert.throws(() => createGame({ ...base, home: { ...base.home, squad: swapped } }), FootballChessInputError);
});

test("Strikers step one square; Runners go up to two in a line and have a skill move", () => {
  const striker = positionFromDiagram({ rows: [empty, empty, "...S...", empty, empty], carrier: "d3" });
  assert.deepEqual(targets(striker, "h0", "move"), ["c2", "c3", "c4", "d2", "d4", "e2", "e3", "e4"]);

  const runner = positionFromDiagram({ rows: [empty, empty, "...R...", empty, empty], carrier: "d3" });
  assert.equal(targets(runner, "h0", "move").length, 16);
  assert.equal(targets(runner, "h0", "skill").length, 8);
});

test("a Runner with the ball stops on a guarded square, and cannot jump onto one", () => {
  // An away Defender on f4 guards e3–g5.
  const rows = [empty, ".....d.", "...R...", empty, empty];
  const withBall = positionFromDiagram({ rows, carrier: "d3" });
  const moves = targets(withBall, "h0", "move");
  assert.ok(moves.includes("e3"));
  assert.ok(!moves.includes("f3"), "stopped by the guard on e3");
  const skills = targets(withBall, "h0", "skill");
  assert.ok(!skills.includes("e5"), "e5 is guarded");
  assert.ok(skills.includes("f2"));

  // Without the ball the same Runner runs straight through.
  const offBall = positionFromDiagram({ rows: ["S......", ".....d.", "...R...", empty, empty], carrier: "a5" });
  assert.ok(targets(offBall, "h1", "move").includes("f3"));
});

test("the skill move can be used once per possession", () => {
  const state = positionFromDiagram({ rows: [empty, empty, "...R...", empty, "......d"], carrier: "d3" });
  const skill = actionsOf(state, "h0").find((action) => action.kind === "skill");
  assert.ok(skill !== undefined);
  const after = step(state, skill);
  assert.equal(after.skillSpent, true);
  // Away moves; home has the ball again with the skill spent.
  const reply = legalActions(after).find((action) => action.kind === "move") as Action;
  const back = step(after, reply);
  assert.equal(targets(back, "h0", "skill").length, 0);
});

test("passes need a lane free of opponents; a Playmaker lofts over them", () => {
  const blocked = positionFromDiagram({ rows: [empty, empty, ".R.d.S.", empty, empty], carrier: "b3" });
  assert.ok(!legalActions(blocked).some((action) => action.kind === "pass"));

  const teammate = positionFromDiagram({ rows: [empty, empty, ".R.D.S.", empty, empty], carrier: "b3" });
  assert.ok(legalActions(teammate).some((action) => action.kind === "pass" && action.targetId === "h2"));

  const lofted = positionFromDiagram({ rows: [empty, empty, ".P.d.S.", empty, empty], carrier: "b3" });
  assert.ok(legalActions(lofted).some((action) => action.kind === "pass" && action.targetId === "h1"));

  const offLane = positionFromDiagram({ rows: [empty, "..S....", "R......", empty, empty], carrier: "a3" });
  assert.ok(!legalActions(offLane).some((action) => action.kind === "pass"), "an L-shape is not a lane");
});

test("tackles and slides come from the front or side, never from behind", () => {
  // Away carries the ball on d3, attacking the home goal on the left.
  const rows = (line: string) => [empty, "...D...", line, empty, empty];
  const front = positionFromDiagram({ rows: rows("..Ds..."), carrier: "d3", turn: "home" });
  assert.ok(legalActions(front).some((action) => action.kind === "tackle" && action.pieceId === "h1"));
  assert.ok(legalActions(front).some((action) => action.kind === "tackle" && action.pieceId === "h0"), "level is fine");

  const behind = positionFromDiagram({ rows: [empty, empty, "...sD..", empty, empty], carrier: "d3", turn: "home" });
  assert.ok(!legalActions(behind).some((action) => action.kind === "tackle"));

  const slide = positionFromDiagram({ rows: [empty, empty, ".D.s...", empty, empty], carrier: "d3", turn: "home" });
  assert.ok(legalActions(slide).some((action) => action.kind === "slide"));
  const blockedSlide = positionFromDiagram({ rows: [empty, empty, ".DSs...", empty, empty], carrier: "d3", turn: "home" });
  assert.ok(!legalActions(blockedSlide).some((action) => action.kind === "slide" && action.pieceId === "h0"));
});

test("shooting range depends on the class", () => {
  const striker = positionFromDiagram({ rows: [empty, empty, "...S...", empty, empty], carrier: "d3" });
  assert.equal(targets(striker, "h0", "shoot").length, 3, "a Striker shoots from 4 columns out");
  const runner = positionFromDiagram({ rows: [empty, empty, "...R...", empty, empty], carrier: "d3" });
  assert.equal(targets(runner, "h0", "shoot").length, 0);
  const closer = positionFromDiagram({ rows: [empty, empty, "....R..", empty, empty], carrier: "e3" });
  assert.equal(targets(closer, "h0", "shoot").length, 3);
});

test("keepers step toward the ball after attacking actions only", () => {
  const state = positionFromDiagram({
    rows: [".....S.", empty, empty, "s......", empty],
    carrier: "f5",
    keepers: { home: 2, away: 2 },
  });
  const move = actionsOf(state, "h0").find((action) => action.kind === "move" && sqName(action.to) === "f4") as Action;
  const afterAttack = step(state, move);
  assert.equal(pieceById(afterAttack, "ak").row, 3);
  assert.equal(pieceById(afterAttack, "hk").row, 3);
  const defend = actionsOf(afterAttack, "a0").find((action) => action.kind === "move") as Action;
  const afterDefence = step(afterAttack, defend);
  assert.equal(pieceById(afterDefence, "ak").row, 3);
  assert.equal(pieceById(afterDefence, "hk").row, 3);
});

test("either keeper allows one setup action, then must throw after the opponent replies", () => {
  for (const side of ["home", "away"] as const) {
    const keeper = side === "home" ? "hk" : "ak";
    let state = positionFromDiagram({ rows: [empty, empty, ".S...s.", empty, empty], carrier: keeper });
    assert.equal(keeperMustRelease(state), false);
    assert.ok(legalActions(state).some((action) => action.kind === "pass"), "can throw immediately");
    const setup = legalActions(state).find((action) => action.kind === "move");
    assert.ok(setup);
    state = step(state, setup);
    assert.equal(state.carrierId, keeper);
    assert.equal(state.keeperSetupUsed, true);
    assert.equal(state.attackClock, 5);
    const reply = legalActions(state).find((action) => action.kind === "move");
    assert.ok(reply, "opponent can reposition to mark the receiver");
    state = step(state, reply);
    assert.equal(keeperMustRelease(state), true);
    assert.equal(state.attackClock, 5, "opponent action does not use the attack clock");
    assert.equal(canAct(state, pieceById(state, setup.pieceId)), false);
    assert.ok(legalActions(state).every((action) => action.kind === "pass" && action.pieceId === keeper));
    assert.throws(() => step(state, { kind: "hold", pieceId: keeper }), FootballChessInputError);
    assert.throws(() => step(state, setup), FootballChessInputError, "cannot take a second setup action");
    state = step(state, legalActions(state)[0]);
    assert.equal(state.keeperSetupUsed, false);
    assert.equal(carrierOf(state).cls, "striker");
    assert.equal(state.attackClock, 4, "distribution does not reset the attack clock");
  }
});

test("throwing immediately leaves the setup allowance clear", () => {
  const state = positionFromDiagram({ rows: [empty, empty, ".S...s.", empty, empty], carrier: "hk" });
  const pass = legalActions(state).find((action) => action.kind === "pass");
  assert.ok(pass);
  const after = step(state, pass);
  assert.equal(after.keeperSetupUsed, false);
  assert.notEqual(after.carrierId, "hk");
});

test("a forced keeper throw still risks interception when every receiver is marked", () => {
  const fresh = positionFromDiagram({
    rows: [empty, empty, ".Sd....", empty, empty], carrier: "hk", config: { allowForced: true },
  });
  const state = { ...fresh, keeperSetupUsed: true };
  const legal = legalActions(state);
  assert.equal(legal.length, 1);
  assert.equal(legal[0].kind, "pass");
  const list = outcomes(state, legal[0]);
  const intercepted = list.findIndex((outcome) => outcome.tag === "intercepted");
  assert.ok(intercepted >= 0);
  assert.ok(Math.abs(list[intercepted].p - 0.15) < 1e-12);
  const after = step(state, legal[0], { forced: intercepted });
  assert.equal(carrierOf(after).side, "away");
  assert.equal(after.keeperSetupUsed, false);
  assert.equal(after.attackClock, after.setup.config.attackClock);
});

test("saves start fresh, and replay reconstructs a used keeper setup allowance", () => {
  const setup = setupFor(2, { kickoff: "home", config: { ...matchConfig("short"), allowForced: true } });
  // A Striker at kick-off can shoot from d3.
  const striker = footballPlayerCards.find((card) => classOf(card) === "striker");
  assert.ok(striker);
  setup.home = { ...setup.home, squad: [striker, ...setup.home.squad.slice(1)] };
  let state = createGame(setup);
  const shot = legalActions(state).find((action) => action.kind === "shoot");
  assert.ok(shot);
  const saved = outcomes(state, shot).findIndex((outcome) => outcome.tag === "saved");
  assert.ok(saved >= 0);
  state = step(state, shot, { forced: saved });
  assert.equal(state.carrierId, "ak");
  assert.equal(state.keeperSetupUsed, false);
  const setupMove = legalActions(state).find((action) => action.kind === "move");
  assert.ok(setupMove);
  state = step(state, setupMove);
  assert.equal(state.keeperSetupUsed, true);
  assert.deepEqual(replay(setup, state.log), state);
});

test("a keeper with no outfield receiver holds until the sin bin returns a teammate", () => {
  const fresh = positionFromDiagram({ rows: [empty, empty, ".S...s.", empty, empty], carrier: "hk" });
  let state: GameState = {
    ...fresh,
    keeperSetupUsed: true,
    pieces: fresh.pieces.map((piece) => piece.id === "h0" ? { ...piece, offFor: 1 } : piece),
  };
  assert.deepEqual(legalActions(state).map((action) => action.kind), ["hold"]);
  state = step(state, legalActions(state)[0]);
  assert.equal(state.keeperSetupUsed, true);
  assert.equal(pieceById(state, "h0").offFor, 0);
  state = step(state, legalActions(state)[0]);
  assert.ok(legalActions(state).every((action) => action.kind === "pass" && action.pieceId === "hk"));
});

test("keeper possession does not postpone half time or full time", () => {
  for (const half of [1, 2] as const) {
    const fresh = positionFromDiagram({ rows: [empty, empty, ".S...s.", empty, empty], carrier: "hk" });
    const state = { ...fresh, half, actionsLeft: { home: 1, away: 0 } };
    const setup = legalActions(state).find((action) => action.kind === "move");
    assert.ok(setup);
    const after = step(state, setup);
    assert.equal(after.keeperSetupUsed, false);
    assert.equal(half === 1 ? after.last?.halfTime : after.last?.fullTime, true);
  }
});

test("the attack clock turns a stalling possession over to the nearest opponent", () => {
  let state = positionFromDiagram({
    rows: [empty, empty, "S.....s", empty, "d......"],
    carrier: "a3",
    attackClock: 2,
  });
  const homeMove = (s: GameState) => actionsOf(s, "h0").find((action) => action.kind === "move") as Action;
  const awayMove = (s: GameState) => actionsOf(s, "a1").find((action) => action.kind === "move") as Action;
  state = step(state, homeMove(state));
  assert.equal(state.attackClock, 1);
  state = step(state, awayMove(state));
  assert.equal(state.attackClock, 1, "the defending side's actions do not run the clock");
  state = step(state, homeMove(state));
  assert.equal(state.last?.passive, true);
  assert.equal(carrierOf(state).side, "away");
  assert.equal(state.stats.home.passives, 1);
  assert.equal(state.attackClock, state.setup.config.attackClock);
});

test("a blocked shot can become a corner that keeps the attack going", () => {
  const state = positionFromDiagram({
    rows: [empty, empty, "....Sd.", empty, empty],
    carrier: "e3",
    config: { allowForced: true },
  });
  const shot: Action = { kind: "shoot", pieceId: "h0", target: 2 };
  const list = outcomes(state, shot);
  const cornerIndex = list.findIndex((outcome) => outcome.tag === "corner");
  assert.ok(cornerIndex >= 0);
  const after = step(state, shot, { forced: cornerIndex });
  assert.equal(carrierOf(after).side, "home");
  assert.equal(after.attackClock, 3);
  assert.equal(sqName(carrierOf(after)), "g1");
});

test("a foul in the penalty area gives a penalty, and a second yellow sends a player to the sin bin", () => {
  // Away carries on b3, inside the home penalty area; home's Defender on b1
  // slides from level, through the empty b2.
  const state = positionFromDiagram({
    rows: [empty, empty, ".s.....", empty, ".D....."],
    carrier: "b3",
    turn: "home",
    config: { allowForced: true },
  });
  const booked: GameState = {
    ...state,
    pieces: state.pieces.map((piece) => (piece.id === "h0" ? { ...piece, yellow: true } : piece)),
  };
  const slide: Action = { kind: "slide", pieceId: "h0" };
  const foulIndex = outcomes(booked, slide).findIndex((outcome) => outcome.tag === "foul");
  const fouled = step(booked, slide, { forced: foulIndex });
  assert.equal(fouled.phase, "penalty");
  assert.equal(fouled.turn, "away");
  assert.equal(fouled.last?.card, "red");
  assert.equal(pieceById(fouled, "h0").offFor, 6);
  assert.ok(!onBoard(pieceById(fouled, "h0")));
  assert.ok(legalActions(fouled).every((action) => action.kind === "shoot" && action.pieceId === "a0"));

  const actionsBefore = fouled.actionsLeft.away;
  const scored = step(fouled, { kind: "shoot", pieceId: "a0", target: 2 }, { forced: 0 });
  assert.equal(scored.score.away, 1);
  assert.equal(scored.actionsLeft.away, actionsBefore, "a penalty kick costs no action");
  assert.equal(scored.turn, "home", "the conceding side kicks off");
});

test("a sent-off player returns after six of its side's actions", () => {
  let state = createGame({ ...setupFor(4), config: { ...matchConfig("long"), attackClock: 0 } });
  state = {
    ...state,
    pieces: state.pieces.map((piece) => (piece.id === "h2" ? { ...piece, offFor: 6 } : piece)),
  };
  const policy = randomPolicy(9);
  let homeActions = 0;
  while (homeActions < 6) {
    if (state.turn === "home") homeActions += 1;
    state = step(state, policy(state));
  }
  assert.equal(pieceById(state, "h2").offFor, 0);
  assert.ok(onBoard(pieceById(state, "h2")));
});

test("halves: each side plays its actions, and the other side kicks off the second half", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const setup = setupFor(seed);
    let state = createGame(setup);
    const policy = randomPolicy(seed);
    let sawHalfTime = false;
    while (state.phase !== "fullTime") {
      state = step(state, policy(state));
      if (state.last?.halfTime === true) {
        sawHalfTime = true;
        assert.equal(state.half, 2);
        assert.equal(state.turn, other(setup.kickoff));
        assert.equal(sqName(carrierOf(state)), "d3");
      }
    }
    assert.ok(sawHalfTime);
    const perSide = (side: Side) =>
      state.log.filter((entry, index) => entry.side === side && !wasPenaltyKick(setup, state, index)).length;
    assert.equal(perSide("home"), setup.config.actionsPerHalf * 2);
    assert.equal(perSide("away"), setup.config.actionsPerHalf * 2);
  }
});

function wasPenaltyKick(setup: MatchSetup, final: GameState, index: number): boolean {
  if (index === 0) return false;
  const before = replay(setup, final.log.slice(0, index));
  return before.phase === "penalty";
}

test("every action's outcomes sum to one", () => {
  for (const seed of [11, 12, 13]) {
    let state = createGame(setupFor(seed));
    const policy = randomPolicy(seed);
    while (state.phase !== "fullTime") {
      for (const action of legalActions(state)) {
        const list = outcomes(state, action);
        const total = list.reduce((sum, outcome) => sum + outcome.p, 0);
        assert.ok(Math.abs(total - 1) < 1e-9, `${actionKey(action)} sums to ${total}`);
        assert.ok(list.every((outcome) => outcome.p > 0 && outcome.p <= 1));
      }
      state = step(state, policy(state));
    }
  }
});

test("matches are deterministic, replay from their log, and reject tampering", () => {
  const setup = setupFor(21, { config: matchConfig("standard") });
  const first = playMatch(setup, { home: randomPolicy(1), away: randomPolicy(2) });
  const second = playMatch(setup, { home: randomPolicy(1), away: randomPolicy(2) });
  assert.deepEqual(second.log, first.log);
  assert.deepEqual(second.score, first.score);

  const rebuilt = replay(setup, first.log);
  assert.deepEqual(rebuilt.score, first.score);
  assert.equal(rebuilt.ply, first.ply);
  assert.equal(rebuilt.rng, first.rng);

  const rolled = first.log.findIndex((entry, index) => outcomes(replay(setup, first.log.slice(0, index)), entry.action).length > 1);
  assert.ok(rolled >= 0);
  const forged = first.log.map((entry, index) =>
    index === rolled ? { ...entry, outcome: entry.outcome === 0 ? 1 : 0 } : entry,
  );
  assert.throws(() => replay(setup, forged), FootballChessInputError);

  const forcedEntry = first.log.map((entry, index) => (index === rolled ? { ...entry, forced: true } : entry));
  assert.throws(() => replay(setup, forcedEntry), FootballChessInputError);
});

test("illegal actions are refused", () => {
  const state = createGame(setupFor(2));
  const opponentPiece = state.pieces.find((piece) => piece.side !== state.turn && onBoard(piece));
  assert.ok(opponentPiece !== undefined);
  assert.throws(
    () => step(state, { kind: "move", pieceId: opponentPiece.id, to: { col: 3, row: 0 } }),
    FootballChessInputError,
  );
  assert.throws(
    () => step(state, { kind: "pass", pieceId: state.carrierId, targetId: opponentPiece.id }),
    FootballChessInputError,
  );
});

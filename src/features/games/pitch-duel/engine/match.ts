import type { RandomSource } from "../../shared/engine/random-source";

import { attackMenu, attacks, defenseMenu, defenses } from "./actions";
import { chooseCpuAttack, chooseCpuDefense, chooseCpuSetPiece } from "./cpu";
import { isWin, rollDuel } from "./duel";
import { addMomentum, cpuSpendsSurge, momentumGain, surgeBoost, surgeReady } from "./momentum";
import { Stream } from "./rng";
import {
  cornerCountered,
  defenderOptions,
  freeKickGoalChance,
  isDefenderOption,
  isTakerOption,
  oneOnOneGoalChance,
  penaltyGoalChance,
  setPieceTitles,
  takerOptions,
} from "./set-pieces";
import { deriveStats } from "./stats";
import { bestFor, difficulty, duelOdds, duelists } from "./situation";
import { blueprintOf, tacticBoost, tacticPlayable } from "./tactics";
import { absoluteX, band, clampProgress, isWing, mirror, normalizeLane, opposite, oppositeWing, zoneNames } from "./zones";
import {
  PitchDuelInputError,
  type AttackId,
  type CornerDefence,
  type CornerDelivery,
  type CpuIntent,
  type DefenseId,
  type EventKind,
  type FreeKickShot,
  type FreeKickWall,
  type KeeperDive,
  type Lane,
  type MatchEvent,
  type MatchInput,
  type MatchSetup,
  type MatchState,
  type OneOnOneFinish,
  type OneOnOneKeeper,
  type Outcome,
  type PenaltyTarget,
  type PlayerMatchLine,
  type Progress,
  type Resolution,
  type SetPiece,
  type SetPieceKind,
  type SetPieceOption,
  type Side,
  type SideStats,
  type TacticSlot,
  type TeamSheet,
} from "./types";

/* ---- Constants ------------------------------------------------------------ */

export const halfLength = 45;
/** Minutes per decision the pacing governor steers toward: ~30 decisions a match. */
export const minutesPerDecision = 3.2;
const extraMinuteChance = 0.35;

type ShotKind = "finish" | "long" | "header" | "weak";

const shotTable: Record<Exclude<ShotKind, "long" | "weak">, [number, number]> = {
  finish: [0.6, 0.78],
  header: [0.48, 0.66],
};

function shotChance(kind: ShotKind, quality: "normal" | "high", progress: Progress): number {
  if (kind === "weak") return 0.07;
  if (kind === "long") return progress >= 7 ? (quality === "high" ? 0.48 : 0.3) : quality === "high" ? 0.36 : 0.2;
  return shotTable[kind][quality === "high" ? 1 : 0];
}

/* ---- Setup ---------------------------------------------------------------- */

const emptyLine = (): PlayerMatchLine => ({ duelsWon: 0, duelsLost: 0, goals: 0, shots: 0, saves: 0, conceded: 0, fouls: 0, yellow: 0, red: false });
const emptyStats = (): SideStats => ({ shots: 0, onTarget: 0, fouls: 0, corners: 0, duelsWon: 0, readsWon: 0 });

function sheet(side: Side, team: MatchSetup["home"]): TeamSheet {
  const stats = Object.fromEntries(Object.values(team.cards).map((card) => [card.id, deriveStats(card)]));
  return {
    ...team,
    side,
    stats,
    tactics: team.tactics.map((t): TacticSlot => ({ id: t.id, power: t.power, used: false })),
  };
}

export function createMatch(setup: MatchSetup): MatchState {
  const home = sheet("home", setup.home);
  const away = sheet("away", setup.away);
  const players: Record<string, PlayerMatchLine> = {};
  for (const team of [home, away]) for (const id of [team.keeperId, ...team.outfield]) players[`${team.side}:${id}`] = emptyLine();
  const firstKickoff = setup.firstKickoff ?? "home";
  return {
    id: setup.id ?? `pd3-${setup.seed.toString(36)}`,
    seed: setup.seed,
    rng: { play: setup.seed >>> 0, decide: (setup.seed ^ 0x9e3779b9) >>> 0 },
    division: setup.division,
    opponentName: setup.opponentName,
    teams: { home, away },
    phase: "kickoff",
    pending: { kind: "open" },
    half: 1,
    minute: 0,
    halfIncidents: 0,
    decisions: 0,
    halfDecisions: 0,
    score: { home: 0, away: 0 },
    firstKickoff,
    possession: { side: firstKickoff, progress: 4, lane: "center", bonus: 0 },
    cpuIntent: null,
    intentRevealed: false,
    cpuBoosts: difficulty.boosts[Math.min(4, Math.max(0, setup.division - 1))],
    lastResolution: null,
    log: [],
    nextEventId: 1,
    tendencies: { attack: [], defend: [], setPiece: [] },
    cpuRecent: [],
    stats: { home: emptyStats(), away: emptyStats() },
    players,
    momentum: { home: 0, away: 0 },
  };
}

/* ---- Selectors ------------------------------------------------------------ */

/** Player lines are keyed `side:cardId`, since both teams may field the same card. */
export function lineKey(side: Side, id: string): string {
  return `${side}:${id}`;
}

export function minuteLabel(state: Pick<MatchState, "half" | "minute">): string {
  const end = state.half === 1 ? halfLength : halfLength * 2;
  return state.minute <= end ? `${state.minute}'` : `${end}+${state.minute - end}'`;
}

export function stoppageFor(state: Pick<MatchState, "halfIncidents">): number {
  return Math.min(4, Math.max(1, 1 + Math.floor(state.halfIncidents / 2)));
}

export function isFinished(state: MatchState): boolean {
  return state.phase === "fulltime";
}

export type Turn =
  | { kind: "attack"; options: AttackId[] }
  | { kind: "defend"; options: DefenseId[] }
  | { kind: "setPiece"; setPiece: SetPiece; role: "taker" | "defender"; options: SetPieceOption[] }
  | { kind: "continue" }
  | { kind: "over" };

/** What the human must decide right now. */
export function currentTurn(state: MatchState): Turn {
  if (state.phase === "fulltime") return { kind: "over" };
  if (state.phase !== "choose") return { kind: "continue" };
  if (state.pending.kind === "setPiece") {
    const sp = state.pending.setPiece;
    const role = sp.side === "home" ? "taker" : "defender";
    const options = (role === "taker" ? takerOptions : defenderOptions)[sp.kind].map((o) => o.id);
    return { kind: "setPiece", setPiece: sp, role, options };
  }
  const { side, progress, lane } = state.possession;
  return side === "home" ? { kind: "attack", options: attackMenu(progress, lane) } : { kind: "defend", options: defenseMenu(progress) };
}

/** The two cards facing off right now. */
export function currentDuel(state: MatchState): { attacker: { side: Side; id: string }; defender: { side: Side; id: string } } {
  if (state.pending.kind === "setPiece") {
    const sp = state.pending.setPiece;
    return { attacker: { side: sp.side, id: sp.takerId }, defender: { side: opposite(sp.side), id: sp.keeperId } };
  }
  const { attackerId, defenderId } = duelists(state);
  return { attacker: { side: state.possession.side, id: attackerId }, defender: { side: opposite(state.possession.side), id: defenderId } };
}

export function playerRating(line: PlayerMatchLine, keeper: boolean): number {
  const raw =
    6.4 + line.duelsWon * 0.3 - line.duelsLost * 0.15 + line.goals * 1.1 + line.shots * 0.12 + line.saves * 0.45 -
    (keeper ? line.conceded * 0.35 : 0) - line.fouls * 0.15 - line.yellow * 0.4 - (line.red ? 2 : 0);
  return Math.round(Math.min(10, Math.max(3, raw)) * 10) / 10;
}

export function ratings(state: MatchState): { side: Side; id: string; rating: number }[] {
  const out: { side: Side; id: string; rating: number }[] = [];
  for (const side of ["home", "away"] as Side[]) {
    const team = state.teams[side];
    for (const id of [team.keeperId, ...team.outfield]) out.push({ side, id, rating: playerRating(state.players[lineKey(side, id)], id === team.keeperId) });
  }
  return out;
}

export function mvp(state: MatchState): { side: Side; id: string; rating: number } {
  const winner: Side | null = state.score.home === state.score.away ? null : state.score.home > state.score.away ? "home" : "away";
  return ratings(state).reduce((best, r) =>
    r.rating > best.rating || (r.rating === best.rating && r.side === winner && best.side !== winner) ? r : best,
  );
}

/* ---- Step ----------------------------------------------------------------- */

export type MatchRandom = { play: RandomSource; decide: RandomSource };

type Ctx = {
  s: MatchState;
  play: RandomSource;
  decide: RandomSource;
  events: MatchEvent[];
};

/**
 * Pure: the same state and input always give the same result. With no `random`
 * passed, rolls come from the seeded streams stored on the state and the new
 * stream positions are written back.
 */
export function step(state: MatchState, input: MatchInput, random?: MatchRandom): MatchState {
  const s = structuredClone(state);
  const playStream = new Stream(s.rng.play);
  const decideStream = new Stream(s.rng.decide);
  const ctx: Ctx = { s, play: random?.play ?? playStream.next, decide: random?.decide ?? decideStream.next, events: [] };

  if (s.phase === "fulltime") throw new PitchDuelInputError("The match is over");

  if (s.phase === "kickoff" || s.phase === "halftime") {
    if (input.type !== "continue") throw new PitchDuelInputError("Kick off first");
    if (s.phase === "halftime") {
      s.half = 2;
      s.minute = halfLength;
      s.halfIncidents = 0;
      s.halfDecisions = 0;
      s.possession = { side: opposite(s.firstKickoff), progress: 4, lane: "center", bonus: 0 };
      s.pending = { kind: "open" };
    }
    log(ctx, s.possession.side, "kickoff", s.half === 1 ? "Kick-off" : "Second half under way", []);
    s.phase = "choose";
    s.lastResolution = null;
    prepareTurn(ctx);
  } else if (input.type === "mindGame") {
    playMindGame(ctx, input.tacticId);
  } else if (input.type === "continue") {
    throw new PitchDuelInputError("A decision is needed");
  } else {
    decide(ctx, input);
  }

  if (!random) s.rng = { play: playStream.state, decide: decideStream.state };
  return s;
}

export function matchReducer(state: MatchState, input: MatchInput): MatchState {
  return step(state, input);
}

/* ---- Turn preparation ----------------------------------------------------- */

function prepareTurn(ctx: Ctx): void {
  const { s } = ctx;
  s.intentRevealed = false;
  let intent: CpuIntent;
  if (s.pending.kind === "setPiece") intent = { kind: "setPiece", option: chooseCpuSetPiece(s, s.pending.setPiece, ctx.decide) };
  else if (s.possession.side === "away") intent = { kind: "attack", action: chooseCpuAttack(s, ctx.decide) };
  else intent = { kind: "defend", action: chooseCpuDefense(s, ctx.decide) };
  s.cpuIntent = intent;
}

function playMindGame(ctx: Ctx, tacticId: string): void {
  const { s } = ctx;
  const slot = s.teams.home.tactics.find((t) => t.id === tacticId);
  if (!slot || slot.used || blueprintOf(slot.id) !== "act15") throw new PitchDuelInputError("Mind Game is not available");
  if (s.pending.kind === "setPiece") throw new PitchDuelInputError("Mind Game works in open play");
  slot.used = true;
  s.intentRevealed = true;
  log(ctx, "home", "tactic", "Mind Game: you read their plan", []);
}

/* ---- Decisions ------------------------------------------------------------ */

function takeTactic(ctx: Ctx, tacticId: string | undefined, role: "attack" | "defend" | "setPiece"): TacticSlot | null {
  if (!tacticId) return null;
  const slot = ctx.s.teams.home.tactics.find((t) => t.id === tacticId);
  if (!slot || slot.used) throw new PitchDuelInputError("That tactic is not available");
  if (blueprintOf(slot.id) === "act15") throw new PitchDuelInputError("Play Mind Game before you choose");
  if (!tacticPlayable(slot, role)) throw new PitchDuelInputError("That tactic does not fit this moment");
  slot.used = true;
  log(ctx, "home", "tactic", `Tactic played: ${tacticName(slot.id)}`, []);
  return slot;
}

function tacticName(id: string): string {
  const names: Record<string, string> = {
    act1: "Through Ball", act2: "Power Shot", act3: "Skill Move", act4: "Cut Inside", act5: "Long Shot", act6: "Quick Break",
    act7: "Slide Tackle", act8: "Press High", act9: "Block Lane", act10: "Tight Marking", act11: "Intercept", act12: "Last-Ditch Tackle",
    act13: "All In", act14: "Tactical Foul", act15: "Mind Game", act16: "Fast Recovery",
  };
  return names[blueprintOf(id)] ?? "Tactic";
}

function decide(ctx: Ctx, input: Exclude<MatchInput, { type: "continue" | "mindGame" }>): void {
  const { s } = ctx;
  const turn = currentTurn(s);
  const intent = s.cpuIntent;
  const before = { x: absoluteX(s.possession.side, s.possession.progress), lane: s.possession.lane };
  let minutes = 1;

  const surge = (input.type === "attack" || input.type === "defend") && input.surge === true;
  if (surge && (turn.kind === "setPiece" || !surgeReady(s, "home"))) throw new PitchDuelInputError("Your surge is not ready");

  if (turn.kind === "attack") {
    if (input.type !== "attack" || !turn.options.includes(input.action)) throw new PitchDuelInputError("That action is not on the menu");
    if (intent?.kind !== "defend") throw new PitchDuelInputError("Turn not prepared");
    const tactic = takeTactic(ctx, input.tacticId, "attack");
    remember(s.tendencies.attack, { band: band(s.possession.progress), key: attacks[input.action].family });
    minutes = attacks[input.action].minutes;
    resolveOpen(ctx, input.action, intent.action, tactic, null, before, surge);
  } else if (turn.kind === "defend") {
    if (input.type !== "defend" || !turn.options.includes(input.action)) throw new PitchDuelInputError("That defence is not on the menu");
    if (intent?.kind !== "attack") throw new PitchDuelInputError("Turn not prepared");
    const tactic = takeTactic(ctx, input.tacticId, "defend");
    remember(s.tendencies.defend, { band: band(mirror(s.possession.progress)), key: input.action });
    s.cpuRecent = [attacks[intent.action].family, ...s.cpuRecent].slice(0, 4);
    minutes = attacks[intent.action].minutes;
    resolveOpen(ctx, intent.action, input.action, null, tactic, before, surge);
  } else if (turn.kind === "setPiece") {
    if (input.type !== "setPiece" || !turn.options.includes(input.option)) throw new PitchDuelInputError("That option is not available");
    if (intent?.kind !== "setPiece") throw new PitchDuelInputError("Turn not prepared");
    const tactic = takeTactic(ctx, input.tacticId, "setPiece");
    const sp = turn.setPiece;
    s.tendencies.setPiece = [{ band: "attack" as const, key: `${sp.kind}:${input.option}` }, ...s.tendencies.setPiece].slice(0, 10);
    const taker = turn.role === "taker" ? input.option : intent.option;
    const defender = turn.role === "taker" ? intent.option : input.option;
    resolveSetPiece(ctx, sp, taker, defender, tactic, before);
  } else {
    throw new PitchDuelInputError("No decision is pending");
  }

  s.decisions += 1;
  s.halfDecisions += 1;
  advanceClock(ctx, minutes, turn.kind === "setPiece");
  checkPeriod(ctx);
  if (s.phase === "choose") prepareTurn(ctx);
}

function remember(list: MatchState["tendencies"]["attack"], pick: MatchState["tendencies"]["attack"][number]): void {
  list.unshift(pick);
  if (list.length > 10) list.length = 10;
}

/* ---- Open play ------------------------------------------------------------ */

type OpenResult = { headline: string; detail: string; goal: Side | null };

function resolveOpen(
  ctx: Ctx,
  attack: AttackId,
  defense: DefenseId,
  attackTactic: TacticSlot | null,
  defenseTactic: TacticSlot | null,
  before: { x: number; lane: Lane },
  userSurge = false,
): void {
  const { s, play } = ctx;
  const { side, progress, lane, bonus } = s.possession;
  const defSide = opposite(side);
  const act = attacks[attack];
  const dfn = defenses[defense];
  const odds = duelOdds(s, attack, defense);
  let relation = odds.relation;
  const userAttacking = side === "home";
  const userTactic = userAttacking ? attackTactic : defenseTactic;
  const userBlueprint = userTactic ? blueprintOf(userTactic.id) : null;

  // Skill Move softens a full counter.
  let k = odds.k + bonus;
  if (userBlueprint === "act3" && userAttacking && relation === "full") {
    relation = "partial";
    k += 6;
  }
  if (userTactic) {
    const boost = tacticBoost(userTactic, userAttacking
      ? { role: "attack", action: attack, family: act.family, progress }
      : { role: "defend", action: defense, family: act.family, progress });
    k += userAttacking ? boost : -boost;
  }
  // The CPU spends its few boosts on the moments that matter.
  if (s.cpuBoosts > 0 && progress >= 7 && ctx.decide() < 0.6) {
    s.cpuBoosts -= 1;
    k += userAttacking ? -6 : 6;
    log(ctx, "away", "tactic", `${s.opponentName} play a tactic card`, []);
  }

  let volatility = act.volatility * dfn.volatilityScale;
  if (userBlueprint === "act13") volatility *= 1.4;
  if (userBlueprint === "act5") volatility *= 1.25;

  const attTeam = s.teams[side];
  const defTeam = s.teams[defSide];
  const attacker = attTeam.cards[odds.attackerId];
  const defender = defTeam.cards[odds.defenderId];
  const attLine = s.players[lineKey(side, odds.attackerId)];
  const defLine = s.players[lineKey(defSide, odds.defenderId)];
  s.possession.bonus = 0;

  // Tactical Foul: no duel, just a foul at the spot.
  if (!userAttacking && userBlueprint === "act14") {
    const result = foul(ctx, side, odds.defenderId, 0.6, 0.02);
    finishResolution(ctx, "duel", {
      attackingSide: side, attackerId: odds.attackerId, defenderId: odds.defenderId, attackLabel: act.label, defenseLabel: "TACTICAL FOUL",
      relation: null, outcome: "fail", userWon: true, before, margin: null, surges: [], ...result,
    });
    return;
  }

  // Surges: the human spends one by choice, the CPU when the moment comes.
  const surges: Side[] = [];
  if (userSurge) {
    surges.push("home");
    s.momentum.home = 0;
    k += userAttacking ? surgeBoost : -surgeBoost;
    log(ctx, "home", "surge", "SURGE! Your side raise the tempo", []);
  }
  if (cpuSpendsSurge(s)) {
    surges.push("away");
    s.momentum.away = 0;
    k += userAttacking ? -surgeBoost : surgeBoost;
    log(ctx, "away", "surge", `${s.opponentName} surge forward`, []);
  }

  const { outcome, swing } = rollDuel(k, volatility, play);
  const margin = Math.round(k + swing);
  const won = isWin(outcome);
  attLine[won ? "duelsWon" : "duelsLost"] += 1;
  defLine[won ? "duelsLost" : "duelsWon"] += 1;
  s.stats[won ? side : defSide].duelsWon += 1;
  if (!won && relation !== "wrong") s.stats[defSide].readsWon += 1;

  // Momentum: the duel's winner gains, more for a big win or a read; the loser cools.
  const big = outcome === "success_high" || outcome === "fail_high";
  addMomentum(s, won ? side : defSide, momentumGain.duelWin + (big ? momentumGain.bigWin : 0) + (!won && relation === "full" ? momentumGain.read : 0));
  addMomentum(s, won ? defSide : side, momentumGain.duelLoss);
  log(ctx, side, "duel", `${attacker.shortName} ${act.label.toLowerCase()} vs ${defender.shortName}`, [odds.attackerId, odds.defenderId]);

  let result: OpenResult;
  const keepsOnLoss = userAttacking && userBlueprint === "act16";

  if (!won) {
    const foulChance = Math.min(0.6, (dfn.foul + (progress >= 7 ? 0.08 : 0)) * (defenseTactic && blueprintOf(defenseTactic.id) === "act7" ? 1.5 : 1) * (defenseTactic && blueprintOf(defenseTactic.id) === "act12" ? 2 : 1));
    if (play() < foulChance) {
      result = foul(ctx, side, odds.defenderId, defense === "slide" ? 0.45 : 0.25, defense === "slide" ? 0.08 : 0.02);
    } else if (act.shot) {
      result = shotBlocked(ctx, outcome, attack, odds.attackerId, odds.defenderId);
    } else if (attack === "cross") {
      if (outcome === "fail" && play() < 0.35) result = corner(ctx, side, lane, "Cross deflected behind");
      else result = turnover(ctx, side, progress, outcome === "fail_high", `${defender.shortName} heads it clear`, defense === "clearance");
    } else if (keepsOnLoss || (outcome === "fail" && play() < act.keepOnFail)) {
      result = { headline: "STILL YOURS", detail: keepsOnLoss ? "Fast Recovery wins it straight back" : `${attacker.shortName} recovers the loose ball`, goal: null };
      if (!userAttacking) result.headline = "THEY KEEP IT";
    } else {
      result = turnover(ctx, side, progress, outcome === "fail_high", `${defender.shortName} wins it`, defense === "clearance");
    }
  } else if (act.shot) {
    result = keeperStage(ctx, side, odds.attackerId, act.shot, outcome === "success_high" ? "high" : "normal", progress);
  } else if (attack === "cross") {
    log(ctx, side, "advance", `${attacker.shortName} whips in a cross`, [odds.attackerId]);
    const header = bestFor(s, side, { phy: 0.6, sho: 0.4 });
    result = keeperStage(ctx, side, header, "header", outcome === "success_high" ? "high" : "normal", 8);
  } else {
    result = advance(ctx, attack, outcome, attackTactic, odds.attackerId);
  }

  finishResolution(ctx, "duel", {
    attackingSide: side, attackerId: odds.attackerId, defenderId: odds.defenderId, attackLabel: act.label, defenseLabel: dfn.label,
    relation, outcome, userWon: userAttacking ? won : !won, before, margin, surges, ...result,
  });
}

function advance(ctx: Ctx, attack: AttackId, outcome: Outcome, tactic: TacticSlot | null, attackerId: string): OpenResult {
  const { s, play } = ctx;
  const act = attacks[attack];
  const { side, progress, lane } = s.possession;
  const high = outcome === "success_high";
  const extra = tactic && blueprintOf(tactic.id) === "act6" ? 1 : 0;
  const steps = (high ? act.advance[1] : act.advance[0]) + extra;
  const target = clampProgress(progress + steps);

  let nextLane: Lane = lane;
  if (act.lane === "center") nextLane = "center";
  if (act.lane === "switch") nextLane = isWing(lane) ? oppositeWing(lane) : play() < 0.5 ? "left" : "right";

  const name = s.teams[side].cards[attackerId].shortName;

  // Big chances: a clean break into the box becomes a one-on-one.
  const breaks =
    (high && (attack === "dribble" || attack === "cutInside") && progress >= 7) ||
    (high && attack === "throughBall" && progress >= 5) ||
    (!high && attack === "throughBall" && target === 8 && play() < 0.4) ||
    (high && attack === "dribble" && progress === 8 && play() < 0.45);
  if (breaks) {
    s.possession = { side, progress: 8, lane: "center", bonus: 0 };
    s.pending = { kind: "setPiece", setPiece: { kind: "oneOnOne", side, lane: "center", takerId: attackerId, keeperId: s.teams[opposite(side)].keeperId } };
    log(ctx, side, "bigChance", `BIG CHANCE! ${name} is through on goal`, [attackerId]);
    return { headline: side === "home" ? "BIG CHANCE" : "THEY'RE CLEAN THROUGH", detail: `${name} is clean through`, goal: null };
  }

  let bonus = 0;
  if (attack === "switchPlay") bonus = high ? 5 : 3;
  if (high && (attack === "dribble" || attack === "sprint")) bonus = 4;
  if (attack === "dribble" && progress === 8) bonus = Math.max(bonus, 4);

  s.possession = { side, progress: target, lane: normalizeLane(target, nextLane), bonus };
  const where = zoneNames[target].toLowerCase();
  log(ctx, side, "advance", target > progress ? `${name} drives into ${where}` : `${name} opens up the ${s.possession.lane} side`, [attackerId]);
  const cpu = side === "away";
  return {
    headline: cpu ? (high ? "THEY CUT THROUGH" : "THEY'RE THROUGH") : high ? "CLEAN!" : "THROUGH",
    detail: target > progress ? `Into ${where}${bonus ? ` · +${bonus} next duel` : ""}` : `Space on the ${s.possession.lane} · +${bonus} next duel`,
    goal: null,
  };
}

function turnover(ctx: Ctx, side: Side, progress: Progress, counter: boolean, text: string, cleared = false): OpenResult {
  const { s } = ctx;
  const defSide = opposite(side);
  const start = cleared ? 4 : mirror(progress) + (counter ? 1 : 0);
  const lane = s.possession.lane;
  const p = clampProgress(start);
  s.possession = { side: defSide, progress: p, lane: normalizeLane(p, lane), bonus: counter ? 4 : 0 };
  log(ctx, defSide, "turnover", counter ? `${text} — counter-attack!` : text, []);
  // Worded for the human: losing the ball reads differently from winning it.
  const userLost = side === "home";
  const headline = counter
    ? userLost ? "COUNTERED!" : "COUNTER!"
    : cleared ? "CLEARED" : userLost ? "TURNOVER" : "WON IT BACK";
  return { headline, detail: counter ? `${text} · +4 on the break` : text, goal: null };
}

function shotBlocked(ctx: Ctx, outcome: Outcome, attack: AttackId, shooterId: string, blockerId: string): OpenResult {
  const { s, play } = ctx;
  const { side, progress, lane } = s.possession;
  const blocker = s.teams[opposite(side)].cards[blockerId].shortName;
  s.stats[side].shots += 1;
  s.players[lineKey(side, shooterId)].shots += 1;
  if (outcome === "fail" && play() < 0.5) {
    return keeperStage(ctx, side, shooterId, "weak", "normal", progress, true);
  }
  log(ctx, side, "block", `${blocker} blocks the shot`, [blockerId]);
  if (outcome === "fail" && play() < 0.5) return corner(ctx, side, lane, `${blocker} blocks it behind`);
  return turnover(ctx, side, progress, outcome === "fail_high", `${blocker} blocks it`);
}

function corner(ctx: Ctx, side: Side, lane: Lane, text: string): OpenResult {
  const { s } = ctx;
  const cornerLane: Lane = isWing(lane) ? lane : "left";
  s.stats[side].corners += 1;
  s.halfIncidents += 1;
  s.possession = { side, progress: 7, lane: cornerLane, bonus: 0 };
  s.pending = { kind: "setPiece", setPiece: { kind: "corner", side, lane: cornerLane, takerId: bestFor(s, side, { pas: 0.8, dri: 0.2 }), keeperId: s.teams[opposite(side)].keeperId } };
  log(ctx, side, "corner", `${text} — corner`, []);
  return { headline: "CORNER", detail: text, goal: null };
}

function keeperStage(
  ctx: Ctx,
  side: Side,
  shooterId: string,
  kind: ShotKind,
  quality: "normal" | "high",
  progress: Progress,
  alreadyCounted = false,
  baseOverride?: number,
): OpenResult {
  const { s, play } = ctx;
  const defSide = opposite(side);
  const shooter = s.teams[side].stats[shooterId];
  const keeperId = s.teams[defSide].keeperId;
  const keeper = s.teams[defSide].stats[keeperId];
  const name = s.teams[side].cards[shooterId].shortName;
  const keeperName = s.teams[defSide].cards[keeperId].shortName;
  if (!alreadyCounted) {
    s.stats[side].shots += 1;
    s.players[lineKey(side, shooterId)].shots += 1;
  }

  const factor = Math.min(1.3, Math.max(0.7, 1 + (shooter.sho - keeper.keep) * 0.015));
  const nerve = s.half === 2 && s.minute >= 75 ? (shooter.composure - 75) * 0.002 : 0;
  const chance = Math.min(0.95, Math.max(0.02, (baseOverride ?? shotChance(kind, quality, progress)) * factor + nerve));
  const roll = play();

  if (roll < chance) return goal(ctx, side, shooterId, kind === "header" ? `${name} heads it in!` : `${name} scores!`);

  const onTarget = roll < chance + 0.55 * (1 - chance);
  if (onTarget) {
    s.stats[side].onTarget += 1;
    s.players[lineKey(defSide, keeperId)].saves += 1;
    addMomentum(s, defSide, momentumGain.save);
    if (play() < 0.3) {
      log(ctx, defSide, "save", `${keeperName} tips it over`, [keeperId]);
      return corner(ctx, side, s.possession.lane, `${keeperName} saves from ${name}`);
    }
    log(ctx, defSide, "save", `${keeperName} saves from ${name}`, [keeperId]);
    restart(ctx, defSide);
    return { headline: "SAVED", detail: `${keeperName} holds ${name}'s shot`, goal: null };
  }
  if (play() < 0.15) {
    log(ctx, side, "post", `${name} hits the post!`, [shooterId]);
    restart(ctx, defSide);
    return { headline: "OFF THE POST", detail: `${name} rattles the woodwork`, goal: null };
  }
  log(ctx, side, "miss", `${name} fires wide`, [shooterId]);
  restart(ctx, defSide);
  return { headline: "WIDE", detail: `${name} misses the target`, goal: null };
}

function goal(ctx: Ctx, side: Side, scorerId: string, text: string): OpenResult {
  const { s } = ctx;
  const defSide = opposite(side);
  s.score[side] += 1;
  s.stats[side].onTarget += 1;
  s.halfIncidents += 1;
  s.players[lineKey(side, scorerId)].goals += 1;
  s.players[lineKey(defSide, s.teams[defSide].keeperId)].conceded += 1;
  addMomentum(s, side, momentumGain.goalFor);
  addMomentum(s, defSide, momentumGain.goalAgainst);
  s.minute += 1;
  log(ctx, side, "goal", `GOAL! ${text}`, [scorerId]);
  s.possession = { side: defSide, progress: 4, lane: "center", bonus: 0 };
  s.pending = { kind: "open" };
  return { headline: "GOAL!", detail: text, goal: side };
}

/** Keeper's ball: a goal kick or a held shot restarts from the edge of the box. */
function restart(ctx: Ctx, side: Side): void {
  ctx.s.possession = { side, progress: 2, lane: "center", bonus: 0 };
  ctx.s.pending = { kind: "open" };
}

/* ---- Fouls ---------------------------------------------------------------- */

function foul(ctx: Ctx, attackingSide: Side, foulerId: string, yellowChance: number, redChance: number): OpenResult {
  const { s, play } = ctx;
  const defSide = opposite(attackingSide);
  const { progress, lane } = s.possession;
  const line = s.players[lineKey(defSide, foulerId)];
  const name = s.teams[defSide].cards[foulerId].shortName;
  line.fouls += 1;
  s.stats[defSide].fouls += 1;
  s.halfIncidents += 1;
  log(ctx, defSide, "foul", `Foul by ${name}`, [foulerId]);

  const isKeeper = foulerId === s.teams[defSide].keeperId;
  let card = "";
  if (!isKeeper) {
    const roll = play();
    if (roll < redChance) {
      line.red = true;
      card = " · RED CARD";
      log(ctx, defSide, "red", `RED CARD! ${name} is sent off`, [foulerId]);
    } else if (roll < redChance + yellowChance) {
      line.yellow += 1;
      if (line.yellow >= 2) {
        line.red = true;
        card = " · SECOND YELLOW";
        log(ctx, defSide, "red", `Second yellow — ${name} is off`, [foulerId]);
      } else {
        card = " · YELLOW";
        log(ctx, defSide, "yellow", `Yellow card for ${name}`, [foulerId]);
      }
    }
  }

  if (progress === 8) {
    setPiece(ctx, attackingSide, "penalty", "center", bestFor(s, attackingSide, { sho: 0.8, dri: 0.2 }));
    log(ctx, attackingSide, "penalty", "PENALTY!", []);
    return { headline: "PENALTY!", detail: `${name} brings him down${card}`, goal: null };
  }
  if (progress >= 6 && lane === "center") {
    setPiece(ctx, attackingSide, "freeKick", "center", bestFor(s, attackingSide, { sho: 0.6, pas: 0.4 }));
    log(ctx, attackingSide, "freeKick", "Free kick in a dangerous spot", []);
    return { headline: "FREE KICK", detail: `${name} fouls on the edge${card}`, goal: null };
  }
  if (progress === 7) {
    return { ...corner(ctx, attackingSide, lane, `Wide free kick after ${name}'s foul`), headline: "WIDE FREE KICK", detail: `${name} fouls out wide${card}` };
  }
  const p = clampProgress(progress + 1);
  s.possession = { side: attackingSide, progress: p, lane: normalizeLane(p, lane), bonus: 2 };
  return { headline: "FREE KICK", detail: `Quick free kick after ${name}'s foul${card}`, goal: null };
}

function setPiece(ctx: Ctx, side: Side, kind: SetPieceKind, lane: Lane, takerId: string): void {
  const { s } = ctx;
  s.pending = { kind: "setPiece", setPiece: { kind, side, lane, takerId, keeperId: s.teams[opposite(side)].keeperId } };
}

/* ---- Set pieces ----------------------------------------------------------- */

function resolveSetPiece(
  ctx: Ctx,
  sp: SetPiece,
  takerOption: SetPieceOption,
  defenderOption: SetPieceOption,
  tactic: TacticSlot | null,
  before: { x: number; lane: Lane },
): void {
  const { s, play } = ctx;
  if (!isTakerOption(sp.kind, takerOption) || !isDefenderOption(sp.kind, defenderOption)) throw new PitchDuelInputError("Bad set-piece pairing");
  const side = sp.side;
  const defSide = opposite(side);
  s.pending = { kind: "open" };
  const taker = s.teams[side].stats[sp.takerId];
  const keeper = s.teams[defSide].stats[sp.keeperId];
  const takerName = s.teams[side].cards[sp.takerId].shortName;
  const keeperName = s.teams[defSide].cards[sp.keeperId].shortName;
  const userTakes = side === "home";
  const boost = tactic ? tacticBoost(tactic, { role: "setPiece" }) * 0.01 : 0;
  const shift = userTakes ? boost : -boost;
  const takerLabel = takerOptions[sp.kind].find((o) => o.id === takerOption)?.label ?? "";
  const defenderLabel = defenderOptions[sp.kind].find((o) => o.id === defenderOption)?.label ?? "";

  let result: OpenResult;
  if (sp.kind === "penalty") {
    s.stats[side].shots += 1;
    s.players[lineKey(side, sp.takerId)].shots += 1;
    const adjust = Math.max(-0.1, Math.min(0.1, (taker.sho + taker.composure / 2 - keeper.keep * 1.5) * 0.004));
    const chance = penaltyGoalChance(takerOption as PenaltyTarget, defenderOption as KeeperDive) + adjust + shift;
    const guessed = (takerOption === "C" && defenderOption === "C") || ((takerOption === "TL" || takerOption === "BL") && defenderOption === "L") || ((takerOption === "TR" || takerOption === "BR") && defenderOption === "R");
    if (play() < chance) result = goal(ctx, side, sp.takerId, `${takerName} converts the penalty`);
    else if (guessed) {
      s.stats[side].onTarget += 1;
      s.players[lineKey(defSide, sp.keeperId)].saves += 1;
      addMomentum(s, defSide, momentumGain.save);
      log(ctx, defSide, "save", `${keeperName} saves the penalty!`, [sp.keeperId]);
      restart(ctx, defSide);
      result = { headline: "PENALTY SAVED", detail: `${keeperName} guessed right`, goal: null };
    } else {
      log(ctx, side, "miss", `${takerName} misses the penalty`, [sp.takerId]);
      restart(ctx, defSide);
      result = { headline: "MISSED", detail: `${takerName} puts it off target`, goal: null };
    }
  } else if (sp.kind === "freeKick") {
    if (takerOption === "layoff") {
      s.possession = { side, progress: 7, lane: "center", bonus: 4 };
      result = { headline: "LAID OFF", detail: `${takerName} rolls it short · +4 next duel`, goal: null };
    } else {
      s.stats[side].shots += 1;
      s.players[lineKey(side, sp.takerId)].shots += 1;
      const adjust = Math.max(-0.08, Math.min(0.08, (taker.sho - keeper.keep) * 0.004));
      const chance = freeKickGoalChance(takerOption as Exclude<FreeKickShot, "layoff">, defenderOption as FreeKickWall) + adjust + shift;
      if (play() < chance) result = goal(ctx, side, sp.takerId, `${takerName} curls in the free kick`);
      else if (play() < 0.3) {
        s.players[lineKey(defSide, sp.keeperId)].saves += 1;
        s.stats[side].onTarget += 1;
        addMomentum(s, defSide, momentumGain.save);
        result = corner(ctx, side, "left", `${keeperName} tips the free kick over`);
      } else {
        log(ctx, defSide, "block", `The wall holds firm`, []);
        restart(ctx, defSide);
        result = { headline: "WALL HOLDS", detail: `${takerName}'s free kick is dealt with`, goal: null };
      }
    }
  } else if (sp.kind === "corner") {
    const delivery = takerOption as CornerDelivery;
    if (cornerCountered(delivery, defenderOption as CornerDefence) && play() >= 0.3 - shift) {
      const p = clampProgress(3);
      s.possession = { side: defSide, progress: p, lane: sp.lane, bonus: 0 };
      log(ctx, defSide, "turnover", `${keeperName}'s defence clears the corner`, []);
      result = { headline: "CLEARED", detail: "They read the corner", goal: null };
    } else if (delivery === "short") {
      s.possession = { side, progress: 7, lane: sp.lane, bonus: 5 };
      result = { headline: "SHORT CORNER", detail: "Worked short · +5 next duel", goal: null };
    } else {
      const header = bestFor(s, side, { phy: 0.6, sho: 0.4 });
      const countered = cornerCountered(delivery, defenderOption as CornerDefence);
      result = keeperStage(ctx, side, header, "header", delivery === "far" && !countered ? "high" : "normal", 8);
      if (countered) result.detail = `Second ball · ${result.detail}`;
    }
  } else {
    s.stats[side].shots += 1;
    s.players[lineKey(side, sp.takerId)].shots += 1;
    const factor = Math.min(1.2, Math.max(0.8, 1 + (taker.sho - keeper.keep) * 0.01));
    const chance = oneOnOneGoalChance(takerOption as OneOnOneFinish, defenderOption as OneOnOneKeeper) * factor + shift;
    if (takerOption === "round" && defenderOption === "rush" && play() < 0.15) {
      result = { headline: "PENALTY!", detail: `${keeperName} takes him down`, goal: null };
      s.players[lineKey(defSide, sp.keeperId)].fouls += 1;
      s.stats[defSide].fouls += 1;
      s.halfIncidents += 1;
      log(ctx, side, "penalty", `${keeperName} brings down ${takerName} — PENALTY!`, [sp.keeperId]);
      setPiece(ctx, side, "penalty", "center", bestFor(s, side, { sho: 0.8, dri: 0.2 }));
    } else if (play() < chance) {
      result = goal(ctx, side, sp.takerId, `${takerName} finishes the one-on-one`);
    } else {
      s.stats[side].onTarget += 1;
      s.players[lineKey(defSide, sp.keeperId)].saves += 1;
      addMomentum(s, defSide, momentumGain.save);
      if (play() < 0.25) result = corner(ctx, side, "right", `${keeperName} denies ${takerName}`);
      else {
        log(ctx, defSide, "save", `${keeperName} denies ${takerName}!`, [sp.keeperId]);
        restart(ctx, defSide);
        result = { headline: "DENIED", detail: `${keeperName} stands tall`, goal: null };
      }
    }
  }

  finishResolution(ctx, "setPiece", {
    attackingSide: side, attackerId: sp.takerId, defenderId: sp.keeperId,
    attackLabel: `${setPieceTitles[sp.kind]} · ${takerLabel}`, defenseLabel: defenderLabel,
    relation: null, outcome: null, margin: null, surges: [],
    userWon: userTakes ? result.goal === side || result.headline === "LAID OFF" || result.headline === "SHORT CORNER" || result.headline === "PENALTY!" : result.goal !== side,
    before, ...result,
  });
}

/* ---- Resolution, clock and periods --------------------------------------- */

function finishResolution(
  ctx: Ctx,
  kind: Resolution["kind"],
  r: OpenResult & {
    attackingSide: Side; attackerId: string; defenderId: string; attackLabel: string; defenseLabel: string;
    relation: Resolution["relation"]; outcome: Resolution["outcome"]; userWon: boolean; before: { x: number; lane: Lane };
    margin: number | null; surges: Side[];
  },
): void {
  const { s } = ctx;
  s.lastResolution = {
    kind,
    attackingSide: r.attackingSide,
    attackerId: r.attackerId,
    defenderId: r.defenderId,
    attackLabel: r.attackLabel,
    defenseLabel: r.defenseLabel,
    relation: r.relation,
    outcome: r.outcome,
    userWon: r.userWon,
    headline: r.headline,
    detail: r.detail,
    goal: r.goal,
    from: r.before,
    to: { x: absoluteX(s.possession.side, s.possession.progress), lane: s.possession.lane },
    events: ctx.events.slice(),
    margin: r.margin,
    surges: r.surges,
  };
}

function advanceClock(ctx: Ctx, minutes: number, setPieceDecision: boolean): void {
  const { s, play } = ctx;
  let step = setPieceDecision ? 1 : minutes + (play() < extraMinuteChance ? 1 : 0);
  const start = s.half === 1 ? 0 : halfLength;
  const target = start + s.halfDecisions * minutesPerDecision;
  const projected = s.minute + step;
  if (projected - target > 2) step = Math.max(1, step - 1);
  else if (projected - target < -2) step += 1;
  s.minute += step;
}

function checkPeriod(ctx: Ctx): void {
  const { s } = ctx;
  if (s.pending.kind !== "open") return;
  const end = (s.half === 1 ? halfLength : halfLength * 2) + stoppageFor(s);
  if (s.minute < end) return;
  if (s.half === 1) {
    s.phase = "halftime";
    log(ctx, s.possession.side, "halftime", `Half-time: ${s.score.home}–${s.score.away}`, []);
  } else {
    s.phase = "fulltime";
    log(ctx, s.possession.side, "fulltime", `Full-time: ${s.score.home}–${s.score.away}`, []);
  }
  s.cpuIntent = null;
  if (s.lastResolution) s.lastResolution.events = ctx.events.slice();
}

function log(ctx: Ctx, side: Side, kind: EventKind, text: string, playerIds: string[]): void {
  const { s } = ctx;
  const event: MatchEvent = { id: s.nextEventId, minute: minuteLabel(s), side, kind, text, playerIds };
  s.nextEventId += 1;
  s.log.push(event);
  ctx.events.push(event);
}

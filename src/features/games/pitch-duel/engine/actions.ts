import { isWing } from "./zones";
import type { AttackId, DefenseId, Family, Lane, Progress, Relation, StatKey } from "./types";

/**
 * One table for every on-ball action, the way Ballers' `events.ts` works:
 * family (for the counter matrix), stat weights for both sides, volatility,
 * minute cost and how far it moves the ball.
 */
export type AttackDef = {
  id: AttackId;
  family: Family;
  label: string;
  hint: string;
  base: number;
  volatility: number;
  minutes: number;
  off: Partial<Record<StatKey, number>>;
  def: Partial<Record<StatKey, number>>;
  /** Zones gained on success / big success. */
  advance: [number, number];
  /** Chance the attacker keeps the ball on a plain fail. */
  keepOnFail: number;
  /** Where the ball goes laterally. "switch" crosses the pitch. */
  lane: "same" | "center" | "switch";
  /** Shot actions resolve through the keeper stage instead of advancing. */
  shot?: "finish" | "long";
};

export const attacks: Record<AttackId, AttackDef> = {
  shortPass: {
    id: "shortPass", family: "PASS", label: "SHORT PASS", hint: "Safe, keeps it moving",
    base: 7, volatility: 0.55, minutes: 2, off: { pas: 0.6, dri: 0.4 }, def: { def: 0.6, pac: 0.2, phy: 0.2 },
    advance: [1, 2], keepOnFail: 0.5, lane: "same",
  },
  forwardPass: {
    id: "forwardPass", family: "PASS", label: "FORWARD PASS", hint: "Break a line",
    base: 4, volatility: 0.7, minutes: 3, off: { pas: 0.8, dri: 0.2 }, def: { def: 0.6, pac: 0.4 },
    advance: [1, 3], keepOnFail: 0.3, lane: "same",
  },
  dribble: {
    id: "dribble", family: "CARRY", label: "DRIBBLE", hint: "Beat your man",
    base: 3, volatility: 0.9, minutes: 2, off: { dri: 0.6, pac: 0.3, phy: 0.1 }, def: { def: 0.6, pac: 0.2, phy: 0.2 },
    advance: [1, 2], keepOnFail: 0.35, lane: "same",
  },
  sprint: {
    id: "sprint", family: "CARRY", label: "SPRINT", hint: "Burn down the wing",
    base: 2, volatility: 0.9, minutes: 2, off: { pac: 0.7, dri: 0.3 }, def: { pac: 0.5, def: 0.5 },
    advance: [1, 2], keepOnFail: 0.3, lane: "same",
  },
  cutInside: {
    id: "cutInside", family: "CARRY", label: "CUT INSIDE", hint: "Drift into the middle",
    base: 1, volatility: 0.9, minutes: 2, off: { dri: 0.5, pac: 0.3, sho: 0.2 }, def: { def: 0.6, pac: 0.4 },
    advance: [1, 1], keepOnFail: 0.3, lane: "center",
  },
  throughBall: {
    id: "throughBall", family: "THROUGH", label: "THROUGH BALL", hint: "Split the defence",
    base: -1, volatility: 1.1, minutes: 3, off: { pas: 0.7, dri: 0.3 }, def: { def: 0.5, pac: 0.5 },
    advance: [2, 3], keepOnFail: 0.2, lane: "center",
  },
  longPass: {
    id: "longPass", family: "THROUGH", label: "LONG BALL", hint: "Skip the midfield",
    base: 1, volatility: 1.0, minutes: 3, off: { pas: 0.6, phy: 0.4 }, def: { phy: 0.5, def: 0.5 },
    advance: [2, 3], keepOnFail: 0.25, lane: "same",
  },
  switchPlay: {
    id: "switchPlay", family: "WIDE", label: "SWITCH PLAY", hint: "Find the free wing",
    base: 5, volatility: 0.6, minutes: 3, off: { pas: 0.8, dri: 0.2 }, def: { pac: 0.5, def: 0.5 },
    advance: [0, 1], keepOnFail: 0.5, lane: "switch",
  },
  cross: {
    id: "cross", family: "WIDE", label: "CROSS", hint: "Header chance in the box",
    base: 1, volatility: 1.1, minutes: 3, off: { pas: 0.6, dri: 0.2, phy: 0.2 }, def: { phy: 0.5, def: 0.5 },
    advance: [0, 0], keepOnFail: 0, lane: "center",
  },
  finish: {
    id: "finish", family: "SHOT", label: "SHOOT", hint: "Go for goal",
    base: 4, volatility: 1.0, minutes: 2, off: { sho: 0.75, dri: 0.25 }, def: { def: 0.6, phy: 0.4 },
    advance: [0, 0], keepOnFail: 0, lane: "same", shot: "finish",
  },
  longShot: {
    id: "longShot", family: "SHOT", label: "LONG SHOT", hint: "Low odds, big reward",
    base: 0, volatility: 1.0, minutes: 2, off: { sho: 0.8, pas: 0.2 }, def: { def: 0.6, phy: 0.4 },
    advance: [0, 0], keepOnFail: 0, lane: "same", shot: "long",
  },
};

export type DefenseDef = {
  id: DefenseId;
  label: string;
  hint: string;
  full: Family[];
  partial: Family[];
  /** Base foul chance when this action stops the attacker. */
  foul: number;
  volatilityScale: number;
};

export const defenses: Record<DefenseId, DefenseDef> = {
  intercept: { id: "intercept", label: "INTERCEPT", hint: "Read the pass", full: ["PASS"], partial: ["THROUGH"], foul: 0.03, volatilityScale: 1 },
  tackle: { id: "tackle", label: "TACKLE", hint: "Stop the dribbler", full: ["CARRY"], partial: ["PASS"], foul: 0.1, volatilityScale: 1 },
  holdLine: { id: "holdLine", label: "HOLD LINE", hint: "Kill the ball in behind", full: ["THROUGH"], partial: ["SHOT"], foul: 0.02, volatilityScale: 1 },
  aerial: { id: "aerial", label: "AERIAL DUEL", hint: "Win crosses and switches", full: ["WIDE"], partial: ["CARRY"], foul: 0.06, volatilityScale: 1 },
  block: { id: "block", label: "BLOCK", hint: "Throw yourself at shots", full: ["SHOT"], partial: ["WIDE"], foul: 0.04, volatilityScale: 1 },
  slide: { id: "slide", label: "SLIDE TACKLE", hint: "All or nothing, foul risk", full: [], partial: ["CARRY", "THROUGH"], foul: 0.28, volatilityScale: 1.3 },
  clearance: { id: "clearance", label: "CLEARANCE", hint: "Hoof it to safety", full: [], partial: ["PASS", "CARRY", "THROUGH", "WIDE", "SHOT"], foul: 0.02, volatilityScale: 1 },
};

export const relationModifier: Record<Relation, number> = { full: -13, partial: -4, wrong: 4 };

export function relationOf(attack: AttackId, defense: DefenseId): Relation {
  const family = attacks[attack].family;
  const d = defenses[defense];
  if (d.full.includes(family)) return "full";
  if (d.partial.includes(family)) return "partial";
  return "wrong";
}

/**
 * The fixed menu for a spot. Ballers draws a random menu each turn; here the
 * same spot always offers the same 3–4 buttons so the player can plan, with
 * Ballers' guarantees kept: always a carry, always a shot in the box, a long
 * shot from the final third.
 */
export function attackMenu(progress: Progress, lane: Lane): AttackId[] {
  const wing = isWing(lane);
  switch (progress) {
    case 1:
      return ["shortPass", "longPass", "dribble"];
    case 2:
      return ["shortPass", "forwardPass", "dribble", "longPass"];
    case 3:
      return wing ? ["shortPass", "forwardPass", "sprint", "switchPlay"] : ["shortPass", "forwardPass", "dribble", "longPass"];
    case 4:
    case 5:
      return wing ? ["shortPass", "forwardPass", "sprint", "switchPlay"] : ["shortPass", "forwardPass", "dribble", "throughBall"];
    case 6:
      return wing ? ["shortPass", "cutInside", "cross", "longShot"] : ["shortPass", "dribble", "throughBall", "longShot"];
    case 7:
      return wing ? ["cutInside", "sprint", "cross", "longShot"] : ["dribble", "throughBall", "longShot", "shortPass"];
    case 8:
      return ["finish", "dribble", "shortPass"];
  }
}

/** The defender's menu, keyed off how close the attacker is. */
export function defenseMenu(attackerProgress: Progress): DefenseId[] {
  if (attackerProgress === 8) return ["intercept", "tackle", "block", "clearance", "slide"];
  if (attackerProgress >= 6) return ["intercept", "tackle", "holdLine", "aerial", "block"];
  return ["intercept", "tackle", "holdLine", "aerial", "slide"];
}

export const families: Family[] = ["PASS", "CARRY", "THROUGH", "WIDE", "SHOT"];

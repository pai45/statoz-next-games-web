import type { ActionCard } from "@/domain/cards";

import type { AttackId, DefenseId, Family, Progress } from "./types";

/**
 * Owned action cards become once-per-match boosts. Each of the sixteen
 * blueprints (`act1`–`act16`) maps to one effect; the tier's power sets the size.
 */
export type TacticEffect = {
  key: string;
  /** When the card may be played. */
  use: "attack" | "defend" | "either" | "setPiece";
  /** What the boost applies to; empty means any. */
  families?: Family[];
  /** Short line for the UI chip. */
  summary: string;
};

export const tacticEffects: Record<string, TacticEffect> = {
  act1: { key: "act1", use: "attack", families: ["THROUGH"], summary: "Boost through balls" },
  act2: { key: "act2", use: "attack", families: ["SHOT"], summary: "Boost shots" },
  act3: { key: "act3", use: "attack", families: ["CARRY"], summary: "Boost carries, soften a counter" },
  act4: { key: "act4", use: "attack", families: ["CARRY", "WIDE"], summary: "Boost cut-ins and crosses" },
  act5: { key: "act5", use: "attack", families: ["SHOT"], summary: "Big shot boost, wilder" },
  act6: { key: "act6", use: "attack", summary: "Success gains an extra zone" },
  act7: { key: "act7", use: "defend", families: ["CARRY"], summary: "Boost vs dribbles, foul risk" },
  act8: { key: "act8", use: "defend", summary: "Boost in their half" },
  act9: { key: "act9", use: "defend", families: ["PASS", "WIDE"], summary: "Boost vs passes and crosses" },
  act10: { key: "act10", use: "defend", summary: "Flat defensive boost" },
  act11: { key: "act11", use: "defend", families: ["PASS", "THROUGH"], summary: "Boost vs passes, win it = counter" },
  act12: { key: "act12", use: "defend", summary: "Big boost near your goal, foul risk" },
  act13: { key: "act13", use: "either", summary: "Huge boost, much wilder" },
  act14: { key: "act14", use: "defend", summary: "Stop the attack with a foul" },
  act15: { key: "act15", use: "either", summary: "See the CPU's pick first" },
  act16: { key: "act16", use: "attack", summary: "A lost duel keeps the ball" },
};

export function blueprintOf(id: string): string {
  return id.match(/^act\d+/)?.[0] ?? "act10";
}

export function effectFor(card: Pick<ActionCard, "id">): TacticEffect {
  return tacticEffects[blueprintOf(card.id)] ?? tacticEffects.act10;
}

export function boostValue(card: Pick<ActionCard, "power">): number {
  return Math.min(15, Math.max(4, Math.round(card.power * 0.6)));
}

export type TacticContext =
  | { role: "attack"; action: AttackId; family: Family; progress: Progress }
  | { role: "defend"; action: DefenseId; family: Family | null; progress: Progress }
  | { role: "setPiece" };

/** Whether a card may be played into this decision at all. */
export function tacticPlayable(card: Pick<ActionCard, "id">, role: "attack" | "defend" | "setPiece"): boolean {
  const effect = effectFor(card);
  if (blueprintOf(card.id) === "act15") return role !== "setPiece";
  if (role === "setPiece") return effect.use === "either" || effect.key === "act2";
  return effect.use === "either" || effect.use === role;
}

/**
 * The k adjustment a played card makes to one duel, from the player's side
 * (positive helps the player who played it). Context decides whether the
 * family-limited cards connect.
 */
export function tacticBoost(card: Pick<ActionCard, "id" | "power">, context: TacticContext): number {
  const effect = effectFor(card);
  const value = boostValue(card);
  if (effect.key === "act15") return 3;
  if (effect.key === "act14" || effect.key === "act16" || effect.key === "act6") return Math.round(value / 3);
  if (context.role === "setPiece") return Math.round(value / 2);
  const family = context.role === "attack" ? context.family : context.family;
  if (effect.families && family && !effect.families.includes(family)) return Math.round(value / 3);
  if (effect.key === "act8" && context.progress >= 6) return Math.round(value / 3);
  if (effect.key === "act12") return context.progress >= 6 ? value + 3 : Math.round(value / 3);
  if (effect.key === "act13") return value + 2;
  return value;
}

import { attacks, relationModifier, relationOf } from "./actions";
import { formationModifier, participantFor } from "./lineup";
import { laneFit, weighted } from "./stats";
import { mirror, opposite } from "./zones";
import type { AttackId, DefenseId, MatchState, Relation, Side, StatKey } from "./types";

/** Division tables: index 0 is division 1. */
export const difficulty = {
  /** k edge the CPU gets in every duel. */
  edge: [-4, -2, -1, 0, 1],
  /** How much the CPU trusts what it has learned about you. */
  trust: [0.3, 0.5, 0.65, 0.8, 0.9],
  /** Chance it takes its best read instead of sampling. */
  greedy: [0.35, 0.5, 0.6, 0.7, 0.8],
  /** Softmax temperature for its attacking picks; lower is sharper. */
  temperature: [14, 10, 7, 5, 4],
  /** Once-per-match boosts the CPU may spend. */
  boosts: [0, 1, 1, 2, 3],
  /** Penalty per repeat of the same attacking family. */
  repeatPenalty: [0, 1, 2, 3, 4],
} as const;

export function tier(state: Pick<MatchState, "division">): number {
  return Math.min(4, Math.max(0, state.division - 1));
}

/** Who stands where is decided by the zone, not the button — so the cards shown before a pick are the ones that duel. */
const attackerWeights: Partial<Record<StatKey, number>> = { pas: 0.35, dri: 0.35, sho: 0.15, pac: 0.15 };
const defenderWeights: Partial<Record<StatKey, number>> = { def: 0.6, pac: 0.2, phy: 0.2 };

/** One team's sent-off outfield ids. Match lines are keyed `side:id`, since both squads can hold the same card. */
export function sentOffSet(state: MatchState, side: Side): Set<string> {
  return new Set(state.teams[side].outfield.filter((id) => state.players[`${side}:${id}`]?.red));
}

export function duelists(state: MatchState): { attackerId: string; defenderId: string } {
  const { side, progress, lane } = state.possession;
  const defSide = opposite(side);
  const attackerId = participantFor(state.teams[side], progress, lane, attackerWeights, sentOffSet(state, side));
  const defenderId = participantFor(state.teams[defSide], mirror(progress), lane, defenderWeights, sentOffSet(state, defSide));
  return { attackerId, defenderId };
}

function sentOffCount(state: MatchState, side: Side): number {
  return sentOffSet(state, side).size;
}

export type DuelOdds = { attackerId: string; defenderId: string; relation: Relation; k: number };

/**
 * The duel's edge before tactics, carry-over bonus and the swing: action base,
 * half the weighted stat gap, lane fit, the counter, formations, the division
 * edge and any man advantage.
 */
export function duelOdds(state: MatchState, attack: AttackId, defense: DefenseId): DuelOdds {
  const { side, progress, lane } = state.possession;
  const def = attacks[attack];
  const { attackerId, defenderId } = duelists(state);
  const attTeam = state.teams[side];
  const defTeam = state.teams[opposite(side)];
  const off = weighted(attTeam.stats[attackerId], def.off) + laneFit(attTeam.cards[attackerId], lane);
  const dfn = weighted(defTeam.stats[defenderId], def.def) + laneFit(defTeam.cards[defenderId], lane);
  const relation = relationOf(attack, defense);
  const edge = difficulty.edge[tier(state)] * (side === "away" ? 1 : -1);
  const manAdvantage = (sentOffCount(state, opposite(side)) - sentOffCount(state, side)) * 3;
  const k =
    def.base +
    0.5 * (off - dfn) +
    relationModifier[relation] +
    formationModifier(attTeam.formation, "attack", progress, lane) -
    formationModifier(defTeam.formation, "defend", progress, lane) +
    edge +
    manAdvantage;
  return { attackerId, defenderId, relation, k };
}

/** The best available player on a team for a stat mix (set-piece takers). */
export function bestFor(state: MatchState, side: Side, weights: Partial<Record<StatKey, number>>): string {
  const team = state.teams[side];
  const off = sentOffSet(state, side);
  const pool = team.outfield.filter((id) => !off.has(id));
  if (!pool.length) return team.keeperId;
  return pool.reduce((a, b) => (weighted(team.stats[b], weights) > weighted(team.stats[a], weights) ? b : a));
}

import type { RandomSource } from "../../shared/engine/random-source";

import { attackMenu, attacks, defenseMenu, defenses } from "./actions";
import { outcomeProbabilities } from "./duel";
import { pickWeighted } from "./rng";
import { defenderOptions, takerOptions } from "./set-pieces";
import { difficulty, duelOdds, tier } from "./situation";
import { band, mirror } from "./zones";
import type {
  AttackId,
  DefenseId,
  Family,
  MatchState,
  Outcome,
  Progress,
  SetPiece,
  SetPieceOption,
  TendencyPick,
} from "./types";

/**
 * The CPU commits its pick from the match state before the human chooses, so
 * it never reacts to the button you pressed. It learns from your recent picks:
 * the more predictable you are (and the higher the division), the more often
 * it reads you. Mix it up and it is guessing.
 */

const memory = 10;
const decay = 0.8;

/** Recency-weighted frequencies of a key among picks in the same zone band. */
function frequencies(picks: readonly TendencyPick[], zoneBand: TendencyPick["band"]) {
  const counts = new Map<string, number>();
  let samples = 0;
  picks.slice(0, memory).forEach((pick, age) => {
    const w = decay ** age * (pick.band === zoneBand ? 1 : 0.35);
    counts.set(pick.key, (counts.get(pick.key) ?? 0) + w);
    samples += w;
  });
  return { counts, samples };
}

/**
 * The CPU's belief about which keys you will pick, over the options it can see
 * on your menu: an even prior, blended toward your habits by trust × confidence.
 */
export function belief<K extends string>(
  options: readonly K[],
  keyOf: (option: K) => string,
  picks: readonly TendencyPick[],
  zoneBand: TendencyPick["band"],
  trust: number,
): Map<K, number> {
  const { counts, samples } = frequencies(picks, zoneBand);
  const confidence = Math.min(1, samples / 5);
  const mix = confidence * trust;
  const smoothed = options.map((o) => (counts.get(keyOf(o)) ?? 0) + 0.25);
  const total = smoothed.reduce((a, b) => a + b, 0);
  const out = new Map<K, number>();
  options.forEach((o, i) => out.set(o, (1 - mix) / options.length + (mix * smoothed[i]) / total));
  return out;
}

function softmaxPick<T>(items: readonly T[], scores: readonly number[], temperature: number, random: RandomSource): T {
  const max = Math.max(...scores);
  return pickWeighted(items, scores.map((s) => Math.exp((s - max) / temperature)), random);
}

const relationValue = { full: 13, partial: 4, wrong: -4 } as const;

/** The defensive read when the human has the ball. */
export function chooseCpuDefense(state: MatchState, random: RandomSource): DefenseId {
  const { progress, lane } = state.possession;
  const menu = defenseMenu(progress);
  // Belief is over families on your menu, so two pass buttons are not twice as likely as one dribble.
  const userFamilies = [...new Set(attackMenu(progress, lane).map((a) => attacks[a].family))];
  const p = belief(userFamilies, (f) => f, state.tendencies.attack, band(progress), difficulty.trust[tier(state)]);
  const scores = menu.map((d) =>
    userFamilies.reduce((sum, f) => sum + (p.get(f) ?? 0) * relationValue[familyRelation(f, d)], 0) - (d === "slide" ? 1.5 : 0),
  );
  if (random() < difficulty.greedy[tier(state)]) {
    const best = Math.max(...scores);
    const top = menu.filter((_, i) => scores[i] >= best - 0.5);
    return top[Math.floor(random() * top.length)];
  }
  return softmaxPick(menu, scores, 4, random);
}

/** Roughly what each outcome of an on-ball action is worth to the attacker. */
function outcomeValues(attack: AttackId, progress: Progress): Record<Outcome, number> {
  const def = attacks[attack];
  const turnover = 8 + 3 * (9 - progress);
  const keep = def.keepOnFail * -2 + (1 - def.keepOnFail) * -turnover;
  if (def.shot) {
    const goal = def.shot === "finish" ? [46, 64] : progress === 7 ? [24, 40] : [14, 28];
    return { success_high: goal[1], success: goal[0], fail: 4, fail_high: -turnover - 6 };
  }
  if (attack === "cross") return { success_high: 56, success: 38, fail: 0.35 * 10 - 0.65 * turnover, fail_high: -turnover - 6 };
  const reach = (steps: number) => Math.min(8, progress + steps);
  const zoneValue = (p: number) => (p - progress) * 12 + (p === 8 ? 15 : 0);
  const chanceBonus = ["dribble", "cutInside", "throughBall"].includes(attack) && reach(def.advance[1]) >= 7 ? 22 : 0;
  return {
    success_high: zoneValue(reach(def.advance[1])) + chanceBonus + (attack === "switchPlay" ? 8 : 0),
    success: zoneValue(reach(def.advance[0])) + (attack === "switchPlay" ? 5 : 0),
    fail: keep,
    fail_high: -turnover - 6,
  };
}

/** The CPU's attacking pick: expected value against what it believes you will read, sampled with some looseness. */
export function chooseCpuAttack(state: MatchState, random: RandomSource): AttackId {
  const { progress, lane } = state.possession;
  const menu = attackMenu(progress, lane);
  const userMenu = defenseMenu(progress);
  const t = tier(state);
  const p = belief(userMenu, (d) => d, state.tendencies.defend, band(mirror(progress)), difficulty.trust[t]);
  const lead = state.score.away - state.score.home;
  const late = state.half === 2 && state.minute >= 75;

  const scores = menu.map((attack) => {
    const def = attacks[attack];
    const values = outcomeValues(attack, progress);
    if (late && lead > 0) {
      values.fail *= values.fail < 0 ? 1.5 : 1;
      values.fail_high *= 1.5;
    }
    let ev = 0;
    for (const d of userMenu) {
      const odds = outcomeProbabilities(duelOdds(state, attack, d).k, def.volatility * defenses[d].volatilityScale);
      ev += (p.get(d) ?? 0) * (Object.keys(odds) as Outcome[]).reduce((sum, o) => sum + odds[o] * values[o], 0);
    }
    if (late && lead > 0 && (attack === "shortPass" || attack === "switchPlay")) ev += 6;
    if (state.half === 2 && state.minute >= 60 && lead < 0 && (def.shot || attack === "throughBall")) ev += 8;
    const repeats = state.cpuRecent.slice(0, 2).filter((f) => f === def.family).length;
    return ev - repeats * difficulty.repeatPenalty[t];
  });
  return softmaxPick(menu, scores, difficulty.temperature[t], random);
}

/**
 * Set pieces: the CPU defends against what you have liked lately and, as the
 * taker, leans away from what you have been stopping it with.
 */
export function chooseCpuSetPiece(state: MatchState, setPiece: SetPiece, random: RandomSource): SetPieceOption {
  const cpuTakes = setPiece.side === "away";
  const options = (cpuTakes ? takerOptions : defenderOptions)[setPiece.kind].map((o) => o.id);
  const t = tier(state);
  const learned = t >= 2;
  const recent = state.tendencies.setPiece.filter((pick) => pick.key.startsWith(`${setPiece.kind}:`)).slice(0, 3);
  const userLikes = (id: string) => recent.filter((pick) => pick.key === `${setPiece.kind}:${id}`).length;

  const weights = options.map((id) => {
    if (cpuTakes) {
      const base = setPiece.kind === "penalty" ? (id === "C" ? 0.5 : id === "BL" || id === "BR" ? 1.3 : 1) : setPiece.kind === "freeKick" && id === "layoff" ? 0.6 : 1;
      return base;
    }
    if (!learned) return 1;
    const counters: Record<string, string[]> = {
      L: ["TL", "BL"], C: ["C"], R: ["TR", "BR"],
      jump: ["over"], cheat: ["around"], stay: ["low"],
      man: ["near"], zonal: ["far"], press: ["short"],
      rush: ["round"], wait: ["chip"],
    };
    return 1 + (counters[id] ?? []).reduce((sum, taker) => sum + userLikes(taker), 0) * difficulty.trust[t] * 1.5;
  });
  return pickWeighted(options, weights, random) as SetPieceOption;
}

function familyRelation(family: Family, defense: DefenseId): "full" | "partial" | "wrong" {
  const d = defenses[defense];
  return d.full.includes(family) ? "full" : d.partial.includes(family) ? "partial" : "wrong";
}

export function familyOf(attack: AttackId): Family {
  return attacks[attack].family;
}

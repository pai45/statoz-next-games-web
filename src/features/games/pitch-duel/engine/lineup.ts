import type { PlayerCard } from "@/domain/cards";

import { laneFit, positionsOf, weighted } from "./stats";
import type { FormationId, FormationSlot, Lane, Line, Progress, SlotPosition, StatKey, TeamSheet } from "./types";

/** Eleven a side: a keeper plus ten outfield places. */
export const outfieldSize = 10;

const slot = (line: Line, lanes: Lane[], pos: SlotPosition, across: number, depth: number): FormationSlot => ({
  line,
  lanes,
  pos,
  at: { across, depth },
});

// Depth runs from the own goal line (0) towards the halfway line (0.5) and on.
const back = 0.2;
const mid = 0.36;
const front = 0.5;

const fourBack = [
  slot("back", ["left"], "LB", 0.12, back + 0.02),
  slot("back", ["left", "center"], "CB", 0.37, back - 0.02),
  slot("back", ["center", "right"], "CB", 0.63, back - 0.02),
  slot("back", ["right"], "RB", 0.88, back + 0.02),
];

export const formations: Record<FormationId, { label: string; blurb: string; slots: FormationSlot[] }> = {
  "4-4-2": {
    label: "CLASSIC",
    blurb: "Two banks of four and a strike pair. No weak spot.",
    slots: [
      ...fourBack,
      slot("mid", ["left"], "LM", 0.12, mid + 0.02),
      slot("mid", ["left", "center"], "CM", 0.38, mid),
      slot("mid", ["center", "right"], "CM", 0.62, mid),
      slot("mid", ["right"], "RM", 0.88, mid + 0.02),
      slot("front", ["left", "center"], "ST", 0.38, front),
      slot("front", ["center", "right"], "ST", 0.62, front),
    ],
  },
  "4-3-3": {
    label: "WING PLAY",
    blurb: "Three forwards stretch the pitch. Lethal down the flanks.",
    slots: [
      ...fourBack,
      slot("mid", ["left", "center"], "CM", 0.3, mid + 0.02),
      slot("mid", ["center"], "CDM", 0.5, mid - 0.04),
      slot("mid", ["center", "right"], "CM", 0.7, mid + 0.02),
      slot("front", ["left"], "LW", 0.13, front - 0.02),
      slot("front", ["center"], "ST", 0.5, front + 0.02),
      slot("front", ["right"], "RW", 0.87, front - 0.02),
    ],
  },
  "3-5-2": {
    label: "MIDFIELD LOCK",
    blurb: "Five in midfield own the centre; the wings are thinner.",
    slots: [
      slot("back", ["left", "center"], "CB", 0.25, back),
      slot("back", ["center"], "CB", 0.5, back - 0.03),
      slot("back", ["center", "right"], "CB", 0.75, back),
      slot("mid", ["left"], "LWB", 0.08, mid - 0.02),
      slot("mid", ["left", "center"], "CM", 0.32, mid),
      slot("mid", ["center"], "CDM", 0.5, mid - 0.03),
      slot("mid", ["center", "right"], "CM", 0.68, mid),
      slot("mid", ["right"], "RWB", 0.92, mid - 0.02),
      slot("front", ["left", "center"], "ST", 0.38, front),
      slot("front", ["center", "right"], "ST", 0.62, front),
    ],
  },
  "4-2-3-1": {
    label: "CONTROL",
    blurb: "A double pivot shields the back four. Hard to play through.",
    slots: [
      ...fourBack,
      // The centre column holds five rows (GK, CB, CDM, CAM, ST), so they are spaced wider.
      slot("mid", ["left", "center"], "CDM", 0.38, mid - 0.06),
      slot("mid", ["center", "right"], "CDM", 0.62, mid - 0.06),
      slot("front", ["left"], "LW", 0.15, front - 0.06),
      slot("front", ["center"], "CAM", 0.5, front - 0.07),
      slot("front", ["right"], "RW", 0.85, front - 0.06),
      slot("front", ["center"], "ST", 0.5, front + 0.06),
    ],
  },
  "5-3-2": {
    label: "PARK THE BUS",
    blurb: "Five at the back. Hard to break, slow to score.",
    slots: [
      slot("back", ["left"], "LWB", 0.08, back + 0.04),
      slot("back", ["left", "center"], "CB", 0.3, back - 0.02),
      slot("back", ["center"], "CB", 0.5, back - 0.04),
      slot("back", ["center", "right"], "CB", 0.7, back - 0.02),
      slot("back", ["right"], "RWB", 0.92, back + 0.04),
      slot("mid", ["left", "center"], "CM", 0.3, mid),
      slot("mid", ["center"], "CM", 0.5, mid - 0.02),
      slot("mid", ["center", "right"], "CM", 0.7, mid),
      slot("front", ["left", "center"], "ST", 0.38, front),
      slot("front", ["center", "right"], "ST", 0.62, front),
    ],
  },
};

export const formationIds = Object.keys(formations) as FormationId[];
export const defaultFormation: FormationId = "4-4-2";

export function isFormationId(value: unknown): value is FormationId {
  return typeof value === "string" && value in formations;
}

/** The k modifier a formation adds to one duel, from that team's side. */
export function formationModifier(
  formation: FormationId,
  role: "attack" | "defend",
  attackerProgress: Progress,
  lane: Lane,
): number {
  const wide = lane !== "center";
  switch (formation) {
    case "4-3-3":
      return wide ? (role === "attack" ? 2 : -1) : 0;
    case "3-5-2":
      return wide ? -2 : 2;
    case "4-2-3-1":
      if (role === "defend" && (attackerProgress === 4 || attackerProgress === 5)) return 2;
      return role === "attack" && attackerProgress >= 6 && !wide ? 1 : 0;
    case "5-3-2":
      if (attackerProgress < 6) return 0;
      return role === "defend" ? 3 : -3;
    default:
      return 0;
  }
}

function lineFor(progress: Progress): Line[] {
  if (progress <= 3) return ["back", "mid", "front"];
  if (progress >= 6) return ["front", "mid", "back"];
  return progress === 4 ? ["mid", "back", "front"] : ["mid", "front", "back"];
}

/**
 * Who contests this duel for a team: the best-suited available player in the
 * line the zone calls for, preferring the places that cover the lane.
 * `progress` is from this team's own point of view.
 */
export function participantFor(
  team: TeamSheet,
  progress: Progress,
  lane: Lane,
  weights: Partial<Record<StatKey, number>>,
  sentOff: ReadonlySet<string>,
): string {
  const slots = formations[team.formation].slots;
  const available = team.outfield
    .map((id, index) => ({ id, slot: slots[index] }))
    .filter((entry) => entry.slot && !sentOff.has(entry.id));
  if (!available.length) return team.keeperId;

  const score = (id: string) => weighted(team.stats[id], weights) + laneFit(team.cards[id], lane);
  const best = (pool: typeof available) => pool.reduce((a, b) => (score(b.id) > score(a.id) ? b : a)).id;

  for (const line of lineFor(progress)) {
    const inLine = available.filter((e) => e.slot.line === line);
    if (!inLine.length) continue;
    const covering = inLine.filter((e) => e.slot.lanes.includes(lane));
    return best(covering.length ? covering : inLine);
  }
  return best(available);
}

export type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

const groupOf: Record<string, PositionGroup> = {
  GK: "GK",
  CB: "DEF",
  LB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LM: "MID",
  RM: "MID",
  LW: "FWD",
  RW: "FWD",
  ST: "FWD",
  SS: "FWD",
};

export function positionGroup(position: string): PositionGroup {
  return groupOf[position] ?? "MID";
}

const sideOf = (position: string) => (/^L/.test(position) ? "L" : /^R/.test(position) ? "R" : "C");

/**
 * How well a card suits a place: 3 for its natural position, 2 for a wide
 * player on the same flank (a winger at wide midfield, a full back at wing
 * back), 1 for the same group, 0 otherwise.
 */
export function positionFit(card: PlayerCard, pos: SlotPosition): number {
  const own = positionsOf(card);
  if (own.includes(pos)) return 3;
  const group = positionGroup(pos);
  const flank = sideOf(pos);
  const attacking = (g: PositionGroup) => g === "MID" || g === "FWD";
  if (
    flank !== "C" &&
    own.some((p) => sideOf(p) === flank && (positionGroup(p) === group || (attacking(group) && attacking(positionGroup(p)))))
  )
    return 2;
  if (own.some((p) => positionGroup(p) === group)) return 1;
  return 0;
}

export type ClubSetup = {
  formation: FormationId;
  keeperId: string;
  /** Ten outfield ids, in the formation's slot order. */
  outfield: string[];
  tactics: string[];
};

export const maxTactics = 3;

export function lineupErrors(
  club: ClubSetup,
  ownedPlayers: readonly string[],
  ownedActions: readonly string[],
  cardFor: (id: string) => PlayerCard | undefined,
): string[] {
  const errors: string[] = [];
  if (!isFormationId(club.formation)) errors.push("Choose a formation");
  const keeper = cardFor(club.keeperId);
  if (!keeper || keeper.role !== "goalkeeper" || !ownedPlayers.includes(club.keeperId)) errors.push("Pick a keeper you own");
  const outfield = club.outfield.filter(Boolean);
  if (outfield.length !== outfieldSize) errors.push(`Fill all ${outfieldSize} outfield places`);
  if (new Set(outfield).size !== outfield.length || outfield.includes(club.keeperId)) errors.push("Each player can fill one place");
  if (outfield.some((id) => !ownedPlayers.includes(id) || !cardFor(id) || cardFor(id)?.role === "goalkeeper"))
    errors.push("Outfield places need outfield players you own");
  if (club.tactics.length > maxTactics || new Set(club.tactics).size !== club.tactics.length || club.tactics.some((id) => !ownedActions.includes(id)))
    errors.push(`Pick up to ${maxTactics} different owned tactics`);
  return errors;
}

/**
 * Fills a formation's empty places from a pool. Wide and specialist places
 * pick first, each taking the unused card with the best mix of position fit
 * and rating. A place nobody can fill stays null.
 */
export function fillFormation(
  formation: FormationId,
  pool: readonly string[],
  cardFor: (id: string) => PlayerCard | undefined,
  keep: readonly (string | null | undefined)[] = [],
): (string | null)[] {
  const slots = formations[formation].slots;
  const out: (string | null)[] = slots.map((_, i) => keep[i] || null);
  const used = new Set(out.filter((id): id is string => Boolean(id)));
  const candidates = pool.filter((id) => {
    const card = cardFor(id);
    return card && card.role !== "goalkeeper";
  });
  const generic = (pos: SlotPosition) => pos === "CB" || pos === "CM";
  const order = slots.map((s, i) => ({ s, i })).sort((a, b) => Number(generic(a.s.pos)) - Number(generic(b.s.pos)));
  for (const { s, i } of order) {
    if (out[i]) continue;
    let best: string | null = null;
    let bestScore = -1;
    for (const id of candidates) {
      if (used.has(id)) continue;
      const card = cardFor(id)!;
      const fit = positionFit(card, s.pos);
      // A strong player one step out of position beats a weak natural fit; a wrong position never does.
      const value = (fit === 0 ? -40 : fit * 10) + card.rating;
      if (value > bestScore) {
        best = id;
        bestScore = value;
      }
    }
    if (best) {
      out[i] = best;
      used.add(best);
    }
  }
  return out;
}

/**
 * A playable first club from whatever the player owns: the best keeper and a
 * 4-4-2 picked by position. `ownedPlayers` should include the always-available
 * academy cards, so a small collection can still field eleven.
 */
export function defaultClub(
  ownedPlayers: readonly string[],
  ownedActions: readonly string[],
  cardFor: (id: string) => PlayerCard | undefined,
  preferred?: { keeperId?: string | null; actionCardIds?: string[] },
  actionCategory?: (id: string) => string | undefined,
): ClubSetup | null {
  const rating = (id: string) => cardFor(id)?.rating ?? 0;
  const keepers = ownedPlayers.filter((id) => cardFor(id)?.role === "goalkeeper").sort((a, b) => rating(b) - rating(a));
  const preferredKeeper = preferred?.keeperId && keepers.includes(preferred.keeperId) ? [preferred.keeperId] : [];
  const keeperId = [...preferredKeeper, ...keepers][0];
  if (!keeperId) return null;

  const formation = defaultFormation;
  const outfield = fillFormation(formation, ownedPlayers, cardFor);
  if (outfield.some((id) => !id)) return null;

  const pool = [...new Set([...(preferred?.actionCardIds ?? []), ...ownedActions])].filter((id) => ownedActions.includes(id));
  const tactics: string[] = [];
  for (const category of ["attack", "defense", "special"]) {
    const hit = pool.find((id) => !tactics.includes(id) && actionCategory?.(id) === category);
    if (hit) tactics.push(hit);
  }
  for (const id of pool) if (tactics.length < maxTactics && !tactics.includes(id)) tactics.push(id);

  return { formation, keeperId, outfield: outfield as string[], tactics: tactics.slice(0, maxTactics) };
}

/**
 * Moves a club onto another formation: the current ten are re-seated where
 * they fit best, and any place left open is filled from the pool.
 */
export function reshapeClub(
  club: ClubSetup,
  formation: FormationId,
  pool: readonly string[],
  cardFor: (id: string) => PlayerCard | undefined,
): ClubSetup {
  const placed = fillFormation(formation, club.outfield.filter(Boolean), cardFor);
  const filled = fillFormation(formation, pool.filter((id) => id !== club.keeperId), cardFor, placed);
  return { ...club, formation, outfield: filled.map((id) => id ?? "") };
}

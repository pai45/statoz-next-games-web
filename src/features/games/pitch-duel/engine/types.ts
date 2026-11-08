/**
 * Pitch Duel's match vocabulary.
 *
 * The pitch is Ballers' one-dimensional ladder: the side on the ball sits at a
 * `progress` from 1 (its own box) to 8 (the opponent's box), in one of three
 * lanes. Progress is always measured from the attacking side's point of view,
 * so the same rules serve both teams; the UI converts it to an absolute pitch
 * position with `absoluteX`.
 */

import type { PlayerCard } from "@/domain/cards";

export type Side = "home" | "away";
export type Lane = "left" | "center" | "right";

/** 1 own box · 2 own near-box · 3 own third · 4 own half · 5 their half · 6 their third · 7 their near-box · 8 their box. */
export type Progress = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Family = "PASS" | "CARRY" | "THROUGH" | "WIDE" | "SHOT";

export type AttackId =
  | "shortPass"
  | "forwardPass"
  | "dribble"
  | "sprint"
  | "cutInside"
  | "throughBall"
  | "longPass"
  | "switchPlay"
  | "cross"
  | "finish"
  | "longShot";

export type DefenseId =
  | "intercept"
  | "tackle"
  | "holdLine"
  | "aerial"
  | "block"
  | "slide"
  | "clearance";

export type Relation = "full" | "partial" | "wrong";

export type Outcome = "fail_high" | "fail" | "success" | "success_high";

export type StatKey = "pac" | "sho" | "pas" | "dri" | "def" | "phy";
export type KeeperKey = "div" | "ref" | "han" | "pos";

export type DerivedStats = Record<StatKey, number> & {
  /** Single shot-stopping number, the mean of the four keeper stats. */
  keep: number;
  keeper: Record<KeeperKey, number>;
  /** Big-game nerve, used for late shots and penalties. */
  composure: number;
};

export type Line = "back" | "mid" | "front";

export type FormationId = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1" | "5-3-2";

/** A shirt position printed on the lineup editor and used to judge fit. */
export type SlotPosition = "LB" | "CB" | "RB" | "LWB" | "RWB" | "CDM" | "CM" | "CAM" | "LM" | "RM" | "LW" | "RW" | "ST";

/**
 * One outfield place in an eleven-a-side shape. `line` and `lanes` decide who
 * contests a duel; `pos` and `at` are where the place sits on the pitch:
 * `across` 0 (left touchline) to 1 (right), `depth` 0 (own goal line) to 1.
 */
export type FormationSlot = { line: Line; lanes: Lane[]; pos: SlotPosition; at: { across: number; depth: number } };

export type TacticSlot = { id: string; power: number; used: boolean };

export type TeamSheet = {
  side: Side;
  name: string;
  formation: FormationId;
  keeperId: string;
  /** The ten outfield card ids, in formation slot order. */
  outfield: string[];
  cards: Record<string, PlayerCard>;
  stats: Record<string, DerivedStats>;
  tactics: TacticSlot[];
};

export type Possession = {
  side: Side;
  progress: Progress;
  lane: Lane;
  /** Carry-over bonus for the attacker's next duel (counter, isolation, lay-off). */
  bonus: number;
};

export type SetPieceKind = "penalty" | "freeKick" | "corner" | "oneOnOne";

export type PenaltyTarget = "TL" | "BL" | "C" | "BR" | "TR";
export type KeeperDive = "L" | "C" | "R";
export type FreeKickShot = "over" | "around" | "low" | "layoff";
export type FreeKickWall = "jump" | "cheat" | "stay";
export type CornerDelivery = "near" | "far" | "short";
export type CornerDefence = "man" | "zonal" | "press";
export type OneOnOneFinish = "round" | "chip" | "low";
export type OneOnOneKeeper = "rush" | "wait";

export type TakerOption = PenaltyTarget | FreeKickShot | CornerDelivery | OneOnOneFinish;
export type DefenderOption = KeeperDive | FreeKickWall | CornerDefence | OneOnOneKeeper;
export type SetPieceOption = TakerOption | DefenderOption;

export type SetPiece = {
  kind: SetPieceKind;
  /** The side taking it. */
  side: Side;
  lane: Lane;
  takerId: string;
  keeperId: string;
};

export type Pending = { kind: "open" } | { kind: "setPiece"; setPiece: SetPiece };

export type Phase = "kickoff" | "choose" | "halftime" | "fulltime";

export type MatchInput =
  | { type: "attack"; action: AttackId; tacticId?: string; surge?: boolean }
  | { type: "defend"; action: DefenseId; tacticId?: string; surge?: boolean }
  | { type: "setPiece"; option: SetPieceOption; tacticId?: string }
  | { type: "mindGame"; tacticId: string }
  | { type: "continue" };

export type CpuIntent =
  | { kind: "attack"; action: AttackId }
  | { kind: "defend"; action: DefenseId }
  | { kind: "setPiece"; option: SetPieceOption };

export type EventKind =
  | "kickoff"
  | "duel"
  | "advance"
  | "turnover"
  | "foul"
  | "yellow"
  | "red"
  | "freeKick"
  | "corner"
  | "penalty"
  | "bigChance"
  | "shot"
  | "save"
  | "post"
  | "miss"
  | "block"
  | "goal"
  | "tactic"
  | "surge"
  | "halftime"
  | "fulltime";

export type MatchEvent = {
  id: number;
  minute: string;
  side: Side;
  kind: EventKind;
  text: string;
  playerIds: string[];
};

/** What the last decision did — the payload of the reveal. */
export type Resolution = {
  kind: "duel" | "setPiece";
  /** The side that had the ball (or took the set piece). */
  attackingSide: Side;
  attackerId: string;
  defenderId: string;
  attackLabel: string;
  defenseLabel: string;
  relation: Relation | null;
  outcome: Outcome | null;
  /** True when the human side won the moment. */
  userWon: boolean;
  headline: string;
  detail: string;
  goal: Side | null;
  from: { x: number; lane: Lane };
  to: { x: number; lane: Lane };
  events: MatchEvent[];
  /**
   * Where an open-play duel landed, from the attacker's side: the edge plus
   * the swing. The outcome bands start at -12, 0 and +12. Null for set pieces.
   */
  margin: number | null;
  /** The sides that spent a surge on this duel. */
  surges: Side[];
};

export type TendencyPick = { band: "build" | "attack"; key: string };

export type PlayerMatchLine = {
  duelsWon: number;
  duelsLost: number;
  goals: number;
  shots: number;
  saves: number;
  conceded: number;
  fouls: number;
  yellow: number;
  red: boolean;
};

export type SideStats = {
  shots: number;
  onTarget: number;
  fouls: number;
  corners: number;
  duelsWon: number;
  readsWon: number;
};

export type MatchState = {
  id: string;
  seed: number;
  rng: { play: number; decide: number };
  division: number;
  opponentName: string;
  teams: Record<Side, TeamSheet>;
  phase: Phase;
  pending: Pending;
  half: 1 | 2;
  minute: number;
  /** Goals, fouls and set pieces this half — they set the stoppage time. */
  halfIncidents: number;
  decisions: number;
  halfDecisions: number;
  score: Record<Side, number>;
  firstKickoff: Side;
  possession: Possession;
  cpuIntent: CpuIntent | null;
  /** Mind Game: the CPU's pick is visible before the human commits. */
  intentRevealed: boolean;
  cpuBoosts: number;
  lastResolution: Resolution | null;
  log: MatchEvent[];
  nextEventId: number;
  /** The human's recent picks, newest first — what the CPU learns from. */
  tendencies: { attack: TendencyPick[]; defend: TendencyPick[]; setPiece: TendencyPick[] };
  /** The CPU's own recent attacking families, so it avoids repeating itself. */
  cpuRecent: Family[];
  stats: Record<Side, SideStats>;
  players: Record<string, PlayerMatchLine>;
  /** Momentum per side, 0–100. A full bar is a surge: one boosted duel. */
  momentum: Record<Side, number>;
};

export type MatchSetup = {
  id?: string;
  seed: number;
  division: number;
  opponentName: string;
  home: Omit<TeamSheet, "stats" | "side" | "tactics"> & { tactics: { id: string; power: number }[] };
  away: Omit<TeamSheet, "stats" | "side" | "tactics"> & { tactics: { id: string; power: number }[] };
  /** Defaults to home. */
  firstKickoff?: Side;
};

export class PitchDuelInputError extends Error {}

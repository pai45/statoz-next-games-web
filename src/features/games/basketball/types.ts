/**
 * Hoop Duel's vocabulary — the web port of `models/basketball.dart` and the
 * simulation types declared at the top of `games/basketball/basketball_engine.dart`.
 *
 * Pure data: no React, no canvas, no storage. The engine, the AI, the renderer
 * and the HUD all speak these types, which is what keeps the rules in one place
 * and the drawing in another.
 */

/* ---- The athlete ---------------------------------------------------------- */

export type BasketballArchetype =
  | "balancedGuard"
  | "sharpshooter"
  | "slasher"
  | "interiorPower";

export type BasketballCardRole = "guard" | "wing" | "big";

/**
 * One signature trait per athlete — small, readable effects.
 *
 * - `quickRelease` faster gather + earlier release apex, slightly wider window
 * - `deepRange` no distance falloff beyond the three-point arc
 * - `rimPressure` wider dunk gate and halved layup contest
 * - `glassCleaner` rebound contest bonus and a stronger box-out
 */
export type BasketballTrait =
  | "quickRelease"
  | "deepRange"
  | "rimPressure"
  | "glassCleaner";

export type BasketballDifficulty = "rookie" | "pro" | "allStar";

/** Where a shot resolves from, by distance to the rim at release. */
export type ShotZone = "dunk" | "layup" | "close" | "mid" | "three";

/** Release timing grade against the shot meter. */
export type ReleaseGrade = "perfect" | "good" | "early" | "late";

export const basketballDifficulties: BasketballDifficulty[] = [
  "rookie",
  "pro",
  "allStar",
];

export const basketballArchetypeLabels: Record<BasketballArchetype, string> = {
  balancedGuard: "BALANCED GUARD",
  sharpshooter: "SHARPSHOOTER",
  slasher: "SLASHER",
  interiorPower: "INTERIOR POWER",
};

export const basketballTraitLabels: Record<BasketballTrait, string> = {
  quickRelease: "QUICK RELEASE",
  deepRange: "DEEP RANGE",
  rimPressure: "RIM PRESSURE",
  glassCleaner: "GLASS CLEANER",
};

export const basketballTraitBlurbs: Record<BasketballTrait, string> = {
  quickRelease: "Faster gather, harder to block",
  deepRange: "No penalty on deep threes",
  rimPressure: "Dunks from further out",
  glassCleaner: "Owns the rebound battle",
};

export const basketballDifficultyLabels: Record<BasketballDifficulty, string> = {
  rookie: "ROOKIE",
  pro: "PRO",
  allStar: "ALL-STAR",
};

/** A Hoop Duel athlete. Ratings are 0–99. */
export type BasketballAthlete = {
  id: string;
  name: string;
  ovr: number;
  teamName: string;
  teamCode: string;
  position: string;
  cardRole: BasketballCardRole;
  archetype: BasketballArchetype;
  trait: BasketballTrait;
  /** One-line lobby flavour, e.g. 'Backcourt value with quick-trigger reads.' */
  tagline: string;
  /** Body height in metres — feeds reach for blocks and rebounds. */
  heightM: number;
  speed: number;
  handling: number;
  inside: number;
  mid: number;
  three: number;
  dunk: number;
  defense: number;
  steal: number;
  block: number;
  rebound: number;
  stamina: number;
};

/** Shooting rating for a zone (dunks use `dunk`, put-backs use `inside`). */
export function ratingFor(athlete: BasketballAthlete, zone: ShotZone): number {
  switch (zone) {
    case "dunk":
      return athlete.dunk;
    case "layup":
    case "close":
      return athlete.inside;
    case "mid":
      return athlete.mid;
    case "three":
      return athlete.three;
  }
}

/* ---- The match ------------------------------------------------------------ */

/** Everything a match needs to run deterministically. */
export type BasketballMatchConfig = {
  /** Three athletes from the starter pack; one is active at a time. */
  playerRoster: BasketballAthlete[];
  playerStarterIndex: number;
  cpuRoster: BasketballAthlete[];
  cpuStarterIndex: number;
  difficulty: BasketballDifficulty;
  seed: number;
  /** First-match contextual control hints. */
  showHints: boolean;
  /** The player's team livery id. */
  teamId: string;
  /** The CPU's livery id — always different from `teamId`. */
  cpuTeamId: string;
};

/** Player-side box score, accumulated by the engine for the result screen. */
export type BasketballBoxScore = {
  attempts: number;
  makes: number;
  threesMade: number;
  perfectReleases: number;
  dunks: number;
  blocks: number;
  steals: number;
  rebounds: number;
  turnovers: number;
  /** Longest unanswered scoring run, in points. */
  bestRun: number;
};

export const emptyBoxScore: BasketballBoxScore = Object.freeze({
  attempts: 0,
  makes: 0,
  threesMade: 0,
  perfectReleases: 0,
  dunks: 0,
  blocks: 0,
  steals: 0,
  rebounds: 0,
  turnovers: 0,
  bestRun: 0,
});

export function fgPercent(box: BasketballBoxScore): number {
  return box.attempts === 0 ? 0 : Math.trunc((box.makes * 100) / box.attempts);
}

/** Final match outcome, handed from the engine to the result overlay. */
export type BasketballMatchSummary = {
  playerScore: number;
  cpuScore: number;
  overtime: boolean;
  box: BasketballBoxScore;
  difficulty: BasketballDifficulty;
  /** The winning basket beat the final buzzer. */
  buzzerBeater: boolean;
  abandoned: boolean;
};

export function summaryWon(summary: BasketballMatchSummary): boolean {
  return summary.playerScore > summary.cpuScore;
}

export function summaryMargin(summary: BasketballMatchSummary): number {
  return Math.abs(summary.playerScore - summary.cpuScore);
}

/**
 * Performance grade D→S: result *and* shot quality *and* defense, not just the
 * scoreline — so a scrappy one-point win outranks a sloppy blowout.
 */
export function summaryGrade(summary: BasketballMatchSummary): string {
  const box = summary.box;
  const won = summaryWon(summary);
  let score = 0;
  if (won) score += 3;
  const percent = fgPercent(box);
  if (percent >= 60) {
    score += 2;
  } else if (percent >= 45) {
    score += 1;
  }
  if (box.perfectReleases >= 3) score += 1;
  if (box.blocks + box.steals >= 3) {
    score += 2;
  } else if (box.blocks + box.steals >= 1) {
    score += 1;
  }
  if (box.turnovers >= 4) score -= 1;
  if (won && summaryMargin(summary) >= 8) score += 1;
  if (score >= 8) return "S";
  if (score >= 6) return "A";
  if (score >= 4) return "B";
  if (score >= 2) return "C";
  return "D";
}

/** Flutter's `calculateBasketballXP`. A loss still pays, an overtime pays more. */
export function calculateBasketballXP(options: {
  won: boolean;
  margin: number;
  overtime: boolean;
}): number {
  if (!options.won) return options.overtime ? 6 : 4;
  const base = Math.min(26, 16 + options.margin * 2);
  return options.overtime ? Math.min(26, base + 2) : base;
}

/* ---- Simulation state ----------------------------------------------------- */

export type BodyState =
  | "idle"
  | "run"
  | "drive"
  | "crossover"
  | "stepback"
  | "gather"
  | "jump"
  | "land"
  | "stance"
  | "lunge"
  | "contest"
  | "fake"
  | "stagger"
  | "celebrate"
  | "dejected"
  | "spin";

export type JumpPurpose = "shot" | "layup" | "dunk" | "putback" | "block" | "rebound";

export type BallPhase = "held" | "shot" | "loose" | "dead";

export type PlayPhase = "awaiting" | "live" | "deadReset" | "finished";

/**
 * Presentation-only meaning of the player's contextual ACTION pad.
 *
 * Derived entirely from simulation state. It does not alter intent resolution;
 * it only explains what the existing tap/hold/release will do.
 */
export type BasketballActionCue =
  | "shoot"
  | "finish"
  | "release"
  | "defend"
  | "block"
  | "rebound";

/** One tick of input. The AI produces exactly this, so it cannot cheat. */
export type BasketballIntent = {
  /** -1 = away from the hoop, +1 = toward it. */
  moveAxis: number;
  /** Edge: double-tap burst on the move pad. */
  burst: boolean;
  /** Action zone currently held. */
  actionDown: boolean;
  /** Edge: action press started this tick. */
  actionPressed: boolean;
  /** Edge: action released this tick. */
  actionReleased: boolean;
  /** How long the action was held at release (or so far). */
  heldSeconds: number;
  /** Edge: swipe away from the hoop inside the action zone. */
  swipeBack: boolean;
};

export const idleIntent: BasketballIntent = Object.freeze({
  moveAxis: 0,
  burst: false,
  actionDown: false,
  actionPressed: false,
  actionReleased: false,
  heldSeconds: 0,
  swipeBack: false,
});

export function makeIntent(
  overrides: Partial<BasketballIntent> = {},
): BasketballIntent {
  return { ...idleIntent, ...overrides };
}

/** Shot-meter view for the HUD. Null when no meter is running. */
export type ShotMeterView = {
  progress: number;
  perfectCenter: number;
  perfectHalf: number;
  goodHalf: number;
};

/** Public rebound prediction — exposed only after rim contact. */
export type ReboundPrediction = {
  landX: number;
  tLand: number;
};

/* ---- Events --------------------------------------------------------------- */

export type BasketballEventType =
  | "basketMade"
  | "shotMissed"
  | "steal"
  | "block"
  | "rebound"
  | "shotClockViolation"
  | "heatStarted"
  | "heatEnded"
  | "ankleBreaker"
  | "poster"
  | "stagger"
  | "perfectRelease"
  | "halfEnded"
  | "overtimeStarted"
  | "matchEnded"
  | "substitution"
  | "dunk"
  | "shotReleased"
  | "buzzerBeater"
  | "spinMove"
  | "crossover";

export type BasketballEvent = {
  type: BasketballEventType;
  team: number;
  points: number;
  zone: ShotZone | null;
  grade: ReleaseGrade | null;
  offensive: boolean;
  halfIndex: number;
  needsOvertime: boolean;
  onDunk: boolean;
};

export function makeEvent(
  type: BasketballEventType,
  overrides: Partial<Omit<BasketballEvent, "type">> = {},
): BasketballEvent {
  return {
    type,
    team: -1,
    points: 0,
    zone: null,
    grade: null,
    offensive: false,
    halfIndex: 0,
    needsOvertime: false,
    onDunk: false,
    ...overrides,
  };
}

/* ---- Small maths the whole module shares ---------------------------------- */

export function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** `double.sign` — Dart returns 0 for 0, which `Math.sign` also does. */
export function sign(value: number): number {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

/**
 * Tennis Rally's domain vocabulary — the web port of `lib/models/tennis.dart`.
 *
 * Flutter models each of these as an enum; the string unions serialise for free
 * and read the same at the call site. Where an enum's *order* is load-bearing —
 * `TennisIntent.serveAim` clamps to -1..1, a shot type indexes nothing — the
 * ordered array next to the union is the authority.
 *
 * Everything here is data plus pure functions. Nothing in this file knows about
 * React, the canvas, or the DOM.
 *
 * Five modes are declared because the engine branches on them, and the engine is
 * a line-for-line translation. Only `quickMatch` is reachable: `app.dart` routes
 * to `TennisRallyHub`, which builds nothing else. The other four belong to
 * `TennisRallyV2Hub`, which is dead code in the Flutter source.
 */

/* ---- Enums --------------------------------------------------------------- */

export type TennisMode =
  | "quickMatch"
  | "tournament"
  | "endlessRally"
  | "targetPractice"
  | "training";

export type TennisDifficulty = "rookie" | "pro" | "allStar";

export type TennisArchetype =
  | "allRounder"
  | "powerBaseliner"
  | "speedDefender"
  | "serveAndVolley"
  | "spinSpecialist"
  | "allCourtRival";

export type TennisShotType =
  | "normal"
  | "power"
  | "topspin"
  | "slice"
  | "lob"
  | "volley"
  | "smash"
  | "dropShot"
  | "defensive"
  | "serve";

export type TennisTimingGrade = "perfect" | "good" | "early" | "late" | "missed";

export type TennisMatchPhase =
  | "preServe"
  | "serving"
  | "rally"
  | "pointComplete"
  | "setComplete"
  | "practiceComplete";

/* ---- Labels -------------------------------------------------------------- */

export const tennisModeLabels: Record<TennisMode, string> = {
  quickMatch: "QUICK MATCH",
  tournament: "TOURNAMENT",
  endlessRally: "ENDLESS RALLY",
  targetPractice: "TARGET PRACTICE",
  training: "TRAINING",
};

export const tennisDifficultyLabels: Record<TennisDifficulty, string> = {
  rookie: "ROOKIE",
  pro: "PRO",
  allStar: "ALL-STAR",
};

/** Oz Coins a win pays at each difficulty. */
export const tennisWinCoins: Record<TennisDifficulty, number> = {
  rookie: 20,
  pro: 30,
  allStar: 40,
};

export const tennisXpBonus: Record<TennisDifficulty, number> = {
  rookie: 0,
  pro: 4,
  allStar: 8,
};

export const tennisArchetypeLabels: Record<TennisArchetype, string> = {
  allRounder: "ALL-ROUNDER",
  powerBaseliner: "POWER BASELINER",
  speedDefender: "SPEED DEFENDER",
  serveAndVolley: "SERVE & VOLLEY",
  spinSpecialist: "SPIN SPECIALIST",
  allCourtRival: "ALL-COURT RIVAL",
};

export const tennisShotLabels: Record<TennisShotType, string> = {
  normal: "GOOD",
  power: "POWER",
  topspin: "TOPSPIN",
  slice: "SLICE",
  lob: "LOB",
  volley: "VOLLEY",
  smash: "SMASH",
  dropShot: "DROP SHOT",
  defensive: "DEFENSIVE",
  serve: "SERVE",
};

/* ---- Ratings ------------------------------------------------------------- */

/**
 * The nine sub-ratings the rally physics reads. `overall` is not stored on the
 * athlete's card — the card carries its own `rating`, which is the same number.
 */
export type TennisRatings = {
  speed: number;
  acceleration: number;
  power: number;
  control: number;
  serve: number;
  stamina: number;
  volley: number;
  spin: number;
  reach: number;
};

/** One playable athlete, as the engine sees them. */
export type TennisAthlete = {
  id: string;
  archetype: TennisArchetype;
  signature: string;
  ratings: TennisRatings;
  overallRating: number;
};

/* ---- Settings ------------------------------------------------------------ */

/**
 * Accessibility and control preferences.
 *
 * Two of Flutter's toggles are deliberately absent. `sound` has nothing to
 * drive — this app ships no audio system. `strongFlashes` is read by nothing in
 * the Flutter source either; it is a switch wired to a field wired to storage
 * and back, and porting it would carry that across rather than fix it.
 */
export type TennisSettings = {
  leftHanded: boolean;
  /** 0.8 – 1.25. Scales the width of both control pads. */
  controlScale: number;
  /** 0.45 – 1. */
  controlOpacity: number;
  movementAssist: boolean;
  reducedMotion: boolean;
  haptics: boolean;
};

export const defaultTennisSettings: TennisSettings = {
  leftHanded: false,
  controlScale: 1,
  controlOpacity: 0.82,
  movementAssist: true,
  reducedMotion: false,
  haptics: true,
};

export const controlScaleRange = { min: 0.8, max: 1.25 } as const;
export const controlOpacityRange = { min: 0.45, max: 1 } as const;

/* ---- Match configuration ------------------------------------------------- */

export type TennisMatchConfig = {
  matchId: string;
  mode: TennisMode;
  playerId: string;
  opponentId: string;
  difficulty: TennisDifficulty;
  seed: number;
  trainingLesson: number | null;
};

/* ---- Score --------------------------------------------------------------- */

export type TennisScoreState = {
  playerGames: number;
  opponentGames: number;
  playerPoints: number;
  opponentPoints: number;
  /** -1 when nobody holds advantage, else the team that does. */
  advantage: number;
  tieBreak: boolean;
  playerTieBreak: number;
  opponentTieBreak: number;
  firstServer: number;
  currentServer: number;
  pointsInGame: number;
  totalGames: number;
  /** -1 until the set is decided. */
  setWinner: number;
  tieBreakFirstServer: number;
};

export const initialScoreState: TennisScoreState = {
  playerGames: 0,
  opponentGames: 0,
  playerPoints: 0,
  opponentPoints: 0,
  advantage: -1,
  tieBreak: false,
  playerTieBreak: 0,
  opponentTieBreak: 0,
  firstServer: 0,
  currentServer: 0,
  pointsInGame: 0,
  totalGames: 0,
  setWinner: -1,
  tieBreakFirstServer: 0,
};

export function isDeuce(score: TennisScoreState): boolean {
  return !score.tieBreak && score.playerPoints >= 3 && score.opponentPoints >= 3;
}

export function isSetComplete(score: TennisScoreState): boolean {
  return score.setWinner >= 0;
}

/** Serve is taken from the right court on even points, as the rules require. */
export function isRightServiceCourt(score: TennisScoreState): boolean {
  return score.pointsInGame % 2 === 0;
}

/** What the scoreboard prints for one side: LOVE / 15 / 30 / 40 / AD, or a count. */
export function pointLabel(score: TennisScoreState, player: number): string {
  if (score.tieBreak) {
    return `${player === 0 ? score.playerTieBreak : score.opponentTieBreak}`;
  }
  if (score.advantage === player) return "AD";
  if (isDeuce(score)) return "40";
  const points = player === 0 ? score.playerPoints : score.opponentPoints;
  switch (Math.min(3, Math.max(0, points))) {
    case 0:
      return "LOVE";
    case 1:
      return "15";
    case 2:
      return "30";
    default:
      return "40";
  }
}

/* ---- Intent and events --------------------------------------------------- */

/** One frame of input, from the pads or from the AI — the same shape for both. */
export type TennisIntent = {
  moveX: number;
  moveY: number;
  sprint: boolean;
  shotDown: boolean;
  shotPressed: boolean;
  shotReleased: boolean;
  holdSeconds: number;
  aimX: number;
  aimY: number;
  /** -1 = wide, 0 = body, 1 = centre/T. */
  serveAim: number;
};

export const idleIntent: TennisIntent = {
  moveX: 0,
  moveY: 0,
  sprint: false,
  shotDown: false,
  shotPressed: false,
  shotReleased: false,
  holdSeconds: 0,
  aimX: 0,
  aimY: 0,
  serveAim: 0,
};

export type TennisEventType =
  | "serveStarted"
  | "contact"
  | "perfectContact"
  | "bounce"
  | "net"
  | "let"
  | "fault"
  | "doubleFault"
  | "ace"
  | "out"
  | "winner"
  | "pointEnded"
  | "gameEnded"
  | "endChange"
  | "tieBreakStarted"
  | "setEnded"
  | "rallyMilestone"
  | "practiceScore"
  | "lessonComplete";

export type TennisEvent = {
  type: TennisEventType;
  team?: number;
  label?: string;
  value?: number;
  shot?: TennisShotType;
  timing?: TennisTimingGrade;
};

export type TennisPointResult = {
  winner: number;
  gameWon: boolean;
  setWon: boolean;
  tieBreakStarted: boolean;
  endChange: boolean;
  breakPointConverted: boolean;
  breakPointSaved: boolean;
};

/* ---- Stats and summary --------------------------------------------------- */

export type TennisMatchStats = {
  durationSeconds: number;
  aces: number;
  doubleFaults: number;
  winners: number;
  unforcedErrors: number;
  breakPointsWon: number;
  breakPointsSaved: number;
  maxBreakPointsSavedInGame: number;
  firstServesIn: number;
  firstServesAttempted: number;
  perfectContacts: number;
  longestRally: number;
  netPointsWon: number;
  totalPointsWon: number;
  totalPointsLost: number;
  staminaSpent: number;
  cleanHolds: number;
  comebackFromThreeGames: boolean;
  tiebreakNerve: boolean;
  wonTwentyShotRally: boolean;
  shotTypesUsed: TennisShotType[];
};

export const emptyMatchStats: TennisMatchStats = {
  durationSeconds: 0,
  aces: 0,
  doubleFaults: 0,
  winners: 0,
  unforcedErrors: 0,
  breakPointsWon: 0,
  breakPointsSaved: 0,
  maxBreakPointsSavedInGame: 0,
  firstServesIn: 0,
  firstServesAttempted: 0,
  perfectContacts: 0,
  longestRally: 0,
  netPointsWon: 0,
  totalPointsWon: 0,
  totalPointsLost: 0,
  staminaSpent: 0,
  cleanHolds: 0,
  comebackFromThreeGames: false,
  tiebreakNerve: false,
  wonTwentyShotRally: false,
  shotTypesUsed: [],
};

export function firstServePercentage(stats: TennisMatchStats): number {
  return stats.firstServesAttempted === 0
    ? 0
    : stats.firstServesIn / stats.firstServesAttempted;
}

export type TennisMatchSummary = {
  matchId: string;
  mode: TennisMode;
  playerId: string;
  opponentId: string;
  difficulty: TennisDifficulty;
  playerGames: number;
  opponentGames: number;
  won: boolean;
  stats: TennisMatchStats;
  practiceScore: number;
  tournamentChampion: boolean;
  trainingLesson: number | null;
};

function clampInt(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * The 0–100 grade a set is scored out of. Result, difficulty, serve, shot
 * balance, break play, timing, rally length, stamina and variety, each capped
 * so no single number can carry the grade on its own.
 */
export function performanceScore(summary: TennisMatchSummary): number {
  const { stats } = summary;
  const result = summary.won
    ? 20
    : summary.playerGames + 2 >= summary.opponentGames
      ? 10
      : 4;
  const difficultyScore =
    summary.difficulty === "rookie" ? 2 : summary.difficulty === "pro" ? 6 : 10;
  const serve = clampInt(Math.round(firstServePercentage(stats) * 15), 0, 15);
  const shotBalance = clampInt(8 + stats.winners - stats.unforcedErrors * 2, 0, 15);
  const breakPlay = clampInt(
    stats.breakPointsWon * 3 + stats.breakPointsSaved * 2,
    0,
    10,
  );
  const perfect = clampInt(stats.perfectContacts * 2, 0, 10);
  const rally = clampInt(Math.round(stats.longestRally / 2), 0, 10);
  const stamina = clampInt(Math.round(5 - stats.staminaSpent / 80), 0, 5);
  const variety = clampInt(stats.shotTypesUsed.length, 0, 5);

  return clampInt(
    result +
      difficultyScore +
      serve +
      shotBalance +
      breakPlay +
      perfect +
      rally +
      stamina +
      variety,
    0,
    100,
  );
}

export type TennisGrade = "S" | "A" | "B" | "C" | "D";

export function grade(summary: TennisMatchSummary): TennisGrade {
  const score = performanceScore(summary);
  if (score >= 90) return "S";
  if (score >= 78) return "A";
  if (score >= 64) return "B";
  if (score >= 48) return "C";
  return "D";
}

/* ---- Reward -------------------------------------------------------------- */

export type TennisReward = {
  xp: number;
  coins: number;
  masteryXp: number;
  /** Set when a repeated rookie rematch has had its bonus suppressed. */
  farmed: boolean;
};

export const zeroReward: TennisReward = {
  xp: 0,
  coins: 0,
  masteryXp: 0,
  farmed: false,
};

/** The signature a farming check compares: who, against whom, at what level. */
export function quickMatchSignature(summary: TennisMatchSummary): string {
  return `${summary.playerId}:${summary.opponentId}:${summary.difficulty}`;
}

const gradeXpBonus: Record<TennisGrade, number> = {
  S: 10,
  A: 7,
  B: 4,
  C: 2,
  D: 0,
};

const gradeMasteryBonus: Record<TennisGrade, number> = {
  S: 20,
  A: 15,
  B: 10,
  C: 5,
  D: 0,
};

/**
 * What a finished match pays.
 *
 * The farming guard is the interesting part: the same athlete against the same
 * rival on rookie, four times running, stops paying the bonus. It still pays a
 * flat ten coins for the win — playing is never worth nothing.
 */
export function calculateTennisReward(
  summary: TennisMatchSummary,
  profile: { lastQuickSignature: string | null; quickRepeatCount: number },
): TennisReward {
  if (summary.mode === "training") {
    // Unreachable in the live build; kept so the reward table matches Flutter's.
    return { xp: 0, coins: 0, masteryXp: 2, farmed: false };
  }
  if (summary.mode === "endlessRally" || summary.mode === "targetPractice") {
    return {
      xp: Math.min(12, Math.floor(summary.practiceScore / 100)),
      coins: 0,
      masteryXp: Math.min(12, Math.floor(summary.practiceScore / 80)),
      farmed: false,
    };
  }

  const signature = quickMatchSignature(summary);
  const repeatedRookie =
    summary.mode === "quickMatch" &&
    summary.difficulty === "rookie" &&
    profile.lastQuickSignature === signature &&
    profile.quickRepeatCount >= 3;

  const letter = grade(summary);
  const performanceBonus = Math.min(
    8,
    Math.min(3, summary.stats.aces) +
      (summary.stats.longestRally >= 20 ? 2 : 0) +
      (summary.stats.comebackFromThreeGames ? 2 : 0) +
      (summary.stats.breakPointsSaved >= 3 ? 2 : 0),
  );

  let xp = 12;
  let coins = 0;
  if (summary.won) {
    xp += 10;
    coins = repeatedRookie ? 10 : tennisWinCoins[summary.difficulty];
  }
  if (!repeatedRookie) {
    xp += tennisXpBonus[summary.difficulty] + gradeXpBonus[letter] + performanceBonus;
  }
  if (summary.mode === "tournament" && summary.won) {
    coins = Math.round(coins * 1.25);
    if (summary.tournamentChampion) {
      xp += 30;
      coins += 75;
    }
  }

  const masteryXp =
    20 +
    (summary.won ? 20 : 0) +
    gradeMasteryBonus[letter] +
    Math.min(10, summary.stats.shotTypesUsed.length * 2);

  return { xp, coins, masteryXp, farmed: repeatedRookie };
}

/* ---- Mastery ------------------------------------------------------------- */

/**
 * Mastery levels 1–10, each costing `level × 100` XP. Ported from
 * `TennisProfile.masteryLevel` / `masteryProgress`, which walk the same ladder
 * twice; here one walk answers both.
 */
export function masteryLadder(xp: number): { level: number; progress: number } {
  let remaining = Math.max(0, xp);
  let level = 1;
  while (level < 10 && remaining >= level * 100) {
    remaining -= level * 100;
    level += 1;
  }
  return {
    level,
    progress: level >= 10 ? 1 : Math.min(1, Math.max(0, remaining / (level * 100))),
  };
}

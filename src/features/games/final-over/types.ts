/**
 * Final Over's domain vocabulary — the web port of the `final_over` package's
 * `domain/models.dart`.
 *
 * Flutter models each of these as an enum; the string unions serialise for free
 * and read the same at the call site. Where an enum's *order* is load-bearing —
 * a uniform pick, or an index into a salt table — the ordered array next to the
 * union is the authority, not the union's declaration order.
 *
 * Everything here is data plus pure functions. Nothing in this file knows about
 * React, the canvas, or the DOM.
 */

/* ---- Phases and outcomes ------------------------------------------------ */

export type MatchPhase =
  | "idle"
  | "matchIntro"
  | "deliveryPreparation"
  | "bowlerRunUp"
  | "incomingBall"
  | "contact"
  | "cameraTransition"
  | "fieldPlay"
  | "runDecision"
  | "runnersMoving"
  | "throwInProgress"
  | "deliveryResult"
  | "betweenBalls"
  | "paused"
  | "won"
  | "lost"
  | "quit";

export type Elevation = "ground" | "loft";

export type ShotDirection = "offSide" | "straight" | "legSide" | "behind";

export type TimingGrade = "perfect" | "good" | "early" | "late" | "poor" | "miss";

export type DeliveryLine = "wideOff" | "off" | "middle" | "leg" | "wideLeg";

export type DeliveryLength = "yorker" | "full" | "good" | "short";

export type ExtraType = "none" | "wide" | "noBall";

export type DismissalType = "none" | "bowled" | "caught" | "runOut";

export type ContactType = "none" | "miss" | "clean" | "edge";

export type RiskLevel = "safe" | "close" | "danger";

export type ObjectiveType =
  | "twoBoundaries"
  | "sixRunsFirstThreeLegalBalls"
  | "completeDouble";

export type FielderRole = "outfielder" | "wicketkeeper" | "bowler";

export type FielderMotion =
  | "idle"
  | "reacting"
  | "chasing"
  | "backup"
  | "catching"
  | "carrying"
  | "throwing";

export type MatchEndReason =
  | "targetReached"
  | "ballsExhausted"
  | "wicketsLost"
  | "quit";

/**
 * The six named random streams, in declaration order — this array indexes the
 * salt table in `engine/random.ts`, so reordering it changes every seeded match.
 */
export const randomStreams = [
  "delivery",
  "contact",
  "catchOutcome",
  "drop",
  "throwOutcome",
  "objective",
] as const;

export type RandomStream = (typeof randomStreams)[number];

/* ---- Labels ------------------------------------------------------------- */

/** The four swing directions as the aim overlay and the control deck name them. */
export const shotDirectionLabels: Record<ShotDirection, string> = {
  offSide: "LEFT",
  straight: "FRONT",
  legSide: "RIGHT",
  behind: "BACK",
};

export const elevationLabels: Record<Elevation, string> = {
  ground: "GROUND",
  loft: "LOFT",
};

/* ---- Vectors ------------------------------------------------------------ */

/**
 * A point on the field, in the engine's own units: the boundary sits at radius
 * 1, so every distance below is a fraction of the ground's radius.
 *
 * Dart gives `FieldVector` operators; TypeScript has none, so the arithmetic is
 * free functions over a plain readonly pair.
 */
export type FieldVector = { readonly x: number; readonly y: number };

export const zeroVector: FieldVector = { x: 0, y: 0 };

export function vec(x: number, y: number): FieldVector {
  return { x, y };
}

export function addVectors(a: FieldVector, b: FieldVector): FieldVector {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtractVectors(a: FieldVector, b: FieldVector): FieldVector {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleVector(a: FieldVector, scale: number): FieldVector {
  return { x: a.x * scale, y: a.y * scale };
}

export function vectorLengthSquared(a: FieldVector): number {
  return a.x * a.x + a.y * a.y;
}

export function vectorLength(a: FieldVector): number {
  return Math.sqrt(vectorLengthSquared(a));
}

export function normalizeVector(a: FieldVector): FieldVector {
  const magnitude = vectorLength(a);
  return magnitude === 0 ? zeroVector : scaleVector(a, 1 / magnitude);
}

export function distanceBetween(a: FieldVector, b: FieldVector): number {
  return vectorLength(subtractVectors(a, b));
}

export function dotProduct(a: FieldVector, b: FieldVector): number {
  return a.x * b.x + a.y * b.y;
}

export function lerpVectors(
  a: FieldVector,
  b: FieldVector,
  t: number,
): FieldVector {
  return addVectors(a, scaleVector(subtractVectors(b, a), clamp(t, 0, 1)));
}

/**
 * Zero degrees is straight down the ground, positive is towards the leg side.
 * The y axis points away from the batter, hence the negative cosine.
 */
export function vectorFromShotAngle(angleDegrees: number): FieldVector {
  const radians = (angleDegrees * Math.PI) / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
}

/** Dart's `num.clamp`, which the ported arithmetic leans on constantly. */
export function clamp(value: number, minimum: number, maximum: number): number {
  return value < minimum ? minimum : value > maximum ? maximum : value;
}

/* ---- Bowlers ------------------------------------------------------------ */

export type BowlerProfile = {
  id: string;
  name: string;
  lookKey: string;
  jerseyNumber: number;
  lineWeights: Partial<Record<DeliveryLine, number>>;
  lengthWeights: Partial<Record<DeliveryLength, number>>;
};

/* ---- The delivery and the swing ----------------------------------------- */

export type DeliverySpec = {
  ordinal: number;
  /** The delivery's own stream seed. A 64-bit value, so it stays a bigint. */
  seed: bigint;
  line: DeliveryLine;
  length: DeliveryLength;
  speed: number;
  movement: number;
  extra: ExtraType;
  lineX: number;
  expectedContactMicros: number;
  isFairFinalBall: boolean;
};

export function deliveryIsLegal(delivery: DeliverySpec): boolean {
  return delivery.extra === "none";
}

/** Where the ball actually crosses the bat: the line, plus whatever it moved. */
export function deliveryContactX(delivery: DeliverySpec): number {
  return delivery.lineX + delivery.movement;
}

export type SwingIntent = {
  direction: ShotDirection;
  inputMicros: number;
  powerShot: boolean;
  /**
   * How loaded the bat was on release, 0..1. Null means the input carried no
   * backlift at all, and the swing is judged on timing alone — which is what
   * the shipped app always sends.
   */
  charge: number | null;
};

export type ContactOutcome = {
  type: ContactType;
  timing: TimingGrade;
  timingErrorMs: number;
  direction: ShotDirection;
  elevation: Elevation;
  power: number;
  control: number;
  shotAngleDegrees: number;
  velocity: FieldVector;
  verticalVelocity: number;
  acceptedSwing: boolean;
  powerShotUsed: boolean;
  bowledThreat: boolean;
};

/** The batter let it go, or never got near it. */
export function noSwingOutcome(
  elevation: Elevation,
  bowledThreat = false,
): ContactOutcome {
  return {
    type: "miss",
    timing: "miss",
    timingErrorMs: 276,
    direction: "straight",
    elevation,
    power: 0,
    control: 0,
    shotAngleDegrees: 0,
    velocity: zeroVector,
    verticalVelocity: 0,
    acceptedSwing: false,
    powerShotUsed: false,
    bowledThreat,
  };
}

export function madeContact(outcome: ContactOutcome): boolean {
  return outcome.type === "clean" || outcome.type === "edge";
}

/* ---- The ball, the runner, the field ------------------------------------ */

export type BallKinematics = {
  position: FieldVector;
  velocity: FieldVector;
  height: number;
  verticalVelocity: number;
  aerial: boolean;
  firstBounceOccurred: boolean;
  stopped: boolean;
};

/** Where the ball is the instant it meets the bat. */
export const ballAtContact: BallKinematics = {
  position: { x: 0, y: 0.19 },
  velocity: zeroVector,
  height: 0,
  verticalVelocity: 0,
  aerial: false,
  firstBounceOccurred: false,
  stopped: false,
};

export type RunnerState = {
  active: boolean;
  returning: boolean;
  runNumber: number;
  progress: number;
  completedRuns: number;
  risk: RiskLevel;
};

export const idleRunner: RunnerState = {
  active: false,
  returning: false,
  runNumber: 0,
  progress: 0,
  completedRuns: 0,
  risk: "safe",
};

/**
 * Past this you are committed, whatever the fielders do.
 *
 * The limit is hard-coded on Dart's `RunnerState` rather than read from the
 * tuning, and the controller checks `tuning.turnBackLimit` separately on top of
 * it. Every shipped tier sets that to the same 0.45, so the two agree today —
 * kept faithful so they still would if a tier moved one of them.
 */
export const runnerTurnBackLimit = 0.45;

export function canTurnBack(runner: RunnerState): boolean {
  return runner.active && !runner.returning && runner.progress <= runnerTurnBackLimit;
}

export type FielderState = {
  id: number;
  role: FielderRole;
  homePosition: FieldVector;
  position: FieldVector;
  velocity: FieldVector;
  motion: FielderMotion;
  hasBall: boolean;
  reactionRemainingSeconds: number;
};

export type FieldLayout = {
  id: string;
  label: string;
  fielders: readonly FielderState[];
};

/* ---- The ledger and the result ------------------------------------------ */

/** What one delivery has banked so far, before it is written into history. */
export type DeliveryLedger = {
  extraRuns: number;
  batRuns: number;
  completedRuns: number;
  dismissal: DismissalType;
  boundary: number;
  extraApplied: boolean;
  finalized: boolean;
};

export const emptyLedger: DeliveryLedger = {
  extraRuns: 0,
  batRuns: 0,
  completedRuns: 0,
  dismissal: "none",
  boundary: 0,
  extraApplied: false,
  finalized: false,
};

export function ledgerTotalRuns(ledger: DeliveryLedger): number {
  return ledger.extraRuns + ledger.batRuns + ledger.completedRuns;
}

export type BallResult = {
  deliveryOrdinal: number;
  legalBallsBefore: number;
  legal: boolean;
  extra: ExtraType;
  extraRuns: number;
  runsOffBat: number;
  completedRunningRuns: number;
  boundary: number;
  dismissal: DismissalType;
  contactType: ContactType;
  timing: TimingGrade;
  freeHitDelivery: boolean;
  historyToken: string;
};

export function resultTotalRuns(result: BallResult): number {
  return result.extraRuns + result.runsOffBat + result.completedRunningRuns;
}

export function isWicket(result: BallResult): boolean {
  return result.dismissal !== "none";
}

export function isBoundary(result: BallResult): boolean {
  return result.boundary === 4 || result.boundary === 6;
}

/** Contact that actually put runs on the board — what the combo rewards. */
export function isProductiveContact(result: BallResult): boolean {
  return (
    result.contactType !== "none" &&
    result.contactType !== "miss" &&
    result.runsOffBat + result.completedRunningRuns > 0
  );
}

/* ---- Match state -------------------------------------------------------- */

/**
 * The single source of truth for a chase. Held immutably: the controller
 * replaces it wholesale each fixed step rather than mutating in place, so a
 * renderer reading it mid-frame can never see a half-applied delivery.
 */
export type MatchState = {
  matchSeed: number;
  target: number;
  phase: MatchPhase;
  suspendedPhase: MatchPhase | null;
  committedScore: number;
  legalBalls: number;
  physicalDeliveries: number;
  wickets: number;
  pendingRuns: number;
  pendingExtras: number;
  pendingBatRuns: number;
  freeHit: boolean;
  currentDeliveryFreeHit: boolean;
  combo: number;
  powerSegments: number;
  powerShotArmed: boolean;
  selectedElevation: Elevation;
  selectedDirection: ShotDirection;
  objective: ObjectiveType;
  objectiveProgress: number;
  objectiveCompleted: boolean;
  stars: number;
  simulationMicros: number;
  phaseElapsedMicros: number;
  currentDelivery: DeliverySpec | null;
  swingIntent: SwingIntent | null;
  contactOutcome: ContactOutcome | null;
  ball: BallKinematics | null;
  cameraTransition: number;
  runner: RunnerState;
  fielders: readonly FielderState[];
  ledger: DeliveryLedger;
  history: readonly BallResult[];
  lastResult: BallResult | null;
  deliveryFinalized: boolean;
  canRun: boolean;
  holdRequested: boolean;
  ballHeld: boolean;
  pickupDecisionMicros: number;
  throwArrivalMicros: number;
  endReason: MatchEndReason | null;
  maximumLegalBalls: number;
  ballsPerOver: number;
  maximumOvers: number;
  bowlerIndex: number;
  bowlers: readonly BowlerProfile[];
};

/* ---- Selectors ---------------------------------------------------------- */
/* Anything derivable is derived here rather than stored, so the two can never
 * disagree. These are the ported getters from Dart's `MatchState`.           */

/** Runs on the board, including everything this delivery has banked so far. */
export function score(state: MatchState): number {
  return (
    state.committedScore +
    state.pendingRuns +
    state.pendingExtras +
    state.pendingBatRuns
  );
}

export function runsNeeded(state: MatchState): number {
  return Math.max(0, state.target - score(state));
}

export function ballsRemaining(state: MatchState): number {
  return Math.max(0, state.maximumLegalBalls - state.legalBalls);
}

/** 0-based over index for the next or current delivery. */
export function currentOver(state: MatchState): number {
  if (state.ballsPerOver <= 0) return 0;
  const over = Math.floor(state.legalBalls / state.ballsPerOver);
  return Math.min(over, Math.max(0, state.maximumOvers - 1));
}

/** Legal ball within the current over, 0–5. */
export function ballInOver(state: MatchState): number {
  if (state.ballsPerOver <= 0) return 0;
  return state.legalBalls % state.ballsPerOver;
}

export function currentBowler(state: MatchState): BowlerProfile | null {
  if (state.bowlers.length === 0) return null;
  return state.bowlers[clamp(state.bowlerIndex, 0, state.bowlers.length - 1)];
}

/**
 * How many more you can lose. Takes the limit because wickets in hand are a
 * difficulty knob, not a constant.
 */
export function wicketsRemaining(
  state: MatchState,
  maximumWickets: number,
): number {
  return Math.max(0, maximumWickets - state.wickets);
}

export function isTerminal(state: MatchState): boolean {
  return state.phase === "won" || state.phase === "lost";
}

export function isPaused(state: MatchState): boolean {
  return state.phase === "paused";
}

/** OVERDRIVE can only be armed while the bowler is still walking back. */
export function canConfigureShot(state: MatchState): boolean {
  return state.phase === "deliveryPreparation";
}

export function canSwing(state: MatchState): boolean {
  return (
    state.phase === "incomingBall" &&
    state.swingIntent === null &&
    state.contactOutcome === null &&
    !state.deliveryFinalized &&
    state.currentDelivery !== null
  );
}

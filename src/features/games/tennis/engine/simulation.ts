/**
 * The rally simulation — a line-for-line port of `TennisEngine` from
 * `lib/games/tennis/tennis_engine.dart`.
 *
 * It owns two bodies, one ball, and the scorekeeper, and advances all of them by
 * a fixed step. It has no notion of a frame: the caller decides how often to
 * step it, and `tennis-game.ts` always steps it at exactly 1/120 s so the
 * physics never varies with the display's refresh rate.
 *
 * Every constant below is the Flutter constant. The mode branches are ported
 * too, even though only `quickMatch` is reachable in the live build — removing
 * them would turn a translation into a rewrite, and each removal is a place the
 * physics could silently diverge.
 */

import {
  courtHalfLength,
  courtHalfWidth,
  gravity,
  maximumFrameSeconds,
  netHeight,
  serviceLine,
} from "../constants";
import { tennisAthleteById } from "../data/athletes";
import {
  emptyMatchStats,
  isRightServiceCourt,
  type TennisAthlete,
  type TennisEvent,
  type TennisIntent,
  type TennisMatchConfig,
  type TennisMatchPhase,
  type TennisMatchStats,
  type TennisMatchSummary,
  type TennisScoreState,
  type TennisShotType,
  type TennisTimingGrade,
} from "../types";
import { signed, TennisRandom } from "./random";
import { TennisScoring } from "./scoring";

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Inside the singles court, with the millimetre of slack the lines get. */
export function ballInsideSingles(x: number, y: number): boolean {
  return Math.abs(x) <= courtHalfWidth + 0.001 && Math.abs(y) <= courtHalfLength + 0.001;
}

/**
 * Whether a served ball landed in the correct service box.
 *
 * The box is diagonally opposite the server, so which half is legal flips with
 * both the deuce/ad court and which end is serving.
 */
export function serveInsideBox(
  x: number,
  y: number,
  server: number,
  rightServiceCourt: boolean,
): boolean {
  const expectedSide = rightServiceCourt ? 1 : -1;
  const boxSide = server === 0 ? expectedSide : -expectedSide;
  const correctHalf = Math.abs(x) <= 0.001 || Math.sign(x) === Math.sign(boxSide);
  const correctDepth =
    server === 0
      ? y <= 0.001 && y >= -serviceLine - 0.001
      : y >= -0.001 && y <= serviceLine + 0.001;
  return Math.abs(x) <= courtHalfWidth + 0.001 && correctHalf && correctDepth;
}

/* ---- The moving parts ---------------------------------------------------- */

export type BodySnapshot = {
  x: number;
  y: number;
  stamina: number;
  focus: number;
  swingT: number;
  swingShot: TennisShotType | null;
  lastTiming: TennisTimingGrade | null;
};

export class TennisBody {
  readonly team: number;
  readonly spec: TennisAthlete;
  x = 0;
  y = 0;
  stamina = 100;
  focus = 0;
  /** Counts down while a swing plays out; the renderer reads it for the pose. */
  swingT = 0;
  swingShot: TennisShotType | null = null;
  lastTiming: TennisTimingGrade | null = null;

  constructor(team: number, spec: TennisAthlete) {
    this.team = team;
    this.spec = spec;
  }

  get stamina01(): number {
    return this.stamina / 100;
  }

  get focus01(): number {
    return this.focus / 100;
  }

  toSnapshot(): BodySnapshot {
    return {
      x: this.x,
      y: this.y,
      stamina: this.stamina,
      focus: this.focus,
      swingT: this.swingT,
      swingShot: this.swingShot,
      lastTiming: this.lastTiming,
    };
  }

  restore(snapshot: BodySnapshot): void {
    this.x = snapshot.x;
    this.y = snapshot.y;
    this.stamina = clamp(snapshot.stamina, 0, 100);
    this.focus = clamp(snapshot.focus, 0, 100);
    this.swingT = snapshot.swingT;
    this.swingShot = snapshot.swingShot;
    this.lastTiming = snapshot.lastTiming;
  }
}

export type BallSnapshot = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  bounces: number;
  lastHitter: number;
  live: boolean;
  serve: boolean;
  netTouched: boolean;
  shot: TennisShotType;
};

export class TennisBall {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  bounces = 0;
  lastHitter = 1;
  live = false;
  serve = false;
  netTouched = false;
  shot: TennisShotType = "normal";

  toSnapshot(): BallSnapshot {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      vx: this.vx,
      vy: this.vy,
      vz: this.vz,
      bounces: this.bounces,
      lastHitter: this.lastHitter,
      live: this.live,
      serve: this.serve,
      netTouched: this.netTouched,
      shot: this.shot,
    };
  }

  restore(snapshot: BallSnapshot): void {
    this.x = snapshot.x;
    this.y = snapshot.y;
    this.z = snapshot.z;
    this.vx = snapshot.vx;
    this.vy = snapshot.vy;
    this.vz = snapshot.vz;
    this.bounces = snapshot.bounces;
    this.lastHitter = snapshot.lastHitter;
    this.live = snapshot.live;
    this.serve = snapshot.serve;
    this.netTouched = snapshot.netTouched;
    this.shot = snapshot.shot;
  }
}

/** A shot the player asked for, waiting for the ball to come inside reach. */
type QueuedShot = {
  at: number;
  holdSeconds: number;
  aimX: number;
  aimY: number;
  serveAim: number;
};

/* ---- Stats --------------------------------------------------------------- */

type StatsSnapshot = TennisMatchStats & {
  maxDeficit: number;
  pointsLostCurrentServiceGame: number;
  breakPointsSavedCurrentGame: number;
};

/**
 * The running tally, which is only ever about the player.
 *
 * Three fields are bookkeeping rather than results — they track the game in
 * progress so a clean hold or a run of saved break points can be recognised when
 * it ends — so they ride in the snapshot but never reach the summary.
 */
class MutableStats {
  aces = 0;
  doubleFaults = 0;
  winners = 0;
  unforcedErrors = 0;
  breakPointsWon = 0;
  breakPointsSaved = 0;
  breakPointsSavedCurrentGame = 0;
  maxBreakPointsSavedInGame = 0;
  firstServesIn = 0;
  firstServesAttempted = 0;
  perfectContacts = 0;
  longestRally = 0;
  netPointsWon = 0;
  totalPointsWon = 0;
  totalPointsLost = 0;
  staminaSpent = 0;
  cleanHolds = 0;
  comeback = false;
  tiebreakNerve = false;
  wonTwentyShotRally = false;
  shots = new Set<TennisShotType>();
  maxDeficit = 0;
  pointsLostCurrentServiceGame = 0;

  freeze(durationSeconds: number): TennisMatchStats {
    return {
      ...emptyMatchStats,
      durationSeconds,
      aces: this.aces,
      doubleFaults: this.doubleFaults,
      winners: this.winners,
      unforcedErrors: this.unforcedErrors,
      breakPointsWon: this.breakPointsWon,
      breakPointsSaved: this.breakPointsSaved,
      maxBreakPointsSavedInGame: this.maxBreakPointsSavedInGame,
      firstServesIn: this.firstServesIn,
      firstServesAttempted: this.firstServesAttempted,
      perfectContacts: this.perfectContacts,
      longestRally: this.longestRally,
      netPointsWon: this.netPointsWon,
      totalPointsWon: this.totalPointsWon,
      totalPointsLost: this.totalPointsLost,
      staminaSpent: this.staminaSpent,
      cleanHolds: this.cleanHolds,
      comebackFromThreeGames: this.comeback,
      tiebreakNerve: this.tiebreakNerve,
      wonTwentyShotRally: this.wonTwentyShotRally,
      shotTypesUsed: [...this.shots],
    };
  }

  toSnapshot(): StatsSnapshot {
    return {
      ...this.freeze(0),
      maxDeficit: this.maxDeficit,
      pointsLostCurrentServiceGame: this.pointsLostCurrentServiceGame,
      breakPointsSavedCurrentGame: this.breakPointsSavedCurrentGame,
    };
  }

  restore(snapshot: StatsSnapshot): void {
    this.aces = snapshot.aces;
    this.doubleFaults = snapshot.doubleFaults;
    this.winners = snapshot.winners;
    this.unforcedErrors = snapshot.unforcedErrors;
    this.breakPointsWon = snapshot.breakPointsWon;
    this.breakPointsSaved = snapshot.breakPointsSaved;
    this.maxBreakPointsSavedInGame = snapshot.maxBreakPointsSavedInGame;
    this.firstServesIn = snapshot.firstServesIn;
    this.firstServesAttempted = snapshot.firstServesAttempted;
    this.perfectContacts = snapshot.perfectContacts;
    this.longestRally = snapshot.longestRally;
    this.netPointsWon = snapshot.netPointsWon;
    this.totalPointsWon = snapshot.totalPointsWon;
    this.totalPointsLost = snapshot.totalPointsLost;
    this.staminaSpent = snapshot.staminaSpent;
    this.cleanHolds = snapshot.cleanHolds;
    this.comeback = snapshot.comebackFromThreeGames;
    this.tiebreakNerve = snapshot.tiebreakNerve;
    this.wonTwentyShotRally = snapshot.wonTwentyShotRally;
    this.shots = new Set(snapshot.shotTypesUsed);
    this.maxDeficit = snapshot.maxDeficit;
    this.pointsLostCurrentServiceGame = snapshot.pointsLostCurrentServiceGame;
    this.breakPointsSavedCurrentGame = snapshot.breakPointsSavedCurrentGame;
  }
}

/* ---- The engine ---------------------------------------------------------- */

export type EngineSnapshot = {
  rng: number;
  score: TennisScoreState;
  player: BodySnapshot;
  opponent: BodySnapshot;
  ball: BallSnapshot;
  phase: TennisMatchPhase;
  serveNumber: number;
  serveMeter: number;
  serveMeterRising: boolean;
  rallyCount: number;
  practiceScore: number;
  ballsRemaining: number;
  lessonProgress: number;
  targetIndex: number;
  flightId: number;
  targetX: number;
  targetY: number;
  elapsed: number;
  pointResetT: number;
  focusPointActive: boolean;
  endSwapped: boolean;
  serveContinuation: boolean;
  playerSavedTieBreakSetPoint: boolean;
  opponentMissLockedFlightId: number;
  stats: StatsSnapshot;
};

export class TennisEngine {
  readonly config: TennisMatchConfig;
  movementAssist: boolean;
  readonly random: TennisRandom;
  readonly player: TennisBody;
  readonly opponent: TennisBody;
  readonly ball = new TennisBall();
  scoring: TennisScoring;

  phase: TennisMatchPhase = "preServe";
  serveNumber = 1;
  serveMeter = 0;
  serveMeterRising = true;
  rallyCount = 0;
  practiceScore = 0;
  ballsRemaining = 20;
  lessonProgress = 0;
  targetIndex = 0;
  /** Bumped on every launch, so the renderer knows when to re-solve the landing. */
  flightId = 0;
  targetX = 0;
  targetY = -8;
  elapsed = 0;
  pointResetT = 0;
  paused = false;
  focusPointActive = false;
  endSwapped = false;

  private readonly stats = new MutableStats();
  private playerShot: QueuedShot | null = null;
  private opponentShot: QueuedShot | null = null;
  private playerHold = 0;
  private opponentHold = 0;
  private trainingAimLeft = false;
  private trainingAimRight = false;
  private trainingSprintUsed = false;
  private serveContinuation = false;
  private playerSavedTieBreakSetPoint = false;
  private opponentMissLockedFlightId = -1;
  private events: TennisEvent[] = [];

  constructor(
    config: TennisMatchConfig,
    options: { movementAssist?: boolean; snapshot?: EngineSnapshot } = {},
  ) {
    this.config = config;
    this.movementAssist = options.movementAssist ?? true;
    this.random = new TennisRandom(config.seed);
    this.player = new TennisBody(0, tennisAthleteById(config.playerId));
    this.opponent = new TennisBody(1, tennisAthleteById(config.opponentId));
    this.scoring = TennisScoring.forFirstServer(
      config.mode === "training" ? 0 : config.seed % 2 === 0 ? 0 : 1,
    );

    if (options.snapshot === undefined) {
      this.resetBodies();
      this.startPoint(true);
    } else {
      this.restore(options.snapshot);
    }
  }

  get score(): TennisScoreState {
    return this.scoring.state;
  }

  get complete(): boolean {
    return this.phase === "setComplete" || this.phase === "practiceComplete";
  }

  bodyFor(team: number): TennisBody {
    return team === 0 ? this.player : this.opponent;
  }

  /**
   * Whether this side may strike the ball right now.
   *
   * The `lastHitter` guard matters more than it looks: without it a side can
   * generate a contact on consecutive fixed steps while the ball is still inside
   * its reach, relaunching the same trajectory over and over.
   */
  canHit(team: number): boolean {
    if (!this.ball.live || this.phase !== "rally") return false;
    if (this.config.mode === "targetPractice" && team === 1) return false;
    if (this.ball.lastHitter === team) return false;
    if (team === 0 && this.ball.y < 0) return false;
    if (team === 1 && this.ball.y > 0) return false;

    const body = this.bodyFor(team);
    const reach = 0.75 + (body.spec.ratings.reach / 100) * 0.65;
    const distance = Math.hypot(this.ball.x - body.x, this.ball.y - body.y);
    return distance <= reach && this.ball.z >= 0.18 && this.ball.z <= 2.8;
  }

  step(
    playerIntent: TennisIntent,
    opponentIntent: TennisIntent,
    dt: number,
  ): TennisEvent[] {
    this.events = [];
    if (this.paused || this.complete) return this.events;

    const safeDt = clamp(dt, 0, maximumFrameSeconds);
    this.elapsed += safeDt;
    if (this.config.mode === "targetPractice" && this.elapsed >= 90) {
      this.finishPractice();
      return this.events;
    }

    this.updateBody(this.player, playerIntent, safeDt);
    this.updateBody(this.opponent, opponentIntent, safeDt);
    this.captureIntent(0, playerIntent, safeDt);
    this.captureIntent(1, opponentIntent, safeDt);

    if (this.phase === "pointComplete") {
      this.pointResetT -= safeDt;
      if (this.pointResetT <= 0) this.startPoint(false);
    } else if (this.phase === "preServe" || this.phase === "serving") {
      this.updateServe(playerIntent, opponentIntent, safeDt);
    } else if (this.phase === "rally") {
      this.tryContact(0);
      this.tryContact(1);
      this.updateBall(safeDt);
    }

    this.player.swingT = Math.max(0, this.player.swingT - safeDt);
    this.opponent.swingT = Math.max(0, this.opponent.swingT - safeDt);
    return this.events;
  }

  /* ---- Bodies ------------------------------------------------------------ */

  private updateBody(body: TennisBody, intent: TennisIntent, dt: number): void {
    if (this.phase === "pointComplete") {
      this.recover(body, dt * 0.8);
      return;
    }

    let mx = clamp(intent.moveX, -1, 1);
    let my = clamp(intent.moveY, -1, 1);

    // Movement assist nudges the player toward an incoming ball whenever the
    // stick is near centre. It never overrides real input, and it never helps
    // the AI — only team 0 is eligible.
    if (
      body.team === 0 &&
      this.movementAssist &&
      Math.abs(mx) + Math.abs(my) < 0.08 &&
      this.ball.live &&
      this.ball.y > 0
    ) {
      mx = clamp((this.ball.x - body.x) * 0.22, -0.36, 0.36);
      my = clamp((this.ball.y - body.y) * 0.12, -0.24, 0.24);
    }

    const length = Math.hypot(mx, my);
    if (length > 1) {
      mx /= length;
      my /= length;
    }

    const rating = body.spec.ratings;
    const tired = 0.7 + body.stamina01 * 0.3;
    const sprinting = intent.sprint && body.stamina > 8;
    const speed = (3.5 + (rating.speed / 100) * 2.4) * tired * (sprinting ? 1.35 : 1);

    body.x += mx * speed * dt;
    body.y += my * speed * dt;
    body.x = clamp(body.x, -courtHalfWidth - 1.1, courtHalfWidth + 1.1);
    if (body.team === 0) {
      body.y = clamp(body.y, 0.75, courtHalfLength + 1.1);
    } else {
      body.y = clamp(body.y, -courtHalfLength - 1.1, -0.75);
    }

    if (length > 0.05) {
      const drain = (sprinting ? 7.2 : 0.65) * length * dt;
      body.stamina = Math.max(0, body.stamina - drain);
      if (body.team === 0) this.stats.staminaSpent += drain;
    } else {
      body.stamina = Math.min(100, body.stamina + 3 * dt);
    }

    if (body.team === 0 && intent.sprint) this.trainingSprintUsed = true;
  }

  /** Between points both sides drift back to the middle of their baseline. */
  private recover(body: TennisBody, dt: number): void {
    const targetY = body.team === 0 ? 8.8 : -8.8;
    body.x += (0 - body.x) * Math.min(1, dt * 2.2);
    body.y += (targetY - body.y) * Math.min(1, dt * 2.2);
    body.stamina = Math.min(100, body.stamina + dt * 9);
  }

  /**
   * Turn this step's input edges into a queued shot.
   *
   * The hold is accumulated here rather than taken from the intent because a
   * press spans many fixed steps; the release keeps whichever is longer, so a
   * caller that tracks its own hold is never overridden downward.
   */
  private captureIntent(team: number, intent: TennisIntent, dt: number): void {
    if (team === 0) {
      if (intent.shotDown) this.playerHold += dt;
      if (intent.shotReleased) {
        this.playerShot = {
          at: this.elapsed,
          holdSeconds: Math.max(intent.holdSeconds, this.playerHold),
          aimX: intent.aimX,
          aimY: intent.aimY,
          serveAim: intent.serveAim,
        };
        this.playerHold = 0;
      }
      return;
    }
    if (intent.shotDown) this.opponentHold += dt;
    if (intent.shotReleased) {
      this.opponentShot = {
        at: this.elapsed,
        holdSeconds: Math.max(intent.holdSeconds, this.opponentHold),
        aimX: intent.aimX,
        aimY: intent.aimY,
        serveAim: intent.serveAim,
      };
      this.opponentHold = 0;
    }
  }

  /* ---- Serving ----------------------------------------------------------- */

  private updateServe(
    playerIntent: TennisIntent,
    opponentIntent: TennisIntent,
    dt: number,
  ): void {
    const server = this.score.currentServer;
    const intent = server === 0 ? playerIntent : opponentIntent;
    const queued = server === 0 ? this.playerShot : this.opponentShot;

    if (intent.shotPressed || intent.shotDown) {
      if (this.phase === "preServe") {
        this.phase = "serving";
        this.serveMeter = 0;
        this.serveMeterRising = true;
        this.events.push({ type: "serveStarted", team: server });
      }
    }

    if (this.phase === "serving") {
      // A second serve's meter sweeps slower, which is the whole of the safety
      // net: the sweet spot is easier to hit, not any wider.
      const delta = dt / (this.serveNumber === 1 ? 1.05 : 1.25);
      this.serveMeter += this.serveMeterRising ? delta : -delta;
      if (this.serveMeter >= 1) {
        this.serveMeter = 1;
        this.serveMeterRising = false;
      } else if (this.serveMeter <= 0) {
        this.serveMeter = 0;
        this.serveMeterRising = true;
      }
    }

    if (this.phase === "serving" && queued !== null) {
      if (server === 0) this.playerShot = null;
      else this.opponentShot = null;
      this.launchServe(server, queued);
    }
  }

  private launchServe(server: number, queued: QueuedShot): void {
    const body = this.bodyFor(server);
    // The sweet spot is 0.82, and accuracy falls away linearly either side of
    // it — releasing late costs exactly what releasing early does.
    const accuracy = 1 - Math.abs(this.serveMeter - 0.82) / 0.82;
    const rating = body.spec.ratings.serve / 100;
    const secondSafety = this.serveNumber === 2 ? 0.14 : 0;
    const quality = clamp(accuracy * 0.72 + rating * 0.28 + secondSafety, 0, 1);

    const side = isRightServiceCourt(this.score) ? 1 : -1;
    const direction = clamp(queued.serveAim, -1, 1);
    let targetX = side * (1.05 + direction * 1.25);
    if (server === 1) targetX *= -1;
    const targetY = server === 0 ? -4.4 : 4.4;

    const error = (1 - quality) * (this.serveNumber === 1 ? 2.7 : 1.6);
    targetX += signed(this.random) * error;
    // A badly-timed serve does not just stray wide, it sails long.
    const longError = quality < 0.45 ? (0.45 - quality) * 7 : 0;
    const actualTargetY = targetY + (server === 0 ? -longError : longError);
    const duration = 0.58 + (1 - quality) * 0.2;

    this.ball.x = body.x;
    this.ball.y = body.y;
    this.ball.z = 2.35;
    this.ball.bounces = 0;
    this.ball.lastHitter = server;
    this.ball.live = true;
    this.ball.serve = true;
    this.ball.netTouched = false;
    this.ball.shot = "serve";
    this.setFlight(targetX, actualTargetY, duration);

    this.phase = "rally";
    if (server === 0 && this.serveNumber === 1) this.stats.firstServesAttempted += 1;
    body.swingT = 0.55;
    body.swingShot = "serve";
  }

  /* ---- Striking ---------------------------------------------------------- */

  private tryContact(team: number): void {
    if (!this.canHit(team)) return;
    if (team === 1 && this.opponentMissLockedFlightId === this.flightId) return;

    const queued = team === 0 ? this.playerShot : this.opponentShot;
    if (queued === null) return;
    if (team === 0) this.playerShot = null;
    else this.opponentShot = null;

    const body = this.bodyFor(team);
    const distance = Math.hypot(this.ball.x - body.x, this.ball.y - body.y);
    const queueAge = this.elapsed - queued.at;

    let timing: TennisTimingGrade = "good";
    const perfectWindow =
      (0.075 + body.spec.ratings.control / 2200) *
      (0.72 + body.stamina01 * 0.28) *
      (team === 0 && this.focusPointActive ? 1.1 : 1);

    if (distance <= 0.34 && queueAge <= perfectWindow) {
      timing = "perfect";
    } else if (distance > 1.05) {
      // Reaching for it. Whether that reads as early or late depends on whether
      // the ball is still coming or already going away.
      timing = this.ball.vy * (team === 0 ? 1 : -1) > 0 ? "late" : "early";
    } else if (queueAge > 0.45) {
      timing = "early";
    }

    const shot = this.resolveShot(team, queued, timing);
    if (team === 1 && this.opponentMissesReturn(body, distance, timing)) {
      this.opponentMissLockedFlightId = this.flightId;
      body.swingT = 0.28;
      body.swingShot = shot;
      body.lastTiming = "missed";
      return;
    }

    this.launchRallyShot(team, queued, shot, timing);
    body.swingT = shot === "smash" ? 0.62 : 0.36;
    body.swingShot = shot;
    body.lastTiming = timing;
    this.events.push({
      type: "contact",
      team,
      shot,
      timing,
      label: timing.toUpperCase(),
    });

    if (team !== 0) return;

    this.stats.shots.add(shot);
    if (this.config.mode === "endlessRally") {
      this.practiceScore += 1;
      this.events.push({
        type: "practiceScore",
        team: 0,
        value: this.practiceScore,
        label: `${this.practiceScore} RETURNS`,
      });
    }
    if (queued.aimX < -0.25) this.trainingAimLeft = true;
    if (queued.aimX > 0.25) this.trainingAimRight = true;
    if (timing === "perfect") {
      this.stats.perfectContacts += 1;
      this.player.focus = Math.min(100, this.player.focus + 12);
      this.events.push({ type: "perfectContact", team: 0, label: "PERFECT" });
    }
    this.updateTrainingOnContact(shot, timing);
  }

  /**
   * Whether the AI flubs this return.
   *
   * The AI's body obeys the same movement, stamina and reach rules the player's
   * does — difficulty never bends those. It is expressed here instead, as how
   * often a ball it *could* reach is simply missed.
   */
  private opponentMissesReturn(
    body: TennisBody,
    distance: number,
    timing: TennisTimingGrade,
  ): boolean {
    const rating = body.spec.ratings;
    const returnRating =
      (rating.control * 0.42 +
        rating.reach * 0.23 +
        rating.speed * 0.2 +
        rating.stamina * 0.15) /
      100;
    const base = 0.24 - returnRating * 0.17;
    const stretch = clamp((distance - 0.42) / 0.92, 0, 1) * 0.17;
    const tired = (1 - body.stamina01) * 0.16;
    const timingPenalty =
      timing === "perfect"
        ? -0.025
        : timing === "good"
          ? 0
          : timing === "missed"
            ? 0.22
            : 0.12;
    const shotPressure =
      this.ball.shot === "serve"
        ? 0.06
        : this.ball.shot === "power" || this.ball.shot === "smash"
          ? 0.05
          : this.ball.shot === "dropShot" || this.ball.shot === "slice"
            ? 0.035
            : this.ball.shot === "topspin" || this.ball.shot === "lob"
              ? 0.025
              : this.ball.shot === "volley"
                ? 0.04
                : 0;
    const difficultyScale =
      this.config.difficulty === "rookie"
        ? 1.25
        : this.config.difficulty === "pro"
          ? 1
          : 0.78;

    const chance =
      (base + stretch + tired + timingPenalty + shotPressure) * difficultyScale;
    return this.random.nextDouble() < clamp(chance, 0.015, 0.42);
  }

  /**
   * Which shot the gesture became.
   *
   * Position decides first — a high ball at the net is a smash whatever the
   * player swiped — then the swipe's vertical component, then the hold.
   */
  private resolveShot(
    team: number,
    queued: QueuedShot,
    timing: TennisTimingGrade,
  ): TennisShotType {
    const body = this.bodyFor(team);
    const nearNet = Math.abs(body.y) < 4.4;
    const highBall = this.ball.z > 2.05;
    const stretched = Math.hypot(this.ball.x - body.x, this.ball.y - body.y) > 0.95;

    if (highBall && nearNet) return "smash";
    if (nearNet && this.ball.bounces === 0) return "volley";
    if (stretched || timing === "late") return "defensive";
    if (queued.aimY < -0.55) return "dropShot";
    if (queued.aimY < -0.16) return "slice";
    if (queued.aimY > 0.55) return "lob";
    if (queued.aimY > 0.16) return "topspin";
    if (queued.holdSeconds >= 0.28) return "power";
    return "normal";
  }

  private launchRallyShot(
    team: number,
    queued: QueuedShot,
    shot: TennisShotType,
    timing: TennisTimingGrade,
  ): void {
    const body = this.bodyFor(team);
    const rating = body.spec.ratings;
    const side = team === 0 ? -1 : 1;
    let targetY = side * 8.8;
    let duration = 0.92;
    let staminaCost = 1.1;

    switch (shot) {
      case "power":
        duration = 0.68 - rating.power / 2500;
        staminaCost = 6.5;
        break;
      case "topspin":
        duration = 0.92;
        staminaCost = 2.2;
        break;
      case "slice":
        duration = 1.08;
        staminaCost = 1.8;
        break;
      case "lob":
        duration = 1.36;
        staminaCost = 3.2;
        break;
      case "volley":
        duration = 0.63;
        targetY = side * 7.2;
        staminaCost = 2.4;
        break;
      case "smash":
        duration = 0.54;
        staminaCost = 9;
        break;
      case "dropShot":
        duration = 0.92;
        targetY = side * 2.8;
        staminaCost = 3.5;
        break;
      case "defensive":
        duration = 1.28;
        targetY = side * 8.1;
        staminaCost = 1.2;
        break;
      default:
        duration = 0.92;
        staminaCost = 1.1;
        break;
    }

    let targetX = clamp(queued.aimX, -1, 1) * courtHalfWidth * 0.88;
    // Spin steadies the shaped shots; power steadies everything else.
    const control =
      (rating.control +
        (shot === "topspin" || shot === "slice" ? rating.spin : rating.power)) /
      200;
    const timingError =
      timing === "perfect"
        ? 0.1
        : timing === "good"
          ? 0.35
          : timing === "missed"
            ? 2
            : 0.95;
    const tiredError = (1 - body.stamina01) * 0.8;
    const difficultyError = shot === "power" || shot === "dropShot" ? 0.25 : 0;
    const spread = Math.max(
      0.04,
      timingError + tiredError + difficultyError - control * 0.38,
    );

    targetX += signed(this.random) * spread;
    targetY += signed(this.random) * spread * 0.9;

    body.stamina = Math.max(0, body.stamina - staminaCost);
    if (team === 0) this.stats.staminaSpent += staminaCost;

    this.ball.x = body.x;
    this.ball.y = body.y;
    this.ball.z = Math.max(0.55, this.ball.z);
    this.ball.bounces = 0;
    this.ball.lastHitter = team;
    this.ball.live = true;
    this.ball.serve = false;
    this.ball.netTouched = false;
    this.ball.shot = shot;
    this.setFlight(targetX, targetY, duration);

    this.rallyCount += 1;
    this.stats.longestRally = Math.max(this.stats.longestRally, this.rallyCount);
    if (this.rallyCount === 5 || this.rallyCount === 10 || this.rallyCount === 20) {
      if (team === 0) this.player.focus = Math.min(100, this.player.focus + 5);
      this.events.push({
        type: "rallyMilestone",
        team,
        value: this.rallyCount,
        label: `${this.rallyCount} SHOTS`,
      });
    }
  }

  /**
   * Aim the ball at a point on the court and give it exactly the loft needed to
   * land there in `duration` seconds. Solving the ballistics, rather than
   * picking a launch angle, is what makes every shot land where it was aimed.
   */
  private setFlight(targetX: number, targetY: number, duration: number): void {
    this.flightId += 1;
    const speedScale =
      this.config.mode === "endlessRally"
        ? 1 + 0.02 * Math.floor(this.practiceScore / 5)
        : 1;
    const t = Math.max(0.42, duration / speedScale);
    this.ball.vx = (targetX - this.ball.x) / t;
    this.ball.vy = (targetY - this.ball.y) / t;
    this.ball.vz = (0 - this.ball.z - 0.5 * gravity * t * t) / t;
  }

  /* ---- Ball -------------------------------------------------------------- */

  private updateBall(dt: number): void {
    if (!this.ball.live) return;
    const previousY = this.ball.y;

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;
    this.ball.z += this.ball.vz * dt;
    this.ball.vz += gravity * dt;

    const crossedNet =
      (previousY < 0 && this.ball.y >= 0) || (previousY > 0 && this.ball.y <= 0);
    if (crossedNet && !this.ball.netTouched && this.ball.z < netHeight) {
      this.ball.netTouched = true;
      this.flightId += 1;
      this.events.push({ type: "net", team: this.ball.lastHitter, label: "NET" });
      // Clipping the top of the cord sometimes trickles over; anything lower
      // drops dead at the net.
      if (this.ball.z >= netHeight * 0.72 && this.random.nextDouble() < 0.45) {
        this.ball.z = netHeight + 0.04;
        this.ball.vy *= 0.58;
        this.ball.vz = Math.max(0.25, Math.abs(this.ball.vz) * 0.25);
      } else {
        this.ball.vx *= 0.2;
        this.ball.vy *= -0.08;
        this.ball.vz = 0;
      }
    }

    if (this.ball.z <= 0 && this.ball.vz < 0) {
      this.ball.z = 0;
      this.ball.bounces += 1;
      this.ball.vz = -this.ball.vz * bounceFactor(this.ball.shot);
      this.ball.vx *= 0.88;
      this.ball.vy *= 0.88;
      this.events.push({
        type: "bounce",
        team: this.ball.lastHitter,
        value: this.ball.bounces,
      });

      if (this.ball.bounces === 1) {
        if (this.ball.serve) {
          this.resolveServeBounce();
          if (!this.ball.live) return;
        } else if (!ballInsideSingles(this.ball.x, this.ball.y)) {
          this.events.push({ type: "out", team: this.ball.lastHitter, label: "OUT" });
          this.awardPoint(1 - this.ball.lastHitter, "OUT");
          return;
        } else if (!onReceiverSide(this.ball.lastHitter, this.ball.y)) {
          // In the court, but on the striker's own side — a netted shot that
          // dropped back, or one that never crossed.
          this.awardPoint(
            1 - this.ball.lastHitter,
            this.ball.netTouched ? "NET" : "OUT",
          );
          return;
        } else if (
          this.config.mode === "targetPractice" &&
          this.ball.lastHitter === 0 &&
          this.ball.y < 0
        ) {
          this.scoreTarget();
          return;
        }
      }

      if (this.ball.bounces >= 2) {
        if (this.ball.serve && this.ball.lastHitter === this.score.currentServer) {
          if (this.ball.lastHitter === 0) this.stats.aces += 1;
          this.events.push({ type: "ace", team: this.ball.lastHitter, label: "ACE" });
        }
        this.awardPoint(this.ball.lastHitter, "WINNER");
      }
    }

    if (
      Math.abs(this.ball.y) > courtHalfLength + 5 ||
      Math.abs(this.ball.x) > courtHalfWidth + 6
    ) {
      this.awardPoint(1 - this.ball.lastHitter, "OUT");
    }
  }

  private resolveServeBounce(): void {
    const server = this.ball.lastHitter;
    const inside = serveInsideBox(
      this.ball.x,
      this.ball.y,
      server,
      isRightServiceCourt(this.score),
    );

    if (this.ball.netTouched && inside) {
      this.ball.live = false;
      this.events.push({ type: "let", team: server, label: "LET" });
      this.phase = "pointComplete";
      this.pointResetT = 0.45;
      this.serveContinuation = true;
      return;
    }
    if (!inside) {
      this.ball.live = false;
      this.handleFault(server);
      return;
    }
    if (server === 0 && this.serveNumber === 1) this.stats.firstServesIn += 1;

    if (
      server === 0 &&
      this.config.mode === "training" &&
      this.config.trainingLesson === 6
    ) {
      this.updateTrainingOnContact("serve", "good");
      if (this.lessonProgress === 1 && this.phase !== "practiceComplete") {
        this.ball.live = false;
        this.serveNumber = 2;
        this.serveContinuation = true;
        this.phase = "pointComplete";
        this.pointResetT = 0.5;
      }
    }
  }

  private handleFault(server: number): void {
    this.events.push({ type: "fault", team: server, label: "FAULT" });
    if (this.serveNumber === 1) {
      this.serveNumber = 2;
      this.serveContinuation = true;
      this.phase = "pointComplete";
      this.pointResetT = 0.42;
      return;
    }
    if (server === 0) this.stats.doubleFaults += 1;
    this.events.push({ type: "doubleFault", team: server, label: "DOUBLE FAULT" });
    this.awardPoint(1 - server, "DOUBLE FAULT");
  }

  /* ---- Points ------------------------------------------------------------ */

  private awardPoint(winner: number, label: string): void {
    if (this.phase === "pointComplete" || this.complete) return;
    this.ball.live = false;

    if (winner === 0 && this.rallyCount >= 20) this.stats.wonTwentyShotRally = true;
    if (winner === 0) {
      this.stats.totalPointsWon += 1;
    } else {
      this.stats.totalPointsLost += 1;
      if (this.score.currentServer === 0) this.stats.pointsLostCurrentServiceGame += 1;
    }

    if (winner === this.ball.lastHitter && label === "WINNER") {
      if (winner === 0) {
        this.stats.winners += 1;
        this.player.focus = Math.min(100, this.player.focus + 8);
        if (Math.abs(this.player.y) < 4.4) this.stats.netPointsWon += 1;
      }
      this.events.push({ type: "winner", team: winner, label: "WINNER" });
    } else if (winner !== this.ball.lastHitter && this.ball.lastHitter === 0) {
      this.stats.unforcedErrors += 1;
    }

    if (this.config.mode === "endlessRally") {
      if (winner === 1) {
        this.finishPractice();
      } else {
        this.phase = "pointComplete";
        this.pointResetT = 0.55;
      }
      return;
    }
    if (this.config.mode === "training" && this.config.trainingLesson !== 8) {
      this.phase = "pointComplete";
      this.pointResetT = 0.55;
      return;
    }
    if (this.config.mode === "targetPractice") {
      this.nextTargetBall();
      return;
    }

    // Asked before the point is applied — afterwards the set point is gone.
    const savedTieBreakSetPoint =
      this.score.tieBreak && winner === 0 && this.scoring.isSetPointFor(1);
    if (savedTieBreakSetPoint) this.playerSavedTieBreakSetPoint = true;

    const result = this.scoring.awardPoint(winner);
    this.serveNumber = 1;

    const deficit = this.score.opponentGames - this.score.playerGames;
    this.stats.maxDeficit = Math.max(this.stats.maxDeficit, deficit);
    if (result.breakPointConverted && winner === 0) this.stats.breakPointsWon += 1;
    if (result.breakPointSaved && winner === 0) {
      this.stats.breakPointsSaved += 1;
      this.stats.breakPointsSavedCurrentGame += 1;
      this.stats.maxBreakPointsSavedInGame = Math.max(
        this.stats.maxBreakPointsSavedInGame,
        this.stats.breakPointsSavedCurrentGame,
      );
    }

    if (result.gameWon) {
      // The server has already flipped by now, so `currentServer === 1` means
      // the game just finished was the player's to hold.
      if (
        winner === 0 &&
        this.score.currentServer === 1 &&
        this.stats.pointsLostCurrentServiceGame === 0
      ) {
        this.stats.cleanHolds += 1;
      }
      this.stats.pointsLostCurrentServiceGame = 0;
      this.stats.breakPointsSavedCurrentGame = 0;
      this.events.push({
        type: "gameEnded",
        team: winner,
        label: winner === 0 ? "GAME PLAYER" : "GAME OPPONENT",
      });
    }
    if (result.tieBreakStarted) {
      this.events.push({ type: "tieBreakStarted", label: "TIEBREAK" });
    }
    if (result.endChange) {
      this.endSwapped = !this.endSwapped;
      this.events.push({ type: "endChange", label: "CHANGE ENDS" });
    }
    this.events.push({ type: "pointEnded", team: winner, label });

    if (result.setWon) {
      this.stats.comeback = winner === 0 && this.stats.maxDeficit >= 3;
      this.stats.tiebreakNerve = winner === 0 && this.playerSavedTieBreakSetPoint;
      this.phase = "setComplete";
      if (this.focusPointActive) this.focusPointActive = false;
      this.events.push({
        type: "setEnded",
        team: winner,
        label: winner === 0 ? "VICTORY" : "DEFEAT",
      });
      return;
    }
    if (
      this.config.mode === "training" &&
      this.config.trainingLesson === 8 &&
      result.gameWon
    ) {
      this.lessonProgress += 1;
      this.events.push({
        type: "lessonComplete",
        team: 0,
        value: 8,
        label: "SCORING COMPLETE",
      });
      this.finishPractice();
      return;
    }
    this.phase = "pointComplete";
    this.pointResetT = result.gameWon ? 1 : 0.78;
  }

  /**
   * Set up the next point.
   *
   * A fault or a let *continues* the same point rather than beginning a new one,
   * which is why focus is only banked when the point is genuinely new — else a
   * double fault would spend the player's focus twice.
   */
  private startPoint(initial: boolean): void {
    if (this.complete) return;
    const continuingPoint = !initial && this.serveContinuation;
    this.serveContinuation = false;

    this.rallyCount = 0;
    this.ball.live = false;
    this.playerShot = null;
    this.opponentShot = null;
    this.opponentMissLockedFlightId = -1;
    this.serveMeter = 0;
    if (initial) this.serveNumber = 1;
    this.resetBodies();

    if (!continuingPoint) {
      if (this.player.focus >= 100) {
        this.focusPointActive = true;
        this.player.focus = 0;
      } else {
        this.focusPointActive = false;
      }
    }

    if (
      this.config.mode === "endlessRally" ||
      this.config.mode === "targetPractice" ||
      (this.config.mode === "training" && this.config.trainingLesson !== 6)
    ) {
      this.startFeed();
    } else {
      this.phase = "preServe";
    }
  }

  private resetBodies(): void {
    const right = isRightServiceCourt(this.score);
    this.player.x = right ? -1.25 : 1.25;
    this.player.y = 9.1;
    this.opponent.x = right ? 1.25 : -1.25;
    this.opponent.y = -9.1;
  }

  /** Practice modes feed a ball instead of serving one. Unreachable when live. */
  private startFeed(): void {
    this.opponent.x = signed(this.random) * 1.3;
    this.opponent.y =
      this.config.mode === "training" && this.config.trainingLesson === 5 ? -3.2 : -8.6;

    this.ball.x = this.opponent.x;
    this.ball.y = this.opponent.y;
    this.ball.z = 1.1;
    this.ball.bounces = 0;
    this.ball.lastHitter = 1;
    this.ball.live = true;
    this.ball.serve = false;
    this.ball.netTouched = false;
    this.ball.shot = "normal";

    this.setFlight(signed(this.random) * 2.5, 7.8, 1);
    this.phase = "rally";
  }

  private scoreTarget(): void {
    const distance = Math.hypot(this.ball.x - this.targetX, this.ball.y - this.targetY);
    const shrink = Math.max(0.62, 1 - this.targetIndex * 0.018);
    const points =
      distance <= 0.65 * shrink
        ? 500
        : distance <= 1.25 * shrink
          ? 250
          : distance <= 2.1 * shrink
            ? 100
            : 25;
    this.practiceScore += points;
    this.events.push({
      type: "practiceScore",
      team: 0,
      value: points,
      label: `+${points}`,
    });
    this.nextTargetBall();
  }

  private nextTargetBall(): void {
    this.ballsRemaining -= 1;
    if (this.ballsRemaining <= 0) {
      this.finishPractice();
      return;
    }
    this.targetIndex += 1;
    this.targetX =
      (this.targetIndex % 2 === 0 ? -1 : 1) * (1.1 + (this.targetIndex % 3) * 0.75);
    this.targetY = -5.2 - (this.targetIndex % 4) * 1.25;
    this.phase = "pointComplete";
    this.pointResetT = 0.55;
  }

  private updateTrainingOnContact(
    shot: TennisShotType,
    timing: TennisTimingGrade,
  ): void {
    if (this.config.mode !== "training" || this.config.trainingLesson === null) return;
    const lesson = this.config.trainingLesson;

    switch (lesson) {
      case 1:
        if (shot === "normal") this.lessonProgress += 1;
        break;
      case 2:
        if (timing === "perfect") this.lessonProgress = 1;
        break;
      case 3:
        this.lessonProgress =
          (this.trainingAimLeft ? 1 : 0) + (this.trainingAimRight ? 1 : 0);
        break;
      case 4:
        if (shot === "power") this.lessonProgress = 1;
        break;
      case 5:
        if (shot === "lob") this.lessonProgress = 1;
        break;
      case 6:
        if (shot === "serve") this.lessonProgress += 1;
        break;
      case 7:
        if (this.trainingSprintUsed) this.lessonProgress += 1;
        break;
      default:
        break;
    }

    const target =
      lesson === 1
        ? 3
        : lesson === 3 || lesson === 6 || lesson === 7
          ? 2
          : lesson === 8
            ? 999
            : 1;
    if (this.lessonProgress >= target) {
      this.events.push({
        type: "lessonComplete",
        team: 0,
        value: lesson,
        label: "LESSON COMPLETE",
      });
      this.finishPractice();
    }
  }

  private finishPractice(): void {
    this.ball.live = false;
    this.phase = "practiceComplete";
    this.events.push({
      type: "setEnded",
      team: 0,
      value: this.practiceScore,
      label: this.config.mode === "training" ? "LESSON COMPLETE" : "SESSION COMPLETE",
    });
  }

  /* ---- Results and persistence ------------------------------------------- */

  summary(tournamentChampion = false): TennisMatchSummary {
    const isSet = this.config.mode === "quickMatch" || this.config.mode === "tournament";
    return {
      matchId: this.config.matchId,
      mode: this.config.mode,
      playerId: this.config.playerId,
      opponentId: this.config.opponentId,
      difficulty: this.config.difficulty,
      playerGames: this.score.playerGames,
      opponentGames: this.score.opponentGames,
      won: isSet ? this.score.setWinner === 0 : true,
      stats: this.stats.freeze(Math.round(this.elapsed)),
      practiceScore:
        this.config.mode === "endlessRally"
          ? this.practiceScore * 100
          : this.practiceScore,
      tournamentChampion,
      trainingLesson: this.config.trainingLesson,
    };
  }

  toSnapshot(): EngineSnapshot {
    return {
      rng: this.random.state,
      score: this.score,
      player: this.player.toSnapshot(),
      opponent: this.opponent.toSnapshot(),
      ball: this.ball.toSnapshot(),
      phase: this.phase,
      serveNumber: this.serveNumber,
      serveMeter: this.serveMeter,
      serveMeterRising: this.serveMeterRising,
      rallyCount: this.rallyCount,
      practiceScore: this.practiceScore,
      ballsRemaining: this.ballsRemaining,
      lessonProgress: this.lessonProgress,
      targetIndex: this.targetIndex,
      flightId: this.flightId,
      targetX: this.targetX,
      targetY: this.targetY,
      elapsed: this.elapsed,
      pointResetT: this.pointResetT,
      focusPointActive: this.focusPointActive,
      endSwapped: this.endSwapped,
      serveContinuation: this.serveContinuation,
      playerSavedTieBreakSetPoint: this.playerSavedTieBreakSetPoint,
      opponentMissLockedFlightId: this.opponentMissLockedFlightId,
      stats: this.stats.toSnapshot(),
    };
  }

  private restore(snapshot: EngineSnapshot): void {
    this.random.state = snapshot.rng & 0x7fffffff;
    this.scoring = TennisScoring.fromState(snapshot.score);
    this.player.restore(snapshot.player);
    this.opponent.restore(snapshot.opponent);
    this.ball.restore(snapshot.ball);
    this.phase = snapshot.phase;
    this.serveNumber = snapshot.serveNumber;
    this.serveMeter = snapshot.serveMeter;
    this.serveMeterRising = snapshot.serveMeterRising;
    this.rallyCount = snapshot.rallyCount;
    this.practiceScore = snapshot.practiceScore;
    this.ballsRemaining = snapshot.ballsRemaining;
    this.lessonProgress = snapshot.lessonProgress;
    this.targetIndex = snapshot.targetIndex;
    this.flightId = snapshot.flightId;
    this.targetX = snapshot.targetX;
    this.targetY = snapshot.targetY;
    this.elapsed = snapshot.elapsed;
    this.pointResetT = snapshot.pointResetT;
    this.focusPointActive = snapshot.focusPointActive;
    this.endSwapped = snapshot.endSwapped;
    this.serveContinuation = snapshot.serveContinuation;
    this.playerSavedTieBreakSetPoint = snapshot.playerSavedTieBreakSetPoint;
    this.opponentMissLockedFlightId = snapshot.opponentMissLockedFlightId;
    this.stats.restore(snapshot.stats);
  }
}

/** How much of its vertical speed each shot keeps off the bounce. */
function bounceFactor(shot: TennisShotType): number {
  if (shot === "slice" || shot === "dropShot") return 0.48;
  if (shot === "topspin") return 0.72;
  if (shot === "lob" || shot === "defensive") return 0.76;
  return 0.62;
}

/** Whether the ball landed on the side it was hit into. */
function onReceiverSide(hitter: number, y: number): boolean {
  return hitter === 0 ? y <= 0 : y >= 0;
}

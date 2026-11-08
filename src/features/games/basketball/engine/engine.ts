/**
 * The Hoop Duel engine — the pure 1v1 half-court simulation, ported from
 * `games/basketball/basketball_engine.dart`.
 *
 * Deterministic given a seed plus two intent streams. Players move on a 1D
 * court axis; the ball is 2D (x, height). The renderer only *reads* this state
 * and turns pointers into `BasketballIntent`s; the AI produces the very same
 * intents. Every rule gate — the dunk rating, the lockouts, the block sync
 * window — lives HERE, so the CPU cannot cheat structurally: it is playing the
 * same game through the same door.
 *
 * No canvas, no React, no storage. Step it and read it.
 */

import {
  type BasketballActionCue,
  type BasketballAthlete,
  type BasketballBoxScore,
  type BasketballEvent,
  type BasketballIntent,
  type BasketballMatchConfig,
  type BasketballMatchSummary,
  type BallPhase,
  type BodyState,
  type JumpPurpose,
  type PlayPhase,
  type ReboundPrediction,
  type ReleaseGrade,
  type ShotMeterView,
  type ShotZone,
  clamp,
  lerp,
  makeEvent,
  ratingFor,
  sign,
} from "../types";
import * as T from "../tuning";

import { BasketballRandom } from "./random";

/* ---- Bodies --------------------------------------------------------------- */

/** One athlete's live simulation state. */
export class AthleteBody {
  spec: BasketballAthlete;
  readonly team: number;

  x = 0;
  facing = 1;
  body: BodyState = "idle";
  stateT = 0;

  jumpPurpose: JumpPurpose | null = null;
  jumpT = 0;
  jumpDur = 0;

  stamina = 100;
  recoverT = 0;
  driveT = 0;
  fakeT = 0;

  /** Ball-exposed window (crossover / drive start) — boosts steals. */
  exposedT = 0;

  /** Put-back quick-shot window after an offensive board. */
  putbackT = 0;

  /** The defender jumped at a pump fake; staggers on landing. */
  baited = false;

  /**
   * A defender was in the lane when the spin started — the spin had someone to
   * beat, which gates the SPIN CYCLE payoff.
   */
  spinTargeted = false;

  /** The steal lunge has rolled already; one roll per lunge. */
  lungeRolled = false;

  lastMoveDir = 0;
  sinceDirChange = 99;

  constructor(spec: BasketballAthlete, team: number) {
    this.spec = spec;
    this.team = team;
  }

  get airborne(): boolean {
    return this.body === "jump";
  }

  get locked(): boolean {
    return (
      this.body === "gather" ||
      this.body === "jump" ||
      this.body === "stagger" ||
      this.body === "stepback" ||
      this.body === "spin" ||
      this.recoverT > 0
    );
  }

  get stamina01(): number {
    return this.stamina / 100;
  }

  /** 0..1 vertical jump progress mapped to a sine arc. */
  get jumpHeight(): number {
    if (this.body !== "jump" || this.jumpDur <= 0) return 0;
    const tiredJump =
      T.tiredJumpFloor + (1 - T.tiredJumpFloor) * this.stamina01;
    return (
      Math.sin(Math.PI * clamp(this.jumpT / this.jumpDur, 0, 1)) *
      T.maxJumpHeight *
      tiredJump
    );
  }

  /** Distance to the rim. */
  get d(): number {
    return T.rimX - this.x;
  }

  get reach(): number {
    return this.spec.heightM * 1.31 + this.jumpHeight + (this.spec.heightM - 1.95) * 0.2;
  }

  enter(next: BodyState): void {
    this.body = next;
    this.stateT = 0;
  }

  startJump(purpose: JumpPurpose, duration: number): void {
    this.jumpPurpose = purpose;
    this.jumpT = 0;
    this.jumpDur = duration;
    this.enter("jump");
  }

  drain(amount: number): void {
    this.stamina = clamp(this.stamina - amount, 0, 100);
  }
}

/** A side: its three athletes, whose legs are fresh, its score and its heat. */
export class TeamSim {
  readonly roster: BasketballAthlete[];
  activeIndex: number;
  readonly staminas: number[];

  score = 0;
  unanswered = 0;
  heatMeter = 0;
  heatActive = false;
  heatT = 0;

  constructor(roster: BasketballAthlete[], starterIndex: number) {
    this.roster = roster;
    this.activeIndex = starterIndex;
    this.staminas = roster.map(() => 100);
  }
}

export type ShotFlight = {
  make: boolean;
  points: number;
  zone: ShotZone;
  grade: ReleaseGrade;
  shooterTeam: number;
  duration: number;
  startX: number;
  startH: number;
  releasedBeforeBuzzer: boolean;
  dunk: boolean;
  t: number;
};

export type Ball = {
  phase: BallPhase;
  /** Team index holding the ball, or -1 while loose or in flight. */
  holder: number;
  x: number;
  h: number;
  vx: number;
  vh: number;
  flight: ShotFlight | null;
  prediction: ReboundPrediction | null;
};

/* ---- The engine ----------------------------------------------------------- */

export class BasketballEngine {
  readonly config: BasketballMatchConfig;
  readonly teams: [TeamSim, TeamSim];
  readonly bodies: [AthleteBody, AthleteBody];
  readonly ball: Ball = {
    phase: "dead",
    holder: -1,
    x: T.checkSpotX,
    h: 1.1,
    vx: 0,
    vh: 0,
    flight: null,
    prediction: null,
  };

  playPhase: PlayPhase = "awaiting";
  halfIndex = 0;
  halfClock = T.halfSeconds;
  shotClock = T.shotClockSeconds;
  possession = 0;
  resetT = 0;
  overtime = false;

  private readonly random: BasketballRandom;
  private readonly firstPossession: number;
  private buzzerPending = false;
  private matchIsOver = false;
  private looseSeconds = 0;
  private endedOnBuzzer = false;

  /* Player-team box score accumulation. */
  private attempts = 0;
  private makes = 0;
  private threes = 0;
  private perfects = 0;
  private dunks = 0;
  private blocks = 0;
  private steals = 0;
  private rebounds = 0;
  private turnovers = 0;
  private bestRun = 0;

  /** Repeat-shot penalty stacks per team, keyed by the last zone scored from. */
  private readonly lastMakeZone: (ShotZone | null)[] = [null, null];
  private readonly repeatStacks: number[] = [0, 0];

  private events: BasketballEvent[] = [];

  constructor(config: BasketballMatchConfig) {
    this.config = config;
    this.random = new BasketballRandom(config.seed);
    this.teams = [
      new TeamSim(config.playerRoster, config.playerStarterIndex),
      new TeamSim(config.cpuRoster, config.cpuStarterIndex),
    ];
    this.bodies = [
      new AthleteBody(config.playerRoster[config.playerStarterIndex], 0),
      new AthleteBody(config.cpuRoster[config.cpuStarterIndex], 1),
    ];
    this.firstPossession = this.random.nextBool() ? 0 : 1;
  }

  get matchOver(): boolean {
    return this.matchIsOver;
  }

  get playerBody(): AthleteBody {
    return this.bodies[0];
  }

  get cpuBody(): AthleteBody {
    return this.bodies[1];
  }

  /** Current presentation cue for the human-controlled athlete. */
  get playerActionCue(): BasketballActionCue {
    return this.actionCueFor(0);
  }

  /**
   * Explains the contextual ACTION input for `team` without mutating anything.
   *
   * The ordering mirrors the live resolution tables below: a rebound
   * opportunity supersedes offense and defense, an active shot asks for a
   * release, and a valid shooter threat asks a defender to time a block.
   */
  actionCueFor(team: number): BasketballActionCue {
    const body = this.bodies[team];
    const opponent = this.bodies[1 - team];
    const flight = this.ball.flight;

    // The cue promises a visible landing marker, so it starts only once a
    // loose-ball prediction exists — not while a shot is still hidden in flight.
    const reboundAvailable =
      this.ball.phase === "loose" && this.ball.prediction !== null;
    if (reboundAvailable && !body.locked && !body.airborne) return "rebound";

    const onOffense = this.possession === team;
    const holdingBall = this.ball.phase === "held" && this.ball.holder === team;
    if (onOffense && holdingBall) {
      const shotRunning =
        body.body === "gather" || (body.airborne && body.jumpPurpose === "shot");
      if (shotRunning) return "release";

      const moving = body.body === "run" || body.body === "drive";
      const finishAvailable =
        !body.airborne && body.d <= T.layupRange && (moving || body.putbackT > 0);
      if (finishAvailable) return "finish";

      return "shoot";
    }

    const shooterThreat =
      opponent.body === "gather" ||
      opponent.body === "fake" ||
      (opponent.airborne &&
        (opponent.jumpPurpose === "shot" ||
          opponent.jumpPurpose === "layup" ||
          opponent.jumpPurpose === "dunk" ||
          opponent.jumpPurpose === "putback")) ||
      (this.ball.phase === "shot" &&
        flight !== null &&
        flight.shooterTeam !== team &&
        flight.t <= T.blockSyncWindow);
    if (
      shooterThreat &&
      !body.locked &&
      !body.airborne &&
      body.stamina >= T.drainBlockJump
    ) {
      return "block";
    }

    return "defend";
  }

  /* ---- Match flow API ---------------------------------------------------- */

  startHalf(index: number): void {
    this.halfIndex = index;
    this.overtime = index >= 2;
    this.halfClock = this.overtime ? 0 : T.halfSeconds;
    this.possession =
      index === 0
        ? this.firstPossession
        : index === 1
          ? 1 - this.firstPossession
          : this.random.nextBool()
            ? 0
            : 1;
    this.buzzerPending = false;
    this.placeForPossession();
    this.shotClock = T.shotClockSeconds;
    this.playPhase = "live";
  }

  substitute(team: number, rosterIndex: number): void {
    const sim = this.teams[team];
    if (
      rosterIndex < 0 ||
      rosterIndex >= sim.roster.length ||
      rosterIndex === sim.activeIndex
    ) {
      return;
    }
    // Store the outgoing athlete's stamina, bring the sub in on their own legs.
    sim.staminas[sim.activeIndex] = this.bodies[team].stamina;
    sim.activeIndex = rosterIndex;
    const body = new AthleteBody(sim.roster[rosterIndex], team);
    body.stamina = sim.staminas[rosterIndex];
    body.x = this.bodies[team].x;
    this.bodies[team] = body;
  }

  /** Bench regeneration plus an active top-up, at halftime. */
  halftimeRest(): void {
    for (let t = 0; t < 2; t += 1) {
      const sim = this.teams[t];
      for (let i = 0; i < sim.staminas.length; i += 1) sim.staminas[i] = 100;
      this.bodies[t].stamina = clamp(
        this.bodies[t].stamina + T.halftimeActiveRegen,
        0,
        100,
      );
    }
  }

  summary(abandoned = false): BasketballMatchSummary {
    const box: BasketballBoxScore = {
      attempts: this.attempts,
      makes: this.makes,
      threesMade: this.threes,
      perfectReleases: this.perfects,
      dunks: this.dunks,
      blocks: this.blocks,
      steals: this.steals,
      rebounds: this.rebounds,
      turnovers: this.turnovers,
      bestRun: this.bestRun,
    };
    return {
      playerScore: this.teams[0].score,
      cpuScore: this.teams[1].score,
      overtime: this.overtime,
      difficulty: this.config.difficulty,
      buzzerBeater: this.endedOnBuzzer,
      abandoned,
      box,
    };
  }

  meterView(team: number): ShotMeterView | null {
    const body = this.bodies[team];
    if (body.body === "gather" && body.jumpPurpose === "shot") {
      return {
        progress: 0,
        perfectCenter: this.apexFrac(body),
        perfectHalf: this.perfectHalfWindow(body) / T.jumpShotDuration,
        goodHalf: T.goodHalfWindow / T.jumpShotDuration,
      };
    }
    if (
      body.body === "jump" &&
      body.jumpPurpose === "shot" &&
      this.ball.holder === team
    ) {
      return {
        progress: clamp(body.jumpT / body.jumpDur, 0, 1),
        perfectCenter: this.apexFrac(body),
        perfectHalf: this.perfectHalfWindow(body) / body.jumpDur,
        goodHalf: T.goodHalfWindow / body.jumpDur,
      };
    }
    return null;
  }

  private apexFrac(body: AthleteBody): number {
    return body.spec.trait === "quickRelease"
      ? T.shotApexQuickRelease
      : T.shotApexFrac;
  }

  /** The perfect half-window in seconds for this body, right now. */
  perfectHalfWindow(body: AthleteBody): number {
    const rating = ratingFor(body.spec, this.zoneFor(body.d));
    const contest = this.contestOn(body);
    let half =
      T.perfectHalfWindowBase *
      (0.7 + 0.5 * clamp((rating - 50) / 50, 0, 1)) *
      lerp(T.tiredWindowFloor, 1.0, clamp(body.stamina01 / 0.6, 0, 1)) *
      (1 - 0.25 * contest);
    if (this.teams[body.team].heatActive) half *= T.heatWindowMult;
    if (body.spec.trait === "quickRelease") half *= 1.15;
    return half;
  }

  /* ---- step -------------------------------------------------------------- */

  step(player: BasketballIntent, cpu: BasketballIntent, dt: number): BasketballEvent[] {
    this.events = [];
    if (this.playPhase === "awaiting" || this.playPhase === "finished") {
      return this.events;
    }

    this.advanceTimers(dt);

    if (this.playPhase === "deadReset") {
      this.stepDeadReset(dt);
      return this.events;
    }

    const intents = [player, cpu];
    for (let t = 0; t < 2; t += 1) {
      const onOffense = this.ball.holder === t;
      if (onOffense) {
        this.resolveOffense(this.bodies[t], intents[t]);
      } else {
        this.resolveDefense(this.bodies[t], intents[t]);
      }
      this.integrateMovement(this.bodies[t], intents[t], dt);
    }
    this.separateBodies();
    this.stepBall(dt);
    this.stepClocks(dt);
    return this.events;
  }

  /* ---- Timers & states --------------------------------------------------- */

  private advanceTimers(dt: number): void {
    for (const body of this.bodies) {
      body.stateT += dt;
      body.sinceDirChange += dt;
      if (body.recoverT > 0) body.recoverT = Math.max(0, body.recoverT - dt);
      if (body.exposedT > 0) body.exposedT = Math.max(0, body.exposedT - dt);
      if (body.putbackT > 0) body.putbackT = Math.max(0, body.putbackT - dt);

      switch (body.body) {
        case "fake":
          if (body.stateT >= T.fakeSeconds) body.enter("idle");
          break;
        case "crossover":
          if (body.stateT >= T.crossoverDuration) body.enter("run");
          break;
        case "stepback":
          // A step-back flows straight into a gather — that is the space it made.
          if (body.stateT >= T.stepbackDuration) this.beginGather(body);
          break;
        case "stagger":
          if (body.stateT >= T.staggerSeconds) body.enter("idle");
          break;
        case "celebrate":
        case "dejected":
          if (body.stateT >= T.reactSeconds) body.enter("idle");
          break;
        case "spin":
          if (body.stateT >= T.spinDuration) this.resolveSpinEnd(body);
          break;
        case "lunge":
          if (body.stateT >= 0.35) {
            body.enter("idle");
            if (!body.lungeRolled) body.recoverT = T.whiffRecover;
          }
          break;
        case "land":
          if (body.stateT >= 0.18) body.enter("idle");
          break;
        case "gather": {
          const gatherDur =
            body.spec.trait === "quickRelease" ? T.gatherQuickRelease : T.gatherSeconds;
          if (body.stateT >= gatherDur) {
            const purpose = body.jumpPurpose ?? "shot";
            body.startJump(purpose, this.jumpDurFor(purpose));
          }
          break;
        }
        case "jump":
          body.jumpT += dt;
          this.stepJump(body);
          break;
        case "drive":
          body.driveT -= dt;
          body.drain(T.drainDrivePerSec * dt * this.heatDrain(body.team));
          if (body.driveT <= 0) body.enter("run");
          break;
        case "stance":
          body.drain(T.drainStancePerSec * dt * this.heatDrain(body.team));
          break;
        default:
          break;
      }

      // Calm regeneration. The reaction beats count as calm, so the reset-walk
      // regen is unchanged from before reactions existed.
      const calm =
        body.body === "idle" ||
        body.body === "celebrate" ||
        body.body === "dejected" ||
        (body.body === "run" && body.lastMoveDir === 0);
      if (calm) {
        const rate =
          this.playPhase === "deadReset" ? T.regenResetPerSec : T.regenCalmPerSec;
        body.stamina = clamp(
          body.stamina + rate * dt * (0.8 + body.spec.stamina / 250),
          0,
          100,
        );
      }
    }

    for (let t = 0; t < 2; t += 1) {
      const team = this.teams[t];
      if (!team.heatActive) continue;
      team.heatT -= dt;
      if (team.heatT <= 0) {
        team.heatActive = false;
        team.heatMeter = 0;
        this.emit(makeEvent("heatEnded", { team: t }));
      }
    }
  }

  /**
   * A spin ends either past the defender or absorbed by one.
   *
   * The counterplay is deterministic — no roll. To beat a *set* stance the spin
   * has to be launched close enough to carry fully past it, which makes it a
   * timing skill rather than a button that always works.
   */
  private resolveSpinEnd(body: AthleteBody): void {
    const defender = this.bodies[1 - body.team];
    const setDefender = defender.body === "stance" || defender.body === "contest";
    if (setDefender && Math.abs(defender.x - body.x) <= T.bodyGap * 1.4) {
      body.enter("idle");
      body.recoverT = T.spinAbsorbRecover;
    } else {
      body.driveT = T.spinCarryDrive;
      body.enter("drive");
      if (body.spinTargeted && (defender.x - body.x) * body.facing < 0) {
        this.emit(makeEvent("spinMove", { team: body.team }));
      }
    }
    body.spinTargeted = false;
  }

  private heatDrain(team: number): number {
    return this.teams[team].heatActive ? T.heatDrainMult : 1.0;
  }

  private jumpDurFor(purpose: JumpPurpose): number {
    switch (purpose) {
      case "shot":
        return T.jumpShotDuration;
      case "layup":
      case "putback":
        return T.layupDuration;
      case "dunk":
        return T.dunkDuration;
      case "block":
        return T.blockJumpDuration;
      case "rebound":
        return T.reboundJumpDuration;
    }
  }

  private stepJump(body: AthleteBody): void {
    const purpose = body.jumpPurpose;
    const apex = body.jumpDur * 0.5;

    // Layups, dunks and put-backs release themselves at the apex.
    if (
      this.ball.holder === body.team &&
      body.jumpT >= apex &&
      (purpose === "layup" || purpose === "dunk" || purpose === "putback")
    ) {
      this.releaseShot(body, { auto: true });
    }

    // A rebound jump keeps trying to grab through the whole arc.
    if (purpose === "rebound" && this.ball.phase === "loose") this.tryGrab(body);

    if (body.jumpT >= body.jumpDur) {
      // A shot jump that never released: an automatic Late at landing.
      if (this.ball.holder === body.team && purpose === "shot") {
        this.releaseShot(body, { forcedLate: true });
      }
      const wasBaited = body.baited;
      body.baited = false;
      body.jumpPurpose = null;
      if (wasBaited) {
        body.enter("stagger");
        this.emit(makeEvent("stagger", { team: body.team }));
      } else {
        body.enter("land");
      }
    }
  }

  /* ---- Offense (a deterministic priority table) --------------------------- */

  private resolveOffense(body: AthleteBody, intent: BasketballIntent): void {
    if (this.playPhase !== "live") return;

    // O1.5 — spin move: a second double-tap mid-drive whips past the defender.
    if (
      intent.burst &&
      body.body === "drive" &&
      !body.airborne &&
      body.stamina >= T.spinStaminaCost
    ) {
      const defender = this.bodies[1 - body.team];
      body.drain(T.spinStaminaCost);
      body.exposedT = T.spinExposed;
      body.spinTargeted =
        (defender.x - body.x) * body.facing > 0 &&
        Math.abs(defender.x - body.x) <= 1.6;
      body.enter("spin");
      return;
    }

    // Burst drive.
    if (
      intent.burst &&
      !body.locked &&
      body.stamina >= T.burstStaminaCost &&
      body.body !== "drive"
    ) {
      body.driveT = T.driveDuration;
      body.exposedT = 0.15;
      body.drain(T.burstStaminaCost * 0.4);
      body.enter("drive");
    }

    // O1 — step-back.
    if (intent.swipeBack && !body.locked && !body.airborne) {
      body.drain(T.drainCrossover);
      body.jumpPurpose = "shot";
      body.enter("stepback");
      return;
    }

    // O3 — dunk: hold while driving inside the gate.
    if (
      intent.actionDown &&
      body.body === "drive" &&
      body.d <= this.dunkGateFor(body) &&
      !body.airborne
    ) {
      if (
        body.spec.dunk >= 72 &&
        body.stamina >= T.dunkStaminaGate &&
        this.laneClear(body)
      ) {
        body.drain(T.drainDunk);
        body.startJump("dunk", T.dunkDuration);
      } else {
        body.drain(T.drainJumpShot);
        body.startJump("layup", T.layupDuration);
      }
      return;
    }

    // O2 — held past the tap threshold: begin the shot gather. Holding through
    // a drive is reserved for the dunk gate above until that drive ends.
    if (
      intent.actionDown &&
      intent.heldSeconds >= T.tapThreshold &&
      !body.locked &&
      !body.airborne &&
      body.body !== "drive" &&
      body.body !== "gather"
    ) {
      body.jumpPurpose = "shot";
      this.beginGather(body);
      return;
    }

    // O7 — release the shot.
    if (
      intent.actionReleased &&
      (body.body === "gather" || (body.airborne && body.jumpPurpose === "shot"))
    ) {
      this.releaseShot(body);
      return;
    }

    if (intent.actionReleased && intent.heldSeconds < T.tapThreshold) {
      // O6 — put-back.
      if (body.putbackT > 0 && body.d <= T.layupRange && !body.airborne) {
        body.drain(T.drainJumpShot);
        body.startJump("putback", T.layupDuration);
        return;
      }
      // O4 — layup on the move near the rim.
      const moving = body.body === "run" || body.body === "drive";
      if (moving && body.d <= T.layupRange && !body.airborne) {
        body.drain(T.drainJumpShot);
        body.startJump("layup", T.layupDuration);
        return;
      }
      // O5 — pump fake while set.
      if (!body.locked && !body.airborne) {
        body.enter("fake");
      }
    }
  }

  private dunkGateFor(body: AthleteBody): number {
    return body.spec.trait === "rimPressure" ? T.dunkGateRimPressure : T.dunkGate;
  }

  private laneClear(body: AthleteBody): boolean {
    const defender = this.bodies[1 - body.team];
    if (
      defender.body !== "stance" &&
      defender.body !== "contest" &&
      !defender.airborne
    ) {
      return true;
    }
    // A set defender between the driver and the rim blocks the lane.
    const between = defender.x > body.x && defender.x < T.rimX;
    return !(between && Math.abs(defender.x - body.x) < 0.9);
  }

  private beginGather(body: AthleteBody): void {
    body.drain(T.drainJumpShot);
    body.jumpPurpose = "shot";
    body.enter("gather");
  }

  /* ---- Defense ------------------------------------------------------------ */

  private resolveDefense(body: AthleteBody, intent: BasketballIntent): void {
    if (this.playPhase !== "live") return;
    const attacker = this.bodies[1 - body.team];
    const gap = Math.abs(attacker.x - body.x);

    // A sustained hold near the handler is a stance; hold-then-release jumps.
    if (intent.actionDown && !body.locked && !body.airborne) {
      if (body.body !== "stance" && gap <= 1.8) body.enter("stance");
    } else if (
      body.body === "stance" &&
      !intent.actionDown &&
      !intent.actionReleased
    ) {
      body.enter("idle");
    }

    if (intent.actionReleased && intent.heldSeconds >= 0.16 && !body.locked) {
      // D3 — block jump, but only against a rising or faking shooter, or a ball
      // that just left the hand. Releasing a plain stance hold stays grounded.
      const shooterThreat =
        attacker.body === "gather" ||
        attacker.body === "fake" ||
        (attacker.airborne &&
          (attacker.jumpPurpose === "shot" ||
            attacker.jumpPurpose === "layup" ||
            attacker.jumpPurpose === "dunk" ||
            attacker.jumpPurpose === "putback")) ||
        (this.ball.phase === "shot" &&
          (this.ball.flight?.t ?? 99) <= T.blockSyncWindow);
      if (shooterThreat && body.stamina >= T.drainBlockJump) {
        body.drain(T.drainBlockJump);
        if (attacker.body === "fake") body.baited = true;
        body.startJump("block", T.blockJumpDuration);
        this.tryBlockInFlight(body);
      } else if (body.body === "stance") {
        body.enter("idle");
      }
      return;
    }

    if (intent.actionReleased && intent.heldSeconds < T.tapThreshold) {
      // Taps resolve top-down: rebound → contest → steal → whiff.
      if (body.locked || body.airborne) return;

      // D1 — rebound jump at a loose or descending ball.
      const flight = this.ball.flight;
      const ballComing =
        this.ball.phase === "loose" ||
        (this.ball.phase === "shot" &&
          flight !== null &&
          flight.t / flight.duration > 0.55);
      if (ballComing) {
        body.drain(T.drainReboundJump);
        body.startJump("rebound", T.reboundJumpDuration);
        return;
      }

      // D2 — grounded contest while the shooter gathers or rises.
      const shooterUp =
        attacker.body === "gather" ||
        (attacker.airborne && attacker.jumpPurpose === "shot");
      if (shooterUp && gap <= T.contestGap) {
        body.drain(T.drainContest);
        body.enter("contest");
        return;
      }

      // D4 — steal lunge. D5 — the same lunge, whiffing at nothing.
      body.drain(T.drainLunge);
      body.lungeRolled = false;
      body.enter("lunge");
      return;
    }

    // The steal roll happens during the lunge's active frames.
    if (
      body.body === "lunge" &&
      !body.lungeRolled &&
      body.stateT >= T.stealActiveFrom &&
      body.stateT <= T.stealActiveTo &&
      this.ball.holder === attacker.team &&
      Math.abs(attacker.x - body.x) <= T.stealReach
    ) {
      body.lungeRolled = true;
      this.rollSteal(body, attacker);
    }

    // The contest relaxes once the shot has resolved.
    if (body.body === "contest" && body.stateT > 0.5) body.enter("idle");
  }

  private rollSteal(defender: AthleteBody, handler: AthleteBody): void {
    const exposed = handler.exposedT > 0 || handler.body === "crossover";
    const guarded = Math.abs(handler.x - defender.x) <= T.guardedGap;
    const protectedBall = guarded && handler.body !== "drive" && !exposed;
    const p = clamp(
      T.stealBase +
        (defender.spec.steal - 70) * T.stealRatingSlope +
        (exposed ? T.stealExposedBonus : 0) -
        (protectedBall ? T.stealProtectedPenalty : 0) -
        (handler.spec.handling - 70) * 0.003,
      0.03,
      0.85,
    );
    if (this.random.nextDouble() >= p) return;

    this.turnover(defender.team, true);
    defender.enter("idle");
    if (defender.team === 0) this.steals += 1;
    if (handler.team === 0) this.turnovers += 1;
    this.teams[defender.team].heatMeter = clamp(
      this.teams[defender.team].heatMeter + T.heatPerStop,
      0,
      1,
    );
    this.maybeIgniteHeat(defender.team);
    this.emit(makeEvent("steal", { team: defender.team }));
  }

  /* ---- Movement ----------------------------------------------------------- */

  private integrateMovement(
    body: AthleteBody,
    intent: BasketballIntent,
    dt: number,
  ): void {
    // Scripted step-back slide.
    if (body.body === "stepback") {
      body.x = clamp(
        body.x - T.stepbackDistance * (dt / T.stepbackDuration),
        T.courtMinX,
        T.courtMaxX,
      );
      return;
    }
    // Scripted spin slide — the turn carries the handler forward.
    if (body.body === "spin") {
      body.x = clamp(
        body.x + body.facing * T.baseSpeed * T.spinSpeedMult * dt,
        T.courtMinX,
        T.courtMaxX,
      );
      return;
    }
    if (body.locked || body.airborne || this.playPhase !== "live") return;

    // A lunge carries a small forward step toward the attacker.
    if (body.body === "lunge") {
      const attacker = this.bodies[1 - body.team];
      body.x += sign(attacker.x - body.x) * 1.6 * dt;
      return;
    }

    const axis = clamp(intent.moveAxis, -1, 1);

    // Crossover: a quick direction flip while moving with the ball.
    if (
      axis !== 0 &&
      body.lastMoveDir !== 0 &&
      sign(axis) !== sign(body.lastMoveDir) &&
      body.sinceDirChange <= T.crossoverWindow &&
      this.ball.holder === body.team &&
      (body.body === "run" || body.body === "drive")
    ) {
      body.drain(T.drainCrossover);
      body.exposedT = 0.12;
      body.enter("crossover");
      this.emit(makeEvent("crossover", { team: body.team }));
      this.checkAnkleBreaker(body);
    }
    if (axis !== 0 && sign(axis) !== sign(body.lastMoveDir)) body.sinceDirChange = 0;
    body.lastMoveDir = axis;
    if (axis !== 0) body.facing = axis > 0 ? 1 : -1;

    let speed =
      T.baseSpeed *
      (0.8 + 0.4 * clamp((body.spec.speed - 30) / 69, 0, 1)) *
      lerp(T.tiredSpeedFloor, 1.0, body.stamina01);
    if (this.teams[body.team].heatActive) speed *= T.heatSpeedMult;
    switch (body.body) {
      case "drive":
        speed *= T.driveMult;
        break;
      case "stance":
        speed *= T.stanceMult;
        break;
      case "crossover":
        speed *= 1.15;
        break;
      default:
        break;
    }
    // Guarded auto ball-protection: slower, but steal-resistant.
    if (
      this.ball.holder === body.team &&
      body.body !== "drive" &&
      Math.abs(this.bodies[1 - body.team].x - body.x) <= T.guardedGap
    ) {
      speed *= T.protectMult;
    }

    if (axis !== 0 && (body.body === "idle" || body.body === "land")) {
      body.enter("run");
    } else if (axis === 0 && body.body === "run") {
      body.enter("idle");
    }

    body.x = clamp(body.x + axis * speed * dt, T.courtMinX, T.courtMaxX);
  }

  private checkAnkleBreaker(handler: AthleteBody): void {
    const defender = this.bodies[1 - handler.team];
    if (Math.abs(handler.x - defender.x) > 1.3) return;
    const overcommitted =
      defender.body === "lunge" ||
      (defender.body === "stance" &&
        defender.lastMoveDir !== 0 &&
        sign(defender.lastMoveDir) !== sign(handler.lastMoveDir));
    if (!overcommitted) return;
    defender.enter("stagger");
    this.emit(makeEvent("ankleBreaker", { team: handler.team }));
  }

  private separateBodies(): void {
    const a = this.bodies[0];
    const b = this.bodies[1];
    // A spinning handler rotates *around* the defender rather than bulldozing
    // them, so separation is suspended for the spin's duration.
    if (a.body === "spin" || b.body === "spin") return;
    const dx = b.x - a.x;
    if (Math.abs(dx) >= T.bodyGap || dx === 0) return;
    const overlap = T.bodyGap - Math.abs(dx);
    const dir = sign(dx);
    // Heavier bodies hold their ground.
    let wa = b.spec.heightM / (a.spec.heightM + b.spec.heightM);
    let wb = 1 - wa;

    // Fighting for a loose ball, whoever is closer establishes position and
    // cannot be shoved off it from behind.
    if (this.ball.phase === "loose" || this.ball.phase === "shot") {
      const aDist = Math.abs(a.x - this.ball.x);
      const bDist = Math.abs(b.x - this.ball.x);
      if (aDist < bDist - 0.1 && sign(b.x - a.x) === sign(b.lastMoveDir)) {
        wa = 0.05;
        wb = 0.95;
      } else if (bDist < aDist - 0.1 && sign(a.x - b.x) === sign(a.lastMoveDir)) {
        wa = 0.95;
        wb = 0.05;
      }
    }

    a.x = clamp(a.x - dir * overlap * wa, T.courtMinX, T.courtMaxX);
    b.x = clamp(b.x + dir * overlap * wb, T.courtMinX, T.courtMaxX);
  }

  /* ---- Shooting ----------------------------------------------------------- */

  zoneFor(d: number): ShotZone {
    if (d <= T.dunkGate) return "dunk";
    if (d <= T.layupRange) return "layup";
    if (d <= T.closeRange) return "close";
    if (d < T.arcDist) return "mid";
    return "three";
  }

  /** Contest factor 0..1 on a shooter from the opposing defender. */
  private contestOn(shooter: AthleteBody): number {
    const defender = this.bodies[1 - shooter.team];
    const gap = Math.abs(defender.x - shooter.x);
    const proximity = clamp(1 - gap / T.contestRange, 0, 1);
    const arms =
      defender.body === "stance" || defender.body === "contest"
        ? 1.0
        : defender.body === "jump" && defender.jumpPurpose === "block"
          ? 1.3
          : 0.5;
    const height = 1 + (defender.spec.heightM - 1.95) * 0.3;
    return clamp(proximity * arms * height, 0, 1.3);
  }

  private releaseShot(
    body: AthleteBody,
    options: { auto?: boolean; forcedLate?: boolean } = {},
  ): void {
    if (this.ball.holder !== body.team) return;
    const purpose = body.jumpPurpose ?? "shot";

    // Grade the release.
    let grade: ReleaseGrade;
    if (options.forcedLate === true) {
      grade = "late";
    } else if (options.auto === true) {
      grade = "good";
    } else if (body.body === "gather") {
      // Released before the jump even started.
      body.startJump("shot", T.jumpShotDuration);
      grade = "early";
    } else {
      const apexT = body.jumpDur * this.apexFrac(body);
      const offset = body.jumpT - apexT;
      const half = this.perfectHalfWindow(body);
      if (Math.abs(offset) <= half) {
        grade = "perfect";
      } else if (Math.abs(offset) <= half + T.goodHalfWindow) {
        grade = "good";
      } else {
        grade = offset < 0 ? "early" : "late";
      }
    }

    const releaseX = body.x;
    const d = T.rimX - releaseX;
    let zone: ShotZone =
      purpose === "dunk"
        ? "dunk"
        : purpose === "layup" || purpose === "putback"
          ? "layup"
          : this.zoneFor(d);
    // A jump shot from point blank is still a layup-range attempt.
    if (zone === "dunk" && purpose === "shot") zone = "layup";
    const points = zone === "three" ? 3 : 2;

    // Block check at release.
    const defender = this.bodies[1 - body.team];
    const blocked = this.blockConnects(defender, body);

    // Make roll. A dunk that was not blocked always goes in.
    const isDunk = purpose === "dunk";
    const make = blocked
      ? false
      : isDunk
        ? true
        : this.random.nextDouble() < this.makeProbability(body, zone, grade, purpose);

    if (body.team === 0) {
      this.attempts += 1;
      if (grade === "perfect") this.perfects += 1;
    }
    if (grade === "perfect") {
      this.emit(makeEvent("perfectRelease", { team: body.team }));
    }

    const releasedBeforeBuzzer = this.overtime || this.halfClock > 0;
    const startH = body.spec.heightM + body.jumpHeight + 0.3;
    const duration = isDunk ? 0.22 : clamp(0.42 + Math.abs(d) * 0.055, 0.3, 0.95);

    this.ball.phase = "shot";
    this.ball.holder = -1;
    this.ball.x = releaseX;
    this.ball.h = startH;
    this.ball.prediction = null;
    this.ball.flight = {
      make,
      points,
      zone,
      grade,
      shooterTeam: body.team,
      duration,
      startX: releaseX,
      startH,
      releasedBeforeBuzzer,
      dunk: isDunk,
      t: 0,
    };
    this.emit(makeEvent("shotReleased", { team: body.team, zone, grade }));

    if (blocked) {
      this.resolveBlock(defender, body, isDunk);
    } else if (isDunk && defender.airborne && defender.jumpPurpose === "block") {
      // Beat a mistimed block jump at the rim: a poster.
      this.emit(makeEvent("poster", { team: body.team }));
    }
  }

  /**
   * The shot model. Every factor is a multiplier on a zone base, then clamped —
   * so no single input can carry a shot on its own, and a contested, tired,
   * repeated, mistimed heave really is close to hopeless.
   */
  makeProbability(
    body: AthleteBody,
    zone: ShotZone,
    grade: ReleaseGrade,
    purpose: JumpPurpose,
  ): number {
    const spec = body.spec;
    const d = body.d;
    const rating = ratingFor(spec, zone);
    const zoneBase =
      zone === "dunk" || zone === "layup"
        ? T.baseLayup
        : zone === "close"
          ? T.baseClose
          : zone === "mid"
            ? T.baseMid
            : T.baseThree;
    const zoneRef =
      zone === "dunk" || zone === "layup"
        ? T.layupRange
        : zone === "close"
          ? T.closeRange
          : T.arcDist;
    let overshoot = Math.max(0, d - zoneRef);
    if (zone === "three" && spec.trait === "deepRange") overshoot = 0;
    let base = zoneBase + (rating - 70) * T.ratingSlope - overshoot * T.distanceSlope;
    if (purpose === "putback") base += T.putbackBonus;

    const timing =
      grade === "perfect"
        ? T.timingPerfect
        : grade === "good"
          ? T.timingGood
          : T.timingEarlyLate;

    let contest = 1 - T.contestMax * clamp(this.contestOn(body), 0, 1);
    if (purpose === "layup" && spec.trait === "rimPressure") {
      contest = 1 - (1 - contest) * 0.5;
    }

    const moving = body.lastMoveDir !== 0 && purpose === "shot";
    let balance = moving ? T.balanceMoving : 1.0;
    if (body.body === "jump" && body.stateT < 0.05) balance *= 0.95;
    // Step-back shots carry a slight balance penalty.
    if (body.exposedT > 0 && purpose === "shot") {
      balance = Math.min(balance, T.balanceStepback);
    }

    const stamina = lerp(0.85, 1.0, clamp(body.stamina01 / 0.6, 0, 1));
    const heat = this.teams[body.team].heatActive ? T.heatShotBonus : 1.0;
    const repeat = Math.pow(T.repeatPenalty, this.repeatStacks[body.team]);

    const cap = grade === "perfect" ? T.shotCapPerfect : T.shotCap;
    return clamp(
      base * timing * contest * balance * stamina * heat * repeat,
      T.shotFloor,
      cap,
    );
  }

  private blockConnects(defender: AthleteBody, shooter: AthleteBody): boolean {
    if (!defender.airborne || defender.jumpPurpose !== "block") return false;
    if (defender.jumpT > T.blockSyncWindow * 2) return false;
    const gap = Math.abs(defender.x - shooter.x);
    const reach =
      T.blockReachBase +
      (defender.spec.block - 70) * T.blockReachSlope +
      (defender.spec.heightM - 1.95) * 0.5;
    if (gap > reach) return false;
    if (shooter.jumpPurpose === "dunk") {
      const p = clamp(
        T.blockDunkBase + (defender.spec.block - shooter.spec.dunk) * 0.004,
        0.05,
        0.75,
      );
      return this.random.nextDouble() < p;
    }
    return true;
  }

  private resolveBlock(
    defender: AthleteBody,
    shooter: AthleteBody,
    onDunk: boolean,
  ): void {
    // Deflection: down, behind the shooter, or toward the sideline but in play.
    const mode = this.random.nextInt(3);
    this.ball.phase = "loose";
    this.ball.flight = null;
    this.ball.h = shooter.spec.heightM + shooter.jumpHeight;
    this.ball.x = shooter.x;
    if (mode === 0) {
      this.ball.vx = -0.4;
      this.ball.vh = -2.0;
    } else if (mode === 1) {
      this.ball.vx = -(1.8 + this.random.nextDouble() * 1.6);
      this.ball.vh = 1.2;
    } else {
      this.ball.vx = -(0.8 + this.random.nextDouble() * 0.8);
      this.ball.vh = 2.2;
    }
    this.ball.prediction = this.predictLanding();
    if (defender.team === 0) this.blocks += 1;
    this.teams[defender.team].heatMeter = clamp(
      this.teams[defender.team].heatMeter + T.heatPerStop,
      0,
      1,
    );
    this.maybeIgniteHeat(defender.team);
    this.emit(makeEvent("block", { team: defender.team, onDunk }));
  }

  private tryBlockInFlight(defender: AthleteBody): void {
    const flight = this.ball.flight;
    if (this.ball.phase !== "shot" || flight === null) return;
    if (flight.t > T.blockSyncWindow) return;
    if (flight.shooterTeam === defender.team) return;
    const shooter = this.bodies[flight.shooterTeam];
    if (this.blockConnects(defender, shooter)) {
      this.resolveBlock(defender, shooter, flight.dunk);
    }
  }

  /* ---- Ball --------------------------------------------------------------- */

  private stepBall(dt: number): void {
    if (this.ball.phase !== "loose") this.looseSeconds = 0;
    switch (this.ball.phase) {
      case "held": {
        const holder = this.bodies[this.ball.holder];
        this.ball.x = holder.x + holder.facing * 0.35;
        this.ball.h = 1.1;
        break;
      }
      case "shot": {
        const flight = this.ball.flight;
        if (flight === null) break;
        flight.t += dt;
        const s = clamp(flight.t / flight.duration, 0, 1);
        // A quadratic arc from release to the rim, lifted above both ends.
        const lift = flight.dunk
          ? 0.25
          : Math.max(1.0, Math.abs(T.rimX - flight.startX) * 0.22);
        const peak = Math.max(flight.startH, T.rimHeight) + lift;
        this.ball.x = lerp(flight.startX, T.rimX, s);
        this.ball.h = arcHeight(flight.startH, peak, T.rimHeight, s);
        if (s >= 1) this.resolveShotArrival(flight);
        break;
      }
      case "loose": {
        this.ball.vh -= T.gravity * dt;
        this.ball.x += this.ball.vx * dt;
        this.ball.h += this.ball.vh * dt;
        if (this.ball.x < T.courtMinX + 0.15 || this.ball.x > T.courtMaxX - 0.15) {
          this.ball.vx = -this.ball.vx * 0.7;
          this.ball.x = clamp(this.ball.x, T.courtMinX + 0.15, T.courtMaxX - 0.15);
        }
        if (this.ball.h <= 0.12 && this.ball.vh < 0) {
          this.ball.h = 0.12;
          this.ball.vh = -this.ball.vh * 0.55;
          this.ball.vx *= 0.8;
          if (Math.abs(this.ball.vh) < 0.8) this.ball.vh = 0;
        }
        this.tryGroundPickup();
        // Safety net: a ball nobody chases is scooped by the nearest player, so
        // there is never dead time and a pending buzzer can resolve.
        if (this.ball.phase === "loose") {
          this.looseSeconds += dt;
          if (this.looseSeconds >= T.looseTimeout) this.forceLooseRecovery();
        }
        break;
      }
      case "dead":
        break;
    }
  }

  private forceLooseRecovery(): void {
    const [a, b] = this.bodies;
    const nearest =
      Math.abs(this.ball.x - a.x) <= Math.abs(this.ball.x - b.x) ? a : b;
    this.grabBall(nearest);
  }

  private resolveShotArrival(flight: ShotFlight): void {
    if (flight.make) {
      this.scoreBasket(flight);
      return;
    }
    // A miss: rim bounce into a loose ball with a seeded, varied trajectory.
    const missAngle = this.random.nextDouble();
    const long = this.random.nextBool();
    const spread = 0.8 + Math.abs(T.rimX - flight.startX) * 0.35 * missAngle;
    this.ball.phase = "loose";
    this.ball.flight = null;
    this.ball.x = T.rimX;
    this.ball.h = T.rimHeight;
    this.ball.vx = (long ? -1 : -0.45) * spread;
    this.ball.vh = 1.6 + missAngle * 1.8;
    // The landing prediction is published now the rim has been hit — not while
    // the shot was still in the air and its fate unknown.
    this.ball.prediction = this.predictLanding();
    this.emit(
      makeEvent("shotMissed", {
        team: flight.shooterTeam,
        zone: flight.zone,
        grade: flight.grade,
      }),
    );
    if (this.buzzerPending) this.finishHalfNow();
  }

  private predictLanding(): ReboundPrediction {
    // Closed-form projectile: where the ball first falls to catch height.
    const target = 1.2;
    const vh = this.ball.vh;
    const disc = vh * vh + 2 * T.gravity * (this.ball.h - target);
    const t = (vh + Math.sqrt(Math.max(0, disc))) / T.gravity;
    const landX = clamp(
      this.ball.x + this.ball.vx * t,
      T.courtMinX + 0.15,
      T.courtMaxX - 0.15,
    );
    return { landX, tLand: t };
  }

  private scoreBasket(flight: ShotFlight): void {
    const scorer = flight.shooterTeam;
    const team = this.teams[scorer];
    const other = this.teams[1 - scorer];
    team.score += flight.points;
    team.unanswered += flight.points;
    other.unanswered = 0;
    if (other.heatActive) {
      other.heatActive = false;
      other.heatMeter = 0;
      this.emit(makeEvent("heatEnded", { team: 1 - scorer }));
    } else {
      other.heatMeter = 0;
    }
    if (scorer === 0) {
      this.makes += 1;
      if (flight.points === 3) this.threes += 1;
      if (flight.dunk) this.dunks += 1;
      this.bestRun = Math.max(this.bestRun, this.teams[0].unanswered);
    }
    // Repeat-shot penalty bookkeeping: the same look twice stops working.
    if (this.lastMakeZone[scorer] === flight.zone) {
      this.repeatStacks[scorer] = Math.min(
        T.repeatMaxStacks,
        this.repeatStacks[scorer] + 1,
      );
    } else {
      this.repeatStacks[scorer] = 0;
    }
    this.lastMakeZone[scorer] = flight.zone;

    team.heatMeter = clamp(team.heatMeter + T.heatPerBasket, 0, 1);
    if (team.unanswered >= 6) team.heatMeter = 1;
    this.maybeIgniteHeat(scorer);

    const buzzer = this.buzzerPending;
    this.emit(
      makeEvent("basketMade", {
        team: scorer,
        points: flight.points,
        zone: flight.zone,
        grade: flight.grade,
      }),
    );
    if (flight.dunk) this.emit(makeEvent("dunk", { team: scorer }));
    if (buzzer) this.emit(makeEvent("buzzerBeater", { team: scorer }));

    this.ball.phase = "dead";
    this.ball.flight = null;
    this.ball.prediction = null;

    if (this.overtime) {
      this.endMatch(false);
      return;
    }
    if (buzzer) {
      this.finishHalfNow(true);
      return;
    }
    this.beginReset(1 - scorer, scorer);
  }

  private maybeIgniteHeat(teamIndex: number): void {
    const team = this.teams[teamIndex];
    if (team.heatActive || team.heatMeter < 1) return;
    team.heatActive = true;
    team.heatT = T.heatDuration;
    this.emit(makeEvent("heatStarted", { team: teamIndex }));
  }

  /* ---- Rebounds & pickups -------------------------------------------------- */

  private tryGrab(body: AthleteBody): void {
    if (this.ball.phase !== "loose") return;
    if (this.ball.h > body.reach || this.ball.h < 0.5) return;
    if (Math.abs(this.ball.x - body.x) > T.reboundReach) return;

    // Contested when the opponent is also mid rebound-jump and in range.
    const other = this.bodies[1 - body.team];
    const contested =
      other.airborne &&
      other.jumpPurpose === "rebound" &&
      Math.abs(this.ball.x - other.x) <= T.reboundReach &&
      this.ball.h <= other.reach;
    let winner = body;
    if (contested) {
      const sa = this.reboundScore(body);
      const sb = this.reboundScore(other);
      winner = sa === sb ? (this.random.nextBool() ? body : other) : sa > sb ? body : other;
    }
    this.grabBall(winner);
  }

  private reboundScore(body: AthleteBody): number {
    let score =
      -2.0 * Math.abs(this.ball.x - body.x) +
      (body.spec.rebound - 70) * 0.01 +
      (body.spec.heightM - 1.95) * 0.6;
    // Apex bonus: grabbing near the top of the jump.
    const frac = body.jumpDur > 0 ? body.jumpT / body.jumpDur : 0;
    if (Math.abs(frac - 0.5) < 0.2) score += 0.3;
    if (body.spec.trait === "glassCleaner") score += T.glassCleanerBonus;
    // Box-out assist: in contact and on the inside when the jump started.
    const other = this.bodies[1 - body.team];
    if (Math.abs(other.x - body.x) < T.bodyGap + 0.15 && body.d < other.d) {
      score += T.boxOutBonus * 0.5;
    }
    score += (this.random.nextDouble() - 0.5) * 0.05;
    return score;
  }

  private tryGroundPickup(): void {
    if (this.ball.phase !== "loose" || this.ball.h > 1.2) return;
    let nearest: AthleteBody | null = null;
    for (const body of this.bodies) {
      if (body.airborne || body.locked) continue;
      const gap = Math.abs(this.ball.x - body.x);
      if (gap <= T.groundPickupRange) {
        if (nearest === null || gap < Math.abs(this.ball.x - nearest.x)) {
          nearest = body;
        }
      }
    }
    if (nearest !== null) this.grabBall(nearest);
  }

  private grabBall(body: AthleteBody): void {
    const wasShotBy = this.possession;
    this.ball.phase = "held";
    this.ball.holder = body.team;
    this.ball.vx = 0;
    this.ball.vh = 0;
    this.ball.prediction = null;

    const offensive = body.team === wasShotBy;
    this.possession = body.team;
    this.shotClock = T.shotClockSeconds;
    if (offensive) {
      body.putbackT = T.putbackWindow;
      this.teams[body.team].heatMeter = clamp(
        this.teams[body.team].heatMeter + T.heatPerBoard,
        0,
        1,
      );
      this.maybeIgniteHeat(body.team);
    }
    if (body.team === 0) this.rebounds += 1;
    this.emit(makeEvent("rebound", { team: body.team, offensive }));
    // The buzzer already sounded — any recovered ball ends the half.
    if (this.buzzerPending) this.finishHalfNow();
  }

  /* ---- Clocks, possession, match flow ------------------------------------- */

  private stepClocks(dt: number): void {
    if (this.playPhase !== "live") return;

    if (!this.overtime && !this.buzzerPending) {
      this.halfClock -= dt;
      if (this.halfClock <= 0) {
        this.halfClock = 0;
        // A ball in the air, or loose off a live shot: the buzzer-beater rule.
        if (this.ball.phase === "shot" || this.ball.phase === "loose") {
          this.buzzerPending = true;
        } else {
          this.finishHalfNow();
          return;
        }
      }
    }

    if (this.ball.phase === "held" && !this.buzzerPending) {
      this.shotClock -= dt;
      if (this.shotClock <= 0) {
        if (this.ball.holder === 0) this.turnovers += 1;
        this.emit(makeEvent("shotClockViolation", { team: this.ball.holder }));
        this.turnover(1 - this.ball.holder, false);
        this.beginReset(this.possession);
      }
    }
  }

  private turnover(to: number, steal: boolean): void {
    this.possession = to;
    this.shotClock = T.shotClockSeconds;
    if (steal) {
      this.ball.phase = "held";
      this.ball.holder = to;
    }
  }

  private beginReset(newPossession: number, scoredBy?: number): void {
    this.possession = newPossession;
    this.playPhase = "deadReset";
    this.resetT = T.resetSeconds;
    this.ball.phase = "dead";
    this.ball.flight = null;
    this.ball.prediction = null;
    for (const body of this.bodies) {
      body.jumpPurpose = null;
      body.putbackT = 0;
      // A scored-on reset plays a reaction beat — the scorer celebrates, the
      // victim slumps — and both time out well inside the walk-back.
      const react: BodyState =
        scoredBy === undefined ? "idle" : body.team === scoredBy ? "celebrate" : "dejected";
      if (body.body !== react) body.enter(react);
    }
  }

  private stepDeadReset(dt: number): void {
    this.resetT -= dt;
    const offense = this.bodies[this.possession];
    const defense = this.bodies[1 - this.possession];
    const k = clamp(dt / Math.max(0.01, this.resetT + dt), 0, 1);
    offense.x = lerp(offense.x, T.checkSpotX, k);
    defense.x = lerp(defense.x, T.defenderResetX, k);
    this.ball.x = offense.x + 0.35;
    this.ball.h = 1.1;
    if (this.resetT > 0) return;

    offense.x = T.checkSpotX;
    defense.x = T.defenderResetX;
    offense.facing = 1;
    defense.facing = -1;
    this.ball.phase = "held";
    this.ball.holder = this.possession;
    this.shotClock = T.shotClockSeconds;
    this.playPhase = "live";
  }

  private placeForPossession(): void {
    const offense = this.bodies[this.possession];
    const defense = this.bodies[1 - this.possession];
    offense.x = T.checkSpotX;
    defense.x = T.defenderResetX;
    offense.facing = 1;
    defense.facing = -1;
    offense.enter("idle");
    defense.enter("idle");
    this.ball.phase = "held";
    this.ball.holder = this.possession;
    this.ball.prediction = null;
    this.ball.flight = null;
  }

  private finishHalfNow(buzzerBeater = false): void {
    this.buzzerPending = false;
    if (this.halfIndex === 0) {
      this.playPhase = "awaiting";
      this.emit(makeEvent("halfEnded", { halfIndex: 0 }));
      return;
    }
    // End of the second half: decide it, or go to overtime.
    if (this.teams[0].score !== this.teams[1].score) {
      this.endMatch(buzzerBeater);
    } else {
      this.playPhase = "awaiting";
      this.emit(makeEvent("halfEnded", { halfIndex: 1, needsOvertime: true }));
    }
  }

  private endMatch(buzzer: boolean): void {
    this.matchIsOver = true;
    this.endedOnBuzzer = buzzer;
    this.playPhase = "finished";
    this.ball.phase = "dead";
    this.emit(
      makeEvent("matchEnded", {
        team: this.teams[0].score > this.teams[1].score ? 0 : 1,
      }),
    );
  }

  private emit(event: BasketballEvent): void {
    this.events.push(event);
  }
}

/** A piecewise parabola through (0, from), (0.55, peak) and (1, to). */
function arcHeight(from: number, peak: number, to: number, s: number): number {
  if (s < 0.55) {
    const u = s / 0.55;
    return from + (peak - from) * (1 - (1 - u) * (1 - u));
  }
  const u = (s - 0.55) / 0.45;
  return peak - (peak - to) * u * u;
}

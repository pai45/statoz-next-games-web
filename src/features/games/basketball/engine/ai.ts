/**
 * The Hoop Duel CPU — the web port of `games/basketball/basketball_ai.dart`.
 *
 * The AI produces the same `BasketballIntent`s a thumb would, so every rule gate
 * stays in the engine and the CPU cannot cheat structurally. It reads the
 * opponent and the ball through a perception buffer delayed by a
 * difficulty-dependent latency — it never sees inputs, only observable state —
 * reads its OWN body directly (proprioception), and blurs its own timing with
 * gaussian jitter.
 *
 * Difficulty touches four things and nothing else: how stale its picture of the
 * court is, how shaky its timing is, how often it picks a worse plan on purpose,
 * and how readily it bites on a pump fake. It never gets a better shot.
 */

import {
  type BasketballAthlete,
  type BasketballDifficulty,
  type BasketballIntent,
  type BallPhase,
  type BodyState,
  type JumpPurpose,
  clamp,
  makeIntent,
  sign,
} from "../types";
import * as T from "../tuning";

import type { AthleteBody, BasketballEngine } from "./engine";
import { BasketballRandom } from "./random";

type Observation = {
  t: number;
  oppX: number;
  oppBody: BodyState;
  oppJump: JumpPurpose | null;
  oppJumpT: number;
  ballPhase: BallPhase;
  holder: number;
  ballX: number;
  flightT: number;
  predictionX: number | null;
  predictionT: number | null;
};

type OffensePlan = "bringUp" | "probe" | "createSpace" | "attack" | "pullUp";

const offensePlans: OffensePlan[] = [
  "bringUp",
  "probe",
  "createSpace",
  "attack",
  "pullUp",
];

export class BasketballAI {
  private readonly difficulty: BasketballDifficulty;
  private readonly team: number;
  private readonly random: BasketballRandom;

  private readonly buffer: Observation[] = [];
  private now = 0;

  private plan: OffensePlan = "bringUp";
  private replanT = 0;

  /** Non-null while the action zone is held: the accumulated hold, in seconds. */
  private holdT: number | null = null;

  /** When a timed shot or block release is scheduled to fire. */
  private releaseAt: number | null = null;
  private releaseIsBlock = false;

  private stealCooldown = 0;
  private spinCooldown = 0;
  private fakeBiteChance: number;
  private wiggleT = 0;
  private wiggleDir = 1;

  constructor(options: {
    difficulty: BasketballDifficulty;
    seed: number;
    team?: number;
  }) {
    this.difficulty = options.difficulty;
    this.team = options.team ?? 1;
    this.random = new BasketballRandom(options.seed);
    this.fakeBiteChance = T.aiBite[options.difficulty];
  }

  private get latency(): number {
    return T.aiLatency[this.difficulty];
  }

  private get jitter(): number {
    return T.aiJitter[this.difficulty];
  }

  private get epsilon(): number {
    return T.aiEpsilon[this.difficulty];
  }

  /** Gaussian-ish jitter (the sum of two uniforms) around zero. */
  private noise(): number {
    return (this.random.nextDouble() + this.random.nextDouble() - 1) * this.jitter * 2;
  }

  think(engine: BasketballEngine, dt: number): BasketballIntent {
    this.now += dt;
    this.stealCooldown = Math.max(0, this.stealCooldown - dt);
    this.spinCooldown = Math.max(0, this.spinCooldown - dt);
    this.replanT -= dt;
    this.wiggleT -= dt;

    this.push(engine);
    const obs = this.delayed();
    if (obs === null || engine.playPhase !== "live") return this.plain();

    const me = engine.bodies[this.team];
    const onBall = engine.ball.holder === this.team;
    return onBall
      ? this.offense(engine, me, obs, dt)
      : this.defense(engine, me, obs, dt);
  }

  private push(engine: BasketballEngine): void {
    const opp = engine.bodies[1 - this.team];
    const ball = engine.ball;
    this.buffer.push({
      t: this.now,
      oppX: opp.x,
      oppBody: opp.body,
      oppJump: opp.jumpPurpose,
      oppJumpT: opp.jumpT,
      ballPhase: ball.phase,
      holder: ball.holder,
      ballX: ball.x,
      flightT: ball.flight?.t ?? -1,
      predictionX: ball.prediction?.landX ?? null,
      predictionT: ball.prediction?.tLand ?? null,
    });
    while (this.buffer.length > 2 && this.buffer[0].t < this.now - this.latency - 0.05) {
      this.buffer.shift();
    }
  }

  /** The freshest observation the CPU is allowed to have seen by now. */
  private delayed(): Observation | null {
    const cutoff = this.now - this.latency;
    let result: Observation | null = null;
    for (const obs of this.buffer) {
      if (obs.t > cutoff) break;
      result = obs;
    }
    return result ?? (this.buffer.length > 0 ? this.buffer[0] : null);
  }

  /* ---- Offense ------------------------------------------------------------ */

  private offense(
    engine: BasketballEngine,
    me: AthleteBody,
    obs: Observation,
    dt: number,
  ): BasketballIntent {
    const spec = me.spec;

    // Mid-shot: the only job is managing the timed release.
    if (me.body === "gather" || (me.airborne && me.jumpPurpose === "shot")) {
      return this.manageShotRelease(me);
    }
    if (me.airborne) return this.plain();

    const gap = Math.abs(obs.oppX - me.x);
    const open = gap > 1.7;
    const oppStaggered = obs.oppBody === "stagger";
    const oppAirborne = obs.oppBody === "jump" && obs.oppJump === "block";
    const shotClock = engine.shotClock;
    const leading = engine.teams[this.team].score > engine.teams[1 - this.team].score;

    if (this.replanT <= 0) {
      this.replanT = 0.35 + this.random.nextDouble() * 0.4;
      this.plan = this.pickPlan(me, {
        open,
        oppStaggered: oppStaggered || oppAirborne,
        shotClock,
        leading,
      });
      // Deliberately picking a worse plan is what makes a rookie a rookie.
      if (this.random.nextDouble() < this.epsilon) {
        this.plan = offensePlans[this.random.nextInt(offensePlans.length)];
      }
    }

    switch (this.plan) {
      case "bringUp": {
        // Walk it toward the preferred range.
        const targetX = this.preferredX(spec);
        if (Math.abs(me.x - targetX) < 0.2) {
          this.plan = "probe";
          return this.plain();
        }
        return this.plain({ moveAxis: me.x < targetX ? 0.8 : -0.8 });
      }

      case "probe":
        // Leading late still probes rather than stalling outright.
        return this.wiggle();

      case "createSpace":
        // Step back for a jumper when guarded, otherwise shake side to side.
        if (gap < 1.4 && this.random.nextDouble() < 0.6) {
          this.plan = "pullUp";
          return this.plain({ swipeBack: true });
        }
        return this.wiggle(true);

      case "attack": {
        // Drive the lane; finish at the rim.
        const d = me.d;
        const wantsDunk = spec.dunk >= 72 && me.stamina >= T.dunkStaminaGate;
        if (d <= (wantsDunk ? this.dunkGateFor(spec) : T.layupRange)) {
          if (wantsDunk && me.body === "drive") {
            // Hold through the gate for the slam.
            return this.hold(dt, 1);
          }
          return this.tap(1); // layup
        }
        // Spin past a defender planted in the lane. A second burst mid-drive is
        // the spin input — the same thumb edge a player uses.
        const laneBlocked = obs.oppX > me.x && obs.oppX - me.x <= 1.2;
        if (
          me.body === "drive" &&
          laneBlocked &&
          this.spinCooldown <= 0 &&
          me.stamina >= T.spinStaminaCost + 10 &&
          this.random.nextDouble() > this.epsilon
        ) {
          this.spinCooldown = 2.5;
          return this.plain({ moveAxis: 1, burst: true });
        }
        return this.plain({
          moveAxis: 1,
          burst: me.body !== "drive" && me.stamina > 25,
        });
      }

      case "pullUp":
        // Rise for the jumper — the engine's meter does the rest.
        this.scheduleShotRelease(me);
        return this.hold(dt, 0);
    }
  }

  private dunkGateFor(spec: BasketballAthlete): number {
    return spec.trait === "rimPressure" ? T.dunkGateRimPressure : T.dunkGate;
  }

  private pickPlan(
    me: AthleteBody,
    context: {
      open: boolean;
      oppStaggered: boolean;
      shotClock: number;
      leading: boolean;
    },
  ): OffensePlan {
    const spec = me.spec;
    if (context.shotClock < 3) {
      return me.d < T.closeRange ? "attack" : "pullUp";
    }
    if (context.oppStaggered) {
      return spec.dunk >= spec.three ? "attack" : "pullUp";
    }
    // Archetype tendencies.
    const roll = this.random.nextDouble();
    switch (spec.archetype) {
      case "sharpshooter":
        if (context.open && me.d >= T.closeRange) return "pullUp";
        return roll < 0.6 ? "createSpace" : "probe";
      case "slasher":
        if (roll < 0.65) return "attack";
        return context.open ? "pullUp" : "probe";
      case "interiorPower":
        if (me.d > T.closeRange) return "attack";
        return roll < 0.55 ? "attack" : "pullUp";
      case "balancedGuard":
        if (context.open) {
          return me.d < T.layupRange + 1 ? "attack" : "pullUp";
        }
        return roll < 0.4 ? "attack" : roll < 0.7 ? "createSpace" : "probe";
    }
  }

  /** Preferred shooting distance from the rim, as a court x. */
  private preferredX(spec: BasketballAthlete): number {
    switch (spec.archetype) {
      case "sharpshooter":
        return T.rimX - T.arcDist - 0.3;
      case "slasher":
        return T.rimX - T.closeRange;
      case "interiorPower":
        return T.rimX - T.layupRange - 0.8;
      case "balancedGuard":
        return T.rimX - T.closeRange - 0.6;
    }
  }

  private scheduleShotRelease(me: AthleteBody): void {
    if (this.releaseAt !== null) return;
    const gatherDur =
      me.spec.trait === "quickRelease" ? T.gatherQuickRelease : T.gatherSeconds;
    const apexFrac =
      me.spec.trait === "quickRelease" ? T.shotApexQuickRelease : T.shotApexFrac;
    this.releaseAt =
      this.now + gatherDur + T.jumpShotDuration * apexFrac + this.noise();
    this.releaseIsBlock = false;
  }

  private manageShotRelease(me: AthleteBody): BasketballIntent {
    this.scheduleShotRelease(me);
    if (this.now >= (this.releaseAt ?? this.now)) return this.release();
    return this.hold(0.0001, 0);
  }

  /* ---- Defense ------------------------------------------------------------ */

  private defense(
    engine: BasketballEngine,
    me: AthleteBody,
    obs: Observation,
    dt: number,
  ): BasketballIntent {
    // A pending timed block release outranks everything else.
    if (this.holdT !== null && this.releaseIsBlock) {
      if (this.now >= (this.releaseAt ?? this.now)) return this.release();
      return this.hold(dt, 0);
    }

    // Loose ball or a live shot: crash the boards.
    if (obs.ballPhase === "loose" || obs.ballPhase === "shot") {
      return this.crashBoards(engine, me, obs);
    }

    const oppHasBall = obs.holder === 1 - this.team;
    if (!oppHasBall) {
      // Transition — retreat between the (delayed) opponent and the rim.
      return this.moveToward(me, clamp(obs.oppX + 1.1, T.courtMinX, T.rimX - 0.5));
    }

    const oppSpec = engine.bodies[1 - this.team].spec;
    const gap = Math.abs(obs.oppX - me.x);

    // Shooter rising, as far as the CPU can tell: contest or block.
    const shooterUp =
      obs.oppBody === "gather" || (obs.oppBody === "jump" && obs.oppJump === "shot");
    if (shooterUp && gap <= T.contestGap) {
      const canBlock = me.spec.block >= 60 && gap <= 1.4 && me.stamina > 20;
      if (canBlock && this.random.nextDouble() > this.epsilon) {
        // Time the block to the shooter's apex, as the CPU last saw it.
        const apexIn = T.jumpShotDuration * T.shotApexFrac - obs.oppJumpT;
        this.releaseAt = this.now + Math.max(0.05, apexIn) + this.noise();
        this.releaseIsBlock = true;
        return this.hold(dt, 0);
      }
      return this.tap(0); // grounded contest
    }

    // A pump fake shown: disciplined defenders hold, biters leave their feet.
    if (obs.oppBody === "fake" && gap <= 1.6) {
      if (this.random.nextDouble() < this.fakeBiteChance * dt * 8) {
        this.fakeBiteChance *= 0.6; // it learns, within the match
        this.releaseAt = this.now + 0.1;
        this.releaseIsBlock = true;
        return this.hold(dt, 0);
      }
    }

    // A spinning handler beats a lunge, so disciplined defenders plant a set
    // stance instead — the engine absorbs a spin into a set body. Rookies do not
    // read it and keep chasing, so a spin beats them clean.
    if (obs.oppBody === "spin" && this.difficulty !== "rookie") {
      const holdX = clamp(obs.oppX + 0.5, T.courtMinX, T.rimX - 0.4);
      return this.moveToward(me, holdX, { stance: true, dt });
    }

    // Steal only when the ball is exposed, and not too often.
    const exposed = obs.oppBody === "crossover" || obs.oppBody === "drive";
    if (
      exposed &&
      gap <= T.stealReach + 0.3 &&
      this.stealCooldown <= 0 &&
      me.spec.steal >= 45 &&
      this.random.nextDouble() > this.epsilon
    ) {
      this.stealCooldown = T.aiStealCooldown[this.difficulty];
      return this.tap(0);
    }

    // Shadow: sit between the attacker and the rim, pressing up on shooters and
    // sagging off players who cannot punish it.
    const respect = oppSpec.three >= 75 ? 0.9 : oppSpec.three >= 55 ? 1.2 : 1.6;
    const targetX = clamp(obs.oppX + respect, T.courtMinX, T.rimX - 0.4);
    return this.moveToward(me, targetX, { stance: gap < 1.9, dt });
  }

  private crashBoards(
    engine: BasketballEngine,
    me: AthleteBody,
    obs: Observation,
  ): BasketballIntent {
    const landX = obs.predictionX;
    if (landX === null) {
      // No prediction public yet — drift toward the rim.
      return this.moveToward(me, T.rimX - 1.2);
    }
    if (Math.abs(landX - me.x) > 0.35) return this.moveToward(me, landX);
    // Time the jump so its apex meets the drop.
    const tLand = engine.ball.prediction?.tLand ?? obs.predictionT ?? 1;
    if (!me.airborne && tLand <= T.reboundJumpDuration * 0.5 + Math.abs(this.noise())) {
      return this.tap(0);
    }
    return this.plain();
  }

  /* ---- Intent plumbing (thumb-shaped edges) ------------------------------- */

  private moveToward(
    me: AthleteBody,
    targetX: number,
    options: { stance?: boolean; dt?: number } = {},
  ): BasketballIntent {
    const delta = targetX - me.x;
    const axis = Math.abs(delta) < 0.12 ? 0 : sign(delta);
    if (options.stance === true) return this.hold(options.dt ?? 0, axis * 0.8);
    return this.plain({ moveAxis: axis });
  }

  private wiggle(fast = false): BasketballIntent {
    if (this.wiggleT <= 0) {
      this.wiggleT = fast ? 0.16 : 0.5 + this.random.nextDouble() * 0.5;
      this.wiggleDir = -this.wiggleDir;
    }
    return this.plain({ moveAxis: this.wiggleDir * (fast ? 1.0 : 0.5) });
  }

  /**
   * An intent with no action edge. Emitting one drops any stray hold — the
   * thumb came off the pad — so a scheduled release cannot fire later by
   * accident.
   */
  private plain(
    overrides: { moveAxis?: number; burst?: boolean; swipeBack?: boolean } = {},
  ): BasketballIntent {
    this.holdT = null;
    this.releaseAt = null;
    this.releaseIsBlock = false;
    return makeIntent(overrides);
  }

  private tap(moveAxis: number): BasketballIntent {
    this.holdT = null;
    this.releaseAt = null;
    return makeIntent({
      moveAxis,
      actionPressed: true,
      actionReleased: true,
      heldSeconds: 0.05,
    });
  }

  private hold(dt: number, moveAxis: number): BasketballIntent {
    const started = this.holdT === null;
    this.holdT = (this.holdT ?? 0) + dt;
    return makeIntent({
      moveAxis,
      actionDown: true,
      actionPressed: started,
      heldSeconds: this.holdT,
    });
  }

  private release(): BasketballIntent {
    const held = this.holdT ?? 0.2;
    this.holdT = null;
    this.releaseAt = null;
    this.releaseIsBlock = false;
    return makeIntent({ actionReleased: true, heldSeconds: held });
  }
}

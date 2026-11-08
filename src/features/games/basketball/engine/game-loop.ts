/**
 * The clock the duel runs on — the loop half of `BasketballGame` from
 * `games/basketball/basketball_game.dart`. Its drawing half lives in
 * `components/renderer/`; nothing here knows about a canvas.
 *
 * Three things make this more than a wrapper around `BasketballEngine.step`.
 *
 * The **fixed step**: a frame's wall-clock time is clamped and accumulated, then
 * spent 1/120 s at a time, so a release lands on the same tick on a 60 Hz laptop
 * and a 144 Hz monitor. Stepping by frame time would make the shot meter a
 * different instrument on different hardware.
 *
 * **Edge consumption**: a press or a release is an instant, not a duration. If a
 * frame spends four sub-steps, the release must reach exactly one of them or the
 * same shot fires four times. The first sub-step gets the edges; the rest see
 * only the held state.
 *
 * And the **juice**: camera, shake, slow-motion, the impact cinematic, the crowd
 * surge, the sting banners. None of it is a rule and none of it should cost a
 * React render, so it lives on this object and the renderer reads it per frame.
 */

import {
  maxFrameSeconds,
  slowMoScale,
  stingMajorMs,
  stingMinorMs,
  substepSeconds,
} from "../constants";
import { liveryById } from "../data/liveries";
import {
  type BasketballEvent,
  type BasketballIntent,
  type BasketballMatchConfig,
  type BasketballMatchSummary,
  clamp,
  makeIntent,
} from "../types";
import * as T from "../tuning";
import {
  cameraBounds,
  courtProjection,
  type CourtProjection,
} from "../components/renderer/geometry";

import { BasketballAI } from "./ai";
import { BasketballEngine } from "./engine";
import { BasketballRandom } from "./random";

/** A word thrown up by a moment worth naming. */
export type BasketballSting = {
  /** Rises with every sting, so a repeat of the same word re-animates. */
  id: number;
  label: string;
  /** Which accent the word takes; the sting layer resolves it to a token. */
  tone: StingTone;
  /** Majors slam bigger and hold longer. */
  major: boolean;
};

export type StingTone = "cyan" | "lime" | "gold" | "violet" | "danger";

/**
 * A particle burst the renderer should spawn. The loop names the moment and
 * where in the world it happened; the renderer owns pixels, so it owns the
 * particles' speeds and their decay.
 */
export type Burst = {
  kind: "swish" | "spark";
  worldX: number;
  worldH: number;
  tone: "gold" | "cyan" | "amber";
  count: number;
};

type Listener = () => void;

export class HoopDuelGame {
  readonly config: BasketballMatchConfig;
  readonly engine: BasketballEngine;
  readonly reducedMotion: boolean;

  private readonly ai: BasketballAI;
  /** Render-side variety — never the simulation's RNG, which must stay pure. */
  private readonly fxRandom = new BasketballRandom(0x5eed ^ Date.now());

  /* ---- Input state, fed by the control deck ---- */
  private moveAxis = 0;
  private actionDown = false;
  private heldT = 0;
  private burstQueued = false;
  private pressQueued = false;
  private releaseQueued = false;
  private releaseHeld = 0;
  private swipeQueued = false;

  private paused = false;
  private accumulator = 0;
  private slowMoT = 0;
  private shakeT = 0;
  private shakeMag = 0;

  /* ---- Visual state the renderer reads every frame ---- */
  camX = T.checkSpotX + 2;
  shake = { x: 0, y: 0 };
  /** Impact cinematic: a decaying focal zoom-punch about the rim. */
  cineT = 0;
  /** Net sway impulse, consumed by the hoop. */
  netSway = 0;
  /** Crowd surge (0..1) on big plays, over and above the sustained heat state. */
  crowdHype = 0;
  /** Backboard score flash: a decaying timer and the scorer's livery colour. */
  scoreFlashT = 0;
  scoreFlashColor = liveryById("statoz").primary;
  /** Global dribble phase, so the ball and the handler's hand stay in sync. */
  dribblePhase = 0;
  /** Free-running visual seconds, shared with the sting timers. */
  seconds = 0;

  sting: BasketballSting | null = null;
  private stingUntil = -1;
  private stingId = 0;

  private bursts: Burst[] = [];

  private projection: CourtProjection = courtProjection(390, 720);

  private readonly stateListeners = new Set<Listener>();
  private readonly eventListeners = new Set<(events: BasketballEvent[]) => void>();

  constructor(options: {
    config: BasketballMatchConfig;
    reducedMotion?: boolean;
  }) {
    this.config = options.config;
    this.reducedMotion = options.reducedMotion ?? false;
    this.engine = new BasketballEngine(options.config);
    this.ai = new BasketballAI({
      difficulty: options.config.difficulty,
      // The CPU draws from its own stream, so its choices cannot shift the
      // simulation's rolls — salted exactly as Flutter salts it.
      seed: options.config.seed ^ 0xa11ce,
    });
  }

  /* ---- Subscriptions ------------------------------------------------------ */

  onState(listener: Listener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onEvent(listener: (events: BasketballEvent[]) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifyState(): void {
    for (const listener of this.stateListeners) listener();
  }

  /* ---- Viewport ----------------------------------------------------------- */

  /** Called by the arena on mount and on every resize. */
  setViewport(width: number, height: number): void {
    this.projection = courtProjection(width, height);
  }

  getProjection(): CourtProjection {
    return this.projection;
  }

  /* ---- Input API (called by the control deck) ----------------------------- */

  setMoveAxis(axis: number): void {
    this.moveAxis = clamp(axis, -1, 1);
  }

  tapBurst(): void {
    this.burstQueued = true;
  }

  actionPressed(): void {
    this.actionDown = true;
    this.heldT = 0;
    this.pressQueued = true;
  }

  actionReleased(): void {
    if (!this.actionDown && !this.pressQueued) return;
    this.releaseQueued = true;
    this.releaseHeld = this.heldT;
    this.actionDown = false;
  }

  swipeBack(): void {
    this.swipeQueued = true;
    // A step-back swipe supersedes the hold that started it.
    this.actionDown = false;
    this.pressQueued = false;
    this.releaseQueued = false;
  }

  cancelTouches(): void {
    this.moveAxis = 0;
    this.actionDown = false;
    this.pressQueued = false;
    this.releaseQueued = false;
    this.swipeQueued = false;
    this.burstQueued = false;
  }

  /* ---- Match flow API ----------------------------------------------------- */

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  startHalf(index: number): void {
    this.engine.startHalf(index);
    this.cancelTouches();
    this.notifyState();
  }

  substitutePlayer(rosterIndex: number): void {
    this.engine.substitute(0, rosterIndex);
    this.notifyState();
  }

  /** The CPU's halftime brain: bring in the freshest bench legs when gassed. */
  cpuAutoSubstitute(): void {
    const sim = this.engine.teams[1];
    if (this.engine.cpuBody.stamina >= 55) return;
    let best = sim.activeIndex;
    let bestStamina = this.engine.cpuBody.stamina;
    for (let i = 0; i < sim.staminas.length; i += 1) {
      if (i === sim.activeIndex) continue;
      if (sim.staminas[i] > bestStamina + 10) {
        best = i;
        bestStamina = sim.staminas[i];
      }
    }
    if (best !== sim.activeIndex) this.engine.substitute(1, best);
  }

  halftimeRest(): void {
    this.engine.halftimeRest();
    this.notifyState();
  }

  summary(abandoned = false): BasketballMatchSummary {
    return this.engine.summary(abandoned);
  }

  /* ---- The loop ----------------------------------------------------------- */

  /** One animation frame's worth of wall-clock time. */
  step(rawSeconds: number): void {
    const wallDt = Math.min(rawSeconds, maxFrameSeconds);

    if (!this.paused) {
      let simDt = wallDt;
      if (this.slowMoT > 0) {
        this.slowMoT = Math.max(0, this.slowMoT - wallDt);
        simDt = wallDt * slowMoScale;
      }
      this.accumulator += simDt;
      const frameEvents: BasketballEvent[] = [];
      let first = true;
      while (this.accumulator >= substepSeconds) {
        this.accumulator -= substepSeconds;
        frameEvents.push(...this.stepOnce(first));
        first = false;
      }
      if (frameEvents.length > 0) {
        this.handleEvents(frameEvents);
        for (const listener of this.eventListeners) listener(frameEvents);
      }
    }

    this.decayFx(wallDt);
    this.syncCamera(wallDt);
    this.dribblePhase += wallDt * 7;
    this.seconds += wallDt;
    if (this.stingUntil > 0 && this.seconds >= this.stingUntil) {
      this.stingUntil = -1;
      this.sting = null;
    }
    this.notifyState();
  }

  private stepOnce(consumeEdges: boolean): BasketballEvent[] {
    if (this.actionDown) this.heldT += substepSeconds;
    const intent: BasketballIntent = makeIntent({
      moveAxis: this.moveAxis,
      burst: consumeEdges && this.burstQueued,
      actionDown: this.actionDown,
      actionPressed: consumeEdges && this.pressQueued,
      actionReleased: consumeEdges && this.releaseQueued,
      heldSeconds: consumeEdges && this.releaseQueued ? this.releaseHeld : this.heldT,
      swipeBack: consumeEdges && this.swipeQueued,
    });
    if (consumeEdges) {
      this.burstQueued = false;
      this.pressQueued = false;
      if (this.releaseQueued) {
        this.releaseQueued = false;
        this.heldT = 0;
      }
      this.swipeQueued = false;
    }
    const cpuIntent = this.ai.think(this.engine, substepSeconds);
    return this.engine.step(intent, cpuIntent, substepSeconds);
  }

  private decayFx(wallDt: number): void {
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - wallDt);
      const k = this.shakeT * this.shakeMag;
      this.shake = {
        x: (this.fxRandom.nextDouble() - 0.5) * 2 * k,
        y: (this.fxRandom.nextDouble() - 0.5) * 2 * k,
      };
    } else {
      this.shake = { x: 0, y: 0 };
    }
    this.cineT = Math.max(0, this.cineT - wallDt);
    this.crowdHype = Math.max(0, this.crowdHype - wallDt * 0.8);
    this.scoreFlashT = Math.max(0, this.scoreFlashT - wallDt);
    this.netSway = Math.max(0, this.netSway - wallDt * 2.4);
  }

  /**
   * The camera follows the ball more than the players, so a shot leads the eye
   * to the rim rather than sitting between two bodies.
   */
  private syncCamera(wallDt: number): void {
    const ball = this.engine.ball;
    const mid = (this.engine.playerBody.x + this.engine.cpuBody.x) / 2;
    const target = ball.x * 0.55 + mid * 0.45;
    const bounds = cameraBounds(this.projection);
    const clamped =
      bounds.max > bounds.min
        ? clamp(target, bounds.min, bounds.max)
        : (bounds.min + bounds.max) / 2;
    const k = 1 - Math.exp(-6 * wallDt);
    this.camX += (clamped - this.camX) * k;
  }

  /* ---- Bursts ------------------------------------------------------------- */

  /** The renderer takes the pending bursts and turns them into particles. */
  drainBursts(): Burst[] {
    if (this.bursts.length === 0) return [];
    const drained = this.bursts;
    this.bursts = [];
    return drained;
  }

  private burst(burst: Burst): void {
    if (this.reducedMotion) return;
    this.bursts.push(burst);
  }

  /* ---- Event → juice ------------------------------------------------------ */

  private handleEvents(events: BasketballEvent[]): void {
    for (const event of events) {
      const mine = event.team === 0;
      switch (event.type) {
        case "basketMade": {
          this.netSway = 1;
          this.burst({
            kind: "swish",
            worldX: T.rimX,
            worldH: T.rimHeight - 0.2,
            tone: "gold",
            count: 12,
          });
          this.crowdHype = 1;
          this.scoreFlashT = T.scoreFlashSeconds;
          this.scoreFlashColor = liveryById(
            mine ? this.config.teamId : this.config.cpuTeamId,
          ).primary;
          const three = event.points === 3;
          if (event.grade === "perfect" && three && mine) this.slowMo(0.4);
          this.showSting(
            mine ? `+${event.points}` : `CONCEDED +${event.points}`,
            mine ? (three ? "gold" : "lime") : "danger",
            three && mine,
          );
          break;
        }

        case "buzzerBeater":
          this.slowMo(0.5);
          this.crowdHype = 1;
          this.showSting("BUZZER BEATER!", "gold", true);
          break;

        case "dunk":
          this.shakeNow(0.28, 9);
          this.cine();
          this.crowdHype = 1;
          this.showSting(
            mine
              ? this.pick(["THROWN DOWN!", "HAMMER TIME!", "WITH AUTHORITY!"])
              : "DUNKED ON YOUR RIM",
            mine ? "gold" : "danger",
            mine,
          );
          break;

        case "poster":
          this.slowMo(0.4);
          this.cine();
          this.showSting(
            this.pick(["POSTERIZED!", "PUT ON A POSTER!"]),
            "gold",
            true,
          );
          break;

        case "block":
          this.shakeNow(0.22, 7);
          this.crowdHype = 1;
          if (event.onDunk) this.cine();
          this.burst({
            kind: "spark",
            worldX: this.engine.ball.x,
            worldH: this.engine.ball.h,
            tone: "cyan",
            count: 14,
          });
          this.showSting(
            mine
              ? this.pick(["BLOCKED!", "NOT TODAY!", "SENT BACK!"])
              : this.pick(["REJECTED!", "SWATTED AWAY!"]),
            mine ? "cyan" : "danger",
            event.onDunk,
          );
          break;

        case "steal":
          this.showSting(
            mine ? this.pick(["STOLEN!", "PICKED HIS POCKET!"]) : "TURNOVER!",
            mine ? "cyan" : "danger",
            false,
          );
          break;

        case "ankleBreaker":
          this.slowMo(0.25);
          this.showSting(
            this.pick(["ANKLE BREAKER!", "SHIFTED!", "CROSSED UP!"]),
            "violet",
            true,
          );
          break;

        case "spinMove":
          this.showSting(
            mine ? this.pick(["SPIN CYCLE!", "REVERSED!"]) : "SPUN PAST YOU",
            mine ? "violet" : "danger",
            false,
          );
          break;

        case "perfectRelease":
          if (mine) {
            this.showSting(this.pick(["PERFECT", "SPLASH INCOMING"]), "lime", false);
          }
          break;

        case "heatStarted":
          this.showSting(
            mine ? "YOU'RE ON FIRE!" : "OPPONENT HEATING UP",
            mine ? "gold" : "danger",
            mine,
          );
          break;

        case "shotClockViolation":
          this.showSting(
            mine ? "SHOT CLOCK!" : "FORCED THE STOP!",
            mine ? "danger" : "cyan",
            false,
          );
          break;

        case "shotMissed":
          this.burst({
            kind: "spark",
            worldX: T.rimX,
            worldH: T.rimHeight,
            tone: "amber",
            count: 8,
          });
          this.netSway = Math.max(this.netSway, 0.35);
          break;

        case "rebound":
          if (event.offensive && mine) {
            this.showSting("OFF. BOARD — PUT IT BACK!", "cyan", false);
          }
          break;

        default:
          break;
      }
    }
  }

  private slowMo(seconds: number): void {
    if (this.reducedMotion) return;
    this.slowMoT = Math.max(this.slowMoT, seconds);
  }

  private shakeNow(seconds: number, magnitude: number): void {
    if (this.reducedMotion) return;
    this.shakeT = seconds;
    this.shakeMag = magnitude;
  }

  private cine(): void {
    if (this.reducedMotion) return;
    this.cineT = T.cineSeconds;
  }

  private showSting(label: string, tone: StingTone, major: boolean): void {
    this.stingId += 1;
    this.sting = { id: this.stingId, label, tone, major };
    this.stingUntil = this.seconds + (major ? stingMajorMs : stingMinorMs) / 1000;
  }

  /** Render-side label variety. Uses the fx stream, never the simulation's. */
  private pick(options: string[]): string {
    return options[this.fxRandom.nextInt(options.length)];
  }
}

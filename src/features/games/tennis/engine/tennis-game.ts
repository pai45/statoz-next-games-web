/**
 * The clock the match runs on — the loop half of `TennisGame` from
 * `lib/games/tennis/tennis_game.dart`. Its rendering half lives in
 * `components/renderer/`; nothing here knows about a canvas.
 *
 * Two things make this more than a wrapper around `TennisEngine.step`.
 *
 * The first is the **fixed step**. A frame's wall-clock time is clamped and
 * accumulated, then spent 1/120 s at a time, so the physics is identical on a
 * 60 Hz laptop and a 144 Hz monitor and a tab that just came back from the
 * background. Stepping by the frame time instead would make the ball behave
 * differently on different hardware.
 *
 * The second is **edge consumption**. A press or a release is an instant, not a
 * duration: if a frame spends four sub-steps, the release must be delivered to
 * exactly one of them or the same shot fires four times. The first sub-step of a
 * frame gets the edges; the rest see only the held state.
 *
 * Visual bookkeeping — the ball trail, the camera kick, the current sting —
 * lives here rather than in React because none of it is a rule and none of it
 * should cost a render.
 */

import {
  cameraPushDecay,
  linePulseDecay,
  maximumFrameSeconds,
  netPulseDecay,
  stepSeconds,
  stingMajorSeconds,
  stingMinorSeconds,
  trailLength,
  trailLengthReducedMotion,
  trailSpacing,
} from "../constants";
import type {
  TennisEvent,
  TennisIntent,
  TennisMatchConfig,
  TennisMatchSummary,
  TennisSettings,
} from "../types";
import { idleIntent } from "../types";
import { aiSeedSalt, TennisAI, type AiSnapshot } from "./ai";
import { TennisEngine, type EngineSnapshot } from "./simulation";

/** One sample of the ball's flight, in world units. */
export type TrailPoint = { x: number; y: number; z: number };

/** A full-screen word thrown up by a moment worth naming. */
export type TennisSting = {
  /** Rises with every sting, so a repeat of the same word still re-animates. */
  id: number;
  label: string;
  /** Which accent the word takes; the sting layer resolves it to a token. */
  tone: "cyan" | "lime" | "gold" | "orange" | "danger";
  major: boolean;
};

export type MatchSnapshot = {
  config: TennisMatchConfig;
  engine: EngineSnapshot;
  ai: AiSnapshot;
  accumulator: number;
  savedAtMillis: number;
};

type Listener = () => void;

export class TennisRallyGame {
  readonly config: TennisMatchConfig;
  readonly engine: TennisEngine;
  private readonly ai: TennisAI;
  private settings: TennisSettings;

  /* Held input, mirrored from the pads or the keyboard. */
  private moveX = 0;
  private moveY = 0;
  private sprint = false;
  private shotDown = false;
  private shotPressed = false;
  private shotReleased = false;
  private shotHold = 0;
  private releaseHold = 0;
  private aimX = 0;
  private aimY = 0;
  private serveAim = 0;

  private accumulator = 0;
  private paused = false;

  /* Visual state. Read every frame by the renderer, never by the rules. */
  clock = 0;
  cameraPush = 0;
  netPulse = 0;
  linePulse = 0;
  sting: TennisSting | null = null;
  trail: TrailPoint[] = [];
  private stingT = 0;
  private stingId = 0;

  private readonly stateListeners = new Set<Listener>();
  private readonly eventListeners = new Set<(events: TennisEvent[]) => void>();

  constructor(
    config: TennisMatchConfig,
    settings: TennisSettings,
    resume?: MatchSnapshot,
  ) {
    this.config = config;
    this.settings = settings;
    const usable = resume?.config.matchId === config.matchId ? resume : undefined;

    this.engine = new TennisEngine(config, {
      movementAssist: settings.movementAssist,
      snapshot: usable?.engine,
    });
    this.ai = new TennisAI(config.difficulty, config.seed ^ aiSeedSalt);
    if (usable !== undefined) {
      this.ai.restore(usable.ai);
      this.accumulator = Math.min(Math.max(0, usable.accumulator), stepSeconds);
    }
  }

  /* ---- Input ------------------------------------------------------------- */

  setMove(x: number, y: number, sprint = false): void {
    this.moveX = Math.min(1, Math.max(-1, x));
    this.moveY = Math.min(1, Math.max(-1, y));
    this.sprint = sprint;
  }

  shotStarted(): void {
    this.shotDown = true;
    this.shotPressed = true;
    this.shotHold = 0;
  }

  /**
   * Release the shot.
   *
   * The serve reads only the horizontal component — a serve is aimed wide, at
   * the body, or down the T, and the swipe's vertical half shapes rally shots
   * instead.
   */
  shotReleasedWith(aimX: number, aimY: number, holdSeconds: number): void {
    this.aimX = Math.min(1, Math.max(-1, aimX));
    this.aimY = Math.min(1, Math.max(-1, aimY));
    this.serveAim = this.aimX < -0.3 ? -1 : this.aimX > 0.3 ? 1 : 0;
    this.releaseHold = Math.max(this.shotHold, holdSeconds);
    this.shotReleased = true;
    this.shotDown = false;
  }

  /** Drop every held input — on pause, on blur, on a lost pointer capture. */
  cancelTouches(): void {
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this.shotDown = false;
    this.shotPressed = false;
    this.shotReleased = false;
    this.shotHold = 0;
  }

  setPaused(value: boolean): void {
    this.paused = value;
    this.engine.paused = value;
    if (value) this.cancelTouches();
    this.notifyState();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  applySettings(settings: TennisSettings): void {
    this.settings = settings;
    this.engine.movementAssist = settings.movementAssist;
  }

  /* ---- The frame --------------------------------------------------------- */

  /**
   * Advance by one frame of wall-clock time.
   *
   * `reducedMotion` is passed per frame rather than read off settings so the
   * OS-level preference and the in-game toggle can both suppress the camera
   * kick without either having to know about the other.
   */
  advance(frameSeconds: number, reducedMotion: boolean): void {
    const wallDt = Math.min(frameSeconds, maximumFrameSeconds);
    this.clock += wallDt;

    if (!this.paused) {
      this.accumulator += wallDt;
      const events: TennisEvent[] = [];
      let first = true;
      while (this.accumulator >= stepSeconds) {
        this.accumulator -= stepSeconds;
        events.push(...this.stepOnce(first));
        first = false;
      }
      if (events.length > 0) {
        this.handleEvents(events, reducedMotion);
        for (const listener of this.eventListeners) listener(events);
        this.notifyState();
      }
    }

    this.decayEffects(wallDt);
    this.recordTrail(reducedMotion);
  }

  private stepOnce(consumeEdges: boolean): TennisEvent[] {
    if (this.shotDown) this.shotHold += stepSeconds;

    const intent: TennisIntent = {
      moveX: this.moveX,
      moveY: this.moveY,
      sprint: this.sprint,
      shotDown: this.shotDown,
      shotPressed: consumeEdges && this.shotPressed,
      shotReleased: consumeEdges && this.shotReleased,
      holdSeconds: consumeEdges && this.shotReleased ? this.releaseHold : this.shotHold,
      aimX: this.aimX,
      aimY: this.aimY,
      serveAim: this.serveAim,
    };

    if (consumeEdges) {
      this.shotPressed = false;
      if (this.shotReleased) {
        this.shotReleased = false;
        this.shotHold = 0;
      }
    }

    return this.engine.step(intent, this.ai.think(this.engine, stepSeconds), stepSeconds);
  }

  /* ---- Presentation ------------------------------------------------------ */

  private handleEvents(events: TennisEvent[], reducedMotion: boolean): void {
    const push = (amount: number) => {
      if (!reducedMotion) this.cameraPush = amount;
    };

    for (const event of events) {
      switch (event.type) {
        case "contact":
          if (event.shot === "smash") {
            this.showSting("SMASH", "orange", true);
            push(1);
          }
          break;
        case "perfectContact":
          this.showSting("PERFECT", "cyan", false);
          push(0.55);
          break;
        case "winner":
          this.showSting("WINNER", "lime", true);
          push(0.8);
          break;
        case "ace":
          this.showSting("ACE", "gold", true);
          break;
        case "fault":
          this.showSting("FAULT", "orange", false);
          break;
        case "doubleFault":
          this.showSting("DOUBLE FAULT", "danger", true);
          break;
        case "let":
          this.showSting("LET - REPLAY", "cyan", false);
          break;
        case "net":
          this.netPulse = 1;
          break;
        case "out":
          this.linePulse = 1;
          break;
        case "rallyMilestone":
          this.showSting(event.label ?? `${event.value} SHOTS`, "cyan", false);
          break;
        case "tieBreakStarted":
          this.showSting("TIEBREAK", "gold", true);
          break;
        case "endChange":
          this.showSting("CHANGE ENDS", "cyan", false);
          break;
        default:
          break;
      }
    }
  }

  private showSting(label: string, tone: TennisSting["tone"], major: boolean): void {
    this.stingId += 1;
    this.sting = { id: this.stingId, label, tone, major };
    this.stingT = major ? stingMajorSeconds : stingMinorSeconds;
  }

  private decayEffects(dt: number): void {
    if (this.stingT > 0) {
      this.stingT = Math.max(0, this.stingT - dt);
      if (this.stingT === 0) {
        this.sting = null;
        this.notifyState();
      }
    }
    this.cameraPush = Math.max(0, this.cameraPush - dt * cameraPushDecay);
    this.netPulse = Math.max(0, this.netPulse - dt * netPulseDecay);
    this.linePulse = Math.max(0, this.linePulse - dt * linePulseDecay);
  }

  /**
   * Sample the ball's flight for the comet trail.
   *
   * Sampled by distance, not by time, so a fast serve leaves the same-looking
   * streak a slow lob does rather than a denser one.
   */
  private recordTrail(reducedMotion: boolean): void {
    const ball = this.engine.ball;
    if (!ball.live) {
      if (this.trail.length > 0) this.trail = [];
      return;
    }

    const point = { x: ball.x, y: ball.y, z: ball.z };
    const last = this.trail[this.trail.length - 1];
    if (
      last === undefined ||
      Math.hypot(last.x - point.x, last.y - point.y, last.z - point.z) > trailSpacing
    ) {
      this.trail.push(point);
      const limit = reducedMotion ? trailLengthReducedMotion : trailLength;
      while (this.trail.length > limit) this.trail.shift();
    }
  }

  /* ---- Subscriptions ----------------------------------------------------- */

  /** Coarse beats only — a point, a game, a pause. Never once per frame. */
  onState(listener: Listener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onEvent(listener: (events: TennisEvent[]) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifyState(): void {
    for (const listener of this.stateListeners) listener();
  }

  /* ---- Results and persistence ------------------------------------------- */

  summary(tournamentChampion = false): TennisMatchSummary {
    return this.engine.summary(tournamentChampion);
  }

  toSnapshot(): MatchSnapshot {
    return {
      config: this.config,
      engine: this.engine.toSnapshot(),
      ai: this.ai.toSnapshot(),
      accumulator: this.accumulator,
      savedAtMillis: Date.now(),
    };
  }
}

export { idleIntent };

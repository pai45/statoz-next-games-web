/**
 * The CPU opponent — a port of `TennisAI` from `tennis_engine.dart`.
 *
 * It reads only public engine state and emits the same `TennisIntent` a human
 * control pad does, so it is playing the same game under the same rules. This
 * matters: difficulty never alters the AI body's legal movement, stamina or
 * reach. What difficulty changes is how *stale* the AI's picture of the court is
 * (the reaction delay), how wide it aims, how often it tries something clever,
 * and — over in `opponentMissesReturn` — how often it flubs a reachable ball.
 *
 * The stale observation is the whole trick. The AI only refreshes where the ball
 * and the rival are once per reaction delay, and chases that remembered position
 * in between, which is what makes a rookie look a beat late rather than simply
 * slow.
 */

import { courtHalfLength, courtHalfWidth } from "../constants";
import {
  idleIntent,
  type TennisDifficulty,
  type TennisIntent,
} from "../types";
import { TennisRandom } from "./random";
import type { TennisEngine } from "./simulation";

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export type AiSnapshot = {
  rng: number;
  reactionT: number;
  serveHold: number;
  serveDown: boolean;
  observedBallX: number;
  observedBallY: number;
  observedPlayerX: number;
  observedPlayerY: number;
};

const reactionDelays: Record<TennisDifficulty, number> = {
  rookie: 0.3,
  pro: 0.18,
  allStar: 0.11,
};

/** How long the AI holds the serve meter — nearer 0.82 is a better serve. */
const serveReleaseAt: Record<TennisDifficulty, number> = {
  rookie: 0.68,
  pro: 0.78,
  allStar: 0.84,
};

const aimErrors: Record<TennisDifficulty, number> = {
  rookie: 0.42,
  pro: 0.24,
  allStar: 0.12,
};

/** How often the AI reaches for a lob, a drop shot, or a loaded power shot. */
const tacticChances: Record<TennisDifficulty, number> = {
  rookie: 0.1,
  pro: 0.26,
  allStar: 0.42,
};

export class TennisAI {
  readonly difficulty: TennisDifficulty;
  readonly team: number;
  private readonly random: TennisRandom;

  private reactionT = 0;
  private serveHold = 0;
  private serveDown = false;
  private observedBallX = 0;
  private observedBallY = 0;
  private observedPlayerX = 0;
  private observedPlayerY = 0;

  constructor(difficulty: TennisDifficulty, seed: number, team = 1) {
    this.difficulty = difficulty;
    this.team = team;
    this.random = new TennisRandom(seed);
  }

  get reactionDelay(): number {
    return reactionDelays[this.difficulty];
  }

  think(engine: TennisEngine, dt: number): TennisIntent {
    this.reactionT -= dt;
    if (this.reactionT <= 0) {
      this.reactionT = this.reactionDelay;
      this.observedBallX = engine.ball.x;
      this.observedBallY = engine.ball.y;
      const other = engine.bodyFor(1 - this.team);
      this.observedPlayerX = other.x;
      this.observedPlayerY = other.y;
    }

    const body = engine.bodyFor(this.team);
    const serving =
      engine.score.currentServer === this.team &&
      (engine.phase === "preServe" || engine.phase === "serving");

    if (serving) {
      this.serveHold += dt;
      if (!this.serveDown) {
        this.serveDown = true;
        return { ...idleIntent, shotDown: true, shotPressed: true };
      }
      if (this.serveHold >= serveReleaseAt[this.difficulty]) {
        const held = this.serveHold;
        this.serveHold = 0;
        this.serveDown = false;
        return {
          ...idleIntent,
          shotReleased: true,
          holdSeconds: held,
          serveAim: this.random.nextInt(3) - 1,
        };
      }
      return { ...idleIntent, shotDown: true };
    }

    this.serveHold = 0;
    this.serveDown = false;

    let targetX = 0;
    let targetY = this.team === 0 ? 8.6 : -8.6;
    const ballApproaching =
      engine.ball.live && (this.team === 0 ? engine.ball.y > 0 : engine.ball.y < 0);

    if (ballApproaching) {
      targetX = clamp(this.observedBallX, -courtHalfWidth, courtHalfWidth);
      targetY = clamp(
        this.observedBallY,
        this.team === 0 ? 1.2 : -courtHalfLength,
        this.team === 0 ? courtHalfLength : -1.2,
      );
    }

    const dx = clamp(targetX - body.x, -1, 1);
    const dy = clamp(targetY - body.y, -1, 1);
    const sprint =
      ballApproaching && Math.abs(targetX - body.x) > 1.9 && body.stamina > 24;

    if (!engine.canHit(this.team)) {
      return { ...idleIntent, moveX: dx, moveY: dy, sprint };
    }

    // Hit away from where the rival was last seen, then blur that by the
    // difficulty's aim error.
    const aimError = aimErrors[this.difficulty];
    const tacticChance = tacticChances[this.difficulty];
    let aimX = this.observedPlayerX > 0 ? -0.78 : 0.78;
    aimX += (this.random.nextDouble() * 2 - 1) * aimError;

    let aimY = 0;
    const otherDeep = Math.abs(this.observedPlayerY) > 8.5;
    const otherAtNet = Math.abs(this.observedPlayerY) < 4.4;
    if (otherAtNet && this.random.nextDouble() < tacticChance) {
      aimY = 0.8; // Lob the rival at the net.
    } else if (otherDeep && this.random.nextDouble() < tacticChance) {
      aimY = -0.72; // Drop it short on the rival pinned deep.
    }

    const hold =
      body.stamina > 35 && this.random.nextDouble() < tacticChance ? 0.34 : 0.08;

    return {
      ...idleIntent,
      moveX: dx,
      moveY: dy,
      sprint,
      shotReleased: true,
      holdSeconds: hold,
      aimX: clamp(aimX, -1, 1),
      aimY,
    };
  }

  toSnapshot(): AiSnapshot {
    return {
      rng: this.random.state,
      reactionT: this.reactionT,
      serveHold: this.serveHold,
      serveDown: this.serveDown,
      observedBallX: this.observedBallX,
      observedBallY: this.observedBallY,
      observedPlayerX: this.observedPlayerX,
      observedPlayerY: this.observedPlayerY,
    };
  }

  restore(snapshot: AiSnapshot): void {
    this.random.state = snapshot.rng & 0x7fffffff;
    this.reactionT = snapshot.reactionT;
    this.serveHold = snapshot.serveHold;
    this.serveDown = snapshot.serveDown;
    this.observedBallX = snapshot.observedBallX;
    this.observedBallY = snapshot.observedBallY;
    this.observedPlayerX = snapshot.observedPlayerX;
    this.observedPlayerY = snapshot.observedPlayerY;
  }
}

/** The salt the AI's stream is offset by, so it never mirrors the engine's. */
export const aiSeedSalt = 0x71e115;

/**
 * The ball — the web port of `_BallComponent`.
 *
 * Where the ball is *drawn* is not always where the engine keeps it. In flight
 * and loose the two agree exactly, because that is physics the rules care
 * about. While it is held the engine's position is deliberately coarse — a
 * point near the handler's hip — and the renderer replaces it with the dribble,
 * the gather, the ball going overhead on a jump, and the lift of a pump fake.
 * The same bounce feeds the rig's near hand, so the hand and the ball are one
 * motion rather than two loops that happen to agree.
 */

import type { HoopDuelGame } from "../../engine/game-loop";
import type { BasketballEngine } from "../../engine/engine";
import { clamp } from "../../types";
import * as T from "../../tuning";

import { worldToScreen, type CourtProjection, type ScreenPoint } from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";

/** A world-space point: court x, and height above the floor. */
export type WorldPoint = { x: number; h: number };

/**
 * How high the dribbled ball currently sits, in world metres.
 *
 * Guarded, the handler dribbles lower and quicker — which is the visual tell
 * for the ball-protection speed penalty the engine is already applying.
 */
export function dribbleHeight(engine: BasketballEngine, game: HoopDuelGame): number {
  const holder = engine.bodies[engine.ball.holder];
  const guarded =
    Math.abs(engine.bodies[1 - engine.ball.holder].x - holder.x) <= T.guardedGap;
  const height = guarded ? 0.5 : 0.75;
  const bounce = Math.abs(Math.sin(game.dribblePhase * (guarded ? 1.6 : 1.0))) * height;
  return 0.14 + bounce;
}

/** Where to draw the ball this frame. */
export function ballVisualPosition(game: HoopDuelGame): WorldPoint {
  const engine = game.engine;
  const ball = engine.ball;
  if (ball.phase !== "held" || ball.holder < 0) return { x: ball.x, h: ball.h };

  const holder = engine.bodies[ball.holder];
  const fx = holder.x + holder.facing * 0.32;

  switch (holder.body) {
    case "gather":
      return { x: fx, h: holder.spec.heightM * 0.62 };
    case "jump": {
      const frac = holder.jumpDur > 0 ? clamp(holder.jumpT / holder.jumpDur, 0, 1) : 0;
      const overhead = holder.spec.heightM * (0.62 + frac * 0.5) + holder.jumpHeight;
      return { x: fx + holder.facing * 0.1, h: overhead };
    }
    case "fake": {
      const k = clamp(holder.stateT / T.fakeSeconds, 0, 1);
      const up = Math.sin(Math.min(1, k * 2) * Math.PI) * 0.5;
      return { x: fx, h: holder.spec.heightM * 0.62 + up };
    }
    default:
      return { x: fx, h: dribbleHeight(engine, game) };
  }
}

/** The heat trail's samples, kept by the arena between frames. */
export type BallTrail = ScreenPoint[];

export function paintBall(
  ctx: CanvasRenderingContext2D,
  game: HoopDuelGame,
  projection: CourtProjection,
  palette: ScenePalette,
  trail: BallTrail,
): void {
  const engine = game.engine;
  const ball = engine.ball;
  const px = projection.px;

  const world = ballVisualPosition(game);
  const at = worldToScreen(projection, game.camX, game.shake, world.x, world.h);
  const ground = worldToScreen(projection, game.camX, game.shake, world.x, 0);
  const r = 0.14 * px;

  // A heat trail, but only on a ball that is actually travelling.
  const shooterHeat =
    (ball.phase === "shot" || ball.phase === "loose") &&
    (engine.teams[0].heatActive || engine.teams[1].heatActive);
  if (shooterHeat) {
    trail.push(at);
    while (trail.length > 7) trail.shift();
    for (let i = 0; i < trail.length; i += 1) {
      const k = i / trail.length;
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, r * (0.4 + k * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(palette.gold, 0.1 + k * 0.12);
      ctx.fill();
    }
  } else {
    trail.length = 0;
  }

  // Ground shadow: it shrinks as the ball rises, which is the height cue.
  ctx.beginPath();
  ctx.ellipse(
    ground.x,
    ground.y,
    (r * 1.6 * (1 - clamp(world.h / 6, 0, 0.7))) / 2,
    (r * 0.5) / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fill();

  // The reflection in the hardwood polish.
  if (!game.reducedMotion && world.h < 4) {
    ctx.beginPath();
    ctx.arc(at.x, ground.y + world.h * px * T.reflectSquash, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(palette.amber, T.reflectAlpha);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fillStyle = palette.amber;
  ctx.fill();

  // The seam. It spins with the dribble in hand and with distance in flight, so
  // a ball crossing the court visibly rotates.
  const spin = ball.phase === "held" ? game.dribblePhase * 0.4 : world.x * 0.8;
  ctx.strokeStyle = palette.ballSeam;
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 0.92, spin, spin + Math.PI);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(at.x - r * 0.9, at.y);
  ctx.lineTo(at.x + r * 0.9, at.y);
  ctx.stroke();
}

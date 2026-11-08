/**
 * The top-down fielding camera: the ground from the blimp, the strip, the ball
 * and its trail, ten fielders, and the two runners between the creases.
 *
 * The engine's field units map straight onto this — the boundary is at radius 1
 * and the disc is drawn at `shortestSide * 0.445`, so nothing here has to know
 * how the physics got there.
 */

import { shirtNumberFor, type FinalOverKit } from "../../data/kits";
import type { FieldVector, MatchState } from "../../types";

import type { Point } from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";
import { drawFielderMark, drawRunnerMark } from "./rig";
import { paintGroundFromAbove } from "./stadium";
import { paintBall } from "./batting-view";

export type FieldFrame = {
  width: number;
  height: number;
  state: MatchState;
  palette: ScenePalette;
  kit: FinalOverKit;
  opponentKit: FinalOverKit;
  strikerActorId: string;
  partnerActorId: string;
  trail: readonly FieldVector[];
  seconds: number;
  allowBlur: boolean;
};

export function paintFieldView(
  ctx: CanvasRenderingContext2D,
  frame: FieldFrame,
): void {
  const { width, height, state, palette, opponentKit, trail, seconds, allowBlur } = frame;

  const shortestSide = Math.min(width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = shortestSide * 0.445;

  const at = (v: FieldVector): Point => ({
    x: centerX + v.x * radius,
    y: centerY + v.y * radius,
  });

  paintGroundFromAbove(ctx, width, height, centerX, centerY, radius, palette);

  // The strip.
  const stripWidth = radius * 0.11;
  const stripHeight = radius * 0.46;
  ctx.fillStyle = withAlpha(palette.pitchAbove, 0.85);
  ctx.fillRect(centerX - stripWidth / 2, centerY - stripHeight / 2, stripWidth, stripHeight);

  // Ball trail.
  if (trail.length > 1) {
    ctx.beginPath();
    const first = at(trail[0]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < trail.length; i += 1) {
      const point = at(trail[i]);
      ctx.lineTo(point.x, point.y);
    }
    const lofted = state.contactOutcome?.elevation === "loft";
    ctx.strokeStyle = withAlpha(lofted ? palette.gold : palette.cyan, 0.55);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  const markerRadius = Math.max(7.0, shortestSide * 0.019);
  for (const fielder of state.fielders) {
    drawFielderMark(ctx, at(fielder.position), markerRadius, {
      kit: opponentKit,
      active: fielder.motion === "chasing" || fielder.hasBall,
      facing: { x: fielder.velocity.x, y: fielder.velocity.y },
      palette,
    });
  }

  paintRunners(ctx, at, markerRadius, frame);

  const ball = state.ball;
  if (ball !== null) {
    const center = at(ball.position);
    const r = Math.max(
      4.5,
      shortestSide * (0.012 + Math.min(Math.max(ball.height, 0), 0.3) * 0.04),
    );
    if (ball.aerial) {
      ctx.beginPath();
      ctx.ellipse(center.x, center.y + r * 1.8, r * 1.2, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
      ctx.fill();
    }
    paintBall(ctx, center, r, seconds, palette);
  }

  if (state.phase === "throwInProgress") {
    const holder = state.fielders.find((fielder) => fielder.hasBall);
    if (holder !== undefined) {
      const targetEnd: FieldVector =
        state.runner.runNumber % 2 !== 0 ? { x: 0, y: -0.21 } : { x: 0, y: 0.21 };
      const from = at(holder.position);
      const to = at(targetEnd);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = withAlpha(palette.amber, 0.55);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  void allowBlur;
}

function paintRunners(
  ctx: CanvasRenderingContext2D,
  at: (v: FieldVector) => Point,
  radius: number,
  frame: FieldFrame,
): void {
  const { state, kit, palette, strikerActorId, partnerActorId, allowBlur } = frame;
  const runner = state.runner;

  // Odd runs go one way, even runs come back — the ends alternate with the
  // run number, which is also what the throw target keys off.
  const direction = runner.runNumber % 2 !== 0 ? -1 : 1;
  const startY = direction > 0 ? -0.21 : 0.21;
  const endY = -startY;

  const strikerY = runner.active
    ? startY + (endY - startY) * runner.progress
    : runner.completedRuns % 2 !== 0
      ? -0.21
      : 0.21;
  const nonStrikerY = runner.active
    ? -startY - (endY - startY) * runner.progress
    : -strikerY;

  drawRunnerMark(ctx, at({ x: -0.025, y: strikerY }), radius, {
    kit,
    number: shirtNumberFor(strikerActorId),
    striker: true,
    danger: runner.risk === "danger",
    palette,
    allowBlur,
  });
  drawRunnerMark(ctx, at({ x: 0.025, y: nonStrikerY }), radius, {
    kit,
    number: shirtNumberFor(partnerActorId),
    striker: false,
    palette,
    allowBlur,
  });
}

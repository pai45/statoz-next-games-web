/**
 * The ball, its ground shadow, and the comet trail behind it — a port of
 * `_drawBall` from `tennis_game.dart`.
 *
 * The shadow is what makes the height readable: it stays on the ground where
 * the ball's column meets the court and fades as the ball climbs, so a lob and
 * a drive that cross the same pixel are still told apart.
 */

import type { TennisBall } from "../../engine/simulation";
import type { TrailPoint } from "../../engine/tennis-game";
import { ballPoint, courtPoint, depthOf, type Projection } from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";

export function paintBall(
  ctx: CanvasRenderingContext2D,
  projection: Projection,
  palette: ScenePalette,
  ball: TennisBall,
  trail: TrailPoint[],
): void {
  if (!ball.live) return;

  // The trail fades toward its tail, so the oldest sample is faintest.
  for (let i = 0; i < trail.length; i += 1) {
    const point = trail[i];
    const alpha = ((i + 1) / trail.length) * 0.16;
    const at = ballPoint(projection, point.x, point.y, point.z);
    ctx.beginPath();
    ctx.arc(at.x, at.y, 2.1, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(palette.lime, alpha);
    ctx.fill();
  }

  const floor = courtPoint(projection, ball.x, ball.y);
  const center = ballPoint(projection, ball.x, ball.y, ball.z);
  const radius = 3.4 + depthOf(ball.y) * 1.25;

  ctx.beginPath();
  ctx.ellipse(
    floor.x,
    floor.y + 2,
    (radius * 3.2) / 2,
    (radius * 1.1) / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = withAlpha("#000000", 0.32 - Math.min(0.22, ball.z * 0.055));
  ctx.fill();

  // A soft halo, so the ball stays findable against the court's own green.
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius + 2.2, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(palette.lime, 0.12);
  ctx.fill();

  const felt = ctx.createRadialGradient(
    center.x - 1.2,
    center.y - 1.2,
    0,
    center.x - 1.2,
    center.y - 1.2,
    radius * 1.5,
  );
  felt.addColorStop(0, palette.ballLit);
  felt.addColorStop(1, palette.ballShade);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = felt;
  ctx.fill();

  // The seam: one short arc, which is all that is legible at four pixels.
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.72, -1.1, -1.1 + 1.7);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = withAlpha(palette.text, 0.72);
  ctx.stroke();
}

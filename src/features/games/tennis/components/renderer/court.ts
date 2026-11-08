/**
 * The world behind the play: the stadium wash, the court, the net, and the
 * marker showing where the ball is going to land.
 *
 * Ported from `_drawAtmosphere`, `_drawCourt`, `_drawNet` and `_drawPrediction`
 * in `tennis_game.dart`.
 */

import { courtHalfLength, courtHalfWidth, gravity, serviceLine } from "../../constants";
import type { TennisBall } from "../../engine/simulation";
import { courtPoint, depthOf, type Projection } from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";

/**
 * The bowl the court sits in: a vertical wash, four arcs of crowd, and the
 * lime line marking the front of the stand.
 *
 * The crowd is dots. At this scale nothing more reads as people, and anything
 * more would compete with the ball.
 */
export function paintAtmosphere(
  ctx: CanvasRenderingContext2D,
  projection: Projection,
  palette: ScenePalette,
): void {
  const { width, height } = projection;

  const wash = ctx.createLinearGradient(width * 0.5, 0, width * 0.5, height);
  wash.addColorStop(0, palette.skyTop);
  wash.addColorStop(0.55, palette.background);
  wash.addColorStop(1, palette.skyDeep);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = withAlpha(palette.cyan, 0.08);
  for (let row = 0; row < 4; row += 1) {
    const y = height * (0.07 + row * 0.027);
    for (let i = 0; i < 22; i += 1) {
      const x = ((i + (row % 2 === 1 ? 0.5 : 0)) * width) / 21;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + row * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = withAlpha(palette.lime, 0.18);
  ctx.fillRect(0, height * 0.125, width, 2);
}

/**
 * The court itself.
 *
 * `linePulse` rises when a ball lands out and decays over the next half second,
 * so the perimeter flares at exactly the moment the call is made.
 */
export function paintCourt(
  ctx: CanvasRenderingContext2D,
  projection: Projection,
  palette: ScenePalette,
  linePulse: number,
): void {
  const corners = [
    courtPoint(projection, -courtHalfWidth, -courtHalfLength),
    courtPoint(projection, courtHalfWidth, -courtHalfLength),
    courtPoint(projection, courtHalfWidth, courtHalfLength),
    courtPoint(projection, -courtHalfWidth, courtHalfLength),
  ];

  // A slab of shadow under the court, deeper at the near end — the one thing
  // lifting the surface off the background.
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y + 9);
  for (const point of corners.slice(1)) ctx.lineTo(point.x, point.y + 14);
  ctx.closePath();
  ctx.fillStyle = withAlpha(palette.courtShadow, 0.82);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const point of corners.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();

  const surface = ctx.createLinearGradient(
    corners[0].x,
    corners[0].y,
    corners[2].x,
    corners[2].y,
  );
  surface.addColorStop(0, palette.surfaceNear);
  surface.addColorStop(1, palette.surfaceFar);
  ctx.fillStyle = surface;
  ctx.fill();

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = withAlpha(palette.cyan, 0.52 + linePulse * 0.32);
  ctx.stroke();

  ctx.lineWidth = 1.45;
  ctx.lineCap = "square";
  ctx.strokeStyle = withAlpha(palette.text, 0.84);

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const from = courtPoint(projection, x1, y1);
    const to = courtPoint(projection, x2, y2);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  line(-courtHalfWidth, -courtHalfLength, -courtHalfWidth, courtHalfLength);
  line(courtHalfWidth, -courtHalfLength, courtHalfWidth, courtHalfLength);
  for (const y of [-courtHalfLength, -serviceLine, serviceLine, courtHalfLength]) {
    line(-courtHalfWidth, y, courtHalfWidth, y);
  }
  // The centre service line, which stops at the service lines rather than
  // running the whole length.
  line(0, -serviceLine, 0, serviceLine);
}

/**
 * The net.
 *
 * Drawn as a flat grid at the court's midline rather than in perspective: the
 * camera is shallow enough that a projected net would read as a smear. It
 * ripples on `netPulse`, which the engine raises when the ball clips the cord.
 */
export function paintNet(
  ctx: CanvasRenderingContext2D,
  projection: Projection,
  palette: ScenePalette,
  netPulse: number,
  clock: number,
): void {
  const left = courtPoint(projection, -courtHalfWidth - 0.25, 0);
  const right = courtPoint(projection, courtHalfWidth + 0.25, 0);
  const height = 18;
  const pulse = netPulse * 3;

  ctx.lineWidth = 0.8;
  ctx.strokeStyle = withAlpha(palette.text, 0.56 + netPulse * 0.3);

  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const x = left.x + (right.x - left.x) * t;
    ctx.beginPath();
    ctx.moveTo(x, left.y - height + Math.sin(clock * 18 + i) * pulse);
    ctx.lineTo(x, left.y);
    ctx.stroke();
  }
  for (let i = 0; i <= 4; i += 1) {
    const y = left.y - height + (i * height) / 4;
    ctx.beginPath();
    ctx.moveTo(left.x, y);
    ctx.lineTo(right.x, y);
    ctx.stroke();
  }

  ctx.lineWidth = 2.1;
  ctx.strokeStyle = withAlpha(palette.text, 0.92);
  ctx.beginPath();
  ctx.moveTo(left.x, left.y - height);
  ctx.lineTo(right.x, right.y - height);
  ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = palette.cyan;
  for (const post of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(post.x, post.y);
    ctx.lineTo(post.x, post.y - height - 4);
    ctx.stroke();
  }
}

/**
 * Solve where the ball will first touch down, by finding when its height
 * reaches zero. The smaller positive root is the one that matters — the other
 * is the parabola's mirror, behind the ball.
 */
export function solveLanding(ball: TennisBall): { x: number; y: number } | null {
  if (!ball.live) return null;
  const a = gravity * 0.5;
  const discriminant = ball.vz * ball.vz - 4 * a * ball.z;
  if (discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const roots = [(-ball.vz + root) / (2 * a), (-ball.vz - root) / (2 * a)]
    .filter((value) => value > 0.01)
    .sort((first, second) => first - second);
  if (roots.length === 0) return null;

  const t = roots[0];
  return { x: ball.x + ball.vx * t, y: ball.y + ball.vy * t };
}

/**
 * The landing marker: an ellipse where the ball will bounce.
 *
 * It brightens and grows on a focus point, which is the only cue that the
 * player's banked focus is being spent.
 */
export function paintLandingMarker(
  ctx: CanvasRenderingContext2D,
  projection: Projection,
  palette: ScenePalette,
  landing: { x: number; y: number },
  focusActive: boolean,
): void {
  if (Math.abs(landing.y) > courtHalfLength + 2) return;

  const center = courtPoint(projection, landing.x, landing.y);
  const color = focusActive ? palette.lime : palette.cyan;
  const alpha = focusActive ? 0.74 : 0.32;

  ctx.beginPath();
  ctx.ellipse(
    center.x,
    center.y,
    (focusActive ? 34 : 26) / 2,
    12 / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.lineWidth = focusActive ? 2.4 : 1.3;
  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center.x, center.y, focusActive ? 3.5 : 2.5, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(color, alpha);
  ctx.fill();
}

export { depthOf };

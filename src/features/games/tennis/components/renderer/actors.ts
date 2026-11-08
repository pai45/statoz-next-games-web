/**
 * The two athletes, drawn as jointed stick figures — a port of `_drawPlayer`
 * from `tennis_game.dart`.
 *
 * There is no skeleton and no animation system. A body is a hip, a shoulder and
 * a head stacked off the feet, with the racket arm placed by whichever shot is
 * mid-swing; the legs stride off a sine of the wall clock. Everything scales
 * with depth, so the far athlete is smaller without a second set of numbers.
 */

import type { TennisBody } from "../../engine/simulation";
import type { TennisShotType } from "../../types";
import { courtPoint, depthOf, type Projection, type ScreenPoint } from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";

function translate(point: ScreenPoint, dx: number, dy: number): ScreenPoint {
  return { x: point.x + dx, y: point.y + dy };
}

function stroke(
  ctx: CanvasRenderingContext2D,
  from: ScreenPoint,
  to: ScreenPoint,
  color: string,
  width: number,
  cap: CanvasLineCap = "round",
): void {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.stroke();
}

/**
 * Where the racket hand sits for a given shot, as a fraction through its swing.
 *
 * Serves and smashes reach up and come down; slices and drops stay low and
 * across; everything else sweeps from behind the body to in front of it.
 */
function racketHandFor(
  shoulder: ScreenPoint,
  shot: TennisShotType | null,
  swing: number,
  backhand: boolean,
  scale: number,
): ScreenPoint {
  if (swing <= 0) return translate(shoulder, 10 * scale, 10 * scale);

  if (shot === "smash" || shot === "serve") {
    return translate(
      shoulder,
      (backhand ? -8 : 8) * scale,
      (-24 + 16 * swing) * scale,
    );
  }
  if (shot === "slice" || shot === "dropShot") {
    return translate(
      shoulder,
      (backhand ? -22 : 22) * scale,
      (4 + 13 * swing) * scale,
    );
  }
  return translate(
    shoulder,
    (backhand ? -26 : 26) * scale * (0.35 + swing),
    (8 - 15 * swing) * scale,
  );
}

export function paintAthlete(
  ctx: CanvasRenderingContext2D,
  projection: Projection,
  palette: ScenePalette,
  body: TennisBody,
  options: {
    /** The ball's x, which decides forehand or backhand. */
    ballX: number;
    clock: number;
    /** Only the player's own body gets the focus ring. */
    focusRing: boolean;
  },
): void {
  const feet = courtPoint(projection, body.x, body.y);
  const scale = 0.58 + depthOf(body.y) * 0.48;

  // Ground shadow, drawn first so everything else sits on it.
  ctx.beginPath();
  ctx.ellipse(feet.x, feet.y + 3, (28 * scale) / 2, (7 * scale) / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha("#000000", 0.38);
  ctx.fill();

  // `swingT` counts down from the shot's duration; ×3.2 turns the tail of that
  // countdown into a 0..1 that peaks at contact and eases out.
  const swing = body.swingT > 0 ? Math.min(1, body.swingT * 3.2) : 0;
  const backhand = options.ballX < body.x;
  const lean = body.swingShot === "smash" ? -5 : 0;

  const hip = translate(feet, 0, -19 * scale + lean * scale);
  const shoulder = translate(hip, 0, -22 * scale);
  const head = translate(shoulder, 0, -11 * scale);
  const stride = Math.sin(options.clock * 9 + body.team) * 4 * scale;

  stroke(
    ctx,
    translate(hip, -3 * scale, 0),
    translate(feet, -6 * scale + stride, -1),
    palette.shorts,
    7 * scale,
  );
  stroke(
    ctx,
    translate(hip, 3 * scale, 0),
    translate(feet, 6 * scale - stride, -1),
    palette.shorts,
    7 * scale,
  );
  stroke(ctx, hip, shoulder, palette.shirt, 12 * scale);

  const freeHand = translate(shoulder, (backhand ? 7 : -7) * scale, 12 * scale);
  stroke(ctx, shoulder, freeHand, palette.skin, 6 * scale);

  const racketHand = racketHandFor(shoulder, body.swingShot, swing, backhand, scale);
  stroke(ctx, shoulder, racketHand, palette.skin, 6 * scale);

  const racketEnd = translate(racketHand, (backhand ? -1 : 1) * 14 * scale, -5 * scale);
  stroke(ctx, racketHand, racketEnd, palette.border, 2.2 * scale, "butt");

  const headCenter = translate(racketEnd, (backhand ? -1 : 1) * 6 * scale, -2);
  ctx.beginPath();
  ctx.ellipse(
    headCenter.x,
    headCenter.y,
    (12 * scale) / 2,
    (18 * scale) / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = palette.cyan;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(head.x, head.y, 7.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = palette.skin;
  ctx.fill();

  // Hair is the top half of a ring around the head — a cap, not a shape.
  ctx.beginPath();
  ctx.arc(head.x, head.y - 1, 7.8 * scale, Math.PI, Math.PI * 2);
  ctx.lineWidth = 4 * scale;
  ctx.strokeStyle = palette.hair;
  ctx.stroke();

  if (options.focusRing) {
    ctx.beginPath();
    ctx.arc(hip.x, hip.y, 28 * scale, 0, Math.PI * 2);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = withAlpha(palette.lime, 0.5);
    ctx.stroke();
  }
}

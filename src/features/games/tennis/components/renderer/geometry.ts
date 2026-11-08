/**
 * The camera — how a point on the court becomes a point on the screen.
 *
 * Ported verbatim from `_courtPoint` / `_ballPoint` / `_depth` in
 * `tennis_game.dart`. It is a fake perspective and deliberately so: depth is a
 * plain 0..1 along the court's length, and both the vertical position and the
 * court's half-width are lerped against it. Two lerps and a multiply, no matrix
 * — which is why the far baseline sits at 17% of the height and the near one at
 * 80%, rather than wherever a real projection would put them.
 *
 * The fixed pixel sizes elsewhere in the renderer are tuned for the 390–520px
 * column Flutter constrains the match to, and are not scaled. The play column
 * caps at that width for the same reason.
 */

import { courtHalfLength, courtHalfWidth } from "../../constants";

export type Projection = {
  width: number;
  height: number;
  /** Rises with the camera kick; 1 when the court is at rest. */
  zoom: number;
};

export type ScreenPoint = { x: number; y: number };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 0 at the far baseline, 1 at the near one. Everything else scales off this. */
export function depthOf(y: number): number {
  return clamp01((y + courtHalfLength) / (courtHalfLength * 2));
}

export function projectionFor(width: number, height: number, cameraPush: number): Projection {
  return { width, height, zoom: 1 + cameraPush * 0.025 };
}

/** Where a point on the ground plane lands on screen. */
export function courtPoint(
  projection: Projection,
  x: number,
  y: number,
): ScreenPoint {
  const { width, height, zoom } = projection;
  const depth = depthOf(y);
  const courtY = lerp(height * 0.17, height * 0.8, depth);
  const halfWidth = lerp(width * 0.245, width * 0.475, depth);

  return {
    x: width / 2 + (x / courtHalfWidth) * halfWidth * zoom,
    y: height / 2 + (courtY - height / 2) * zoom,
  };
}

/**
 * Where a point in the air lands on screen.
 *
 * Height lifts more the nearer the ball is, which is the only thing selling the
 * third dimension — a ball at the far baseline barely rises, one at the near
 * baseline climbs almost twice as fast.
 */
export function ballPoint(
  projection: Projection,
  x: number,
  y: number,
  z: number,
): ScreenPoint {
  const floor = courtPoint(projection, x, y);
  return { x: floor.x, y: floor.y - z * (14 + depthOf(y) * 10) };
}

export { clamp01, lerp };

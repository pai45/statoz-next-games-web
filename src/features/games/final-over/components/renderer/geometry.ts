/**
 * The one perspective projection every element in the batting camera shares —
 * the web port of `FinalOverBattingProjection`.
 *
 * The pitch is a trapezoid between a far line just under the horizon and a near
 * line just above the control deck. Everything on it is placed by depth (0 at
 * the bowler, 1 at the batter) and a lateral offset in the engine's own field
 * units, so a delivery's `contactX` maps straight onto the screen.
 */

import { bounceProgress, horizonFraction } from "../../constants";
import { clamp, type DeliveryLength, type DeliverySpec, type MatchPhase } from "../../types";

export type Point = { x: number; y: number };

export type BattingProjection = {
  width: number;
  height: number;
  farY: number;
  nearY: number;
  farHalfWidth: number;
  nearHalfWidth: number;
  centerX: number;
};

export function battingProjection(
  width: number,
  height: number,
  controlDeckTop: number | null,
): BattingProjection {
  const farY = height * (horizonFraction + 0.055);
  const requestedNearY = (controlDeckTop ?? height * 0.78) - 12;
  const bandedNearY = clamp(requestedNearY, height * 0.68, height * 0.78);
  // Prefer the 68–78% band, but let the measured deck win on compact screens:
  // the pitch may shrink further, never overlap the controls.
  const nearY = Math.min(bandedNearY, requestedNearY);

  return {
    width,
    height,
    farY,
    nearY,
    farHalfWidth: width * 0.042,
    nearHalfWidth: width * 0.21 * 0.82,
    centerX: width * 0.5,
  };
}

export function halfWidthAt(projection: BattingProjection, depth: number): number {
  return (
    projection.farHalfWidth +
    (projection.nearHalfWidth - projection.farHalfWidth) * clamp(depth, 0, 1)
  );
}

export function pointAt(
  projection: BattingProjection,
  depth: number,
  lateral = 0,
): Point {
  const d = clamp(depth, 0, 1);
  const lateralScale = projection.width * (0.55 + (1.25 - 0.55) * d);
  return {
    x: projection.centerX + lateral * lateralScale,
    y: projection.farY + (projection.nearY - projection.farY) * d,
  };
}

export function incomingPoint(
  projection: BattingProjection,
  delivery: DeliverySpec,
  progress: number,
): Point {
  return pointAt(
    projection,
    0.08 + 0.78 * clamp(progress, 0, 1),
    delivery.lineX + delivery.movement,
  );
}

export function bouncePoint(
  projection: BattingProjection,
  delivery: DeliverySpec,
): Point {
  return incomingPoint(projection, delivery, bounceProgress[delivery.length]);
}

/**
 * The marker is up while the ball is still short of where it will pitch, and
 * through the whole of the walk-back and run-up before that.
 */
export function shouldShowBounceMarker(
  phase: MatchPhase,
  suspendedPhase: MatchPhase | null,
  length: DeliveryLength,
  incomingProgress: number,
): boolean {
  const activePhase = phase === "paused" ? suspendedPhase : phase;
  return (
    activePhase === "deliveryPreparation" ||
    activePhase === "bowlerRunUp" ||
    (activePhase === "incomingBall" && incomingProgress < bounceProgress[length])
  );
}

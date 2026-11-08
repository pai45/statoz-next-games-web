import {
  cameraAnchorFraction,
  trackWidthFraction,
  viewAheadMeters,
} from "../../constants";
import { bendCompression, trackHalfWidth } from "../../tuning";
import { raceCenterlineX } from "../../engine/geometry";
import type { RaceField } from "../../engine/field";

/**
 * World to screen, for a pseudo-3D scroller that is really flat.
 *
 * The player's car holds one fixed row of the canvas and the road slides
 * underneath it. A car's screen position is therefore its distance behind or
 * ahead of the player, scaled; and its lateral offset from a centerline that
 * itself wanders sideways through the corners.
 *
 * `bendPxPerMeter` is the one figure the physics also holds. The road is drawn
 * with curvature compressed to a fifth of lane widths — otherwise a thirty
 * metre bend would sweep straight off the side of the canvas — and the engine
 * drifts the car wide by exactly the same ratio. Change one without the other
 * and the car starts sliding across a road it is supposed to be on.
 */

export type RaceProjection = {
  width: number;
  height: number;
  /** Vertical pixels per metre, sized to show the road ahead. */
  pxPerMeterY: number;
  /** Lateral pixels per metre, sized so the asphalt spans its share of width. */
  pxPerMeterX: number;
  bendPxPerMeter: number;
  /** The player car's screen row. */
  anchorY: number;
  /** How far up the road is still on screen, in metres. */
  aheadMeters: number;
  /** The centerline offset under the player, which the camera locks onto. */
  cameraRefX: number;
};

export function raceProjection(
  field: RaceField,
  width: number,
  height: number,
): RaceProjection {
  const anchorY = height * cameraAnchorFraction;
  const pxPerMeterY = Math.max(3, anchorY / viewAheadMeters);
  const pxPerMeterX = (width * trackWidthFraction) / (trackHalfWidth * 2);
  const bendPxPerMeter = pxPerMeterX * bendCompression;

  return {
    width,
    height,
    pxPerMeterY,
    pxPerMeterX,
    bendPxPerMeter,
    anchorY,
    aheadMeters: anchorY / pxPerMeterY + 20,
    // Locked exactly onto the centerline under the player, so the car keeps a
    // fixed horizontal position and only moves when it is steered. Any
    // smoothing here reads as the car sliding sideways on its own through a
    // bend, which is precisely the bug it would look like.
    cameraRefX:
      raceCenterlineX(field.circuit, field.sectionStarts, field.player.distance) *
      bendPxPerMeter,
  };
}

export type ScreenPoint = { x: number; y: number };

export function worldToScreen(
  field: RaceField,
  projection: RaceProjection,
  distance: number,
  lateral: number,
): ScreenPoint {
  const bend =
    raceCenterlineX(field.circuit, field.sectionStarts, distance) *
    projection.bendPxPerMeter;
  return {
    x:
      projection.width / 2 +
      (bend - projection.cameraRefX) +
      lateral * projection.pxPerMeterX,
    y:
      projection.anchorY -
      (distance - field.player.distance) * projection.pxPerMeterY,
  };
}

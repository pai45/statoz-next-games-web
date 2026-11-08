/**
 * The one world→screen mapping every element on the court shares.
 *
 * Flutter's Flame layer is two lines: `pxPerUnit = size.x / 8.2` and
 * `floorY = size.y * 0.62`. A phone is the only viewport it ever runs on, so
 * eight and a bit metres across the screen is the framing, full stop.
 *
 * The web has to answer for a 1440px window too, and the naive rule there is
 * wrong in a specific way: it does not show *more court*, it makes the athletes
 * enormous — a 1.95m guard would stand 342px tall. So the scale is additionally
 * capped by viewport height. Below roughly a 1:1 aspect the width rule wins and
 * the framing is Flutter's, pixel for pixel; on a wide screen the height rule
 * wins, the athletes keep the size they have on a phone relative to the court,
 * and the extra width simply reveals more of the floor. The engine's camera
 * clamp already handles running out of court at either end.
 */

import { courtMaxX, courtMinX } from "../../tuning";

export type CourtProjection = {
  width: number;
  height: number;
  /** Pixels per world metre. */
  px: number;
  /** Screen y of the floor line — where a body's feet sit at h = 0. */
  floorY: number;
};

/** Flutter's framing: 8.2 world metres across the width of a phone. */
const metresAcrossPhone = 8.2;

/**
 * The height divisor that keeps an athlete the same fraction of the viewport a
 * phone gives them. Derived from the phone case rather than picked: at 390×844
 * the width rule yields 47.6 px/m, and 844/8.8 is comfortably above it, so a
 * phone still takes Flutter's framing exactly.
 */
const heightDivisor = 8.8;

/** Where the floor line sits, as a fraction of viewport height. */
const floorFraction = 0.62;

export function courtProjection(width: number, height: number): CourtProjection {
  return {
    width,
    height,
    px: Math.min(width / metresAcrossPhone, height / heightDivisor),
    floorY: height * floorFraction,
  };
}

export type ScreenPoint = { x: number; y: number };

/**
 * World (court x, height above the floor) to screen pixels.
 *
 * `camX` is the world x held at the centre of the screen, and `shake` is the
 * camera's own offset — both come from the game loop, which owns them because
 * neither is a rule and neither should cost a React render.
 */
export function worldToScreen(
  projection: CourtProjection,
  camX: number,
  shake: ScreenPoint,
  x: number,
  h: number,
): ScreenPoint {
  return {
    x: (x - camX) * projection.px + projection.width / 2 + shake.x,
    y: projection.floorY - h * projection.px + shake.y,
  };
}

/** How many world metres fit either side of the camera. */
export function halfViewMetres(projection: CourtProjection): number {
  return projection.width / 2 / projection.px;
}

/**
 * The camera's allowed range, so the view never runs past the ends of the
 * court. When the whole court fits — which a wide desktop window does — the two
 * bounds cross and the camera simply parks at the middle.
 */
export function cameraBounds(projection: CourtProjection): {
  min: number;
  max: number;
} {
  const halfView = halfViewMetres(projection);
  return {
    min: courtMinX - 0.4 + halfView,
    max: courtMaxX + 0.6 - halfView,
  };
}

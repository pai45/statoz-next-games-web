/**
 * The easing and interval maths the result scene runs on.
 *
 * Flutter gets `Curves.easeOutCubic` and `Interval` from the framework; the web
 * has neither outside CSS, and the scene is driven from JavaScript rather than
 * keyframes, so the handful actually used are written out here.
 */

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Where `t` sits inside one beat of the timeline, as its own 0..1. */
export function interval(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp01((t - start) / (end - start));
}

export function easeIn(t: number): number {
  return t * t;
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Overshoots past one before settling — what the verdict stamp lands on. */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** A quadratic Bezier point, for the ball's arc from the spot to the target. */
export function quadraticBezier(
  from: { x: number; y: number },
  control: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const inverse = 1 - t;
  const a = inverse * inverse;
  const b = 2 * inverse * t;
  const c = t * t;

  return {
    x: a * from.x + b * control.x + c * to.x,
    y: a * from.y + b * control.y + c * to.y,
  };
}

/* ---- Flutter's named curves --------------------------------------------- */

/**
 * The easings above are the polynomial shorthands the shootout was written
 * against. Flutter's `Curves.*` are cubic Béziers solved numerically, and they
 * are visibly different — `easeOutCubic` as a Bézier sits well above
 * `1 - (1 - t)³` through the middle of its run.
 *
 * Final Over's renderer is a frame-for-frame port of a Flutter canvas, so it
 * needs the real thing. Both live here; neither replaces the other.
 */

const cubicErrorBound = 0.001;

function evaluateCubic(a: number, b: number, m: number): number {
  return (
    3 * a * (1 - m) * (1 - m) * m + 3 * b * (1 - m) * m * m + m * m * m
  );
}

/**
 * Flutter's `Cubic.transformInternal`, bisection and error bound included, so
 * the value at any `t` matches the Dart original rather than merely resembling
 * it.
 */
export function cubicCurve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (t: number) => number {
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let start = 0;
    let end = 1;
    for (;;) {
      const midpoint = (start + end) / 2;
      const estimate = evaluateCubic(x1, x2, midpoint);
      if (Math.abs(t - estimate) < cubicErrorBound) {
        return evaluateCubic(y1, y2, midpoint);
      }
      if (estimate < t) {
        start = midpoint;
      } else {
        end = midpoint;
      }
    }
  };
}

export const easeInCubicCurve = cubicCurve(0.55, 0.055, 0.675, 0.19);
export const easeOutCubicCurve = cubicCurve(0.215, 0.61, 0.355, 1.0);
export const easeInOutCubicCurve = cubicCurve(0.645, 0.045, 0.355, 1.0);

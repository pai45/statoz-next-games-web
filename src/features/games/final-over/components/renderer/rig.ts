import { typography } from "@statoz/design-system/games/tokens/typography";
/**
 * Procedural athlete rendering for Final Over — the web port of the app's
 * `games/final_over/final_over_rig.dart` and the `rigLimb` primitives it builds
 * on.
 *
 * No sprites. Limbs are thick round-cap strokes with IK-lite elbows and knees,
 * only the hip, shoulder and head are ever stored, and every pose is a *pure
 * function* of the engine's state — so what you see is a projection of
 * `MatchState`, never an animation the renderer invented.
 *
 * Cricket adds four things a footballer has no word for: a bat, a helmet with a
 * grille, leg pads, and batting gloves. All are built from the same primitives.
 */

import { easeInCubicCurve, easeInOutCubicCurve } from "../../../shared/engine/curves";
import { referenceHeightMetres } from "../../constants";
import type { FinalOverKit, FinalOverLook } from "../../data/kits";
import { clamp } from "../../types";

import type { Point } from "./geometry";
import { darken, umpireLook, withAlpha, type ScenePalette } from "./palette";

/* ---- Poses --------------------------------------------------------------- */

export type RigPose = {
  hip: number;
  lean: number;
  footNear: Point;
  footFar: Point;
  handNear: Point;
  handFar: Point;
  headBob: number;
};

export type BatterPoseKind =
  | "stance"
  | "backlift"
  | "groundOff"
  | "groundStraight"
  | "groundLeg"
  | "groundBack"
  | "loftOff"
  | "loftStraight"
  | "loftLeg"
  | "loftBack"
  | "miss"
  | "bowled"
  | "running"
  | "slide"
  | "celebrate";

export type BowlerPoseKind = "ready" | "runUp" | "gather" | "release" | "followThrough";

export type UmpireSignal = "idle" | "four" | "six" | "out";

/**
 * A batter is a pose plus the one thing a footballer never has: a bat angle, in
 * radians from the +x axis. Canvas y grows down, so a negative angle points
 * up-and-forward.
 */
export type BatterFrame = { pose: RigPose; batAngle: number };

const pt = (x: number, y: number): Point => ({ x, y });

/** Flutter's `_swing` — eased interpolation on `Curves.easeInOutCubic`. */
function swing(a: number, b: number, t: number): number {
  return a + (b - a) * easeInOutCubicCurve(clamp(t, 0, 1));
}

export function batterFrame(
  kind: BatterPoseKind,
  t: number,
  runPhase = 0,
): BatterFrame {
  switch (kind) {
    case "stance": {
      // Front-foot-forward guard: crouched, weight forward, both hands gripping
      // the handle out in front of the thigh with the bat hanging down toward
      // the front pad. This is also the baseline `backlift` animates *from*, so
      // pressing to swing never jumps silhouettes.
      const breathe = Math.sin(t * 2.4) * 0.015;
      return {
        pose: {
          hip: 0.8 + breathe,
          lean: 0.3,
          footNear: pt(0.28, 0),
          footFar: pt(-0.2, 0),
          handNear: pt(0.2, 0.6),
          handFar: pt(0.16, 0.64),
          headBob: breathe,
        },
        batAngle: 1.45,
      };
    }

    case "backlift": {
      const k = clamp(t, 0, 1);
      // `t` grows past 1 for as long as the hold continues; the overflow drives
      // an idle coil so a long hold reads as tense rather than frozen.
      const overflow = Math.max(0, t - 1);
      const coil = Math.sin(overflow * 5.0) * 0.014;
      return {
        pose: {
          hip: 0.8 + coil,
          lean: 0.3 - k * 0.1 + coil * 0.6,
          footNear: pt(0.28, 0),
          footFar: pt(-0.2, 0),
          handNear: pt(0.2 - k * 0.16, 0.6 - k * 1.26),
          handFar: pt(0.16 - k * 0.16, 0.64 - k * 1.36),
          headBob: coil * 0.7,
        },
        batAngle: swing(1.45, -2.35, k),
      };
    }

    case "groundOff":
    case "groundStraight":
    case "groundLeg":
    case "groundBack": {
      const k = clamp(t, 0, 1);
      const lateral =
        kind === "groundOff" ? -0.2 : kind === "groundLeg" ? 0.22 : kind === "groundBack" ? -0.08 : 0;
      const finishAngle =
        kind === "groundOff"
          ? -0.05
          : kind === "groundStraight"
            ? 0.35
            : kind === "groundLeg"
              ? 0.76
              : 1.18;
      const behind = kind === "groundBack";
      return {
        pose: {
          hip: swing(0.86, behind ? 0.88 : 0.8, k),
          lean: swing(0.12, behind ? 0.08 : 0.46, k),
          footNear: pt(swing(0.18, behind ? 0.1 : 0.34, k), 0),
          footFar: pt(behind ? -0.34 : -0.24, 0),
          handNear: pt(
            swing(-0.02, (behind ? 0.02 : 0.44) + lateral, k),
            swing(-0.62, behind ? 0.02 : -0.24, k),
          ),
          handFar: pt(
            swing(-0.06, (behind ? -0.04 : 0.36) + lateral, k),
            swing(-0.68, behind ? -0.04 : -0.32, k),
          ),
          headBob: 0,
        },
        batAngle: swing(-2.35, finishAngle, k),
      };
    }

    case "loftOff":
    case "loftStraight":
    case "loftLeg":
    case "loftBack": {
      const k = clamp(t, 0, 1);
      const lateral =
        kind === "loftOff" ? -0.22 : kind === "loftLeg" ? 0.24 : kind === "loftBack" ? -0.1 : 0;
      const finishAngle =
        kind === "loftOff"
          ? -1.55
          : kind === "loftStraight"
            ? -1.15
            : kind === "loftLeg"
              ? -0.72
              : 0.42;
      const behind = kind === "loftBack";
      // Front leg braces, torso opens up, hands finish high over the shoulder.
      return {
        pose: {
          hip: swing(0.86, behind ? 0.9 : 0.94, k),
          lean: swing(0.14, behind ? -0.04 : -0.3, k),
          footNear: pt(
            swing(0.18, behind ? 0.08 : 0.38, k),
            swing(0, behind ? 0.02 : 0.1, k),
          ),
          footFar: pt(behind ? -0.34 : -0.26, 0),
          handNear: pt(
            swing(-0.02, (behind ? -0.02 : 0.3) + lateral, k),
            swing(-0.6, behind ? -0.7 : -0.96, k),
          ),
          handFar: pt(
            swing(-0.06, (behind ? -0.08 : 0.22) + lateral, k),
            swing(-0.66, behind ? -0.78 : -1.0, k),
          ),
          headBob: k * 0.02,
        },
        batAngle: swing(-2.35, finishAngle, k),
      };
    }

    case "miss": {
      // Swung through thin air — bat past the body, head chasing it.
      const k = clamp(t, 0, 1);
      return {
        pose: {
          hip: swing(0.86, 0.84, k),
          lean: swing(0.1, 0.3, k),
          footNear: pt(0.22, 0),
          footFar: pt(-0.24, 0),
          handNear: pt(swing(-0.02, 0.2, k), swing(-0.6, -0.5, k)),
          handFar: pt(swing(-0.06, 0.12, k), swing(-0.66, -0.56, k)),
          headBob: -0.02 * k,
        },
        batAngle: swing(-2.35, -0.1, k),
      };
    }

    case "bowled": {
      // The slump. Everything sags toward the stumps behind.
      const sag = Math.min(1, t * 2.4);
      return {
        pose: {
          hip: 0.86 - sag * 0.1,
          lean: 0.1 + sag * 0.34,
          footNear: pt(0.2, 0),
          footFar: pt(-0.2, 0),
          handNear: pt(0.16, -0.26 + sag * 0.08),
          handFar: pt(0.1, -0.3 + sag * 0.08),
          headBob: -0.07 * sag,
        },
        batAngle: swing(-0.4, 1.6, sag),
      };
    }

    case "running": {
      const s = Math.sin(runPhase);
      return {
        pose: {
          hip: 0.9 + Math.abs(Math.sin(runPhase * 2)) * 0.03,
          lean: 0.36,
          footNear: pt(s * 0.4, Math.max(0, Math.sin(runPhase)) * 0.14),
          footFar: pt(-s * 0.4, Math.max(0, -Math.sin(runPhase)) * 0.14),
          handNear: pt(-s * 0.2 + 0.1, -0.44),
          handFar: pt(s * 0.24 - 0.08, -0.46),
          headBob: 0,
        },
        batAngle: -0.6,
      };
    }

    case "slide": {
      // Bat stretched out for the crease.
      const k = clamp(t, 0, 1);
      return {
        pose: {
          hip: swing(0.8, 0.44, k),
          lean: swing(0.5, 0.95, k),
          footNear: pt(swing(0.3, -0.28, k), 0),
          footFar: pt(swing(-0.2, -0.52, k), 0.04),
          handNear: pt(swing(0.34, 0.62, k), swing(-0.3, 0.02, k)),
          handFar: pt(0.1, -0.34),
          headBob: 0,
        },
        batAngle: 0.2,
      };
    }

    case "celebrate": {
      const pump = Math.abs(Math.sin(t * 9));
      return {
        pose: {
          hip: 0.94 + pump * 0.05,
          lean: -0.14,
          footNear: pt(0.18, 0),
          footFar: pt(-0.18, 0),
          handNear: pt(0.12, -1.08 - pump * 0.08),
          handFar: pt(-0.18, -0.58),
          headBob: pump * 0.03,
        },
        batAngle: -1.7,
      };
    }
  }
}

export function bowlerPose(
  kind: BowlerPoseKind,
  t: number,
  runPhase = 0,
): RigPose {
  switch (kind) {
    case "ready": {
      const breathe = Math.sin(t * 2.0) * 0.015;
      return {
        hip: 0.92 + breathe,
        lean: 0.06,
        footNear: pt(0.14, 0),
        footFar: pt(-0.14, 0),
        handNear: pt(0.14, -0.44),
        handFar: pt(-0.02, -0.48),
        headBob: breathe,
      };
    }
    case "runUp": {
      const s = Math.sin(runPhase);
      return {
        hip: 0.9 + Math.abs(Math.sin(runPhase * 2)) * 0.03,
        lean: 0.3,
        footNear: pt(s * 0.44, Math.max(0, Math.sin(runPhase)) * 0.16),
        footFar: pt(-s * 0.44, Math.max(0, -Math.sin(runPhase)) * 0.16),
        handNear: pt(-s * 0.22 + 0.1, -0.46),
        handFar: pt(s * 0.18 - 0.04, -0.5),
        headBob: 0,
      };
    }
    case "gather": {
      // Coil: front knee up, bowling arm cocked back and low.
      const k = clamp(t, 0, 1);
      return {
        hip: swing(0.9, 0.98, k),
        lean: swing(0.3, -0.16, k),
        footNear: pt(swing(0.3, 0.16, k), swing(0.02, 0.4, k)),
        footFar: pt(swing(-0.3, -0.34, k), 0),
        handNear: pt(swing(0.1, 0.26, k), swing(-0.46, -0.72, k)),
        handFar: pt(swing(-0.04, -0.34, k), swing(-0.5, -0.1, k)),
        headBob: 0,
      };
    }
    case "release": {
      // The arm comes over the top. `snap` is the whole point of the pose.
      const snap = clamp(t, 0, 1);
      const armAngle = -2.25 + 2.75 * easeInCubicCurve(snap);
      return {
        hip: swing(0.98, 0.88, snap),
        lean: swing(-0.16, 0.42, snap),
        footNear: pt(swing(0.16, 0.4, snap), swing(0.4, 0, snap)),
        footFar: pt(swing(-0.34, -0.3, snap), 0),
        handNear: pt(Math.cos(armAngle) * 0.52, Math.sin(armAngle) * 0.52 - 0.36),
        handFar: pt(swing(-0.34, 0.18, snap), swing(-0.1, -0.52, snap)),
        headBob: 0,
      };
    }
    case "followThrough": {
      const k = clamp(t, 0, 1);
      return {
        hip: swing(0.88, 0.9, k),
        lean: swing(0.42, 0.26, k),
        footNear: pt(swing(0.4, 0.2, k), 0),
        footFar: pt(swing(-0.3, -0.36, k), swing(0, 0.14, k)),
        handNear: pt(swing(0.3, 0.06, k), swing(0.1, -0.4, k)),
        handFar: pt(swing(0.18, -0.16, k), swing(-0.52, -0.44, k)),
        headBob: 0,
      };
    }
  }
}

/**
 * The signals are the cheapest, loudest feedback in cricket — the crowd knows
 * it is a six because a man in a hat raised both arms.
 */
export function umpirePose(signal: UmpireSignal, t: number): RigPose {
  switch (signal) {
    case "idle": {
      const breathe = Math.sin(t * 1.8) * 0.012;
      return {
        hip: 0.92 + breathe,
        lean: 0.02,
        footNear: pt(0.12, 0),
        footFar: pt(-0.12, 0),
        handNear: pt(0.1, -0.2),
        handFar: pt(-0.1, -0.2),
        headBob: breathe,
      };
    }
    case "four": {
      const k = Math.min(1, t * 3);
      const wave = Math.sin(t * 7) * 0.1 * k;
      return {
        hip: 0.92,
        lean: 0.04,
        footNear: pt(0.14, 0),
        footFar: pt(-0.14, 0),
        handNear: pt(swing(0.1, -0.44, k) + wave, swing(-0.2, -0.52, k)),
        handFar: pt(-0.12, -0.2),
        headBob: 0,
      };
    }
    case "six": {
      const k = Math.min(1, t * 3.4);
      return {
        hip: 0.92 + k * 0.03,
        lean: 0,
        footNear: pt(0.14, 0),
        footFar: pt(-0.14, 0),
        handNear: pt(0.12, swing(-0.2, -1.14, k)),
        handFar: pt(-0.12, swing(-0.2, -1.12, k)),
        headBob: 0,
      };
    }
    case "out": {
      const k = Math.min(1, t * 3.2);
      return {
        hip: 0.92,
        lean: 0.02,
        footNear: pt(0.12, 0),
        footFar: pt(-0.12, 0),
        handNear: pt(swing(0.1, 0.16, k), swing(-0.2, -1.1, k)),
        handFar: pt(-0.1, -0.2),
        headBob: 0,
      };
    }
  }
}

/* ---- Drawing ------------------------------------------------------------- */

export type HeadGear = "helmet" | "cap" | "hat";

type Stroke = { color: string; width: number };

function line(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  stroke: Stroke,
): void {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.stroke();
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scalePoint(a: Point, k: number): Point {
  return { x: a.x * k, y: a.y * k };
}

/**
 * Two-segment limb: the joint is the midpoint pushed along the segment normal.
 * The sign of `bend` picks which way it buckles — negative for knees (forward),
 * positive for elbows (back).
 */
function rigLimb(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  options: {
    bend: number;
    upper: Stroke;
    lower: Stroke;
    px: number;
    lowerOverlay?: string | null;
    shoe?: string | null;
    shoeAccent?: string | null;
  },
): void {
  const { bend, upper, lower, px, lowerOverlay, shoe, shoeAccent } = options;
  const mid = lerpPoint(from, to, 0.5);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const normal: Point = length > 0.001 ? { x: -dy / length, y: dx / length } : { x: 1, y: 0 };
  const joint = addPoints(mid, scalePoint(normal, bend));

  line(ctx, from, joint, upper);
  line(ctx, joint, to, lower);

  // Shadow pass for volume.
  const shadow: Stroke = { color: "rgba(0, 0, 0, 0.15)", width: upper.width * 0.25 };
  line(
    ctx,
    addPoints(from, scalePoint(normal, -upper.width * 0.2)),
    addPoints(joint, scalePoint(normal, -upper.width * 0.2)),
    shadow,
  );
  line(
    ctx,
    addPoints(joint, scalePoint(normal, -lower.width * 0.2)),
    addPoints(to, scalePoint(normal, -lower.width * 0.2)),
    { color: shadow.color, width: lower.width * 0.25 },
  );

  // Overlay: an arm sleeve or a knee pad over the top half of the lower segment.
  if (lowerOverlay != null) {
    line(ctx, joint, lerpPoint(joint, to, 0.5), {
      color: lowerOverlay,
      width: lower.width * 1.05,
    });
  }

  // Hands get a small dot at the wrist; legs pass a shoe instead.
  if (shoe == null) {
    ctx.beginPath();
    ctx.arc(to.x, to.y, px * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = lower.color;
    ctx.fill();
    return;
  }

  const shoeDirection: Point =
    length > 0.001 ? { x: dx / length, y: dy / length } : { x: 0, y: 1 };
  const shoeRadius = px * 0.085;
  ctx.save();
  ctx.translate(to.x, to.y);
  ctx.rotate(Math.atan2(shoeDirection.y, shoeDirection.x));
  ctx.beginPath();
  ctx.ellipse(shoeRadius * 0.3, 0, shoeRadius * 1.1, shoeRadius * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = shoe;
  ctx.fill();
  if (shoeAccent != null) {
    // Sole highlight.
    ctx.beginPath();
    ctx.ellipse(shoeRadius * 0.3, shoeRadius * 0.3, shoeRadius, shoeRadius * 0.4, 0, 0, Math.PI);
    ctx.strokeStyle = shoeAccent;
    ctx.lineWidth = px * 0.03;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  center: Point,
  unit: number,
  gear: HeadGear,
  kit: FinalOverKit,
  look: FinalOverLook,
  palette: ScenePalette,
): void {
  const r = 0.15 * unit;

  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.fillStyle = look.skin;
  ctx.fill();

  // Volume: a dark arc over the crown.
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = r * 0.3;
  ctx.lineCap = "butt";
  ctx.stroke();

  if (gear === "helmet") {
    // Dome in the kit colour…
    ctx.beginPath();
    ctx.arc(center.x, center.y, r * 1.08, Math.PI, Math.PI * 2);
    ctx.strokeStyle = kit.primary;
    ctx.lineWidth = r * 0.7;
    ctx.stroke();
    // …a peak over the brow…
    line(
      ctx,
      { x: center.x + r * 0.1, y: center.y - r * 0.42 },
      { x: center.x + r * 1.15, y: center.y - r * 0.3 },
      { color: darken(kit.primary, 0.3, palette), width: r * 0.2 },
    );
    // …and the grille. Flat lit lines, never a blur.
    line(
      ctx,
      { x: center.x + r * 0.2, y: center.y + r * 0.05 },
      { x: center.x + r * 1.02, y: center.y + r * 0.05 },
      { color: kit.secondary, width: r * 0.16 },
    );
    line(
      ctx,
      { x: center.x + r * 0.24, y: center.y + r * 0.46 },
      { x: center.x + r * 0.96, y: center.y + r * 0.46 },
      { color: kit.secondary, width: r * 0.16 },
    );
    return;
  }

  if (gear === "cap") {
    ctx.beginPath();
    ctx.arc(center.x, center.y, r * 1.06, Math.PI, Math.PI * 2);
    ctx.strokeStyle = look.hair;
    ctx.lineWidth = r * 0.62;
    ctx.stroke();
    line(
      ctx,
      { x: center.x - r * 0.9, y: center.y - r * 0.35 },
      { x: center.x + r * 0.9, y: center.y - r * 0.35 },
      { color: kit.primary, width: r * 0.34 },
    );
    line(
      ctx,
      { x: center.x + r * 0.5, y: center.y - r * 0.42 },
      { x: center.x + r * 1.35, y: center.y - r * 0.42 },
      { color: darken(kit.primary, 0.25, palette), width: r * 0.18 },
    );
    return;
  }

  // Wide-brim umpire hat.
  line(
    ctx,
    { x: center.x - r * 1.3, y: center.y - r * 0.3 },
    { x: center.x + r * 1.3, y: center.y - r * 0.3 },
    { color: palette.umpireHat, width: r * 0.18 },
  );
  ctx.beginPath();
  ctx.arc(center.x, center.y - r * 0.22, r * 0.9, Math.PI, Math.PI * 2);
  ctx.strokeStyle = palette.umpireHat;
  ctx.lineWidth = r * 0.55;
  ctx.stroke();
}

function drawJerseyNumber(
  ctx: CanvasRenderingContext2D,
  at: Point,
  value: number,
  color: string,
  size: number,
  facing: number,
  palette: ScenePalette,
): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  // The canvas is X-flipped by facing; un-flip locally to keep digits readable.
  ctx.scale(facing, 1);
  ctx.font = `${typography.weight.extrabold} ${size.toFixed(1)}px ${palette.displayFont}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), 0, 0);
  ctx.restore();
}

/**
 * The core rig — everything a Final Over actor has in common, with the batter
 * and the bowler building on top of it.
 */
export function drawRig(
  ctx: CanvasRenderingContext2D,
  pose: RigPose,
  options: {
    kit: FinalOverKit;
    look: FinalOverLook;
    px: number;
    heightM: number;
    number: number;
    gear: HeadGear;
    pads: boolean;
    gloves: boolean;
    facing?: number;
    palette: ScenePalette;
  },
): void {
  const { kit, look, px, heightM, number, gear, pads, gloves, palette } = options;
  const facing = options.facing ?? 1;
  const scaleM = heightM / referenceHeightMetres;

  // Athlete-local px, y up → canvas y down. Feet anchored at the origin.
  const local = (xM: number, yM: number): Point => ({ x: xM * px, y: -yM * px });

  const hip = local(0, pose.hip * scaleM);
  const shoulderY = pose.hip * scaleM + 0.5 * scaleM;
  const shoulder = local(Math.sin(pose.lean) * 0.3, shoulderY);
  const headCenter = local(
    Math.sin(pose.lean) * 0.42,
    shoulderY + 0.23 * scaleM + pose.headBob,
  );

  const strokeBody: Stroke = { color: kit.primary, width: px * 0.19 };
  const strokeSkin: Stroke = { color: look.skin, width: px * 0.095 };
  const strokeSkinFar: Stroke = { color: darken(look.skin, 0.25, palette), width: px * 0.095 };
  // Cricket whites are trousers, not shorts — the leg stroke runs full length.
  const strokeTrouser: Stroke = {
    color: darken(kit.primary, 0.15, palette),
    width: px * 0.15,
  };
  const padStroke = (color: string): Stroke => ({ color, width: px * 0.13 });

  // Legs, far first and darker — the painter's algorithm gives depth for free.
  rigLimb(ctx, hip, local(pose.footFar.x * scaleM, pose.footFar.y * scaleM), {
    bend: -0.22 * px,
    upper: strokeTrouser,
    lower: pads ? padStroke(darken(kit.secondary, 0.25, palette)) : strokeTrouser,
    lowerOverlay: pads ? darken(kit.secondary, 0.32, palette) : null,
    shoe: darken(kit.accent, 0.2, palette),
    shoeAccent: darken(kit.secondary, 0.2, palette),
    px,
  });
  rigLimb(ctx, hip, local(pose.footNear.x * scaleM, pose.footNear.y * scaleM), {
    bend: -0.26 * px,
    upper: strokeTrouser,
    lower: pads ? padStroke(kit.secondary) : strokeTrouser,
    lowerOverlay: pads ? kit.secondary : null,
    shoe: kit.accent,
    shoeAccent: kit.secondary,
    px,
  });

  // Far arm, behind the torso.
  rigLimb(ctx, shoulder, addPoints(shoulder, scalePoint(pose.handFar, scaleM * px)), {
    bend: 0.2 * px,
    upper: strokeSkinFar,
    lower: strokeSkinFar,
    lowerOverlay: darken(kit.secondary, 0.25, palette),
    px,
  });

  // Torso.
  line(ctx, hip, shoulder, strokeBody);
  line(
    ctx,
    { x: hip.x + px * 0.04, y: hip.y },
    { x: shoulder.x + px * 0.04, y: shoulder.y },
    { color: "rgba(0, 0, 0, 0.15)", width: px * 0.05 },
  );

  // Shirt trim.
  line(ctx, lerpPoint(hip, shoulder, 0.1), lerpPoint(hip, shoulder, 0.9), {
    color: kit.secondary,
    width: px * 0.04,
  });
  line(ctx, lerpPoint(hip, shoulder, 0.15), lerpPoint(hip, shoulder, 0.4), {
    color: kit.accent,
    width: px * 0.05,
  });

  // Shoulder bar — widens the silhouette into a T.
  line(
    ctx,
    { x: shoulder.x - 0.15 * scaleM * px, y: shoulder.y },
    { x: shoulder.x + 0.15 * scaleM * px, y: shoulder.y },
    { color: kit.primary, width: px * 0.15 },
  );

  if (number >= 0) {
    drawJerseyNumber(
      ctx,
      lerpPoint(hip, shoulder, 0.55),
      number,
      kit.accent,
      px * 0.2,
      facing,
      palette,
    );
  }

  drawHead(ctx, headCenter, scaleM * px, gear, kit, look, palette);

  // Near arm, in front.
  rigLimb(ctx, shoulder, addPoints(shoulder, scalePoint(pose.handNear, scaleM * px)), {
    bend: 0.24 * px,
    upper: strokeSkin,
    lower: strokeSkin,
    lowerOverlay: gloves ? kit.secondary : darken(kit.secondary, 0.1, palette),
    px,
  });
}

/**
 * The bat: three tones — a dark edge, a grip, and a blade that catches the
 * light. Drawn in its own rotated space so the shot poses only have to think
 * about one angle.
 */
function drawBat(
  ctx: CanvasRenderingContext2D,
  grip: Point,
  angle: number,
  px: number,
  scaleM: number,
  kit: FinalOverKit,
  palette: ScenePalette,
  alpha = 1,
): void {
  const length = 0.62 * scaleM * px;
  const width = 0.115 * scaleM * px;

  ctx.save();
  ctx.translate(grip.x, grip.y);
  ctx.rotate(angle);

  // Handle.
  line(ctx, { x: -length * 0.16, y: 0 }, { x: length * 0.3, y: 0 }, {
    color: withAlpha(palette.batHandle, alpha),
    width: width * 0.38,
  });
  // Grip band, in the kit accent so the bat belongs to the team.
  line(ctx, { x: -length * 0.1, y: 0 }, { x: length * 0.14, y: 0 }, {
    color: withAlpha(kit.accent, alpha),
    width: width * 0.46,
  });

  // Blade. Bleached willow, deliberately far lighter than any skin tone — at
  // this size a mid-tan blade reads as a forearm.
  const bladeX = length * 0.3;
  const bladeW = length * 0.7;
  const radius = width * 0.22;

  ctx.beginPath();
  ctx.roundRect(bladeX, -width / 2 + width * 0.18, bladeW, width, radius);
  ctx.fillStyle = withAlpha(palette.batBladeEdge, alpha);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(bladeX, -width / 2, bladeW, width, radius);
  ctx.fillStyle = withAlpha(palette.batBlade, alpha);
  ctx.fill();

  // Spine.
  line(
    ctx,
    { x: length * 0.34, y: -width * 0.06 },
    { x: length * 0.94, y: -width * 0.06 },
    { color: withAlpha(palette.batSpine, alpha), width: width * 0.18 },
  );

  // The dark outline that keeps the bat off the batter's arms.
  ctx.beginPath();
  ctx.roundRect(bladeX, -width / 2, bladeW, width, radius);
  ctx.strokeStyle = withAlpha(palette.batOutline, alpha);
  ctx.lineWidth = width * 0.1;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a batter: the rig, then the bat over the top of the near arm.
 *
 * `trailBatAngles` are recent past bat angles, oldest first, drawn as fading
 * ghosts behind the live bat — a cheap motion trail for the fast part of a
 * committed swing.
 */
export function drawBatter(
  ctx: CanvasRenderingContext2D,
  frame: BatterFrame,
  options: {
    kit: FinalOverKit;
    look: FinalOverLook;
    px: number;
    heightM: number;
    number: number;
    facing?: number;
    trailBatAngles?: readonly number[];
    palette: ScenePalette;
  },
): void {
  const { kit, look, px, heightM, number, palette } = options;
  const facing = options.facing ?? 1;
  const trailBatAngles = options.trailBatAngles ?? [];

  drawRig(ctx, frame.pose, {
    kit,
    look,
    px,
    heightM,
    number,
    facing,
    gear: "helmet",
    pads: true,
    gloves: true,
    palette,
  });

  // Bat last, so it reads in front of the near arm.
  const scaleM = heightM / referenceHeightMetres;
  const shoulderY = frame.pose.hip * scaleM + 0.5 * scaleM;
  const shoulder: Point = { x: Math.sin(frame.pose.lean) * 0.3 * px, y: -shoulderY * px };
  const grip = addPoints(shoulder, scalePoint(frame.pose.handNear, scaleM * px));

  for (let i = 0; i < trailBatAngles.length; i += 1) {
    // Oldest faintest, newest brightest.
    drawBat(ctx, grip, trailBatAngles[i], px, scaleM, kit, palette, 0.12 + 0.16 * i);
  }
  drawBat(ctx, grip, frame.batAngle, px, scaleM, kit, palette);
}

/** `ballInHand` paints the ball at the bowling hand until it leaves it. */
export function drawBowler(
  ctx: CanvasRenderingContext2D,
  pose: RigPose,
  options: {
    kit: FinalOverKit;
    look: FinalOverLook;
    px: number;
    heightM: number;
    number: number;
    facing?: number;
    ballInHand?: boolean;
    palette: ScenePalette;
  },
): void {
  const { kit, look, px, heightM, number, palette } = options;
  const facing = options.facing ?? 1;

  drawRig(ctx, pose, {
    kit,
    look,
    px,
    heightM,
    number,
    facing,
    gear: "cap",
    pads: false,
    gloves: false,
    palette,
  });

  if (options.ballInHand !== true) return;

  const scaleM = heightM / referenceHeightMetres;
  const shoulderY = pose.hip * scaleM + 0.5 * scaleM;
  const shoulder: Point = { x: Math.sin(pose.lean) * 0.3 * px, y: -shoulderY * px };
  const hand = addPoints(shoulder, scalePoint(pose.handNear, scaleM * px));

  ctx.beginPath();
  ctx.arc(hand.x, hand.y, px * 0.055, 0, Math.PI * 2);
  ctx.fillStyle = palette.ball;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(hand.x, hand.y, px * 0.055, -Math.PI * 0.8, -Math.PI * 0.8 + Math.PI * 0.7);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = px * 0.012;
  ctx.stroke();
}

/** The umpire — white coat, black hat, no number. */
export function drawUmpire(
  ctx: CanvasRenderingContext2D,
  pose: RigPose,
  options: {
    px: number;
    heightM: number;
    facing?: number;
    kit: FinalOverKit;
    palette: ScenePalette;
  },
): void {
  drawRig(ctx, pose, {
    kit: options.kit,
    look: umpireLook,
    px: options.px,
    heightM: options.heightM,
    number: -1,
    facing: options.facing ?? 1,
    gear: "hat",
    pads: false,
    gloves: false,
    palette: options.palette,
  });
}

/* ---- Top-down marks ------------------------------------------------------ */

/**
 * A fielder seen from directly above — a rig makes no sense from up here, so
 * they are kit-coloured markers with a facing wedge.
 */
export function drawFielderMark(
  ctx: CanvasRenderingContext2D,
  at: Point,
  radius: number,
  options: {
    kit: FinalOverKit;
    active: boolean;
    facing?: Point;
    palette: ScenePalette;
  },
): void {
  const { kit, active, palette } = options;
  const facing = options.facing ?? { x: 0, y: 0 };

  ctx.beginPath();
  ctx.ellipse(at.x, at.y + radius * 0.5, radius * 1.05, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.33)";
  ctx.fill();

  const facingLength = Math.hypot(facing.x, facing.y);
  if (facingLength > 0.01) {
    const dx = facing.x / facingLength;
    const dy = facing.y / facingLength;
    ctx.beginPath();
    ctx.moveTo(at.x + dx * radius * 2.2, at.y + dy * radius * 2.2);
    ctx.lineTo(at.x - dy * radius * 0.8, at.y + dx * radius * 0.8);
    ctx.lineTo(at.x + dy * radius * 0.8, at.y - dx * radius * 0.8);
    ctx.closePath();
    ctx.fillStyle = withAlpha(kit.primary, active ? 0.55 : 0.25);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = kit.primary;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = active ? kit.accent : darken(kit.primary, 0.35, palette);
  ctx.lineWidth = radius * 0.34;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = kit.secondary;
  ctx.fill();
}

/**
 * A runner seen from above. The active batter is the one thing on the field
 * worth a glow — everything else is flat.
 */
export function drawRunnerMark(
  ctx: CanvasRenderingContext2D,
  at: Point,
  radius: number,
  options: {
    kit: FinalOverKit;
    number: number;
    striker: boolean;
    danger?: boolean;
    palette: ScenePalette;
    allowBlur: boolean;
  },
): void {
  const { kit, striker, palette, allowBlur } = options;
  const danger = options.danger ?? false;

  if (striker) {
    ctx.save();
    if (allowBlur) ctx.filter = "blur(10px)";
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 2.0, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(danger ? palette.danger : palette.cyan, 0.3);
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = kit.primary;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = kit.accent;
  ctx.lineWidth = radius * 0.3;
  ctx.stroke();

  drawJerseyNumber(ctx, at, options.number, kit.secondary, radius * 1.1, 1, palette);
}

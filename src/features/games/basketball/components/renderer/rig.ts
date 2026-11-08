/**
 * Procedural athlete rendering for Hoop Duel — the web port of
 * `games/basketball/basketball_rig.dart` and the `rigLimb` primitives it builds
 * on in `games/rig/athlete_rig.dart`.
 *
 * No sprites. An athlete is limbs drawn as thick round-cap strokes with IK-lite
 * elbows and knees, and the rules of the language are worth keeping:
 *
 *  - only three joints are ever stored — hip, shoulder, head. Elbows and knees
 *    are *solved* by `rigLimb`, never authored.
 *  - every dimension scales by `heightM / 1.95`, every stroke width is a
 *    fraction of `px` (pixels per world metre).
 *  - two colour sources: a *livery* dresses the athlete, a *look* is the person.
 *    Far limbs are the near colour run through `darken`.
 *  - THE GLOW RULE — a rig never blurs. A lit line (the visor) is a flat stroke.
 *    The only blurred thing on the court is the ball-handler's heat aura, and
 *    that belongs to the game, not the rig.
 *
 * Every pose is a pure function of engine state plus a run phase, so what you
 * see is a projection of the simulation, never an animation the renderer
 * invented.
 */

import type { BasketballLivery } from "../../data/liveries";
import { jerseyNumberFor, type BasketballLook } from "../../data/looks";
import type { AthleteBody } from "../../engine/engine";
import type { BodyState, JumpPurpose } from "../../types";
import { clamp } from "../../types";
import * as T from "../../tuning";

import type { ScreenPoint } from "./geometry";
import { darken, displayFontOf, withAlpha, type ScenePalette } from "./palette";

/** Proportions are relative to a 1.95m frame. */
const referenceHeightMetres = 1.95;

/**
 * A pose in athlete-local metres: hip height, torso lean, foot targets
 * (relative to the point under the hip) and hand targets (relative to the
 * shoulder). x is forward, y is up.
 *
 * Hand offsets already use the canvas convention (negative y is up) so they add
 * to the shoulder directly; foot offsets do not.
 */
export type RigPose = {
  hip: number;
  lean: number;
  footNear: ScreenPoint;
  footFar: ScreenPoint;
  handNear: ScreenPoint;
  handFar: ScreenPoint;
  headBob: number;
};

const pt = (x: number, y: number): ScreenPoint => ({ x, y });

function pose(
  hip: number,
  lean: number,
  footNear: ScreenPoint,
  footFar: ScreenPoint,
  handNear: ScreenPoint,
  handFar: ScreenPoint,
  headBob = 0,
): RigPose {
  return { hip, lean, footNear, footFar, handNear, handFar, headBob };
}

/* ---- Poses ---------------------------------------------------------------- */

/** States in which the athlete is dribbling, and so reaches for the ball. */
function isDribblingState(state: BodyState): boolean {
  return (
    state === "idle" ||
    state === "run" ||
    state === "drive" ||
    state === "crossover" ||
    state === "stepback" ||
    state === "stance" ||
    state === "stagger"
  );
}

/**
 * The pose for the current body state.
 *
 * When the athlete is dribbling, the near hand is re-solved to meet the ball
 * wherever the bounce currently has it — so the hand and the ball are one
 * motion rather than two loops that happen to agree.
 */
export function poseFor(
  body: AthleteBody,
  runPhase: number,
  dribbleBallY: number | null,
): RigPose {
  const base = basePoseFor(body, runPhase);
  if (dribbleBallY === null || !isDribblingState(body.body)) return base;

  const scaleM = body.spec.heightM / referenceHeightMetres;
  const shoulderY = base.hip * scaleM + 0.52 * scaleM;
  const dy = (shoulderY - dribbleBallY) / scaleM;
  const dx = (0.32 - Math.sin(base.lean) * 0.3) / scaleM;
  return { ...base, handNear: pt(dx, dy) };
}

function basePoseFor(body: AthleteBody, runPhase: number): RigPose {
  const t = body.stateT;
  const jumpFrac = body.jumpDur > 0 ? clamp(body.jumpT / body.jumpDur, 0, 1) : 0;
  const tired = body.stamina01 < 0.25;

  switch (body.body) {
    case "idle": {
      const bob = Math.sin(t * (tired ? 4.5 : 2.2)) * 0.02;
      return pose(
        (tired ? 0.86 : 0.94) + bob,
        tired ? 0.38 : 0.06,
        pt(0.16, 0),
        pt(-0.16, 0),
        tired ? pt(0.18, -0.62) : pt(0.1, -0.52),
        tired ? pt(-0.1, -0.62) : pt(-0.12, -0.5),
        bob,
      );
    }

    case "run":
    case "drive": {
      const speedy = body.body === "drive";
      const swing = Math.sin(runPhase);
      const amp = speedy ? 0.42 : 0.3;
      return pose(
        0.9 + Math.abs(Math.sin(runPhase * 2)) * 0.03,
        speedy ? 0.34 : 0.18,
        pt(swing * amp, Math.max(0, Math.sin(runPhase)) * 0.14),
        pt(-swing * amp, Math.max(0, -Math.sin(runPhase)) * 0.14),
        pt(-swing * 0.24 + 0.08, -0.42),
        pt(swing * 0.24 - 0.08, -0.44),
      );
    }

    case "crossover": {
      const k = clamp(t / 0.25, 0, 1);
      return pose(
        0.78 - Math.sin(k * Math.PI) * 0.08,
        0.3,
        pt(0.34 - k * 0.5, 0),
        pt(-0.3, 0),
        pt(0.22 - k * 0.44, -0.16),
        pt(-0.2, -0.4),
      );
    }

    case "stepback":
      return pose(0.86, -0.22, pt(0.28, 0.06), pt(-0.24, 0), pt(0.1, -0.3), pt(-0.14, -0.34));

    case "gather":
      return pose(0.78, 0.12, pt(0.14, 0), pt(-0.14, 0), pt(0.24, -0.28), pt(0.18, -0.32));

    case "jump":
      return jumpPose(body.jumpPurpose, jumpFrac);

    case "land": {
      const k = clamp(t / 0.18, 0, 1);
      return pose(
        0.74 + k * 0.2,
        0.18 - k * 0.12,
        pt(0.2, 0),
        pt(-0.2, 0),
        pt(0.16, -0.2),
        pt(-0.16, -0.2),
      );
    }

    case "stance": {
      const sway = Math.sin(t * 3) * 0.02;
      return pose(
        0.76 + sway,
        0.14,
        pt(0.34, 0),
        pt(-0.34, 0),
        pt(0.42, -0.18),
        pt(-0.4, -0.16),
      );
    }

    case "lunge": {
      const k = clamp(t / 0.35, 0, 1);
      return pose(
        0.7 - Math.sin(k * Math.PI) * 0.06,
        0.5,
        pt(0.4 + k * 0.2, 0),
        pt(-0.34, 0),
        pt(0.5 + Math.sin(k * Math.PI) * 0.16, -0.06),
        pt(-0.2, -0.3),
      );
    }

    case "contest":
      return pose(0.92, 0.04, pt(0.2, 0), pt(-0.2, 0), pt(0.1, -1.06), pt(-0.06, -1.02));

    case "fake": {
      const k = clamp(t / 0.35, 0, 1);
      const up = Math.sin(Math.min(1, k * 2) * Math.PI) * 0.5;
      return pose(
        0.84 + up * 0.06,
        0.08,
        pt(0.14, 0),
        pt(-0.14, 0),
        pt(0.2, -0.3 - up),
        pt(0.14, -0.34 - up),
      );
    }

    case "stagger": {
      const wob = Math.sin(t * 16) * (1 - clamp(t / 0.6, 0, 1)) * 0.2;
      return pose(
        0.8,
        -0.4 + wob,
        pt(0.36, 0),
        pt(-0.1, 0),
        pt(0.3 + wob, -0.7),
        pt(-0.34 - wob, -0.6),
        wob * 0.4,
      );
    }

    case "celebrate": {
      // Fist pump: the arm punches the sky on a springy hop.
      const pump = Math.abs(Math.sin(t * 10));
      return pose(
        0.94 + pump * 0.05,
        -0.12,
        pt(0.18, 0),
        pt(-0.18, 0),
        pt(0.1, -1.08 - pump * 0.08),
        pt(-0.2, -0.55),
        pump * 0.03,
      );
    }

    case "dejected": {
      // Head down, shoulders slumped, hands hanging low.
      const sag = Math.min(1, t * 3);
      return pose(
        0.9 - sag * 0.04,
        0.3 * sag,
        pt(0.14, 0),
        pt(-0.14, 0),
        pt(0.08, -0.22 - sag * 0.02),
        pt(-0.1, -0.22),
        -0.05 * sag,
      );
    }

    case "spin": {
      // A sweeping low turn: the lean whips front-to-back through the spin, so
      // side-on it reads as a body rotation, with the ball arm wrapped in tight.
      const k = clamp(t / T.spinDuration, 0, 1);
      const whirl = Math.sin(k * Math.PI);
      return pose(
        0.72 + whirl * 0.06,
        0.45 - k * 0.9,
        pt(0.3 - k * 0.5, 0.06 * whirl),
        pt(-0.2 + k * 0.42, 0),
        pt(-0.28 * whirl + 0.06, -0.5),
        pt(0.34 * whirl, -0.66),
        whirl * 0.02,
      );
    }
  }
}

function jumpPose(purpose: JumpPurpose | null, frac: number): RigPose {
  const tuck = Math.sin(frac * Math.PI);
  switch (purpose) {
    case "shot": {
      // Ball overhead, with the wrist following through past the apex.
      const release = clamp(frac - 0.4, 0, 1) * 1.6;
      return pose(
        0.98,
        0.02,
        pt(0.08, 0.2 * tuck),
        pt(-0.1, 0.26 * tuck),
        pt(0.18 + release * 0.12, -1.0 - release * 0.06),
        pt(0.06, -0.9),
      );
    }
    case "layup":
    case "putback":
      return pose(
        0.98,
        0.12,
        pt(0.16, 0.42 * tuck), // knee drive
        pt(-0.12, 0.1 * tuck),
        pt(0.3, -1.02 - tuck * 0.1),
        pt(-0.08, -0.5),
      );
    case "dunk": {
      // Windup behind the head, then a two-hand slam out in front.
      const slam = clamp(frac - 0.35, 0, 1) / 0.65;
      const reach = -0.6 + slam * 1.1;
      return pose(
        0.98,
        0.2 + slam * 0.18,
        pt(0.2, 0.4 * tuck),
        pt(-0.16, 0.34 * tuck),
        pt(reach * 0.5 + 0.3, -1.04 + slam * 0.2),
        pt(reach * 0.5 + 0.14, -1.0 + slam * 0.2),
      );
    }
    case "block":
      return pose(
        0.98,
        0.04,
        pt(0.1, 0.28 * tuck),
        pt(-0.12, 0.2 * tuck),
        pt(0.16, -1.14),
        pt(-0.14, -0.4),
      );
    case "rebound":
      return pose(
        0.98,
        0,
        pt(0.1, 0.3 * tuck),
        pt(-0.1, 0.3 * tuck),
        pt(0.14, -1.1),
        pt(-0.12, -1.08),
      );
    case null:
      return pose(0.96, 0, pt(0.14, 0.1), pt(-0.14, 0.1), pt(0.12, -0.5), pt(-0.12, -0.5));
  }
}

/* ---- Primitives ----------------------------------------------------------- */

type Stroke = { color: string; width: number };

function line(
  ctx: CanvasRenderingContext2D,
  from: ScreenPoint,
  to: ScreenPoint,
  stroke: Stroke,
  cap: CanvasLineCap = "round",
): void {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = cap;
  ctx.stroke();
}

function add(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scalePoint(p: ScreenPoint, k: number): ScreenPoint {
  return { x: p.x * k, y: p.y * k };
}

function lerpPoint(a: ScreenPoint, b: ScreenPoint, t: number): ScreenPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * A two-segment limb whose joint is solved as the midpoint pushed along the
 * segment normal. `bend` picks which way it buckles — negative for knees
 * (forward), positive for elbows (back).
 *
 * Passing `shoe` draws a rotated sneaker at the end instead of the small wrist
 * dot a hand gets. `lowerOverlay` paints a sleeve or pad over the top half of
 * the lower segment.
 */
function rigLimb(
  ctx: CanvasRenderingContext2D,
  from: ScreenPoint,
  to: ScreenPoint,
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
  const { bend, upper, lower, px } = options;
  const mid = lerpPoint(from, to, 0.5);
  const dir = { x: to.x - from.x, y: to.y - from.y };
  const len = Math.hypot(dir.x, dir.y);
  const normal =
    len > 0.001 ? { x: -dir.y / len, y: dir.x / len } : { x: 1, y: 0 };
  const joint = add(mid, scalePoint(normal, bend));

  line(ctx, from, joint, upper);
  line(ctx, joint, to, lower);

  // A shadow pass along the normal is all the volume a flat rig needs.
  const shadow = "rgba(0, 0, 0, 0.15)";
  line(
    ctx,
    add(from, scalePoint(normal, -upper.width * 0.2)),
    add(joint, scalePoint(normal, -upper.width * 0.2)),
    { color: shadow, width: upper.width * 0.25 },
  );
  line(
    ctx,
    add(joint, scalePoint(normal, -lower.width * 0.2)),
    add(to, scalePoint(normal, -lower.width * 0.2)),
    { color: shadow, width: lower.width * 0.25 },
  );

  if (options.lowerOverlay != null) {
    line(ctx, joint, lerpPoint(joint, to, 0.5), {
      color: options.lowerOverlay,
      width: lower.width * 1.05,
    });
  }

  // Hands are a small dot at the wrist; legs pass a shoe instead.
  if (options.shoe == null) {
    ctx.beginPath();
    ctx.arc(to.x, to.y, px * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = lower.color;
    ctx.fill();
    return;
  }

  const shoeDir = len > 0.001 ? { x: dir.x / len, y: dir.y / len } : { x: 0, y: 1 };
  const shoeR = px * 0.085;
  ctx.save();
  ctx.translate(to.x, to.y);
  ctx.rotate(Math.atan2(shoeDir.y, shoeDir.x));
  ctx.beginPath();
  ctx.ellipse(shoeR * 0.3, 0, shoeR * 1.1, shoeR * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = options.shoe;
  ctx.fill();
  if (options.shoeAccent != null) {
    // Sole highlight.
    ctx.beginPath();
    ctx.ellipse(shoeR * 0.3, shoeR * 0.3, shoeR, shoeR * 0.4, 0, 0, Math.PI);
    ctx.strokeStyle = options.shoeAccent;
    ctx.lineWidth = px * 0.03;
    ctx.stroke();
  }
  ctx.restore();
}

/* ---- The rig -------------------------------------------------------------- */

/**
 * Draws one athlete rig in a livery. Called for the main pass and again,
 * flipped and faded, for the hardwood reflection.
 */
export function drawBasketballRig(
  ctx: CanvasRenderingContext2D,
  body: AthleteBody,
  rigPose: RigPose,
  look: BasketballLook,
  livery: BasketballLivery,
  px: number,
  palette: ScenePalette,
  reflectionPass = false,
): void {
  const { primary, secondary, accent } = livery;
  const scaleM = body.spec.heightM / referenceHeightMetres;
  const frame = look.buildScale;

  // Athlete-local px, y up → canvas y down. Feet anchored at the origin.
  const local = (xM: number, yM: number): ScreenPoint => ({ x: xM * px, y: -yM * px });

  const hip = local(0, rigPose.hip * scaleM);
  const shoulderY = rigPose.hip * scaleM + 0.52 * scaleM;
  const shoulder = local(Math.sin(rigPose.lean) * 0.3, shoulderY);
  const headCenter = local(
    Math.sin(rigPose.lean) * 0.42,
    shoulderY + 0.24 * scaleM + rigPose.headBob,
  );
  const footFar = local(rigPose.footFar.x * scaleM, rigPose.footFar.y * scaleM);
  const footNear = local(rigPose.footNear.x * scaleM, rigPose.footNear.y * scaleM);
  const handFar = add(shoulder, scalePoint(rigPose.handFar, scaleM * px));
  const handNear = add(shoulder, scalePoint(rigPose.handNear, scaleM * px));

  const strokeBody: Stroke = { color: primary, width: px * 0.19 * frame };
  const strokeSkin: Stroke = { color: look.skin, width: px * 0.095 * frame };
  const strokeSkinFar: Stroke = {
    color: darken(look.skin, 0.25),
    width: px * 0.095 * frame,
  };
  const strokeShorts: Stroke = {
    color: darken(primary, 0.15),
    width: px * 0.15 * frame,
  };

  const headR = 0.155 * scaleM * px;
  if (!reflectionPass) {
    drawUnderStroke(ctx, palette, {
      hip,
      shoulder,
      headCenter,
      headRadius: headR,
      footFar,
      footNear,
      handFar,
      handNear,
      frame,
      px,
    });
  }

  // Legs, far first and darker — the painter's algorithm gives depth for free.
  rigLimb(ctx, hip, footFar, {
    bend: -0.22 * px,
    upper: strokeShorts,
    lower: strokeSkinFar,
    shoe: darken(accent, 0.2),
    shoeAccent: darken(secondary, 0.2),
    px,
  });
  rigLimb(ctx, hip, footNear, {
    bend: -0.26 * px,
    upper: strokeShorts,
    lower: strokeSkin,
    lowerOverlay:
      !reflectionPass && look.gear === "kneeSleeve" ? secondary : null,
    shoe: accent,
    shoeAccent: secondary,
    px,
  });

  // Far arm, behind the torso.
  rigLimb(ctx, shoulder, handFar, {
    bend: 0.2 * px,
    upper: strokeSkinFar,
    lower: strokeSkinFar,
    px,
  });

  // Torso (the jersey), its trim, and volume shading.
  line(ctx, hip, shoulder, strokeBody);

  if (!reflectionPass) {
    line(
      ctx,
      { x: hip.x + px * 0.04, y: hip.y },
      { x: shoulder.x + px * 0.04, y: shoulder.y },
      { color: withAlpha(palette.background, 0.3), width: px * 0.05 },
    );
    // Jersey stripes.
    line(ctx, lerpPoint(hip, shoulder, 0.1), lerpPoint(hip, shoulder, 0.9), {
      color: secondary,
      width: px * 0.04,
    });
    line(ctx, lerpPoint(hip, shoulder, 0.15), lerpPoint(hip, shoulder, 0.4), {
      color: accent,
      width: px * 0.05,
    });
  }

  // The shoulder bar widens the silhouette into a T at the top of the jersey.
  line(
    ctx,
    add(shoulder, { x: -0.15 * scaleM * px * frame, y: 0 }),
    add(shoulder, { x: 0.15 * scaleM * px * frame, y: 0 }),
    { color: primary, width: px * 0.15 * frame },
  );

  // Jersey number. The surrounding canvas is X-flipped by facing, so this
  // un-flips locally to keep the digits readable in both directions.
  if (!reflectionPass) {
    const numberPos = lerpPoint(hip, shoulder, 0.55);
    ctx.save();
    ctx.translate(numberPos.x, numberPos.y);
    ctx.scale(body.facing, 1);
    ctx.font = displayFontOf(palette, px * 0.2, 800);
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(jerseyNumberFor(body.spec.id)), 0, 0);
    ctx.restore();
  }

  // Head, hair, headband.
  ctx.beginPath();
  ctx.arc(headCenter.x, headCenter.y, headR, 0, Math.PI * 2);
  ctx.fillStyle = look.skin;
  ctx.fill();

  if (reflectionPass) {
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, headR * look.hairScale, Math.PI, Math.PI * 2);
    ctx.strokeStyle = look.hair;
    ctx.lineWidth = headR * 0.48;
    ctx.lineCap = "butt";
    ctx.stroke();
    return;
  }

  // Head shading.
  ctx.beginPath();
  ctx.arc(headCenter.x, headCenter.y, headR, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = withAlpha(palette.background, 0.3);
  ctx.lineWidth = headR * 0.3;
  ctx.stroke();

  drawHair(ctx, headCenter, headR, look);

  if (look.gear === "headband") {
    line(
      ctx,
      add(headCenter, { x: -headR, y: headR * 0.08 }),
      add(headCenter, { x: headR, y: headR * 0.08 }),
      { color: secondary, width: headR * 0.25 },
      "butt",
    );
  }

  // The visor face hint: a lit line across the front of the face. Flat colour,
  // no blur — a lit line is not a glow, and THE GLOW RULE stays intact.
  line(
    ctx,
    add(headCenter, { x: headR * 0.15, y: headR * 0.42 }),
    add(headCenter, { x: headR * 0.95, y: headR * 0.42 }),
    { color: withAlpha(palette.cyan, 0.85), width: headR * 0.2 },
  );

  // Near arm, in front.
  rigLimb(ctx, shoulder, handNear, {
    bend: 0.24 * px,
    upper: strokeSkin,
    lower: strokeSkin,
    lowerOverlay: look.gear === "shootingSleeve" ? secondary : null,
    px,
  });
}

/**
 * A near-black outline pass under the whole rig. Without it a dark livery
 * disappears into the hardwood at the far end of the court.
 */
function drawUnderStroke(
  ctx: CanvasRenderingContext2D,
  palette: ScenePalette,
  options: {
    hip: ScreenPoint;
    shoulder: ScreenPoint;
    headCenter: ScreenPoint;
    headRadius: number;
    footFar: ScreenPoint;
    footNear: ScreenPoint;
    handFar: ScreenPoint;
    handNear: ScreenPoint;
    frame: number;
    px: number;
  },
): void {
  const { px, frame } = options;
  const color = withAlpha(palette.background, 0.96);

  const limb = (from: ScreenPoint, to: ScreenPoint, bend: number, width: number) => {
    const mid = lerpPoint(from, to, 0.5);
    const dir = { x: to.x - from.x, y: to.y - from.y };
    const len = Math.hypot(dir.x, dir.y);
    const normal = len > 0.001 ? { x: -dir.y / len, y: dir.x / len } : { x: 1, y: 0 };
    const joint = add(mid, scalePoint(normal, bend));
    const stroke = { color, width: width + px * 0.055 };
    line(ctx, from, joint, stroke);
    line(ctx, joint, to, stroke);
    ctx.beginPath();
    ctx.arc(to.x, to.y, stroke.width * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  limb(options.hip, options.footFar, -0.22 * px, px * 0.15 * frame);
  limb(options.hip, options.footNear, -0.26 * px, px * 0.15 * frame);
  limb(options.shoulder, options.handFar, 0.2 * px, px * 0.095 * frame);
  limb(options.shoulder, options.handNear, 0.24 * px, px * 0.095 * frame);

  line(ctx, options.hip, options.shoulder, {
    color,
    width: px * (0.19 * frame + 0.055),
  });
  ctx.beginPath();
  ctx.arc(
    options.headCenter.x,
    options.headCenter.y,
    options.headRadius + px * 0.028,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = color;
  ctx.fill();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  center: ScreenPoint,
  headRadius: number,
  look: BasketballLook,
): void {
  const radius = headRadius * look.hairScale;
  ctx.strokeStyle = look.hair;
  ctx.fillStyle = look.hair;
  ctx.lineCap = "round";

  switch (look.hairStyle) {
    case "closeCrop":
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, Math.PI, Math.PI * 2);
      ctx.lineWidth = radius * 0.38;
      ctx.stroke();
      break;

    case "fade":
      ctx.beginPath();
      ctx.arc(
        center.x,
        center.y,
        radius * 1.02,
        Math.PI * 1.08,
        Math.PI * 1.08 + Math.PI * 0.84,
      );
      ctx.lineWidth = radius * 0.5;
      ctx.stroke();
      line(
        ctx,
        { x: center.x - radius * 0.92, y: center.y - radius * 0.12 },
        { x: center.x - radius * 0.82, y: center.y + radius * 0.28 },
        { color: look.hair, width: radius * 0.18 },
      );
      break;

    case "curls":
      for (let i = 0; i < 5; i += 1) {
        const angle = Math.PI + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.arc(
          center.x + Math.cos(angle) * radius * 0.86,
          center.y + Math.sin(angle) * radius * 0.86 - radius * 0.08,
          radius * 0.31,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;

    case "highTop":
      ctx.beginPath();
      ctx.moveTo(center.x - radius * 0.82, center.y - radius * 0.55);
      ctx.lineTo(center.x - radius * 0.62, center.y - radius * 1.28);
      ctx.lineTo(center.x + radius * 0.58, center.y - radius * 1.28);
      ctx.lineTo(center.x + radius * 0.82, center.y - radius * 0.55);
      ctx.closePath();
      ctx.fill();
      break;

    case "twists":
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, Math.PI, Math.PI * 2);
      ctx.lineWidth = radius * 0.34;
      ctx.stroke();
      for (const x of [-0.55, 0, 0.55]) {
        line(
          ctx,
          { x: center.x + radius * x, y: center.y - radius * 0.72 },
          { x: center.x + radius * x, y: center.y - radius * 1.18 },
          { color: look.hair, width: radius * 0.18 },
        );
        ctx.beginPath();
        ctx.arc(
          center.x + radius * x,
          center.y - radius * 1.22,
          radius * 0.12,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;
  }
}

/* ---- The full athlete pass ------------------------------------------------ */

/** Per-athlete motion the renderer owns: how far the legs have cycled. */
export type RigMotion = { runPhase: number; lastX: number };

export function createRigMotion(): RigMotion {
  return { runPhase: 0, lastX: 0 };
}

export function advanceRigMotion(motion: RigMotion, x: number, dt: number): void {
  motion.runPhase += Math.abs(x - motion.lastX) * 6.5 + dt * 0.8;
  motion.lastX = x;
}

/** Squash and stretch, anchored at the feet: a crouch to leap, a give on landing. */
function squashFor(body: AthleteBody): ScreenPoint {
  if (body.body === "jump" && body.jumpT < 0.08) return { x: 0.94, y: 1.08 };
  if (body.body === "land" && body.stateT < 0.1) return { x: 1.07, y: 0.92 };
  return { x: 1, y: 1 };
}

export type AthleteDrawOptions = {
  body: AthleteBody;
  look: BasketballLook;
  livery: BasketballLivery;
  motion: RigMotion;
  ground: ScreenPoint;
  px: number;
  palette: ScenePalette;
  /** Where the dribbled ball currently is, in world height, or null. */
  dribbleBallY: number | null;
  heatAura: boolean;
  isPlayer: boolean;
  reducedMotion: boolean;
};

export function drawAthlete(
  ctx: CanvasRenderingContext2D,
  options: AthleteDrawOptions,
): void {
  const { body, look, livery, motion, ground, px, palette } = options;
  const heightPx = body.spec.heightM * px;
  const lift = body.jumpHeight * px;

  ctx.save();
  ctx.translate(ground.x, ground.y - lift);
  const squash = squashFor(body);
  ctx.scale(squash.x * body.facing, squash.y);

  // Ground shadow. Drawn at +lift so it stays on the floor while the body rises.
  ctx.beginPath();
  ctx.ellipse(
    0,
    lift,
    (heightPx * 0.42 * (1 - body.jumpHeight * 0.4)) / 2,
    (heightPx * 0.07) / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = withAlpha(palette.background, 0.75);
  ctx.fill();

  drawMovementTicks(ctx, body, motion, heightPx, lift, palette, options.reducedMotion);

  // The heat aura — the one glow on the court.
  if (options.heatAura) {
    ctx.save();
    ctx.filter = "blur(14px)";
    ctx.beginPath();
    ctx.ellipse(
      0,
      -heightPx * 0.45,
      (heightPx * 0.8) / 2,
      (heightPx * 1.1) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = withAlpha(look.accent, 0.22);
    ctx.fill();
    ctx.restore();
  }

  const rigPose = poseFor(body, motion.runPhase, options.dribbleBallY);

  // The hardwood reflection: the same rig mirrored about the ground line,
  // squashed and faded. Skipped under reduced motion, which doubles as the
  // performance guard.
  if (!options.reducedMotion) {
    ctx.save();
    ctx.translate(0, lift * 2);
    ctx.scale(1, -T.reflectSquash);
    // Flutter composites this through a `saveLayer` so the opacity applies to
    // the finished group; a per-call alpha is indistinguishable at 0.09 and
    // costs nothing.
    ctx.globalAlpha = T.reflectAlpha;
    drawBasketballRig(ctx, body, rigPose, look, livery, px, palette, true);
    ctx.restore();
  }

  drawBasketballRig(ctx, body, rigPose, look, livery, px, palette);
  if (options.isPlayer) drawYouMarker(ctx, body, heightPx, palette);
  ctx.restore();
}

/**
 * Small ground marks that say what the feet just did — a drive's scuff, a
 * step-back's slide, a landing's impact. Cheap, and they make the movement read.
 */
function drawMovementTicks(
  ctx: CanvasRenderingContext2D,
  body: AthleteBody,
  motion: RigMotion,
  heightPx: number,
  floorOffset: number,
  palette: ScenePalette,
  reducedMotion: boolean,
): void {
  const y = floorOffset - heightPx * 0.015;
  const width = Math.max(1, heightPx * 0.012);

  switch (body.body) {
    case "drive": {
      const pulse = reducedMotion
        ? 0.24
        : 0.18 + Math.abs(Math.sin(motion.runPhase * 2)) * 0.12;
      for (let i = 0; i < 2; i += 1) {
        const x = -heightPx * (0.18 + i * 0.11);
        line(
          ctx,
          { x, y: y - heightPx * (0.015 + i * 0.018) },
          { x: x - heightPx * 0.09, y },
          { color: withAlpha(palette.cyan, pulse), width },
          "square",
        );
      }
      break;
    }
    case "stepback": {
      const fade = clamp(1 - body.stateT / 0.42, 0, 1);
      for (let i = 0; i < 3; i += 1) {
        const x = heightPx * (0.12 + i * 0.1);
        line(
          ctx,
          { x, y },
          { x: x + heightPx * 0.065, y },
          { color: withAlpha(palette.cyan, 0.42 * fade), width },
          "square",
        );
      }
      break;
    }
    case "land": {
      const fade = clamp(1 - body.stateT / 0.18, 0, 1);
      const stroke = { color: withAlpha(palette.cyan, 0.48 * fade), width };
      line(
        ctx,
        { x: -heightPx * 0.28, y },
        { x: -heightPx * 0.16, y: y - heightPx * 0.055 },
        stroke,
        "square",
      );
      line(
        ctx,
        { x: heightPx * 0.28, y },
        { x: heightPx * 0.16, y: y - heightPx * 0.055 },
        stroke,
        "square",
      );
      break;
    }
    default:
      break;
  }
}

/** The chamfered YOU tag over the player's athlete, with its little pointer. */
function drawYouMarker(
  ctx: CanvasRenderingContext2D,
  body: AthleteBody,
  heightPx: number,
  palette: ScenePalette,
): void {
  const width = heightPx * 0.34;
  const height = heightPx * 0.14;
  const top = -heightPx * 1.18;

  ctx.beginPath();
  ctx.moveTo(-width * 0.5, top);
  ctx.lineTo(width * 0.38, top);
  ctx.lineTo(width * 0.5, top + height * 0.28);
  ctx.lineTo(width * 0.5, top + height);
  ctx.lineTo(-width * 0.38, top + height);
  ctx.lineTo(-width * 0.5, top + height * 0.72);
  ctx.closePath();
  ctx.fillStyle = palette.cyan;
  ctx.fill();

  ctx.save();
  ctx.translate(0, top + height * 0.5);
  ctx.scale(body.facing, 1);
  ctx.font = displayFontOf(palette, heightPx * 0.075, 800);
  ctx.fillStyle = palette.background;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("YOU", 0, 0);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(-height * 0.12, top + height);
  ctx.lineTo(height * 0.12, top + height);
  ctx.lineTo(0, top + height * 1.3);
  ctx.closePath();
  ctx.fillStyle = palette.cyan;
  ctx.fill();
}

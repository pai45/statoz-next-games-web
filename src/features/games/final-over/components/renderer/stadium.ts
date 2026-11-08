import { typography } from "@statoz/design-system/games/tokens/typography";
/**
 * The ground, drawn: night sky, floodlights, a bowl of crowd, the hoardings,
 * the sightscreen behind the bowler's arm, and the outfield running away to the
 * rope — plus the same ground seen from the blimp for the fielding camera.
 *
 * Back to front, flat fills and lit lines. The lamps are the only thing allowed
 * to bloom.
 */

import { crowdDots, crowdIdleHype, horizonFraction } from "../../constants";

import { withAlpha, type ScenePalette } from "./palette";

export type StadiumFrame = {
  width: number;
  height: number;
  /** Free-running seconds since the scene mounted. */
  seconds: number;
  /** 0..1 — how loud the ground is right now. */
  hype: number;
  reducedMotion: boolean;
  allowBlur: boolean;
  palette: ScenePalette;
};

/**
 * A cheap deterministic 0..1 from an integer — a seedless stand-in for a random
 * generator we must not allocate per frame.
 */
function hash(i: number): number {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string | CanvasGradient,
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  cap: CanvasLineCap = "butt",
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.stroke();
}

/** CRT scanlines — the same HUD texture the rest of the app wears. */
export function paintScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = "rgba(0, 0, 0, 0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 0; y < height; y += 3) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

/**
 * A pylon: two struts, a rack, and six lamps. The blur here is the only one in
 * the scene — a floodlight is the one thing on a cricket ground that genuinely
 * glows.
 */
function paintFloodlight(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  flip: boolean,
  frame: StadiumFrame,
): void {
  const { palette, allowBlur } = frame;
  const side = flip ? -1 : 1;

  strokeLine(ctx, baseX, baseY, baseX + side * 14, baseY - 74, withAlpha(palette.cyan, 0.3), 2, "round");
  strokeLine(
    ctx,
    baseX + side * 7,
    baseY - 2,
    baseX + side * 21,
    baseY - 74,
    withAlpha(palette.cyan, 0.18),
    1,
  );

  const rackCenterX = baseX + side * 18;
  const rackCenterY = baseY - 84;
  const rackLeft = rackCenterX - 19;
  const rackTop = rackCenterY - 12;

  ctx.beginPath();
  ctx.roundRect(rackLeft, rackTop, 38, 24, 3);
  ctx.fillStyle = withAlpha(palette.panel, 0.78);
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.cyan, 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  if (allowBlur) ctx.filter = "blur(4px)";
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      ctx.beginPath();
      ctx.arc(rackLeft + 8 + col * 11, rackTop + 8 + row * 9, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * The bowl. A curved back, a roof line, vomitories, tiers, and a few hundred
 * people doing a Mexican wave in `sin`.
 */
function paintStands(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  frame: StadiumFrame,
): void {
  const { width: w, height: h, palette, seconds, hype, reducedMotion } = frame;
  const height = bottom - top;

  const back = new Path2D();
  back.moveTo(0, top);
  back.quadraticCurveTo(w * 0.5, top - h * 0.055, w, top);
  back.lineTo(w, bottom);
  back.quadraticCurveTo(w * 0.5, bottom + h * 0.035, 0, bottom);
  back.closePath();

  const backFill = ctx.createLinearGradient(w / 2, top, w / 2, bottom);
  backFill.addColorStop(0, withAlpha(palette.panelDeep, 0.88));
  backFill.addColorStop(1, withAlpha(palette.background, 0.96));
  ctx.fillStyle = backFill;
  ctx.fill(back);
  ctx.strokeStyle = withAlpha(palette.cyan, 0.2);
  ctx.lineWidth = 1.1;
  ctx.stroke(back);

  const roof = new Path2D();
  roof.moveTo(0, top - h * 0.01);
  roof.quadraticCurveTo(w * 0.5, top - h * 0.066, w, top - h * 0.01);
  roof.lineTo(w, top + h * 0.009);
  roof.quadraticCurveTo(w * 0.5, top - h * 0.044, 0, top + h * 0.009);
  roof.closePath();
  ctx.fillStyle = palette.standRoof;
  ctx.fill(roof);
  ctx.strokeStyle = withAlpha(palette.cyan, 0.22);
  ctx.lineWidth = 1;
  ctx.stroke(roof);

  // Vomitories — the aisles that break the crowd into blocks.
  for (let i = 1; i < 8; i += 1) {
    const x = (w * i) / 8;
    const inset = Math.abs(i - 4) * h * 0.004;
    strokeLine(ctx, x, top - inset, x, bottom, withAlpha(palette.cyan, 0.07), 1);
  }

  // The crowd. Mostly a dark mass of heads — a stand full of neon would be a
  // rainbow, not a crowd — with the odd shirt catching the light. Positions are
  // hashed off the index, never a per-frame random.
  const wave = reducedMotion ? 0 : 1;
  const rows = 5;
  const perRow = Math.floor(crowdDots / rows);
  for (let i = 0; i < crowdDots; i += 1) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    // Odd rows sit half a seat over, so the heads stagger like real seating.
    const jitter = hash(i) - 0.5;
    const x = (col + (row % 2 !== 0 ? 0.5 : 0) + jitter * 0.4) * (w / perRow) - 4;
    const bob =
      Math.sin(seconds * (1.4 + hype * 2.4) + col * 0.55 + row) *
      (0.4 + hype * 1.6) *
      wave;
    const y = top + height * 0.22 + (row * height) / 6.6 + bob;

    const lit = i % 9 === 0;
    const color = lit ? (i % 27 === 0 ? palette.cyan : palette.amber) : palette.crowdDark;
    ctx.beginPath();
    ctx.arc(x, y, 1.05 + hash(i * 7) * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(color, lit ? 0.4 + hype * 0.35 : 0.72);
    ctx.fill();

    // Camera flashes, but only when there is something worth shooting.
    if (hype > 0.6 && i % 13 === 0 && Math.sin(seconds * 9 + i * 2.3) > 0.88) {
      ctx.beginPath();
      ctx.arc(x, y - 1, 1.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * hype})`;
      ctx.fill();
    }
  }
}

/**
 * The sightscreen, directly behind the bowler's arm — the one piece of stadium
 * furniture that exists purely so you can pick the ball up.
 */
function paintSightscreen(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  frame: StadiumFrame,
): void {
  const { width: w, height: h, palette } = frame;
  const height = bottom - top;
  const left = w * 0.395;
  const right = w * 0.555;
  const faceTop = top + height * 0.26;
  const faceBottom = bottom - height * 0.06;
  const faceWidth = right - left;

  // Legs first, so the face sits on them.
  for (const x of [left + faceWidth * 0.22, right - faceWidth * 0.22]) {
    strokeLine(ctx, x, faceBottom, x, bottom + h * 0.012, palette.sightscreenLeg, 3);
  }

  fillRect(ctx, left, faceTop, faceWidth, faceBottom - faceTop, palette.sightscreenEdge);
  fillRect(
    ctx,
    left + 2,
    faceTop + 2,
    faceWidth - 4,
    faceBottom - faceTop - 4,
    palette.sightscreenFace,
  );

  for (let i = 1; i < 4; i += 1) {
    const x = left + (faceWidth * i) / 4;
    strokeLine(ctx, x, faceTop + 2, x, faceBottom - 2, palette.sightscreenSeam, 1);
  }

  ctx.strokeStyle = withAlpha(palette.line, 0.8);
  ctx.lineWidth = 1;
  ctx.strokeRect(left, faceTop, faceWidth, faceBottom - faceTop);
}

const hoardingLabels = ["STATOZ", "FINAL OVER", "SIX TO WIN", "PITCH DUEL"];

/** The hoarding ring. Calm chrome — it is advertising, not a moment. */
function paintHoardings(
  ctx: CanvasRenderingContext2D,
  y: number,
  frame: StadiumFrame,
): void {
  const { width: w, height: h, palette } = frame;
  const boardWidth = w / hoardingLabels.length;
  const boardHeight = h * 0.026;

  for (let i = 0; i < hoardingLabels.length; i += 1) {
    const x = i * boardWidth;
    const accent = i % 2 === 0 ? palette.cyan : palette.amber;

    fillRect(ctx, x, y, boardWidth - 2, boardHeight, withAlpha(palette.panel, 0.8));
    ctx.strokeStyle = withAlpha(accent, 0.32);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boardWidth - 2, boardHeight);

    ctx.save();
    ctx.font = `${typography.weight.extrabold} ${typography.sizePx.p7}px ${palette.displayFont}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1.4px";
    ctx.fillStyle = withAlpha(accent, 0.85);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hoardingLabels[i], x + (boardWidth - 2) / 2, y + boardHeight / 2, boardWidth - 8);
    ctx.restore();
  }
}

/**
 * The outfield: turf from the rope to your feet, mown in bands, with the
 * thirty-yard ring arcing across it.
 */
function paintOutfield(
  ctx: CanvasRenderingContext2D,
  horizonY: number,
  frame: StadiumFrame,
): void {
  const { width: w, height: h, palette } = frame;

  const turf = ctx.createLinearGradient(w / 2, horizonY, w / 2, h);
  turf.addColorStop(0, palette.turfFar);
  turf.addColorStop(0.45, palette.turfMid);
  turf.addColorStop(1, palette.turfNear);
  fillRect(ctx, 0, horizonY, w, h - horizonY, turf);

  // Mown bands, widening as they come at you.
  const band = (t: number) => horizonY + (h - horizonY) * t * t;
  ctx.fillStyle = "rgba(255, 255, 255, 0.013)";
  for (let i = 1; i < 6; i += 2) {
    const y0 = band(i / 6);
    const y1 = band((i + 1) / 6);
    ctx.fillRect(0, y0, w, y1 - y0);
  }

  // The rope, and the shadow it casts on the grass.
  strokeLine(ctx, 0, horizonY, w, horizonY, withAlpha(palette.cyan, 0.45), 2);
  strokeLine(ctx, 0, horizonY + 3, w, horizonY + 3, "rgba(255, 255, 255, 0.10)", 1);

  // Thirty-yard ring — the far arc of it, seen almost edge-on.
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.66, w * 0.65, h * 0.23, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

export function paintStadium(ctx: CanvasRenderingContext2D, frame: StadiumFrame): void {
  const { width: w, height: h, palette } = frame;
  const horizonY = h * horizonFraction;

  // Night sky over the ground.
  const sky = ctx.createLinearGradient(w / 2, 0, w / 2, horizonY);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.48, palette.skyMid);
  sky.addColorStop(1, palette.skyDeep);
  fillRect(ctx, 0, 0, w, horizonY + 1, sky);

  const haloRadius = (w * 1.05) / 2;
  const halo = ctx.createRadialGradient(w * 0.5, h * 0.14, 0, w * 0.5, h * 0.14, haloRadius);
  halo.addColorStop(0, withAlpha(palette.cyan, 0.08));
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.14, haloRadius, (h * 0.3) / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();
  ctx.restore();

  const standTop = h * 0.115;
  const standBottom = h * 0.245;
  paintFloodlight(ctx, w * 0.07, standTop + 8, false, frame);
  paintFloodlight(ctx, w * 0.93, standTop + 8, true, frame);
  paintStands(ctx, standTop, standBottom, frame);
  paintSightscreen(ctx, standTop, standBottom, frame);
  paintHoardings(ctx, standBottom + h * 0.012, frame);
  paintOutfield(ctx, horizonY, frame);
  paintScanlines(ctx, w, h);
}

/**
 * The same ground from the blimp: a disc of turf mown in rings, the rope around
 * it, the thirty-yard circle inside it, and the dark of the stands beyond.
 */
export function paintGroundFromAbove(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  palette: ScenePalette,
): void {
  fillRect(ctx, 0, 0, width, height, palette.aboveBackdrop);

  const turf = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  turf.addColorStop(0, palette.turfAboveInner);
  turf.addColorStop(1, palette.turfAboveOuter);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = turf;
  ctx.fill();

  // Mown rings.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.012)";
  ctx.lineWidth = radius / 5;
  for (let i = 1; i <= 5; i += 2) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, (radius * i) / 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Thirty-yard circle.
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // The rope.
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(palette.cyan, 0.42);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  paintScanlines(ctx, width, height);
}

/**
 * How loud the ground is. Idles low, jumps on a boundary or a wicket, and
 * settles back over a couple of seconds — the crowd is the scoreboard you hear.
 */
export function crowdHype(loud: number, age01: number): number {
  if (loud === 0) return crowdIdleHype;
  return crowdIdleHype + loud * (1 - age01) * (1 - crowdIdleHype);
}

import type { GrandPrixLiverySpec } from "../../data/liveries";

import { darken, withAlpha, type RacePalette } from "./palette";

/**
 * One top-down Formula car, drawn twice: by the arena on track and by the
 * lobby's livery preview, so the car you pick is exactly the car you race.
 *
 * A port of `games/grand_prix/grand_prix_car_painter.dart`, and the proportions
 * are a modern one — a multi-element front wing with endplates, a slim nose, a
 * halo over the cockpit, coke-bottle sidepods, an engine-cover spine, a
 * diffuser and a DRS rear wing — kept bold enough to still read at twenty-six
 * pixels wide.
 *
 * Every measurement is a fraction of the box, so the same call serves a 26px
 * car on a phone and a 90px one in the lobby.
 */

export type CarStyle = {
  body: string;
  bodyEdge: string;
  accent: string;
  accentDark: string;
  carbon: string;
  tyre: string;
  rim: string;
  halo: string;
  suspension: string;
  shadow: string;
  glint: string;
};

export function carStyle(
  spec: GrandPrixLiverySpec,
  palette: RacePalette,
): CarStyle {
  return {
    body: spec.primary,
    bodyEdge: darken(spec.primary, 0.45),
    accent: spec.accent,
    accentDark: darken(spec.accent, 0.3),
    carbon: palette.carbon,
    tyre: palette.tyre,
    rim: palette.rim,
    halo: palette.halo,
    suspension: palette.suspension,
    shadow: "rgba(0, 0, 0, 0.28)",
    glint: "rgba(255, 255, 255, 0.45)",
  };
}

/** The car's width as a fraction of its length. */
export const carAspect = 0.52;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.arcTo(left + width, top, left + width, top + height, r);
  ctx.arcTo(left + width, top + height, left, top + height, r);
  ctx.arcTo(left, top + height, left, top, r);
  ctx.arcTo(left, top, left + width, top, r);
  ctx.closePath();
}

function fillRounded(
  ctx: CanvasRenderingContext2D,
  color: string,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
): void {
  roundedRect(ctx, left, top, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function oval(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  ctx.beginPath();
  ctx.ellipse(
    left + width / 2,
    top + height / 2,
    width / 2,
    height / 2,
    0,
    0,
    Math.PI * 2,
  );
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draws the car into a `w` × `h` box, nose at y = 0 and rear wing at y = h.
 * It is drawn for roughly a 1:2 box; `paintCarPreview` letterboxes anything
 * else to that aspect.
 */
export function paintGrandPrixCar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: CarStyle,
): void {
  const r = w * 0.05;
  const thin = Math.max(1, w * 0.03);

  // Ground shadow.
  oval(ctx, w * 0.01, h * 0.02, w * 0.98, h * 0.96);
  ctx.fillStyle = s.shadow;
  ctx.fill();

  // Front wing under the nose: endplates, upper flap, main plane.
  fillRounded(ctx, s.carbon, w * 0.005, h * 0.005, w * 0.06, h * 0.115, r);
  fillRounded(ctx, s.carbon, w * 0.935, h * 0.005, w * 0.06, h * 0.115, r);
  fillRounded(ctx, s.accentDark, w * 0.09, h * 0.018, w * 0.82, h * 0.032, r);
  fillRounded(ctx, s.accent, w * 0.05, h * 0.055, w * 0.9, h * 0.048, r);

  // Suspension wishbones, under the tyres.
  ctx.strokeStyle = s.suspension;
  ctx.lineWidth = thin;
  ctx.lineCap = "round";
  line(ctx, w * 0.42, h * 0.2, w * 0.1, h * 0.185);
  line(ctx, w * 0.42, h * 0.245, w * 0.1, h * 0.24);
  line(ctx, w * 0.58, h * 0.2, w * 0.9, h * 0.185);
  line(ctx, w * 0.58, h * 0.245, w * 0.9, h * 0.24);
  line(ctx, w * 0.38, h * 0.725, w * 0.1, h * 0.715);
  line(ctx, w * 0.38, h * 0.785, w * 0.1, h * 0.78);
  line(ctx, w * 0.62, h * 0.725, w * 0.9, h * 0.715);
  line(ctx, w * 0.62, h * 0.785, w * 0.9, h * 0.78);
  ctx.lineCap = "butt";

  // Tyres — the rears run wider, each with a grey rim slot.
  const tyreAt = (left: number, top: number, tw: number, th: number) => {
    fillRounded(ctx, s.tyre, left, top, tw, th, w * 0.055);
    fillRounded(
      ctx,
      s.rim,
      left + tw * 0.32,
      top + th * 0.24,
      tw * 0.36,
      th * 0.52,
      w * 0.03,
    );
  };
  tyreAt(-w * 0.005, h * 0.145, w * 0.195, h * 0.135);
  tyreAt(w * 0.81, h * 0.145, w * 0.195, h * 0.135);
  tyreAt(-w * 0.015, h * 0.685, w * 0.215, h * 0.155);
  tyreAt(w * 0.8, h * 0.685, w * 0.215, h * 0.155);

  // Body: slim nose, chassis, sidepod flare, coke-bottle taper, rear.
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.01);
  ctx.quadraticCurveTo(w * 0.575, h * 0.045, w * 0.585, h * 0.16);
  ctx.lineTo(w * 0.615, h * 0.33);
  ctx.quadraticCurveTo(w * 0.83, h * 0.375, w * 0.835, h * 0.47);
  ctx.quadraticCurveTo(w * 0.815, h * 0.6, w * 0.66, h * 0.685);
  ctx.lineTo(w * 0.635, h * 0.86);
  ctx.lineTo(w * 0.365, h * 0.86);
  ctx.lineTo(w * 0.34, h * 0.685);
  ctx.quadraticCurveTo(w * 0.185, h * 0.6, w * 0.165, h * 0.47);
  ctx.quadraticCurveTo(w * 0.17, h * 0.375, w * 0.385, h * 0.33);
  ctx.lineTo(w * 0.415, h * 0.16);
  ctx.quadraticCurveTo(w * 0.425, h * 0.045, w * 0.5, h * 0.01);
  ctx.closePath();
  ctx.fillStyle = s.body;
  ctx.fill();
  ctx.strokeStyle = s.bodyEdge;
  ctx.lineWidth = Math.max(1, w * 0.022);
  ctx.stroke();

  // Sidepod radiator intakes.
  fillRounded(ctx, s.carbon, w * 0.205, h * 0.445, w * 0.115, h * 0.045, r);
  fillRounded(ctx, s.carbon, w * 0.68, h * 0.445, w * 0.115, h * 0.045, r);

  // The accent nose stripe and the engine-cover spine.
  fillRounded(ctx, s.accent, w * 0.474, h * 0.045, w * 0.052, h * 0.135, r);
  fillRounded(ctx, s.accent, w * 0.468, h * 0.565, w * 0.064, h * 0.27, r);

  // Wing mirrors.
  fillRounded(ctx, s.accent, w * 0.335, h * 0.372, w * 0.048, h * 0.02, r);
  fillRounded(ctx, s.accent, w * 0.617, h * 0.372, w * 0.048, h * 0.02, r);

  // Cockpit, halo, and the driver's helmet.
  fillRounded(ctx, s.carbon, w * 0.415, h * 0.36, w * 0.17, h * 0.185, w * 0.07);
  ctx.strokeStyle = s.halo;
  ctx.lineWidth = Math.max(1, w * 0.028);
  oval(ctx, w * 0.4, h * 0.35, w * 0.2, h * 0.205);
  ctx.stroke();
  line(ctx, w * 0.5, h * 0.35, w * 0.5, h * 0.44);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.475, w * 0.062, 0, Math.PI * 2);
  ctx.fillStyle = s.accent;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.478, h * 0.462, w * 0.02, 0, Math.PI * 2);
  ctx.fillStyle = s.glint;
  ctx.fill();

  // Diffuser, with vertical strakes.
  fillRounded(ctx, s.carbon, w * 0.28, h * 0.86, w * 0.44, h * 0.08, r);
  ctx.strokeStyle = s.rim;
  ctx.lineWidth = Math.max(1, w * 0.018);
  for (const x of [0.39, 0.5, 0.61]) {
    line(ctx, w * x, h * 0.872, w * x, h * 0.928);
  }

  // Rear wing, topmost at the back: endplates, main plane, DRS slot, flap.
  fillRounded(ctx, s.carbon, w * 0.06, h * 0.845, w * 0.055, h * 0.135, r);
  fillRounded(ctx, s.carbon, w * 0.885, h * 0.845, w * 0.055, h * 0.135, r);
  fillRounded(ctx, s.accentDark, w * 0.13, h * 0.845, w * 0.74, h * 0.028, r);
  fillRounded(ctx, s.accent, w * 0.1, h * 0.875, w * 0.8, h * 0.062, r);
  ctx.strokeStyle = s.carbon;
  ctx.lineWidth = Math.max(1, w * 0.016);
  line(ctx, w * 0.12, h * 0.905, w * 0.88, h * 0.905);
}

/**
 * The car on track: the glow that marks the player's, the car itself, and the
 * ring that says it is spinning.
 *
 * The player's is the one glowing thing out there, which is how you find
 * yourself in a field of twenty at a glance.
 */
export function paintCarOnTrack(
  ctx: CanvasRenderingContext2D,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    style: CarStyle;
    palette: RacePalette;
    isPlayer: boolean;
    spinning: boolean;
    accent: string;
  },
): void {
  const { x, y, width: w, height: h, angle, style, palette, isPlayer, spinning, accent } = options;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.translate(-w / 2, -h / 2);

  if (isPlayer) {
    ctx.save();
    ctx.filter = "blur(8px)";
    oval(ctx, -w * 0.25, -h * 0.15, w * 1.5, h * 1.3);
    ctx.fillStyle = withAlpha(accent, 0.35);
    ctx.fill();
    ctx.restore();
  }

  paintGrandPrixCar(ctx, w, h, style);

  if (spinning) {
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, w * 0.75, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(palette.danger, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

/** The lobby preview: the car centred at its native aspect in any box. */
export function paintCarPreview(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: CarStyle,
): void {
  const carWidth = Math.min(width, height * carAspect);
  const carHeight = carWidth / carAspect;
  ctx.save();
  ctx.translate((width - carWidth) / 2, (height - carHeight) / 2);
  paintGrandPrixCar(ctx, carWidth, carHeight, style);
  ctx.restore();
}

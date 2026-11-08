import { typography } from "@statoz/design-system/games/tokens/typography";
/**
 * The rebound landing marker — the web port of `_LandingMarkerComponent`.
 *
 * It is the one piece of information the game gives you that the court itself
 * could not: where a missed shot is going to come down. It appears only once the
 * engine has published a prediction, which is only after rim contact — before
 * that, the shot's fate is genuinely unknown and a marker would be a lie.
 *
 * The ACTION pad's REBOUND cue is gated on the same prediction, so the marker
 * and the button always agree.
 */

import type { HoopDuelGame } from "../../engine/game-loop";

import { worldToScreen, type CourtProjection } from "./geometry";
import { displayFontOf, withAlpha, type ScenePalette } from "./palette";

export function paintLandingMarker(
  ctx: CanvasRenderingContext2D,
  game: HoopDuelGame,
  projection: CourtProjection,
  palette: ScenePalette,
  seconds: number,
): void {
  const prediction = game.engine.ball.prediction;
  if (prediction === null) return;

  const px = projection.px;
  const at = worldToScreen(projection, game.camX, game.shake, prediction.landX, 0);
  const pulse = game.reducedMotion ? 1 : 0.88 + Math.sin(seconds * 9) * 0.12;
  const rx = (px * 1.02 * pulse) / 2;
  const ry = (px * 0.34 * pulse) / 2;

  ctx.beginPath();
  ctx.ellipse(at.x, at.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(palette.gold, 0.78);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    at.x,
    at.y,
    Math.max(0, rx - px * 0.1),
    Math.max(0, ry - px * 0.1),
    0,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = withAlpha(palette.gold, 0.34);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bracketing ticks either side, so the mark reads as a target rather than a
  // puddle of light on the floor.
  const tick = px * 0.15;
  const span = rx * 2 * 0.62;
  ctx.strokeStyle = withAlpha(palette.cyan, 0.66);
  ctx.lineWidth = 2;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(at.x - span, at.y);
  ctx.lineTo(at.x - span + tick, at.y);
  ctx.moveTo(at.x + span - tick, at.y);
  ctx.lineTo(at.x + span, at.y);
  ctx.stroke();

  ctx.fillStyle = withAlpha(palette.gold, 0.86);
  ctx.fillRect(
    at.x - Math.max(3, px * 0.07) / 2,
    at.y - Math.max(2, px * 0.025) / 2,
    Math.max(3, px * 0.07),
    Math.max(2, px * 0.025),
  );

  const chevronY = at.y - px * 0.38;
  ctx.beginPath();
  ctx.moveTo(at.x - px * 0.12, chevronY);
  ctx.lineTo(at.x, chevronY + px * 0.09);
  ctx.lineTo(at.x + px * 0.12, chevronY);
  ctx.strokeStyle = withAlpha(palette.gold, 0.72);
  ctx.lineWidth = 2;
  ctx.lineCap = "butt";
  ctx.stroke();

  ctx.font = displayFontOf(palette, typography.sizePx.p7, typography.weight.black);
  ctx.fillStyle = withAlpha(palette.gold, 0.82);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const previousSpacing = ctx.letterSpacing;
  ctx.letterSpacing = "1.2px";
  ctx.fillText("REBOUND", at.x, chevronY - px * 0.1);
  ctx.letterSpacing = previousSpacing;
}

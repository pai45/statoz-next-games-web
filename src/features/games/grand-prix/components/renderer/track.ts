import { roadBehindMeters, roadSampleStep } from "../../constants";
import { trackHalfWidth, wallLateral } from "../../tuning";
import type { RaceField } from "../../engine/field";
import { lapLengthOf } from "../../types";

import { withAlpha, type RacePalette } from "./palette";
import { worldToScreen, type RaceProjection, type ScreenPoint } from "./projection";

/**
 * The vertically scrolling road: grass, walls, asphalt, kerbs through the
 * corners, braking boards, centre dashes, and the start/finish checker.
 *
 * Every edge is sampled around the player each frame through the same
 * projection the cars use, so the road bends exactly where the physics says the
 * corner is rather than merely near it.
 */

function polyline(ctx: CanvasRenderingContext2D, points: ScreenPoint[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
}

/** The band between two sampled edges, as one closed shape. */
function band(
  ctx: CanvasRenderingContext2D,
  left: ScreenPoint[],
  right: ScreenPoint[],
): void {
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i -= 1) {
    ctx.lineTo(right[i].x, right[i].y);
  }
  ctx.closePath();
}

export function paintTrack(
  ctx: CanvasRenderingContext2D,
  field: RaceField,
  projection: RaceProjection,
  palette: RacePalette,
): void {
  const player = field.player;
  const from = player.distance - roadBehindMeters;
  const to = player.distance + projection.aheadMeters;

  const leftWall: ScreenPoint[] = [];
  const rightWall: ScreenPoint[] = [];
  const leftEdge: ScreenPoint[] = [];
  const rightEdge: ScreenPoint[] = [];
  for (let s = from; s <= to; s += roadSampleStep) {
    leftWall.push(worldToScreen(field, projection, s, -wallLateral));
    rightWall.push(worldToScreen(field, projection, s, wallLateral));
    leftEdge.push(worldToScreen(field, projection, s, -trackHalfWidth));
    rightEdge.push(worldToScreen(field, projection, s, trackHalfWidth));
  }
  if (leftWall.length < 2) return;

  // Grass: the whole corridor between the walls.
  band(ctx, leftWall, rightWall);
  ctx.fillStyle = palette.grass;
  ctx.fill();

  // Asphalt.
  band(ctx, leftEdge, rightEdge);
  ctx.fillStyle = palette.asphalt;
  ctx.fill();

  // The track's edge lines.
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(palette.cyan, 0.18);
  polyline(ctx, leftEdge);
  ctx.stroke();
  polyline(ctx, rightEdge);
  ctx.stroke();

  // The walls.
  ctx.lineWidth = 3;
  ctx.strokeStyle = withAlpha(palette.muted, 0.55);
  polyline(ctx, leftWall);
  ctx.stroke();
  polyline(ctx, rightWall);
  ctx.stroke();

  paintCentreDashes(ctx, field, projection, palette, from, to);
  paintKerbsAndBoards(ctx, field, projection, palette, from, to);
  paintFinishLines(ctx, field, projection, palette);
}

/** A centre dash every twelve metres — the main sense of speed. */
function paintCentreDashes(
  ctx: CanvasRenderingContext2D,
  field: RaceField,
  projection: RaceProjection,
  palette: RacePalette,
  from: number,
  to: number,
): void {
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(palette.cyan, 0.1);
  const start = Math.floor(from / 12) * 12;
  for (let s = start; s <= to; s += 12) {
    const a = worldToScreen(field, projection, s, 0);
    const b = worldToScreen(field, projection, s + 5, 0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

/**
 * Kerb dashes along the edges of every corner and chicane, plus amber braking
 * boards sixty and a hundred and ten metres before each zone — repeated for
 * every lap currently in view.
 */
function paintKerbsAndBoards(
  ctx: CanvasRenderingContext2D,
  field: RaceField,
  projection: RaceProjection,
  palette: RacePalette,
  from: number,
  to: number,
): void {
  const sections = field.circuit.sections;
  const lapLength = lapLengthOf(field.circuit);
  const firstLap = Math.max(0, Math.floor(from / lapLength));
  const lastLap = Math.min(field.laps - 1, Math.floor(to / lapLength));

  for (let lap = firstLap; lap <= lastLap; lap += 1) {
    const lapBase = lap * lapLength;
    for (let i = 0; i < sections.length; i += 1) {
      const section = sections[i];
      if (section.type === "straight") continue;
      const sectionStart = lapBase + field.sectionStarts[i];
      const sectionEnd = sectionStart + section.length;
      if (sectionEnd < from || sectionStart > to) continue;

      // Alternating kerb dashes on both edges through the section.
      let red = true;
      ctx.lineWidth = 4;
      for (
        let s = Math.max(sectionStart, from);
        s < Math.min(sectionEnd, to);
        s += 5, red = !red
      ) {
        ctx.strokeStyle = withAlpha(
          red ? palette.danger : palette.checkerLight,
          0.55,
        );
        for (const side of [-1, 1]) {
          const a = worldToScreen(field, projection, s, side * trackHalfWidth);
          const b = worldToScreen(
            field,
            projection,
            Math.min(s + 3.4, sectionEnd),
            side * trackHalfWidth,
          );
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Braking boards ahead of the zone.
      ctx.fillStyle = withAlpha(palette.amber, 0.7);
      for (const lead of [60, 110]) {
        const s = sectionStart - lead;
        if (s < from || s > to) continue;
        for (const side of [-1, 1]) {
          const at = worldToScreen(
            field,
            projection,
            s,
            side * (trackHalfWidth + 1),
          );
          ctx.fillRect(at.x - 5, at.y - 2, 10, 4);
        }
      }
    }
  }
}

/**
 * The start line, a slim marker at every intermediate lap boundary, and the
 * full checkered flag at the race's finish.
 */
function paintFinishLines(
  ctx: CanvasRenderingContext2D,
  field: RaceField,
  projection: RaceProjection,
  palette: RacePalette,
): void {
  const lapLength = lapLengthOf(field.circuit);
  for (let lap = 0; lap <= field.laps; lap += 1) {
    const at = lap * lapLength;
    const delta = at - field.player.distance;
    if (delta < -30 || delta > projection.aheadMeters) continue;
    const isFinish = lap === field.laps;
    paintChecker(ctx, field, projection, palette, at, isFinish || lap === 0 ? 2 : 1);
  }
}

function paintChecker(
  ctx: CanvasRenderingContext2D,
  field: RaceField,
  projection: RaceProjection,
  palette: RacePalette,
  at: number,
  rows: number,
): void {
  const cells = 8;
  const cellWidth = (trackHalfWidth * 2) / cells;
  for (let row = 0; row < rows; row += 1) {
    for (let i = 0; i < cells; i += 1) {
      const even = (i + row) % 2 === 0;
      const a = worldToScreen(
        field,
        projection,
        at + row * 2,
        -trackHalfWidth + i * cellWidth,
      );
      const b = worldToScreen(
        field,
        projection,
        at + (row + 1) * 2,
        -trackHalfWidth + (i + 1) * cellWidth,
      );
      ctx.fillStyle = even ? palette.checkerLight : palette.checkerDark;
      ctx.fillRect(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.abs(b.x - a.x),
        Math.abs(b.y - a.y),
      );
    }
  }
}

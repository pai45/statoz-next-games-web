"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  contactSparkCount,
  roadBehindMeters,
  wallSparkCount,
} from "../constants";
import { carWidth } from "../tuning";
import { grandPrixLiverySpec } from "../data/liveries";
import { isSpinning } from "../engine/field";
import type { GrandPrixRace } from "../engine/race";
import { useRaceLoop } from "../state/use-race-engine";

import { carStyle, paintCarOnTrack, type CarStyle } from "./renderer/car";
import { SparkField } from "./renderer/effects";
import { readRacePalette, type RacePalette } from "./renderer/palette";
import { raceProjection, worldToScreen } from "./renderer/projection";
import { paintTrack } from "./renderer/track";

/**
 * The canvas the race is drawn on, and the only thing in the module that runs
 * per frame.
 *
 * It owns the visual state Flutter keeps on `GrandPrixGame` that is genuinely
 * about drawing rather than rules — the spark pool, the resolved palette, the
 * per-livery paint — because none of it is a rule and none of it should cost a
 * React render.
 *
 * The draw order is Flame's component priority: the road under everything, then
 * the rest of the field, then the player, then sparks. So a rival never covers
 * your own car, which is the whole reason yours is the one that glows.
 */

export type GrandPrixArenaProps = {
  race: GrandPrixRace;
  /** False once the result is up; the canvas holds its last frame. */
  active: boolean;
};

export function GrandPrixArena({ race, active }: GrandPrixArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef<RacePalette | null>(null);
  const sparksRef = useRef<SparkField | null>(null);
  const stylesRef = useRef<Map<string, CarStyle> | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  if (sparksRef.current === null) sparksRef.current = new SparkField();

  /* ---- Sizing -------------------------------------------------------------- */

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (canvas == null || parent == null) return;

    // Beyond 2x the extra pixels cost real frames and buy nothing anyone sees.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) return;

    sizeRef.current = { width, height, dpr };
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    const palette = readRacePalette();
    paletteRef.current = palette;
    // One paint per livery, built once: seven of them dress a field of twenty.
    const styles = new Map<string, CarStyle>();
    for (const car of race.field.cars) {
      if (!styles.has(car.livery)) {
        styles.set(car.livery, carStyle(grandPrixLiverySpec(car.livery), palette));
      }
    }
    stylesRef.current = styles;

    resize();
    const parent = canvasRef.current?.parentElement;
    if (parent == null) return;
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [race, resize]);

  /* ---- The frame ----------------------------------------------------------- */

  const paint = useCallback(
    (dt: number) => {
      const canvas = canvasRef.current;
      const palette = paletteRef.current;
      const sparks = sparksRef.current;
      const styles = stylesRef.current;
      if (canvas == null || palette == null || sparks == null || styles == null) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (ctx == null) return;

      const { width, height, dpr } = sizeRef.current;
      if (width === 0 || height === 0) return;

      const field = race.field;
      const projection = raceProjection(field, width, height);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, width, height);

      paintTrack(ctx, field, projection, palette);

      // Contact throws sparks from wherever the player's car is right now. The
      // race flags it and the canvas spends it, so scenery never reaches React.
      const contact = race.takeContact();
      if (contact !== null && !race.reducedMotion) {
        const at = worldToScreen(
          field,
          projection,
          field.player.distance,
          field.player.lateral,
        );
        sparks.spawn(
          at.x,
          at.y,
          contact === "wall" ? palette.danger : palette.amber,
          contact === "wall" ? wallSparkCount : contactSparkCount,
        );
      }

      const playerDistance = field.player.distance;
      const held = race.held;
      const steerLean = ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 0.12;
      const carPx = carWidth * projection.pxPerMeterX * 0.68;

      // Rivals, then the player: yours is always the car on top.
      const order = [
        ...field.cars.filter((car) => !car.isPlayer),
        field.player,
      ];
      for (const car of order) {
        const delta = car.distance - playerDistance;
        if (delta <= -roadBehindMeters || delta >= projection.aheadMeters) continue;
        const style = styles.get(car.livery);
        if (style === undefined) continue;
        const at = worldToScreen(field, projection, car.distance, car.lateral);
        paintCarOnTrack(ctx, {
          x: at.x,
          y: at.y,
          width: carPx,
          height: carPx * 2.05,
          angle: isSpinning(car)
            ? Math.sin(car.spinTimer * 24) * 0.7
            : car.isPlayer
              ? steerLean
              : 0,
          style,
          palette,
          isPlayer: car.isPlayer,
          spinning: isSpinning(car),
          accent: grandPrixLiverySpec(car.livery).accent,
        });
      }

      sparks.paint(ctx, dt);
    },
    [race],
  );

  useRaceLoop(race, paint, active);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="block size-full touch-none select-none"
    />
  );
}

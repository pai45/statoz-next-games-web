"use client";

import { useCallback, useEffect, useRef } from "react";

import { liveryById } from "../data/liveries";
import { buildLook } from "../data/looks";
import type { HoopDuelGame } from "../engine/game-loop";
import { useHoopDuelLoop } from "../state/use-hoop-duel-engine";

import { dribbleHeight, paintBall, type BallTrail } from "./renderer/ball";
import { CourtScene } from "./renderer/court";
import {
  beginImpactCinematic,
  endImpactCinematic,
  ParticleField,
} from "./renderer/effects";
import { courtProjection, worldToScreen } from "./renderer/geometry";
import { paintLandingMarker } from "./renderer/marker";
import { readScenePalette, type ScenePalette } from "./renderer/palette";
import { advanceRigMotion, createRigMotion, drawAthlete } from "./renderer/rig";

/**
 * The canvas the duel is drawn on, and the only thing in the module that runs
 * per frame.
 *
 * It owns the visual state Flutter keeps on `BasketballGame` that is genuinely
 * about drawing rather than rules — the ball's heat trail, each athlete's leg
 * cycle, the particle pool, the skyline's clock — because none of it is a rule
 * and none of it should cost a React render.
 *
 * The draw order is Flame's component priority order, which is not arbitrary:
 * the landing marker sits *under* the athletes so a body chasing a rebound
 * covers the mark it is running to, and the ball sits over both so it is never
 * lost behind a shoulder at the rim.
 */

export type HoopDuelArenaProps = {
  game: HoopDuelGame;
  /** Paused between halves and behind overlays; the canvas holds its last frame. */
  active: boolean;
};

export function HoopDuelArena({ game, active }: HoopDuelArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef<ScenePalette | null>(null);
  const sceneRef = useRef<CourtScene | null>(null);
  const particlesRef = useRef<ParticleField | null>(null);
  const trailRef = useRef<BallTrail>([]);
  const motionRef = useRef([createRigMotion(), createRigMotion()]);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  if (sceneRef.current === null) sceneRef.current = new CourtScene();
  if (particlesRef.current === null) particlesRef.current = new ParticleField();

  /* ---- Sizing ------------------------------------------------------------- */

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
    game.setViewport(width, height);
  }, [game]);

  useEffect(() => {
    paletteRef.current = readScenePalette();
    resize();
    const parent = canvasRef.current?.parentElement;
    if (parent == null) return;
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [resize]);

  /* ---- The frame ---------------------------------------------------------- */

  const paint = useCallback(
    (seconds: number, dt: number) => {
      const canvas = canvasRef.current;
      const palette = paletteRef.current;
      const scene = sceneRef.current;
      const particles = particlesRef.current;
      if (canvas == null || palette == null || scene == null || particles == null) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (ctx == null) return;

      const { width, height, dpr } = sizeRef.current;
      if (width === 0 || height === 0) return;

      const projection = courtProjection(width, height);
      const engine = game.engine;
      scene.advance(game.reducedMotion ? 0 : dt);
      for (let team = 0; team < 2; team += 1) {
        advanceRigMotion(motionRef.current[team], engine.bodies[team].x, dt);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, width, height);

      const cinematic = beginImpactCinematic(ctx, game, projection);

      scene.paint(ctx, game, projection, palette);
      paintLandingMarker(ctx, game, projection, palette, seconds);

      // The CPU first, then the player: on a shared possession the athlete you
      // are steering is the one in front.
      for (const team of [1, 0]) {
        const body = engine.bodies[team];
        const holdingBall = engine.ball.phase === "held" && engine.ball.holder === team;
        drawAthlete(ctx, {
          body,
          look: buildLook(body.spec),
          livery: liveryById(team === 0 ? game.config.teamId : game.config.cpuTeamId),
          motion: motionRef.current[team],
          ground: worldToScreen(projection, game.camX, game.shake, body.x, 0),
          px: projection.px,
          palette,
          // Offset to the top of the ball, which is what a hand actually meets.
          dribbleBallY: holdingBall ? dribbleHeight(engine, game) + 0.12 : null,
          heatAura: engine.teams[team].heatActive && holdingBall,
          isPlayer: team === 0,
          reducedMotion: game.reducedMotion,
        });
      }

      paintBall(ctx, game, projection, palette, trailRef.current);

      particles.spawn(game, projection, palette);
      particles.paint(ctx, dt);

      endImpactCinematic(ctx, cinematic);
    },
    [game],
  );

  useHoopDuelLoop(game, paint, active);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="block size-full touch-none select-none"
    />
  );
}

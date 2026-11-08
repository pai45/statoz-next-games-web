"use client";

import { useCallback, useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import type { TennisRallyGame } from "../engine/tennis-game";
import { useTennisLoop } from "../state/use-tennis-engine";

import { paintBall } from "./renderer/ball";
import {
  paintAtmosphere,
  paintCourt,
  paintLandingMarker,
  paintNet,
  solveLanding,
} from "./renderer/court";
import { paintAthlete } from "./renderer/actors";
import { projectionFor } from "./renderer/geometry";
import { readScenePalette, type ScenePalette } from "./renderer/palette";

/**
 * The canvas the match is drawn on, and the only thing in the module that runs
 * per frame.
 *
 * It owns the animation loop, and nothing it does costs a React render: the
 * camera kick, the net ripple and the ball trail all live on the game instance,
 * and the painters read them directly. The HUD sits over this in the DOM and
 * updates on its own, far coarser, schedule.
 */

export type TennisArenaProps = {
  game: TennisRallyGame;
  /** False while an overlay owns the screen, so the match holds still. */
  active: boolean;
};

export function TennisArena({ game, active }: TennisArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const paletteRef = useRef<ScenePalette | null>(null);

  const reducedMotion = usePrefersReducedMotion();

  /**
   * The landing marker is solved once per flight rather than per frame — the
   * parabola does not change while the ball is in the air, and re-solving it
   * every frame would let floating-point drift make the marker jitter.
   */
  const landingRef = useRef<{ flightId: number; at: { x: number; y: number } | null }>({
    flightId: -1,
    at: null,
  });

  /* ---- Sizing ----------------------------------------------------------- */

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

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
    paletteRef.current = readScenePalette();
    resize();

    const parent = canvasRef.current?.parentElement ?? null;
    if (parent === null) return;

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    // The palette resolves from CSS custom properties, so a theme swap has to
    // re-read it. Never per frame.
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      paletteRef.current = readScenePalette();
    };
    scheme.addEventListener("change", onScheme);

    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", onScheme);
    };
  }, [resize]);

  /* ---- The frame -------------------------------------------------------- */

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const palette = paletteRef.current;
    if (canvas === null || palette === null) return;

    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const { width, height, dpr } = sizeRef.current;
    if (width === 0 || height === 0) return;

    const engine = game.engine;
    const projection = projectionFor(width, height, game.cameraPush);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    paintAtmosphere(ctx, projection, palette);
    paintCourt(ctx, projection, palette, game.linePulse);
    paintNet(ctx, projection, palette, game.netPulse, game.clock);

    // Before the first bounce, show where it is going to land. After it, the
    // marker would be telling the player something they can already see.
    const ball = engine.ball;
    if (ball.live && ball.bounces === 0) {
      if (landingRef.current.flightId !== engine.flightId) {
        landingRef.current = { flightId: engine.flightId, at: solveLanding(ball) };
      }
      const landing = landingRef.current.at;
      if (landing !== null) {
        paintLandingMarker(ctx, projection, palette, landing, engine.focusPointActive);
      }
    } else {
      landingRef.current = { flightId: -1, at: null };
    }

    // Far side first, so the near athlete overlaps them rather than the reverse.
    paintAthlete(ctx, projection, palette, engine.opponent, {
      ballX: ball.x,
      clock: game.clock,
      focusRing: false,
    });
    paintAthlete(ctx, projection, palette, engine.player, {
      ballX: ball.x,
      clock: game.clock,
      focusRing: engine.focusPointActive,
    });

    paintBall(ctx, projection, palette, ball, game.trail);
  }, [game]);

  useTennisLoop(game, paint, reducedMotion, active);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block size-full"
      aria-hidden
    />
  );
}

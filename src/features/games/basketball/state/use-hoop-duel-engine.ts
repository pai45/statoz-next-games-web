"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { maxFrameSeconds } from "../constants";
import type { BasketballEvent, BasketballMatchConfig } from "../types";
import type { BasketballActionCue, ShotMeterView } from "../types";
import { HoopDuelGame, type BasketballSting } from "../engine/game-loop";

/**
 * The seam between a 120 Hz simulation and a React tree that must not re-render
 * a hundred and twenty times a second.
 *
 * Flutter solves the same problem with `ValueNotifier`s: the Flame loop reads
 * the engine directly and the HUD watches a handful of published values. The web
 * split is the same shape — `useHoopDuelLoop` owns the requestAnimationFrame
 * loop and hands each frame straight to the canvas, and `useHoopDuelHud`
 * publishes only what the HUD can actually see, through `useSyncExternalStore`
 * with a cached snapshot, so a frame that changed nothing costs no render.
 */

/**
 * The game object for one match.
 *
 * A lazy `useState` initialiser rather than a ref, so the instance is built once
 * without writing to anything during render, and survives Strict Mode's
 * double-invoked effects — which a cleanup would not. Nothing leaks: every
 * listener unsubscribes itself and the loop holds no timer of its own.
 */
export function useHoopDuelGame(
  config: BasketballMatchConfig,
  reducedMotion: boolean,
): HoopDuelGame {
  const [game] = useState(() => new HoopDuelGame({ config, reducedMotion }));
  return game;
}

export type FramePainter = (frameSeconds: number, elapsedSeconds: number) => void;

/**
 * Steps the game and paints, once per animation frame.
 *
 * The elapsed time is clamped before it reaches the loop, matching Flutter's
 * `min(dt, 1/30)` — a tab backgrounded for a minute must not resolve a whole
 * half when it comes back.
 */
export function useHoopDuelLoop(
  game: HoopDuelGame,
  paint: FramePainter,
  active: boolean,
): void {
  // The painter changes identity whenever the scene's inputs do; the loop must
  // not restart for that, so it reads the latest through a ref written only
  // from an effect.
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  }, [paint]);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let previous: number | null = null;

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (previous === null) {
        previous = now;
        return;
      }
      const rawSeconds = (now - previous) / 1000;
      previous = now;
      if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) return;

      game.step(rawSeconds);
      paintRef.current(game.seconds, Math.min(rawSeconds, maxFrameSeconds));
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [game, active]);
}

/* ---- The coarse HUD projection -------------------------------------------- */

export type HoopDuelHud = {
  playerScore: number;
  cpuScore: number;
  /** Tenths of a second, as Flutter publishes it. */
  halfClockTenths: number;
  shotClock: number;
  halfIndex: number;
  stamina: number;
  heatPlayer: number;
  heatCpu: number;
  heatActivePlayer: boolean;
  heatActiveCpu: boolean;
  possession: number;
  actionCue: BasketballActionCue;
  meter: ShotMeterView | null;
  sting: BasketballSting | null;
  paused: boolean;
  over: boolean;
  /** The half ended and the engine is waiting to be told what happens next. */
  awaiting: boolean;
};

/** Quantises a 0..1 value to hundredths, so a hair's movement publishes nothing. */
function hundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function project(game: HoopDuelGame): HoopDuelHud {
  const engine = game.engine;
  const meter = engine.meterView(0);
  return {
    playerScore: engine.teams[0].score,
    cpuScore: engine.teams[1].score,
    halfClockTenths: Math.ceil(engine.halfClock * 10),
    shotClock: Math.ceil(Math.min(99, Math.max(0, engine.shotClock))),
    halfIndex: engine.halfIndex,
    stamina: hundredths(engine.playerBody.stamina / 100),
    heatPlayer: hundredths(engine.teams[0].heatMeter),
    heatCpu: hundredths(engine.teams[1].heatMeter),
    heatActivePlayer: engine.teams[0].heatActive,
    heatActiveCpu: engine.teams[1].heatActive,
    possession: engine.ball.holder,
    actionCue: engine.playerActionCue,
    meter:
      meter === null
        ? null
        : {
            // Two hundred steps is finer than the meter is wide in pixels and
            // far coarser than the 120 Hz it is sampled from.
            progress: Math.round(meter.progress * 200) / 200,
            perfectCenter: Math.round(meter.perfectCenter * 200) / 200,
            perfectHalf: Math.round(meter.perfectHalf * 200) / 200,
            goodHalf: Math.round(meter.goodHalf * 200) / 200,
          },
    sting: game.sting,
    paused: game.isPaused,
    over: engine.matchOver,
    awaiting: engine.playPhase === "awaiting",
  };
}

/** Everything the HUD can see, as one comparable string. */
function signature(hud: HoopDuelHud): string {
  return [
    hud.playerScore,
    hud.cpuScore,
    hud.halfClockTenths,
    hud.shotClock,
    hud.halfIndex,
    hud.stamina,
    hud.heatPlayer,
    hud.heatCpu,
    hud.heatActivePlayer,
    hud.heatActiveCpu,
    hud.possession,
    hud.actionCue,
    hud.meter === null ? "-" : `${hud.meter.progress}/${hud.meter.perfectHalf}`,
    hud.sting?.id ?? -1,
    hud.paused,
    hud.over,
    hud.awaiting,
  ].join("|");
}

/**
 * The HUD's view of the match.
 *
 * This *does* publish while a shot meter is sweeping and while the half clock
 * runs — those are the two things on screen that must track the simulation. The
 * clock moves ten times a second and the meter two hundred steps across
 * three-quarters of a second; everything else only moves on a real event.
 */
export function useHoopDuelHud(game: HoopDuelGame): HoopDuelHud {
  const cache = useRef<{ signature: string; value: HoopDuelHud } | null>(null);

  const getSnapshot = useCallback(() => {
    const next = project(game);
    const nextSignature = signature(next);
    if (cache.current === null || cache.current.signature !== nextSignature) {
      cache.current = { signature: nextSignature, value: next };
    }
    return cache.current.value;
  }, [game]);

  const subscribe = useCallback(
    (onChange: () => void) => game.onState(onChange),
    [game],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Engine events, delivered to a callback that never re-subscribes. */
export function useHoopDuelEvents(
  game: HoopDuelGame,
  onEvents: (events: BasketballEvent[]) => void,
): void {
  const handler = useRef(onEvents);
  useEffect(() => {
    handler.current = onEvents;
  }, [onEvents]);

  useEffect(() => game.onEvent((events) => handler.current(events)), [game]);
}

/** A stable input surface, so the control deck never re-renders on identity. */
export function useHoopDuelControls(game: HoopDuelGame) {
  return useMemo(
    () => ({
      setMoveAxis: (axis: number) => game.setMoveAxis(axis),
      tapBurst: () => game.tapBurst(),
      actionPressed: () => game.actionPressed(),
      actionReleased: () => game.actionReleased(),
      swipeBack: () => game.swipeBack(),
      cancelTouches: () => game.cancelTouches(),
    }),
    [game],
  );
}

export type HoopDuelInput = ReturnType<typeof useHoopDuelControls>;

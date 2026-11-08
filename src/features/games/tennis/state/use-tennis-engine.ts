"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { TennisEvent, TennisMatchConfig, TennisSettings } from "../types";
import { isDeuce, isRightServiceCourt, pointLabel } from "../types";
import type { MatchSnapshot, TennisRallyGame, TennisSting } from "../engine/tennis-game";
import { TennisRallyGame as Game } from "../engine/tennis-game";

/**
 * The seam between a 120 Hz simulation and a React tree that must not re-render
 * a hundred and twenty times a second.
 *
 * Flutter splits this with `ValueNotifier`s feeding the HUD while the Flame loop
 * reads the engine directly. The web split is the same shape: `useTennisLoop`
 * owns the requestAnimationFrame loop and hands each frame straight to the
 * canvas, and `useTennisHud` publishes only the coarse beats — the score, the
 * phase, the meters — through `useSyncExternalStore`, with a cached snapshot so
 * an unchanged frame re-renders nothing at all.
 */

/**
 * The game instance for one match.
 *
 * A lazy `useState` initialiser rather than a ref, so it is built exactly once
 * without writing to anything during render, and so it survives Strict Mode's
 * double-invoked effects. There is nothing to dispose: the loop lives in an
 * effect, and every listener unsubscribes itself.
 */
export function useTennisGame(
  config: TennisMatchConfig,
  settings: TennisSettings,
  resume?: MatchSnapshot | null,
): TennisRallyGame {
  const [game] = useState(() => new Game(config, settings, resume ?? undefined));

  // Settings can change mid-match from the pause screen. The instance is not
  // rebuilt for that — only told.
  useEffect(() => {
    game.applySettings(settings);
  }, [game, settings]);

  return game;
}

export type FramePainter = (frameSeconds: number) => void;

/**
 * Steps the game and paints, once per animation frame.
 *
 * The elapsed time is clamped inside `advance`, matching Flutter's
 * `min(dt, 1/30)` — a tab backgrounded for a minute must not resolve a hundred
 * points when it comes back.
 */
export function useTennisLoop(
  game: TennisRallyGame,
  paint: FramePainter,
  reducedMotion: boolean,
  active: boolean,
): void {
  // The painter changes identity whenever the scene's inputs do; the loop must
  // not restart for that, so it reads the latest through a ref written only
  // from an effect.
  const paintRef = useRef(paint);
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    paintRef.current = paint;
    reducedMotionRef.current = reducedMotion;
  }, [paint, reducedMotion]);

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
      const seconds = (now - previous) / 1000;
      previous = now;
      if (!Number.isFinite(seconds) || seconds <= 0) return;

      game.advance(seconds, reducedMotionRef.current);
      paintRef.current(game.clock);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [game, active]);
}

/* ---- The coarse HUD projection ------------------------------------------- */

export type TennisHudSnapshot = {
  playerGames: number;
  opponentGames: number;
  playerPoints: string;
  opponentPoints: string;
  playerServing: boolean;
  opponentServing: boolean;
  deuce: boolean;
  tieBreak: boolean;
  serveNumber: number;
  /** 0..1, the sweeping serve meter. Quantised — see `signature`. */
  serveMeter: number;
  serveVisible: boolean;
  stamina: number;
  focus: number;
  focusActive: boolean;
  rally: number;
  sting: TennisSting | null;
  paused: boolean;
  over: boolean;
  won: boolean;
  rightServiceCourt: boolean;
};

function project(game: TennisRallyGame): TennisHudSnapshot {
  const engine = game.engine;
  const score = engine.score;
  const serving = engine.phase === "preServe" || engine.phase === "serving";

  return {
    playerGames: score.playerGames,
    opponentGames: score.opponentGames,
    playerPoints: pointLabel(score, 0),
    opponentPoints: pointLabel(score, 1),
    playerServing: score.currentServer === 0,
    opponentServing: score.currentServer === 1,
    deuce: isDeuce(score),
    tieBreak: score.tieBreak,
    serveNumber: engine.serveNumber,
    // Quantised so a meter that moved a thousandth does not publish a snapshot.
    serveMeter: Math.round(engine.serveMeter * 200) / 200,
    serveVisible: serving,
    stamina: Math.round(engine.player.stamina01 * 100) / 100,
    focus: Math.round(engine.player.focus01 * 100) / 100,
    focusActive: engine.focusPointActive,
    rally: engine.rallyCount,
    sting: game.sting,
    paused: game.isPaused,
    over: engine.complete,
    won: score.setWinner === 0,
    rightServiceCourt: isRightServiceCourt(score),
  };
}

/** Everything the HUD can see, as one comparable string. */
function signature(snapshot: TennisHudSnapshot): string {
  return [
    snapshot.playerGames,
    snapshot.opponentGames,
    snapshot.playerPoints,
    snapshot.opponentPoints,
    snapshot.playerServing,
    snapshot.deuce,
    snapshot.tieBreak,
    snapshot.serveNumber,
    snapshot.serveMeter,
    snapshot.serveVisible,
    snapshot.stamina,
    snapshot.focus,
    snapshot.focusActive,
    snapshot.rally,
    snapshot.sting?.id ?? -1,
    snapshot.paused,
    snapshot.over,
    snapshot.rightServiceCourt,
  ].join("|");
}

/**
 * The HUD's view of the match.
 *
 * The serve meter sweeps continuously, so this *does* publish while a serve is
 * being wound up — that is the one thing on screen that must track the
 * simulation. It is quantised to two hundred steps, which is finer than the
 * meter is wide in pixels and far coarser than the 120 Hz it is sampled from.
 */
export function useTennisHud(game: TennisRallyGame): TennisHudSnapshot {
  const cache = useRef<{ signature: string; value: TennisHudSnapshot } | null>(null);

  const getSnapshot = useCallback(() => {
    const next = project(game);
    const nextSignature = signature(next);
    if (cache.current === null || cache.current.signature !== nextSignature) {
      cache.current = { signature: nextSignature, value: next };
    }
    return cache.current.value;
  }, [game]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const unsubscribe = game.onState(onChange);
      // The meter and the sting timer move without an engine event, so the HUD
      // is also polled once per frame. `getSnapshot` caches, so a frame that
      // changed nothing the HUD shows still costs no render.
      let frame = 0;
      const poll = () => {
        frame = window.requestAnimationFrame(poll);
        onChange();
      };
      frame = window.requestAnimationFrame(poll);

      return () => {
        unsubscribe();
        window.cancelAnimationFrame(frame);
      };
    },
    [game],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Engine events, delivered to a callback that never re-subscribes. */
export function useTennisEvents(
  game: TennisRallyGame,
  onEvents: (events: TennisEvent[]) => void,
): void {
  const handler = useRef(onEvents);
  useEffect(() => {
    handler.current = onEvents;
  }, [onEvents]);

  useEffect(() => game.onEvent((events) => handler.current(events)), [game]);
}

/** A stable dispatcher, so the control pads never re-render on identity. */
export function useTennisCommands(game: TennisRallyGame) {
  return useMemo(
    () => ({
      move: (x: number, y: number, sprint = false) => game.setMove(x, y, sprint),
      shotStarted: () => game.shotStarted(),
      shotReleased: (aimX: number, aimY: number, holdSeconds: number) =>
        game.shotReleasedWith(aimX, aimY, holdSeconds),
      cancel: () => game.cancelTouches(),
      pause: () => game.setPaused(true),
      resume: () => game.setPaused(false),
    }),
    [game],
  );
}

export type TennisCommands = ReturnType<typeof useTennisCommands>;

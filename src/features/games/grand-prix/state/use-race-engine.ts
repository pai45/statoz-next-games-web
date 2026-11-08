"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { OvertakeEvent } from "../types";
import type { PlayerRaceOutcome, RaceSetup } from "../engine/field";
import { GrandPrixRace, type RaceView } from "../engine/race";

/**
 * The seam between a 120 Hz race and a React tree that must not re-render a
 * hundred and twenty times a second.
 *
 * Flutter solves the same problem with `ValueNotifier`s: the Flame loop reads
 * the field directly and the HUD watches a handful of published values. The
 * split here is the same shape — the loop hands each frame straight to the
 * canvas, and only the coarse view reaches React, through
 * `useSyncExternalStore` with a cached snapshot, so a frame that changed
 * nothing costs no render.
 */

/**
 * The race object for one session.
 *
 * A lazy `useState` initialiser rather than a ref, so it is built once without
 * writing anything during render and survives Strict Mode's double-invoked
 * effects, which a cleanup would not.
 */
export function useGrandPrixRace(
  setup: RaceSetup,
  reducedMotion: boolean,
): GrandPrixRace {
  const [race] = useState(() => new GrandPrixRace(setup, reducedMotion));
  return race;
}

export type FramePainter = (frameSeconds: number) => void;

/** Steps the race and paints, once per animation frame. */
export function useRaceLoop(
  race: GrandPrixRace,
  paint: FramePainter,
  active: boolean,
): void {
  // The painter's identity changes whenever the scene's inputs do; the loop
  // must not restart for that, so it reads the latest through a ref written
  // only from an effect.
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

      race.step(rawSeconds);
      paintRef.current(rawSeconds);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [race, active]);
}

/** Everything the HUD can see, as one comparable string. */
function signature(view: RaceView): string {
  return [
    view.position,
    view.speedKph,
    view.lapProgress,
    view.currentLap,
    view.slipstreaming,
    view.held.left,
    view.held.right,
    view.held.throttle,
    view.held.brake,
    view.stuckSeconds,
    view.running,
  ].join("|");
}

/**
 * The HUD's view of the race.
 *
 * This does publish while the car is moving — the speed readout and the lap bar
 * are the two things on screen that have to track the simulation — but the
 * speed is whole kph and the bar is two hundred steps, so a frame that moved
 * neither costs nothing.
 */
export function useRaceView(race: GrandPrixRace): RaceView {
  const cache = useRef<{ signature: string; value: RaceView } | null>(null);

  const getSnapshot = useCallback(() => {
    const next = race.view();
    const nextSignature = signature(next);
    if (cache.current === null || cache.current.signature !== nextSignature) {
      cache.current = { signature: nextSignature, value: next };
    }
    return cache.current.value;
  }, [race]);

  const subscribe = useCallback(
    (onChange: () => void) => race.onState(onChange),
    [race],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** A pass on track, delivered to a callback that never re-subscribes. */
export function useOvertakes(
  race: GrandPrixRace,
  onOvertake: (event: OvertakeEvent) => void,
): void {
  const handler = useRef(onOvertake);
  useEffect(() => {
    handler.current = onOvertake;
  }, [onOvertake]);

  useEffect(() => race.onOvertake((event) => handler.current(event)), [race]);
}

/** The flag, or the retirement. */
export function useRaceFinish(
  race: GrandPrixRace,
  onFinished: (outcome: PlayerRaceOutcome) => void,
): void {
  const handler = useRef(onFinished);
  useEffect(() => {
    handler.current = onFinished;
  }, [onFinished]);

  useEffect(() => race.onFinished((outcome) => handler.current(outcome)), [race]);
}

/** A stable input surface, so the control deck never re-renders on identity. */
export function useRaceControls(race: GrandPrixRace) {
  return useMemo(
    () => ({
      setLeft: (down: boolean) => race.setInput({ left: down }),
      setRight: (down: boolean) => race.setInput({ right: down }),
      setThrottle: (down: boolean) => race.setInput({ throttle: down }),
      setBrake: (down: boolean) => race.setInput({ brake: down }),
      releaseAll: () => race.releaseAll(),
    }),
    [race],
  );
}

export type RaceInput = ReturnType<typeof useRaceControls>;

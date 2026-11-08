"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { MatchController } from "../engine/match-controller";
import type { GameplayEvent } from "../engine/commands";
import type { GameplayTuning } from "../tuning";
import {
  ballsRemaining,
  canConfigureShot,
  canSwing,
  canTurnBack,
  currentBowler,
  currentOver,
  isTerminal,
  runsNeeded,
  score,
  type BallResult,
  type Elevation,
  type MatchPhase,
  type MatchState,
  type RiskLevel,
  type ShotDirection,
} from "../types";

/**
 * The clock the match runs on, and the seam between a 60 Hz simulation and a
 * React tree that must not re-render sixty times a second.
 *
 * Flutter solves the same problem by feeding the HUD through `ValueNotifier`s
 * while the Flame loop reads `MatchState` directly. The web split is the same
 * shape: `useMatchLoop` owns the requestAnimationFrame loop and hands each
 * frame straight to the canvas, and `useHudSnapshot` publishes only the coarse
 * beats — the score, the phase, the ball strip — through
 * `useSyncExternalStore`, with a cached snapshot so an unchanged frame does not
 * re-render anything at all.
 */

const microsPerSecond = 1000000;

/**
 * The controller for one chase.
 *
 * A lazy `useState` initialiser rather than a ref, so the instance is built
 * once without writing to anything during render. The match is started here
 * too — the seeded roll must happen in the browser, never in a server render
 * where it would differ from the client's.
 *
 * The target is always supplied, as Flutter's cubit does: the tier decides
 * which rungs of the ladder are in play, so leaving the engine to pick would
 * hand a rookie an elite chase.
 */
export function useMatchController(
  tuning: GameplayTuning,
  seed: number,
  target: number,
): MatchController {
  const [controller] = useState(() => {
    const created = new MatchController(tuning);
    created.startMatch(seed, target);
    return created;
  });

  // Deliberately not disposed on unmount. The instance lives in state, so it
  // survives Strict Mode's double-invoked effects while a cleanup would not —
  // disposing there kills the controller the second pass then goes on using.
  // Nothing leaks either way: every listener unsubscribes itself, and the
  // controller holds no timer of its own.
  return controller;
}

export type FramePainter = (frameSeconds: number, elapsedSeconds: number) => void;

/**
 * Steps the controller and paints, once per animation frame.
 *
 * The elapsed time is clamped to 1/30 s before it reaches the engine, matching
 * Flutter's `dt.clamp(0, 1/30)` — a tab that was backgrounded for a minute must
 * not resolve sixty deliveries when it comes back.
 */
export function useMatchLoop(
  controller: MatchController,
  paint: FramePainter,
  active: boolean,
): void {
  // The painter changes identity whenever the scene's inputs do; the loop
  // must not restart for that, so it reads the latest through a ref that is
  // only ever written from an effect.
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  }, [paint]);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let previous: number | null = null;
    let visualSeconds = 0;

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (previous === null) {
        previous = now;
        return;
      }
      const rawSeconds = (now - previous) / 1000;
      previous = now;
      if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) return;

      const bounded = Math.min(rawSeconds, 1 / 30);
      visualSeconds += bounded;
      controller.step(Math.round(bounded * microsPerSecond));
      paintRef.current(visualSeconds, bounded);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [controller, active]);
}

/* ---- The coarse HUD projection ------------------------------------------- */

export type HudSnapshot = {
  score: number;
  wickets: number;
  target: number;
  runsNeeded: number;
  ballsLeft: number;
  currentOver: number;
  maximumOvers: number;
  bowlerName: string;
  combo: number;
  powerSegments: number;
  powerShotArmed: boolean;
  freeHit: boolean;
  phase: MatchPhase;
  suspendedPhase: MatchPhase | null;
  canConfigureShot: boolean;
  canSwing: boolean;
  canRun: boolean;
  canTurnBack: boolean;
  runnerActive: boolean;
  completedRuns: number;
  runProgress: number;
  risk: RiskLevel;
  history: readonly BallResult[];
  selectedElevation: Elevation;
  selectedDirection: ShotDirection;
  preparationSeconds: number;
  over: boolean;
  won: boolean;
  stars: number;
  lastResult: BallResult | null;
  maximumWickets: number;
  powerShotRequirement: number;
};

function project(state: MatchState, tuning: GameplayTuning): HudSnapshot {
  return {
    score: score(state),
    wickets: state.wickets,
    target: state.target,
    runsNeeded: runsNeeded(state),
    ballsLeft: ballsRemaining(state),
    currentOver: currentOver(state),
    maximumOvers: state.maximumOvers,
    bowlerName: currentBowler(state)?.name ?? "VOLT",
    combo: state.combo,
    powerSegments: state.powerSegments,
    powerShotArmed: state.powerShotArmed,
    freeHit: state.freeHit || state.currentDeliveryFreeHit,
    phase: state.phase,
    suspendedPhase: state.suspendedPhase,
    canConfigureShot: canConfigureShot(state),
    canSwing: canSwing(state),
    canRun: state.canRun,
    canTurnBack: canTurnBack(state.runner),
    runnerActive: state.runner.active,
    completedRuns: state.runner.completedRuns,
    // Quantised, so an unchanged bar never publishes a new snapshot.
    runProgress: Math.round(state.runner.progress * 100) / 100,
    risk: state.runner.risk,
    history: state.history,
    selectedElevation: state.selectedElevation,
    selectedDirection: state.selectedDirection,
    preparationSeconds:
      state.phase === "deliveryPreparation"
        ? Math.min(
            3,
            Math.max(
              1,
              Math.ceil(
                (tuning.deliveryPreparationMicros - state.phaseElapsedMicros) /
                  microsPerSecond,
              ),
            ),
          )
        : 0,
    over: isTerminal(state),
    won: state.phase === "won",
    stars: state.stars,
    lastResult: state.lastResult,
    maximumWickets: tuning.maximumWickets,
    powerShotRequirement: tuning.powerShotSegments,
  };
}

/** Everything the HUD can see, as one comparable string. */
function signature(snapshot: HudSnapshot): string {
  return [
    snapshot.score,
    snapshot.wickets,
    snapshot.runsNeeded,
    snapshot.ballsLeft,
    snapshot.currentOver,
    snapshot.bowlerName,
    snapshot.combo,
    snapshot.powerSegments,
    snapshot.powerShotArmed,
    snapshot.freeHit,
    snapshot.phase,
    snapshot.suspendedPhase,
    snapshot.canConfigureShot,
    snapshot.canSwing,
    snapshot.canRun,
    snapshot.canTurnBack,
    snapshot.runnerActive,
    snapshot.completedRuns,
    snapshot.runProgress,
    snapshot.risk,
    snapshot.history.length,
    snapshot.selectedElevation,
    snapshot.selectedDirection,
    snapshot.preparationSeconds,
    snapshot.over,
    snapshot.stars,
  ].join("|");
}

/**
 * The HUD's view of the match.
 *
 * `useSyncExternalStore` compares snapshots by reference, so the projection is
 * cached and only replaced when something the HUD actually shows has changed.
 * Returning a fresh object every read would re-render sixty times a second,
 * which is the whole thing this exists to avoid.
 */
export function useHudSnapshot(
  controller: MatchController,
  tuning: GameplayTuning,
): HudSnapshot {
  const cache = useRef<{ signature: string; value: HudSnapshot } | null>(null);

  const getSnapshot = useCallback(() => {
    const next = project(controller.getState(), tuning);
    const nextSignature = signature(next);
    if (cache.current === null || cache.current.signature !== nextSignature) {
      cache.current = { signature: nextSignature, value: next };
    }
    return cache.current.value;
  }, [controller, tuning]);

  const subscribe = useCallback(
    (onChange: () => void) => controller.onState(onChange),
    [controller],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Engine events, delivered to a callback that never re-subscribes. */
export function useMatchEvents(
  controller: MatchController,
  onEvent: (event: GameplayEvent) => void,
): void {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(
    () => controller.onEvent((event) => handler.current(event)),
    [controller],
  );
}

/** A stable dispatcher, so the control deck never re-renders on identity. */
export function useMatchCommands(controller: MatchController) {
  return useMemo(
    () => ({
      start: () => controller.dispatch({ type: "start" }),
      swing: (direction: ShotDirection, elevation?: Elevation) =>
        controller.dispatch({ type: "swing", direction, elevation }),
      selectDirection: (direction: ShotDirection) =>
        controller.dispatch({ type: "selectDirection", direction }),
      selectElevation: (elevation: Elevation) =>
        controller.dispatch({ type: "selectElevation", elevation }),
      activatePowerShot: () => controller.dispatch({ type: "activatePowerShot" }),
      startRun: () => controller.dispatch({ type: "startRun" }),
      holdBall: () => controller.dispatch({ type: "holdBall" }),
      turnBack: () => controller.dispatch({ type: "turnBack" }),
      pause: () => controller.dispatch({ type: "pause" }),
      resume: () => controller.dispatch({ type: "resume" }),
      quit: () => controller.dispatch({ type: "quitToHome" }),
    }),
    [controller],
  );
}

export type MatchCommands = ReturnType<typeof useMatchCommands>;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  gridHoldMs,
  launchTimeoutMs,
  lightIntervalMs,
  lightsOutMaxHoldMs,
  lightsOutMinHoldMs,
} from "../constants";
import { gradeLaunch } from "../engine/field";
import type { LaunchGrade } from "../types";

/**
 * The five lights, and the reaction test they set up — the start half of
 * `GrandPrixCubit`.
 *
 * The lamps come on a second apart, then hold dark for somewhere between a
 * fifth of a second and a second and a half, so the moment cannot be learned.
 * Throttle before that and it is a jump start with a two-second cut; throttle
 * after and the reaction time grades the launch; sit there for two full seconds
 * and it is graded slow for you.
 *
 * Under reduced motion the reaction test is skipped altogether and the car
 * takes an average launch, which is what the app does — a timing test built out
 * of flashing lamps is not a thing to insist on.
 */

export type StartPhase = "grid" | "lights" | "away";

export type StartSequence = {
  phase: StartPhase;
  /** Lit lamps, zero to five. Drops back to zero the instant they go out. */
  lightsOn: number;
  /** True once the lamps are dark — the launch window is open. */
  lightsOut: boolean;
  grade: LaunchGrade | null;
  /** The first throttle press. Does nothing once the car is away. */
  registerThrottle: () => void;
};

export function useStartSequence(reducedMotion: boolean): StartSequence {
  const [phase, setPhase] = useState<StartPhase>("grid");
  const [lightsOn, setLightsOn] = useState(0);
  const [lightsOut, setLightsOut] = useState(false);
  const [grade, setGrade] = useState<LaunchGrade | null>(null);

  /** When the lamps went dark, for the reaction measurement. */
  const lightsOutAt = useRef<number | null>(null);
  /**
   * The phase as the timers see it. They fire outside React's flow and must not
   * close over a stale value, so every transition writes here first and to
   * state second — never during a render.
   */
  const phaseRef = useRef<StartPhase>("grid");

  const enter = useCallback(
    (next: StartPhase) => {
      phaseRef.current = next;
      setPhase(next);
    },
    [setPhase],
  );

  const goRacing = useCallback(
    (launched: LaunchGrade) => {
      setGrade(launched);
      setLightsOn(0);
      setLightsOut(true);
      enter("away");
    },
    [enter, setGrade, setLightsOn, setLightsOut],
  );

  useEffect(() => {
    const timers: number[] = [];
    const at = (delayMs: number, run: () => void) => {
      timers.push(window.setTimeout(run, delayMs));
    };

    if (reducedMotion) {
      at(gridHoldMs, () => goRacing("good"));
    } else {
      at(gridHoldMs, () => {
        if (phaseRef.current !== "grid") return;
        enter("lights");

        for (let lamp = 1; lamp <= 5; lamp += 1) {
          at(lightIntervalMs * lamp, () => {
            if (phaseRef.current === "lights") setLightsOn(lamp);
          });
        }

        const outMs =
          lightIntervalMs * 5 +
          lightsOutMinHoldMs +
          Math.floor(
            Math.random() * (lightsOutMaxHoldMs - lightsOutMinHoldMs + 1),
          );
        at(outMs, () => {
          if (phaseRef.current !== "lights") return;
          lightsOutAt.current = performance.now();
          setLightsOn(0);
          setLightsOut(true);
          at(launchTimeoutMs, () => {
            if (phaseRef.current === "lights") goRacing("slow");
          });
        });
      });
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [reducedMotion, enter, goRacing, setLightsOn, setLightsOut]);

  const registerThrottle = useCallback(() => {
    if (phaseRef.current !== "lights") return;
    if (lightsOutAt.current === null) {
      goRacing("jump");
      return;
    }
    goRacing(gradeLaunch(performance.now() - lightsOutAt.current));
  }, [goRacing]);

  return { phase, lightsOn, lightsOut, grade, registerThrottle };
}

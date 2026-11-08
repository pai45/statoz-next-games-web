"use client";

import { useEffect, useRef, useState } from "react";

import { accentVar, CountdownRing, withAlpha } from "@statoz/design-system/games";

import {
  countdownGoHoldMs,
  countdownHoldMs,
  countdownStartsAt,
} from "../constants";

import { ArenaBackdrop } from "./arena-backdrop";

const CYAN = accentVar("cyan");

export type LaunchCountdownProps = {
  /** Runs when the countdown reaches the app, or the player skips ahead. */
  onEnter: () => void;
};

/**
 * The completion cinematic: a 3·2·1 launch countdown that drops the player
 * into the app on GO. No CTA — clicking or pressing a key skips ahead.
 *
 * Flutter cues a haptic and a sound on every beat; the web has neither, so the
 * ring's sweep and the changing readout carry the tick on their own.
 */
export function LaunchCountdown({ onEnter }: LaunchCountdownProps) {
  const [seconds, setSeconds] = useState(countdownStartsAt);
  const entered = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    skipRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (seconds <= 0) {
          if (entered.current) return;
          entered.current = true;
          onEnter();
          return;
        }
        setSeconds((current) => current - 1);
      },
      seconds > 0 ? countdownHoldMs : countdownGoHoldMs,
    );

    return () => window.clearTimeout(timer);
  }, [seconds, onEnter]);

  function skip() {
    if (entered.current) return;
    entered.current = true;
    onEnter();
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <ArenaBackdrop />

      <div className="relative flex flex-col items-center">
        <p
          className="font-display text-2xs font-extrabold leading-compact"
          style={{ color: CYAN, letterSpacing: "var(--ds-tracking-mega)" }}
        >
          SYS://LAUNCH-SEQUENCE
        </p>

        <CountdownRing accent={CYAN} className="mt-7">
          {seconds > 0 ? String(seconds) : "GO"}
        </CountdownRing>

        <p
          aria-live="polite"
          className="mt-6 text-sm font-bold leading-compact tracking-tight"
          style={{ color: withAlpha(CYAN, 0.7) }}
        >
          ENTERING STATOZ…
        </p>
      </div>

      <button
        ref={skipRef}
        type="button"
        onClick={skip}
        className="absolute inset-0 z-10 cursor-default"
      >
        <span className="sr-only">Skip the launch countdown</span>
      </button>
    </div>
  );
}

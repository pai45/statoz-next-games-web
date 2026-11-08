"use client";

import { useEffect, useRef } from "react";

import { accentVar, BrandIcon, glow, withAlpha } from "@statoz/design-system/games";

import { welcomeDurationMs } from "../constants";

import { ArenaBackdrop } from "./arena-backdrop";
import styles from "./motion.module.css";

const CYAN = accentVar("cyan");

export type WelcomeRevealProps = {
  /** Runs when the reveal finishes, or the moment the player skips it. */
  onDone: () => void;
};

/**
 * The first-run brand splash: the crest pops in and spins to rest, then
 * WELCOME TO and STATOZ climb in under it. It hands over on its own; a click,
 * a tap, or a key press skips straight through.
 *
 * The spin and the pop run to different clocks, so they sit on nested elements
 * rather than being composed frame by frame as Flutter does.
 */
export function WelcomeReveal({ onDone }: WelcomeRevealProps) {
  const done = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The reveal owns the screen, so it should own the keyboard too.
    skipRef.current?.focus();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => {
        if (done.current) return;
        done.current = true;
        onDone();
      },
      reduced ? 600 : welcomeDurationMs,
    );

    return () => window.clearTimeout(timer);
  }, [onDone]);

  function skip() {
    if (done.current) return;
    done.current = true;
    onDone();
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <ArenaBackdrop />

      <div className="relative flex flex-col items-center">
        <div className={styles.logoSpin}>
          <div className={`${styles.logoPop} relative grid place-items-center`}>
            {/* The crest's own bloom, sized to the mark rather than the box. */}
            <span
              aria-hidden
              className="absolute size-[84%] rounded-[22%]"
              style={{ boxShadow: glow(CYAN, { alpha: 0.5, blur: 45, spread: 0 }) }}
            />
            <BrandIcon
              name="logo"
              size={150}
              alt=""
              priority
              className="relative size-[7.5rem] sm:size-[9.375rem]"
            />
          </div>
        </div>

        <p
          className={`${styles.revealUp} mt-7 font-display text-sm font-extrabold leading-compact text-muted`}
          style={
            {
              "--reveal-delay": "1560ms",
              letterSpacing: "var(--ds-tracking-max)",
            } as React.CSSProperties
          }
        >
          WELCOME TO
        </p>

        <h1
          className={`${styles.revealUp} mt-3 font-display font-black leading-compact`}
          style={
            {
              "--reveal-delay": "1920ms",
              "--reveal-rise": "16px",
              color: CYAN,
              fontSize: "var(--ds-text-celebration)",
              letterSpacing: "var(--ds-tracking-display)",
              textShadow: `0 0 28px ${withAlpha(CYAN, 0.85)}, 0 0 54px ${withAlpha(CYAN, 0.4)}`,
            } as React.CSSProperties
          }
        >
          STATOZ
        </h1>
      </div>

      {/* The whole screen is the skip target, as in the app. */}
      <button
        ref={skipRef}
        type="button"
        onClick={skip}
        className="absolute inset-0 z-10 cursor-default"
      >
        <span className="sr-only">Skip the welcome animation</span>
      </button>
    </div>
  );
}

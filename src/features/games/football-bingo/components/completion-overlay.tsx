"use client";

import { useEffect, useState } from "react";

import { accentVar, Glyph, withAlpha } from "@statoz/design-system/games";

import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import {
  completionCountMs,
  completionRevealMs,
  completionSummaryMs,
  gridSize,
} from "../constants";

import { Label } from "./bingo-chrome";
import styles from "./football-bingo.module.css";

/**
 * Nine from nine — the web port of `_CompletionOverlay`.
 *
 * Two beats, both of which advance on their own and both of which a tap can
 * bring forward: the grid completing, then the day being logged. The tally
 * counts up behind them, and is pinned at full once the summary shows.
 */

const cellCount = gridSize * gridSize;

export type CompletionOverlayProps = {
  onDone: () => void;
};

export function CompletionOverlay({ onDone }: CompletionOverlayProps) {
  const reduced = usePrefersReducedMotion();
  const [summary, setSummary] = useState(false);
  const [counted, setCounted] = useState(reduced ? cellCount : 0);

  const lime = accentVar("lime");
  const orange = accentVar("orange");

  // The tally climbs on its own clock, so the two beats below can land early
  // without cutting it short.
  useEffect(() => {
    if (reduced) return;
    const step = completionCountMs / cellCount;
    const id = window.setInterval(() => {
      setCounted((value) => {
        if (value >= cellCount) {
          window.clearInterval(id);
          return value;
        }
        return value + 1;
      });
    }, step);
    return () => window.clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    if (summary) return;
    const id = window.setTimeout(() => setSummary(true), completionRevealMs);
    return () => window.clearTimeout(id);
  }, [summary]);

  useEffect(() => {
    if (!summary) return;
    const id = window.setTimeout(onDone, completionSummaryMs);
    return () => window.clearTimeout(id);
  }, [summary, onDone]);

  const count = summary ? cellCount : Math.min(counted, cellCount);

  return (
    <div
      className={`${styles.overlay} absolute inset-0 z-40 grid place-items-center px-6`}
      style={{
        background: withAlpha("var(--ds-color-background-muted)", 0.9),
      }}
      role="dialog"
      aria-modal="true"
      aria-label={summary ? "Daily logged" : "Grid complete"}
    >
      {/* The whole plate is the control: tap once to reveal, again to leave. */}
      <button
        type="button"
        onClick={() => (summary ? onDone() : setSummary(true))}
        className={`${styles.pop} w-full max-w-70 cursor-pointer p-4`}
        style={{
          background: withAlpha("var(--ds-color-background-secondary)", 0.96),
          border: `1px solid ${lime}`,
          boxShadow: `0 0 32px ${withAlpha(lime, 0.18)}`,
        }}
      >
        <p
          className="text-center font-display font-black leading-compact"
          style={{
            color: summary ? orange : lime,
            fontSize: "var(--ds-text-lg)",
            letterSpacing: "var(--ds-tracking-mega)",
          }}
        >
          {summary ? "DAILY LOGGED" : "GRID COMPLETE"}
        </p>

        <p
          className="mt-2 text-center font-display font-black leading-compact ds-tabular"
          style={{ fontSize: "var(--ds-text-3xl)" }}
        >
          {count}/{cellCount}
        </p>

        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: cellCount }, (_, index) => {
            const filled = index < count;
            return (
              <span
                key={index}
                className="grid size-8.5 place-items-center"
                style={{
                  background: filled ? lime : "var(--ds-color-background-elevated)",
                  border: `1px solid ${filled ? lime : "var(--ds-color-border-muted)"}`,
                  color: filled
                    ? "var(--ds-color-text-inverse)"
                    : "var(--ds-color-text-muted)",
                }}
              >
                <Glyph name="check" size={18} />
              </span>
            );
          })}
        </div>

        <Label className="mt-3.5 text-center">
          {summary ? "TAP TO CONTINUE" : "TAP TO REVEAL"}
        </Label>
      </button>
    </div>
  );
}

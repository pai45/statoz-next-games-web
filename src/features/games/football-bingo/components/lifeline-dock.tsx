"use client";

import { accentVar, Glyph, withAlpha } from "@statoz/design-system/games";

import { lifelineCost, startingLifelines } from "../constants";

import styles from "./football-bingo.module.css";

/**
 * The lifeline bar — the web port of `_LifelineDock`.
 *
 * Five hearts, one spent per wrong cell. At zero the bar becomes the only thing
 * on it: a purchase, at twenty-five coins for a single life rather than a
 * refilled bar. The dock is absent entirely on a finished or archived day,
 * because there is nothing left to spend a life on.
 */

export type LifelineDockProps = {
  lifelines: number;
  needsLifeline: boolean;
  onBuy: () => void;
};

export function LifelineDock({ lifelines, needsLifeline, onBuy }: LifelineDockProps) {
  const orange = accentVar("orange");

  return (
    <div
      className="shrink-0 px-4 pb-3 pt-2.5"
      style={{
        background: "var(--ds-color-background-muted)",
        borderTop: "1px solid var(--ds-color-border-muted)",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
      }}
    >
      {needsLifeline ? (
        <button
          type="button"
          onClick={onBuy}
          className={`${styles.plate} flex h-12 w-full cursor-pointer items-center justify-center gap-2`}
          style={{
            background: orange,
            border: `1px solid ${orange}`,
            color: "var(--ds-color-text-inverse)",
          }}
        >
          <Glyph name="favorite" size={18} />
          <span
            className="font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-md)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            +1 LIFELINE
          </span>
          <span className="ml-1.5 flex items-center gap-1">
            <Glyph name="paid" size={16} />
            <span
              className="font-display font-black leading-compact ds-tabular"
              style={{ fontSize: "var(--ds-text-md)" }}
            >
              {lifelineCost}
            </span>
          </span>
        </button>
      ) : (
        <div
          className="flex h-12 items-center justify-center gap-1.5"
          role="img"
          aria-label={`${lifelines} of ${startingLifelines} lifelines left`}
        >
          {Array.from({ length: startingLifelines }, (_, index) => (
            <span
              key={index}
              style={{
                color:
                  index < lifelines
                    ? "var(--ds-color-danger)"
                    : withAlpha("var(--ds-color-text-muted)", 0.35),
              }}
            >
              <Glyph name="favorite" size={23} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

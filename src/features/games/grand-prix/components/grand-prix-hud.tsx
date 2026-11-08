"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/games";

import { fieldSize } from "../tuning";
import type { RaceView } from "../engine/race";

/**
 * The slim strip over the road: the way out, where you are, how fast you are
 * going, and how much of the lap is behind you.
 *
 * Flutter's `_RaceHud`. The lap bar deliberately has no transition — it is fed
 * from the simulation every frame, and easing it would make the car's own
 * progress lag behind the car.
 */

const cyan = accentVar("cyan");
const racing = accentVar("racing");

export type GrandPrixHudProps = {
  view: RaceView;
  laps: number;
  onExit: () => void;
};

export function GrandPrixHud({ view, laps, onExit }: GrandPrixHudProps) {
  return (
    <div
      className="pointer-events-none w-full px-2 pt-1.5 pb-2"
      style={{
        background: `linear-gradient(to bottom, ${withAlpha("#0d111a", 0.92)}, ${withAlpha("#0d111a", 0)})`,
      }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          aria-label="Leave the race"
          className="pointer-events-auto grid size-11 shrink-0 cursor-pointer place-items-center text-muted"
        >
          <Glyph name="close" size={20} />
        </button>

        <div className="flex flex-1 items-baseline justify-center">
          <span
            className="font-display font-black leading-none tabular-nums"
            style={{ fontSize: typography.sizeRem.p26, color: cyan }}
          >
            P{view.position}
          </span>
          <span
            className="font-display font-black leading-none tabular-nums text-muted"
            style={{ fontSize: typography.sizeRem.p13 }}
          >
            /{fieldSize}
          </span>
        </div>

        <span
          className="w-21 shrink-0 text-right font-display font-black leading-none tabular-nums"
          style={{ fontSize: typography.sizeRem.p13 }}
        >
          {view.speedKph} KPH
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2 pl-3">
        <span
          className="shrink-0 font-display font-black leading-none tabular-nums text-muted"
          style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.6px" }}
        >
          {laps === 1 ? "LAP" : `LAP ${view.currentLap}/${laps}`}
        </span>

        <div
          className="h-1.25 flex-1 overflow-hidden rounded-sm"
          role="progressbar"
          aria-label="Lap progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(view.lapProgress * 100)}
          style={{ background: withAlpha(racing, 0.14) }}
        >
          <div
            className="h-full rounded-sm"
            style={{
              width: `${view.lapProgress * 100}%`,
              background: racing,
              boxShadow: `0 0 6px -1px ${withAlpha(racing, 0.3)}`,
            }}
          />
        </div>

        <span
          className="shrink-0 px-1.5 py-0.5 font-display font-black leading-none transition-opacity duration-150"
          style={{
            fontSize: typography.sizeRem.p8,
            letterSpacing: "1.2px",
            color: cyan,
            border: `1px solid ${withAlpha(cyan, 0.5)}`,
            opacity: view.slipstreaming ? 1 : 0,
          }}
        >
          TOW
        </span>
      </div>
    </div>
  );
}

/** The verdict colours, shared by the flash on track and the result banner. */
export const launchLabels = {
  perfect: { label: "PERFECT LAUNCH", short: "PERFECT", color: accentVar("gold") },
  great: { label: "GREAT LAUNCH", short: "GREAT", color: feedbackVar("success") },
  good: { label: "GOOD LAUNCH", short: "GOOD", color: cyan },
  slow: { label: "SLOW AWAY", short: "SLOW", color: accentVar("orange") },
  jump: {
    label: "JUMP START — THROTTLE CUT",
    short: "JUMP START",
    color: feedbackVar("danger"),
  },
} as const;

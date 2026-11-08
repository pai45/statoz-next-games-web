"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { PointerEvent as ReactPointerEvent } from "react";

import { accentVar, feedbackVar, Glyph, withAlpha, type GlyphName } from "@statoz/design-system/games";

import type { RaceView } from "../engine/race";
import type { RaceInput } from "../state/use-race-engine";

/**
 * The race control pad: steering on the left, pedals on the right.
 *
 * Flutter reaches past `GestureDetector` to a raw `Listener` so that steering
 * and throttle can be held at once; Pointer Events give the web the same thing
 * for free, one pointer id per finger. Each plate captures its pointer, so a
 * thumb that slides off the pad mid-corner still releases it rather than
 * leaving the car turning.
 *
 * A plate lights on its own held state rather than on a press, which is what
 * lets a key on a desktop keyboard light exactly the plate a thumb would.
 */

const cyan = accentVar("cyan");
const danger = feedbackVar("danger");
const success = feedbackVar("success");

export type GrandPrixControlsProps = {
  view: RaceView;
  input: RaceInput;
  /** The throttle also opens the launch, so the first press has to be heard. */
  onThrottlePressed: () => void;
};

export function GrandPrixControls({
  view,
  input,
  onThrottlePressed,
}: GrandPrixControlsProps) {
  return (
    <div
      className="flex w-full items-end gap-2.5 px-3.5 pt-2.5 pb-3.5"
      style={{
        background: `linear-gradient(to top, ${withAlpha("#0d111a", 0.94)}, ${withAlpha("#0d111a", 0)})`,
      }}
    >
      <HoldPad
        icon="chevron_left"
        label="Steer left"
        accent={cyan}
        down={view.held.left}
        onHold={input.setLeft}
      />
      <HoldPad
        icon="chevron_right"
        label="Steer right"
        accent={cyan}
        down={view.held.right}
        onHold={input.setRight}
      />

      <div className="flex-1" />

      <HoldPad
        icon="compress"
        text="BRAKE"
        label="Brake"
        accent={danger}
        wide
        down={view.held.brake}
        onHold={input.setBrake}
      />
      <HoldPad
        icon="keyboard_double_arrow_up"
        text="ACCEL"
        label="Accelerate"
        accent={success}
        wide
        down={view.held.throttle}
        onHold={(down) => {
          input.setThrottle(down);
          if (down) onThrottlePressed();
        }}
      />
    </div>
  );
}

type HoldPadProps = {
  icon: GlyphName;
  text?: string;
  label: string;
  accent: string;
  wide?: boolean;
  down: boolean;
  onHold: (down: boolean) => void;
};

function HoldPad({ icon, text, label, accent, wide = false, down, onHold }: HoldPadProps) {
  const press = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    onHold(true);
  };
  const release = () => onHold(false);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={down}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      // The plate is a hold, not a click: a keyboard press must not fire it,
      // because the keyboard drives the car directly and would double up.
      onKeyDown={(event) => event.preventDefault()}
      className="grid h-17 shrink-0 cursor-pointer touch-none place-items-center transition-colors duration-90 select-none"
      style={{
        width: wide ? 92 : 64,
        background: down ? withAlpha(accent, 0.28) : withAlpha("#1d293d", 0.85),
        border: `${down ? 1.6 : 1}px solid ${withAlpha(accent, down ? 0.9 : 0.4)}`,
      }}
    >
      <span
        className="flex flex-col items-center gap-0.75"
        style={{ color: down ? accent : withAlpha(accent, 0.75) }}
      >
        <Glyph name={icon} size={text === undefined ? 30 : 22} />
        {text === undefined ? null : (
          <span
            className="font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p8_5,
              letterSpacing: "1.4px",
              color: down ? accent : "var(--ds-color-text-muted)",
            }}
          >
            {text}
          </span>
        )}
      </span>
    </button>
  );
}

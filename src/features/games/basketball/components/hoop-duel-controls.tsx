"use client";
import { typography } from "@statoz/design-system/games/tokens/typography";

import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  accentVar,
  ChevronLeftIcon,
  ChevronRightIcon,
  Glyph,
  hudChamferPath,
  withAlpha,
} from "@statoz/design-system/games";
import type { GlyphName, IconProps } from "@statoz/design-system/games";

import {
  actionCueSwitchMs,
  burstWindowMs,
  padPressMs,
  stepbackSwipePx,
} from "../constants";
import type { HoopDuelInput } from "../state/use-hoop-duel-engine";
import type { BasketballActionCue } from "../types";

import styles from "./hoop-duel.module.css";

/**
 * The Hoop Duel control deck — the web port of `basketball_controls.dart`.
 *
 * A MOVE pad on the left (◀ away from the rim, ▶ toward it) and one contextual
 * ACTION pad on the right. Both are raw pointer handlers rather than gesture
 * recognisers, for the same reason Flutter uses bare `Listener`s: a move-hold
 * and an action-hold have to register *simultaneously*, and a recogniser would
 * make them compete for the gesture arena.
 *
 * Everything the pads can do is one of four inputs — tap, hold, release, or a
 * swipe away from the rim — and what each means is decided by the engine, not
 * here. The ACTION pad only ever explains itself.
 *
 * The keyboard path is an addition. Flutter has no keyboard input and its
 * absence is not fidelity; a desktop player needs hands on keys.
 */

const gold = accentVar("gold");
const cyan = accentVar("cyan");

export type HoopDuelControlsProps = {
  input: HoopDuelInput;
  cue: BasketballActionCue;
  /** First-match contextual hints, shown until a half has been played. */
  showHints: boolean;
  /** False behind overlays, so a stray press cannot reach the court. */
  live: boolean;
};

export function HoopDuelControls({
  input,
  cue,
  showHints,
  live,
}: HoopDuelControlsProps) {
  useKeyboardControls(input, live);

  // Going dead mid-hold must not leave the engine driving into the corner. The
  // pads' own pressed state is reset by the `key` below rather than by an
  // effect, so nothing here sets React state.
  useEffect(() => {
    if (!live) input.cancelTouches();
  }, [live, input]);

  return (
    <div
      className="pointer-events-none flex w-full items-end justify-between gap-4 px-3.5 pb-3.5 pt-2"
      style={{
        // The deck sits over the court, so it fades the floor out beneath it
        // rather than sitting on a plate.
        background:
          "linear-gradient(to top, var(--ds-color-background-primary) 0%, transparent 100%)",
      }}
    >
      <MovePad key={`move-${live}`} input={input} showHint={showHints} live={live} />
      <ActionPad
        key={`action-${live}`}
        input={input}
        cue={cue}
        showHint={showHints}
        live={live}
      />
    </div>
  );
}

/* ---- Move pad -------------------------------------------------------------- */

function MovePad({
  input,
  showHint,
  live,
}: {
  input: HoopDuelInput;
  showHint: boolean;
  live: boolean;
}) {
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const lastTap = useRef({ away: 0, rim: 0 });

  const apply = useCallback(
    (nextLeft: boolean, nextRight: boolean) => {
      setLeft(nextLeft);
      setRight(nextRight);
      input.setMoveAxis((nextRight ? 1 : 0) - (nextLeft ? 1 : 0));
    },
    [input],
  );

  /**
   * A second press on the same arrow inside the window is a burst-drive — and,
   * mid-drive, the same edge is the spin move. One input, two meanings, both
   * decided by the engine.
   */
  const maybeBurst = useCallback(
    (toRim: boolean) => {
      const now = performance.now();
      const key = toRim ? "rim" : "away";
      if (now - lastTap.current[key] < burstWindowMs) input.tapBurst();
      lastTap.current[key] = now;
    },
    [input],
  );

  useEffect(() => () => input.setMoveAxis(0), [input]);

  return (
    <div className="pointer-events-auto flex flex-col items-start">
      {showHint ? <HintLabel text="MOVE" /> : null}
      <div className="flex gap-2.5">
        <DirectionButton
          Icon={ChevronLeftIcon}
          label="Move away from the rim"
          down={left}
          disabled={!live}
          onDown={() => {
            maybeBurst(false);
            apply(true, right);
          }}
          onUp={() => apply(false, right)}
        />
        <DirectionButton
          Icon={ChevronRightIcon}
          label="Drive toward the rim"
          down={right}
          disabled={!live}
          onDown={() => {
            maybeBurst(true);
            apply(left, true);
          }}
          onUp={() => apply(left, false)}
        />
      </div>
    </div>
  );
}

function DirectionButton({
  Icon,
  label,
  down,
  disabled,
  onDown,
  onUp,
}: {
  Icon: ComponentType<IconProps>;
  label: string;
  down: boolean;
  disabled: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="grid h-17 w-16 cursor-pointer touch-none place-items-center transition-colors disabled:opacity-40"
      style={{
        transitionDuration: `${padPressMs}ms`,
        backgroundColor: down
          ? withAlpha(cyan, 0.26)
          : "color-mix(in srgb, var(--ds-color-background-elevated) 85%, transparent)",
        border: `${down ? 1.6 : 1}px solid ${withAlpha(cyan, down ? 0.9 : 0.4)}`,
        color: down ? cyan : withAlpha(cyan, 0.75),
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
    >
      <Icon size={32} />
    </button>
  );
}

/* ---- Action pad ------------------------------------------------------------ */

/**
 * What the one button currently means. The engine derives the cue from live
 * state; this is only the copy for it, and the instruction line is the part
 * that actually teaches the game.
 */
const cueCopy: Record<
  BasketballActionCue,
  { label: string; instruction: string; glyph: GlyphName }
> = {
  shoot: {
    label: "SHOOT",
    instruction: "HOLD · RELEASE IN LIME",
    glyph: "sports_basketball",
  },
  finish: {
    label: "FINISH",
    instruction: "TAP LAYUP · HOLD DUNK",
    glyph: "directions_run",
  },
  release: {
    label: "RELEASE",
    instruction: "HIT THE LIME",
    glyph: "vertical_align_top",
  },
  defend: {
    label: "DEFEND",
    instruction: "TAP STEAL · HOLD GUARD",
    glyph: "shield",
  },
  block: {
    label: "BLOCK",
    instruction: "RELEASE WITH SHOOTER",
    glyph: "pan_tool",
  },
  rebound: {
    label: "REBOUND",
    instruction: "TAP AT MARKER",
    glyph: "keyboard_double_arrow_up",
  },
};

function ActionPad({
  input,
  cue,
  showHint,
  live,
}: {
  input: HoopDuelInput;
  cue: BasketballActionCue;
  showHint: boolean;
  live: boolean;
}) {
  const [down, setDown] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const swiped = useRef(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      start.current = { x: event.clientX, y: event.clientY };
      swiped.current = false;
      setDown(true);
      input.actionPressed();
    },
    [input],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!down || swiped.current) return;
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      // A deliberate pull away from the rim, dominant on the horizontal, is a
      // step-back — and it supersedes the hold that started it.
      if (dx < -stepbackSwipePx && Math.abs(dx) > Math.abs(dy)) {
        swiped.current = true;
        setDown(false);
        input.swipeBack();
      }
    },
    [down, input],
  );

  const onPointerUp = useCallback(() => {
    if (!down) return;
    setDown(false);
    input.actionReleased();
  }, [down, input]);

  const copy = cueCopy[cue];
  const accent = down ? gold : withAlpha(gold, 0.86);

  return (
    <div className="pointer-events-auto flex flex-col items-end">
      {showHint ? <HintLabel text="ACTION" /> : null}
      <button
        type="button"
        aria-label={`${copy.label}. ${copy.instruction}`}
        disabled={!live}
        className="relative h-17 w-37.5 cursor-pointer touch-none transition-colors disabled:opacity-40"
        style={{
          transitionDuration: `${padPressMs}ms`,
          clipPath: hudChamferPath(12, 4),
          backgroundColor: down
            ? withAlpha(gold, 0.26)
            : "color-mix(in srgb, var(--ds-color-background-elevated) 90%, transparent)",
          boxShadow: `inset 0 0 0 ${down ? 1.7 : 1}px ${withAlpha(gold, down ? 0.9 : 0.45)}`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span
          key={cue}
          aria-hidden
          className={`${styles.cueSwitch} flex flex-col items-center justify-center gap-1`}
          style={{ animationDuration: `${actionCueSwitchMs}ms` }}
        >
          <span className="flex items-center gap-1.5" style={{ color: accent }}>
            <Glyph name={copy.glyph} size={17} />
            <span
              className="font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p11, letterSpacing: "1.4px" }}
            >
              {copy.label}
            </span>
          </span>
          <span
            className="whitespace-nowrap font-bold leading-none"
            style={{
              fontSize: typography.sizeRem.p6_5,
              letterSpacing: "0.65px",
              color: down ? gold : "var(--ds-color-text-muted)",
            }}
          >
            {copy.instruction}
          </span>
        </span>
      </button>
    </div>
  );
}

function HintLabel({ text }: { text: string }) {
  return (
    <div
      className={`${styles.hintLabel} mb-1.5 px-2 py-0.5`}
      style={{
        backgroundColor: withAlpha("#0d111a", 0.7),
        border: `1px solid ${withAlpha(gold, 0.5)}`,
      }}
    >
      <span
        className="font-display font-black leading-none"
        style={{ fontSize: typography.sizeRem.p8, letterSpacing: "1.4px", color: gold }}
      >
        {text}
      </span>
    </div>
  );
}

/* ---- Keyboard -------------------------------------------------------------- */

/**
 * Arrow keys move, a double-tap of either bursts, Space or K is the ACTION pad,
 * and Shift+Left is the step-back swipe.
 *
 * Auto-repeat is the thing to watch: holding a key fires `keydown` over and
 * over, which would re-trigger the burst check forever, so a key already known
 * to be down is ignored until it comes up.
 */
function useKeyboardControls(input: HoopDuelInput, live: boolean): void {
  useEffect(() => {
    if (!live) return;

    const held = new Set<string>();
    const lastTap = { ArrowLeft: 0, ArrowRight: 0 } as Record<string, number>;

    const axis = () =>
      (held.has("ArrowRight") ? 1 : 0) - (held.has("ArrowLeft") ? 1 : 0);

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "ArrowLeft" || key === "ArrowRight") {
        event.preventDefault();
        if (held.has(key)) return;
        if (key === "ArrowLeft" && event.shiftKey) {
          input.swipeBack();
          return;
        }
        const now = performance.now();
        if (now - lastTap[key] < burstWindowMs) input.tapBurst();
        lastTap[key] = now;
        held.add(key);
        input.setMoveAxis(axis());
        return;
      }
      if (key === " " || key === "k" || key === "K") {
        event.preventDefault();
        if (held.has("action")) return;
        held.add("action");
        input.actionPressed();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "ArrowLeft" || key === "ArrowRight") {
        held.delete(key);
        input.setMoveAxis(axis());
        return;
      }
      if (key === " " || key === "k" || key === "K") {
        if (!held.delete("action")) return;
        input.actionReleased();
      }
    };

    // A tab switch mid-drive would otherwise leave the thumb stuck down.
    const onBlur = () => {
      held.clear();
      input.cancelTouches();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      input.cancelTouches();
    };
  }, [input, live]);
}

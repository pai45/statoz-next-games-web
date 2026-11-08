"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { accentVar, withAlpha } from "@statoz/design-system/games";

import { loftRisePx, loftSpeedPxPerSecond, tapSlopPx } from "../constants";
import {
  elevationLabels,
  shotDirectionLabels,
  type Elevation,
  type ShotDirection,
} from "../types";

/**
 * The whole pitch is the bat — the web port of `final_over_swing_surface.dart`.
 *
 * There is no swing button. The player taps or swipes *anywhere* over the play
 * area to hit the ball. A tap drives it straight along the ground; dominant
 * swipes place it left/off, front/straight, right/leg or back/behind. An upward
 * front swipe or a fast flick lofts the shot. The hit is timed by the release,
 * exactly as the engine grades it.
 *
 * Pointer Events cover touch and mouse in one path, so a desktop drag is the
 * same gesture with the same thresholds. The keyboard path below is an
 * addition — Flutter has no keyboard input, and its absence is not fidelity.
 */

export type SwingGesture = {
  direction: ShotDirection;
  elevation: Elevation;
  isSwipe: boolean;
};

/** The neutral resolution for a plain tap: a safe grounded drive. */
export const tapGesture: SwingGesture = {
  direction: "straight",
  elevation: "ground",
  isSwipe: false,
};

/**
 * Classify a gesture from its start→end displacement and release speed. Short
 * travel is a tap. A longer drag uses its dominant axis: left and right choose
 * the off and leg channels, up drives in front and down plays behind. An upward
 * front swipe lofts; every other direction needs a fast flick to leave the
 * ground.
 */
export function classifyBattingGesture(
  deltaX: number,
  deltaY: number,
  velocity = 0,
): SwingGesture {
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < tapSlopPx) return tapGesture;

  const horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
  const direction: ShotDirection = horizontal
    ? deltaX < 0
      ? "offSide"
      : "legSide"
    : deltaY > 0
      ? "behind"
      : "straight";

  const upwardFront = direction === "straight" && deltaY < -loftRisePx;
  const lofted = upwardFront || velocity >= loftSpeedPxPerSecond;

  return { direction, elevation: lofted ? "loft" : "ground", isSwipe: true };
}

export type SwingSurfaceProps = {
  live: boolean;
  onBeginSwing: () => void;
  onReleaseSwing: (gesture: SwingGesture) => void;
  onCancelSwing: () => void;
  /** Keyboard shortcuts stay live outside the swing window. */
  onRun: () => void;
  onHold: () => void;
  onPause: () => void;
  canRun: boolean;
};

type Drag = { originX: number; originY: number; startedAt: number };

export function SwingSurface({
  live,
  onBeginSwing,
  onReleaseSwing,
  onCancelSwing,
  onRun,
  onHold,
  onPause,
  canRun,
}: SwingSurfaceProps) {
  const surface = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [aim, setAim] = useState<{
    originX: number;
    originY: number;
    x: number;
    y: number;
    gesture: SwingGesture;
  } | null>(null);

  const reset = useCallback(() => {
    drag.current = null;
    setAim(null);
  }, []);

  const localPoint = useCallback((event: React.PointerEvent) => {
    const bounds = surface.current?.getBoundingClientRect();
    return {
      x: event.clientX - (bounds?.left ?? 0),
      y: event.clientY - (bounds?.top ?? 0),
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!live) return;
      const point = localPoint(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      // Starts the render-only backlift coil; the engine no-ops if the window
      // shut between the render and this event.
      onBeginSwing();
      drag.current = { originX: point.x, originY: point.y, startedAt: event.timeStamp };
      setAim({ originX: point.x, originY: point.y, x: point.x, y: point.y, gesture: tapGesture });
    },
    [live, localPoint, onBeginSwing],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (current === null) return;
      const point = localPoint(event);
      setAim({
        originX: current.originX,
        originY: current.originY,
        x: point.x,
        y: point.y,
        gesture: classifyBattingGesture(point.x - current.originX, point.y - current.originY),
      });
    },
    [localPoint],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (current === null) {
        reset();
        return;
      }
      const point = localPoint(event);
      const deltaX = point.x - current.originX;
      const deltaY = point.y - current.originY;
      const seconds = Math.max(0, event.timeStamp - current.startedAt) / 1000;
      const velocity = seconds > 0 ? Math.hypot(deltaX, deltaY) / seconds : 0;
      onReleaseSwing(classifyBattingGesture(deltaX, deltaY, velocity));
      reset();
    },
    [localPoint, onReleaseSwing, reset],
  );

  const onPointerCancel = useCallback(() => {
    onCancelSwing();
    reset();
  }, [onCancelSwing, reset]);

  /* Keyboard. Arrow keys place the shot, Space plays it straight along the
   * ground, R and H call and refuse a run, Escape pauses. Held keys repeat, so
   * the swing only fires on the first press. */
  const liveRef = useRef(live);
  const canRunRef = useRef(canRun);
  useEffect(() => {
    liveRef.current = live;
    canRunRef.current = canRun;
  }, [live, canRun]);

  useEffect(() => {
    const swingWith = (direction: ShotDirection, elevation: Elevation) => {
      if (!liveRef.current) return;
      onBeginSwing();
      onReleaseSwing({ direction, elevation, isSwipe: true });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Never steal a key from a focused control.
      if (target !== null && (target.tagName === "BUTTON" || target.tagName === "INPUT")) {
        if (event.key !== "Escape") return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          swingWith("offSide", "ground");
          return;
        case "ArrowRight":
          event.preventDefault();
          swingWith("legSide", "ground");
          return;
        case "ArrowUp":
          event.preventDefault();
          swingWith("straight", "loft");
          return;
        case "ArrowDown":
          event.preventDefault();
          swingWith("behind", "ground");
          return;
        case " ":
          event.preventDefault();
          if (liveRef.current) {
            onBeginSwing();
            onReleaseSwing(tapGesture);
          } else if (canRunRef.current) {
            onRun();
          }
          return;
        case "r":
        case "R":
          if (canRunRef.current) onRun();
          return;
        case "h":
        case "H":
          onHold();
          return;
        case "Escape":
          onPause();
          return;
        default:
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBeginSwing, onReleaseSwing, onRun, onHold, onPause]);

  return (
    <div
      ref={surface}
      className="absolute inset-0"
      style={{ touchAction: "none", pointerEvents: live ? "auto" : "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {aim !== null ? <AimOverlay aim={aim} /> : null}
    </div>
  );
}

/**
 * Live aim feedback anchored at the finger: an origin pip, an arrow toward the
 * current point once the gesture qualifies as a swipe, and a read-out. Loft
 * tints violet to echo the LOFT accent.
 */
function AimOverlay({
  aim,
}: {
  aim: { originX: number; originY: number; x: number; y: number; gesture: SwingGesture };
}) {
  const { originX, originY, x, y, gesture } = aim;
  const accent = gesture.elevation === "loft" ? accentVar("violet") : accentVar("cyan");
  const gold = accentVar("gold");

  const deltaX = x - originX;
  const deltaY = y - originY;
  const length = Math.hypot(deltaX, deltaY);
  const unitX = length > 0 ? deltaX / length : 0;
  const unitY = length > 0 ? deltaY / length : 0;
  const baseX = x - unitX * 12;
  const baseY = y - unitY * 12;
  const perpX = -unitY;
  const perpY = unitX;

  const label = `${shotDirectionLabels[gesture.direction]} · ${
    elevationLabels[gesture.elevation]
  }`;

  // Sit the read-out just above the finger, flipping below when it would clip.
  const labelY = y - 30 < 8 ? y + 18 : y - 30;

  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <circle cx={originX} cy={originY} r={4} fill={gold} />
      <circle
        cx={originX}
        cy={originY}
        r={8}
        fill="none"
        stroke={withAlpha(gold, 0.45)}
        strokeWidth={1}
      />

      {gesture.isSwipe && length >= 1 ? (
        <>
          <line
            x1={originX}
            y1={originY}
            x2={x}
            y2={y}
            stroke={withAlpha(accent, 0.92)}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <path
            d={`M ${x} ${y} L ${baseX + perpX * 6} ${baseY + perpY * 6} M ${x} ${y} L ${
              baseX - perpX * 6
            } ${baseY - perpY * 6}`}
            stroke={accent}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <foreignObject
            x={Math.max(0, x - 70)}
            y={labelY - 4}
            width={140}
            height={28}
            style={{ overflow: "visible" }}
          >
            <div className="flex size-full items-center justify-center">
              <span
                className="whitespace-nowrap px-2 py-1 font-bold leading-compact"
                style={{
                  color: accent,
                  background: withAlpha("var(--ds-color-background-primary)", 0.82),
                  border: `1px solid ${withAlpha(accent, 0.55)}`,
                  fontSize: "var(--ds-text-2xs)",
                  letterSpacing: "var(--ds-tracking-label)",
                }}
              >
                {label}
              </span>
            </div>
          </foreignObject>
        </>
      ) : null}
    </svg>
  );
}

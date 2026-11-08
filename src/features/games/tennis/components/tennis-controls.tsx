"use client";


import { typography } from "@statoz/design-system/games/tokens/typography";
import { useCallback, useEffect, useRef, useState } from "react";

import { Glyph, hudChamferPath } from "@statoz/design-system/games";

import {
  gestureDeadZone,
  gestureMajorRise,
  gestureMinorRise,
  moveRadius,
  padSize,
  shotAimDivisor,
  shotDragLimit,
  sprintFlickDistance,
  sprintFlickMs,
} from "../constants";
import type { TennisCommands } from "../state/use-tennis-engine";
import type { TennisSettings } from "../types";

import { withAlpha } from "./renderer/palette";
import styles from "./tennis.module.css";

/**
 * The two control pads — the web port of `tennis_controls.dart`.
 *
 * Left is movement: drag the thumb to run, and a quick flick sprints. Right is
 * the shot: press to load, drag to shape it, release to hit. Both are Pointer
 * Events, so a mouse drag on a desktop is the same gesture with the same
 * thresholds as a thumb on a phone; the pixel numbers all come from Flutter.
 *
 * The keyboard block at the bottom is an addition rather than a port — Flutter
 * has no keyboard input, and its absence is not fidelity. It is deliberately
 * kept off the pads' axes so the two can never fight: WASD moves, the arrows
 * aim, and space is the racket.
 */

export type TennisControlsProps = {
  commands: TennisCommands;
  settings: TennisSettings;
  /** False while an overlay owns the screen. */
  live: boolean;
  onPause: () => void;
};

export function TennisControls({
  commands,
  settings,
  live,
  onPause,
}: TennisControlsProps) {
  const movement = (
    <MovementPad key="move" commands={commands} settings={settings} live={live} />
  );
  const shot = <ShotPad key="shot" commands={commands} settings={settings} live={live} />;

  return (
    <>
      <div
        className="flex w-full items-end justify-between px-3 pb-3 pt-3.5"
        style={{
          background: `linear-gradient(to top, ${withAlpha("#0d111a", 0.98)}, ${withAlpha(
            "#0d111a",
            0.78,
          )} 45%, ${withAlpha("#0d111a", 0)})`,
        }}
      >
        {settings.leftHanded ? [shot, movement] : [movement, shot]}
      </div>
      <KeyboardControls commands={commands} live={live} onPause={onPause} />
    </>
  );
}

/* ---- Movement ------------------------------------------------------------ */

function MovementPad({
  commands,
  settings,
  live,
}: {
  commands: TennisCommands;
  settings: TennisSettings;
  live: boolean;
}) {
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0, at: 0 });

  const apply = useCallback(
    (localX: number, localY: number, timeStamp: number) => {
      // The pad's centre, not the touch's origin — Flutter anchors the stick to
      // the plate so the thumb's absolute position is the input.
      const centerX = (padSize * settings.controlScale) / 2;
      const centerY = padSize / 2;
      let dx = localX - centerX;
      let dy = localY - centerY;

      const distance = Math.hypot(dx, dy);
      if (distance > moveRadius) {
        dx = (dx / distance) * moveRadius;
        dy = (dy / distance) * moveRadius;
      }

      // A flick is a long travel inside a short window. Held drags never sprint,
      // however far they go.
      const elapsed = timeStamp - origin.current.at;
      const travelled = Math.hypot(localX - origin.current.x, localY - origin.current.y);
      const sprint = elapsed < sprintFlickMs && travelled > sprintFlickDistance;

      setThumb({ x: dx, y: dy });
      commands.move(dx / moveRadius, dy / moveRadius, sprint);
    },
    [commands, settings.controlScale],
  );

  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!live || pointer.current !== null) return;
    const point = localPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    origin.current = { x: point.x, y: point.y, at: event.timeStamp };
    apply(point.x, point.y, event.timeStamp);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    const point = localPoint(event);
    apply(point.x, point.y, event.timeStamp);
  };

  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setThumb({ x: 0, y: 0 });
    commands.move(0, 0);
  };

  const width = padSize * settings.controlScale;
  const centerX = width / 2;
  const centerY = padSize / 2;
  const idle = thumb.x === 0 && thumb.y === 0;

  return (
    <div style={{ opacity: settings.controlOpacity }}>
      <PadLabel icon="directions_run" label="MOVE / FLICK" />
      <div
        className={`${styles.pad} relative mt-1.5`}
        style={{
          width,
          height: padSize,
          clipPath: hudChamferPath(14, 5),
          background: withAlpha("#1d293d", 0.9),
          border: `1px solid ${withAlpha("#5cdfff", 0.44)}`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${width} ${padSize}`}
          aria-hidden
        >
          <circle
            cx={centerX}
            cy={centerY}
            r={43}
            fill="none"
            stroke={withAlpha("#5cdfff", 0.18)}
            strokeWidth={1}
          />
          <line
            x1={centerX - 48}
            y1={centerY}
            x2={centerX + 48}
            y2={centerY}
            stroke={withAlpha("#5cdfff", 0.18)}
            strokeWidth={1}
          />
          <line
            x1={centerX}
            y1={centerY - 48}
            x2={centerX}
            y2={centerY + 48}
            stroke={withAlpha("#5cdfff", 0.18)}
            strokeWidth={1}
          />
          <circle
            cx={centerX + thumb.x}
            cy={centerY + thumb.y}
            r={23}
            fill={withAlpha("#5cdfff", idle ? 0.18 : 0.38)}
            stroke={withAlpha("#5cdfff", 0.75)}
            strokeWidth={1.4}
          />
        </svg>
      </div>
    </div>
  );
}

/* ---- Shot ---------------------------------------------------------------- */

/**
 * What the drag currently reads as. Mirrors `_ShotPainter._gestureLabel`, and
 * uses the same thresholds the engine will apply to the aim it produces.
 */
function gestureLabel(dx: number, dy: number): string {
  if (Math.hypot(dx, dy) < gestureDeadZone) return "HOLD";
  if (dy < -gestureMajorRise) return "LOB";
  if (dy < -gestureMinorRise) return "TOP";
  if (dy > gestureMajorRise) return "DROP";
  if (dy > gestureMinorRise) return "SLICE";
  return dx < 0 ? "LEFT" : "RIGHT";
}

function ShotPad({
  commands,
  settings,
  live,
}: {
  commands: TennisCommands;
  settings: TennisSettings;
  live: boolean;
}) {
  const [delta, setDelta] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const pointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0, at: 0 });

  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!live || pointer.current !== null) return;
    const point = localPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    origin.current = { x: point.x, y: point.y, at: event.timeStamp };
    setDelta({ x: 0, y: 0 });
    setActive(true);
    commands.shotStarted();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    const point = localPoint(event);
    let dx = point.x - origin.current.x;
    let dy = point.y - origin.current.y;
    const distance = Math.hypot(dx, dy);
    if (distance > shotDragLimit) {
      dx = (dx / distance) * shotDragLimit;
      dy = (dy / distance) * shotDragLimit;
    }
    setDelta({ x: dx, y: dy });
  };

  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    const held = Math.max(0, event.timeStamp - origin.current.at) / 1000;
    // Screen y grows downward and the court's does not, so the vertical half of
    // the swipe is negated: swiping up lobs.
    commands.shotReleased(
      Math.max(-1, Math.min(1, delta.x / shotAimDivisor)),
      Math.max(-1, Math.min(1, -delta.y / shotAimDivisor)),
      held,
    );
    if (settings.haptics) vibrate(10);
    pointer.current = null;
    setDelta({ x: 0, y: 0 });
    setActive(false);
  };

  const width = padSize * settings.controlScale;
  const centerX = width / 2;
  const centerY = padSize / 2;
  const label = active ? gestureLabel(delta.x, delta.y) : "TAP";

  return (
    <div style={{ opacity: settings.controlOpacity }}>
      <PadLabel icon="sports_tennis" label="HIT / SWIPE" />
      <div
        className={`${styles.pad} ${styles.padActive} relative mt-1.5`}
        style={{
          width,
          height: padSize,
          clipPath: hudChamferPath(14, 5),
          background: active ? withAlpha("#51ff94", 0.22) : withAlpha("#1d293d", 0.9),
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${width} ${padSize}`}
          aria-hidden
        >
          <circle
            cx={centerX}
            cy={centerY}
            r={42}
            fill="none"
            stroke={withAlpha("#51ff94", 0.22)}
            strokeWidth={1}
          />
          {/* Four ticks at the compass points, marking the shot directions. */}
          {[0, 1, 2, 3].map((index) => {
            const angle = -Math.PI / 2 + (index * Math.PI) / 2;
            return (
              <line
                key={index}
                x1={centerX + Math.cos(angle) * 28}
                y1={centerY + Math.sin(angle) * 28}
                x2={centerX + Math.cos(angle) * 47}
                y2={centerY + Math.sin(angle) * 47}
                stroke={withAlpha("#51ff94", 0.22)}
                strokeWidth={1}
              />
            );
          })}
          <circle
            cx={centerX + delta.x}
            cy={centerY + delta.y}
            r={active ? 24 : 20}
            fill={withAlpha("#51ff94", active ? 0.42 : 0.18)}
            stroke={withAlpha("#51ff94", 0.86)}
            strokeWidth={1.5}
          />
          <text
            x={centerX + delta.x}
            y={centerY + delta.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={withAlpha("#ffffff", 0.88)}
            style={{
              fontFamily: "var(--ds-font-display), sans-serif",
              fontSize: typography.sizePx.p9,
              fontWeight: typography.weight.extrabold,
              letterSpacing: "0.8px",
            }}
          >
            {label}
          </text>
        </svg>
      </div>
    </div>
  );
}

/*
 * Flutter labels the movement pad with a four-way `open_with` arrow. The design
 * system has no such glyph; `directions_run` is the nearest it ships and reads
 * more plainly for a stick that makes an athlete run.
 */
function PadLabel({
  icon,
  label,
}: {
  icon: "directions_run" | "sports_tennis";
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-muted">
      <Glyph name={icon} size={12} />
      <span
        className="font-display font-extrabold leading-compact"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
      >
        {label}
      </span>
    </div>
  );
}

function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported, or blocked by the browser. Nothing to fall back to.
  }
}

/* ---- Keyboard ------------------------------------------------------------ */

/**
 * The desktop path.
 *
 * WASD sets the movement vector, held Shift sprints, the arrow keys set the
 * shot's aim, and space is press-and-release on the racket — which makes it
 * both the serve meter's trigger and the rally's swing, exactly as the shot pad
 * is. Escape pauses.
 */
function KeyboardControls({
  commands,
  live,
  onPause,
}: {
  commands: TennisCommands;
  live: boolean;
  onPause: () => void;
}) {
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  useEffect(() => {
    const held = new Set<string>();
    const aim = { x: 0, y: 0 };
    let pressedAt: number | null = null;

    const moveKeys: Record<string, [number, number]> = {
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };

    const aimKeys: Record<string, [number, number]> = {
      // Up lobs, down drops, and left/right place it across the court. The
      // magnitudes are the engine's own shot thresholds, so a tap of Up is a
      // lob rather than a topspin that nearly is one.
      ArrowUp: [0, 0.8],
      ArrowDown: [0, -0.8],
      ArrowLeft: [-0.8, 0],
      ArrowRight: [0.8, 0],
    };

    const pushMove = () => {
      let x = 0;
      let y = 0;
      for (const key of held) {
        const vector = moveKeys[key];
        if (vector !== undefined) {
          x += vector[0];
          y += vector[1];
        }
      }
      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }
      commands.move(x, y, held.has("shift"));
    };

    const typing = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return (
        element !== null &&
        (element.tagName === "INPUT" ||
          element.tagName === "TEXTAREA" ||
          element.isContentEditable)
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (typing(event.target) && event.key !== "Escape") return;

      if (event.key === "Escape") {
        onPause();
        return;
      }
      // Held keys repeat; only the first press of each is an edge.
      if (event.repeat) return;
      if (!liveRef.current) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key in moveKeys || key === "Shift") {
        held.add(key === "Shift" ? "shift" : key);
        pushMove();
        event.preventDefault();
        return;
      }
      if (key in aimKeys) {
        const [x, y] = aimKeys[key];
        aim.x = x;
        aim.y = y;
        event.preventDefault();
        return;
      }
      if (key === " ") {
        event.preventDefault();
        if (pressedAt !== null) return;
        pressedAt = event.timeStamp;
        commands.shotStarted();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key in moveKeys || key === "Shift") {
        held.delete(key === "Shift" ? "shift" : key);
        pushMove();
        return;
      }
      if (key === " " && pressedAt !== null) {
        const heldSeconds = Math.max(0, event.timeStamp - pressedAt) / 1000;
        pressedAt = null;
        commands.shotReleased(aim.x, aim.y, heldSeconds);
        aim.x = 0;
        aim.y = 0;
      }
    };

    // A window that loses focus mid-drag would otherwise leave the athlete
    // sprinting into the tramlines forever.
    const onBlur = () => {
      held.clear();
      pressedAt = null;
      aim.x = 0;
      aim.y = 0;
      commands.cancel();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [commands, onPause]);

  // Handler only. The legend is a sibling of the play column rather than a
  // child, because the column clips its overflow and would swallow it.
  return null;
}

/**
 * What the keys do, printed beside the court.
 *
 * Only shown where there is room outside the 520px column for it to sit without
 * crowding the play area — which is also, near enough, where there is a
 * keyboard.
 */
export function KeyboardLegend() {
  return (
    <p
      className="pointer-events-none absolute bottom-8 left-[calc(50%+292px)] hidden font-bold leading-body text-muted xl:block"
      style={{
        fontSize: "var(--ds-text-2xs)",
        letterSpacing: "var(--ds-tracking-tight)",
      }}
    >
      W A S D MOVE · SHIFT SPRINT
      <br />← ↑ → ↓ SHAPE THE SHOT
      <br />
      SPACE HOLD &amp; RELEASE TO HIT
      <br />
      ESC PAUSE
    </p>
  );
}

/**
 * Camera juice and the full-screen effects over the top of both cameras.
 *
 * Everything here is skipped under reduced motion — the JavaScript loop runs
 * straight through the CSS damper in `globals.css`, so it has to ask for
 * itself.
 */

import {
  cineSeconds,
  cineZoom,
  effectSeconds,
  finalBallVignette,
  shakeContact,
  shakeSeconds,
  shakeWicket,
} from "../../constants";
import { clamp, madeContact, type MatchState } from "../../types";

import type { Point } from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";

/** The events that get a full-screen moment of their own. */
export type EffectKind =
  | "contactResolved"
  | "boundary"
  | "wicket"
  | "runOut"
  | "catchTaken"
  | "catchDropped"
  | "runCompleted"
  | null;

/** Contact, a boundary and a wicket all kick the camera; nothing else does. */
export function cameraShake(
  effect: EffectKind,
  age: number,
  seed: number,
): Point {
  if (effect !== "contactResolved" && effect !== "wicket" && effect !== "boundary") {
    return { x: 0, y: 0 };
  }
  if (age >= shakeSeconds) return { x: 0, y: 0 };
  const decay = 1 - age / shakeSeconds;
  const strength = effect === "wicket" ? shakeWicket : shakeContact;
  return {
    x: Math.sin(seed * 0.17 + age * 95) * strength * decay,
    y: Math.cos(seed * 0.23 + age * 77) * strength * decay,
  };
}

/** A focal punch on a run-out or a completed run — the chase tightening. */
export function cameraZoom(effect: EffectKind, age: number): number {
  if ((effect !== "runOut" && effect !== "runCompleted") || age >= cineSeconds) {
    return 1;
  }
  return 1 + Math.sin((age / cineSeconds) * Math.PI) * cineZoom;
}

/**
 * A seeded pseudo-random matching Dart's `math.Random(seed)` closely enough for
 * shard angles — this drives decoration only, never a rule.
 */
function seededRandom(seed: number): () => number {
  let state = (seed | 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return ((state >>> 0) % 1000000) / 1000000;
  };
}

export function paintEffects(
  ctx: CanvasRenderingContext2D,
  options: {
    width: number;
    height: number;
    state: MatchState;
    effect: EffectKind;
    age: number;
    seed: number;
    palette: ScenePalette;
    reducedMotion: boolean;
  },
): void {
  const { width, height, state, effect, age, seed, palette, reducedMotion } = options;
  if (age > effectSeconds || reducedMotion || effect === null) return;

  const t = clamp(age / effectSeconds, 0, 1);
  const shortestSide = Math.min(width, height);
  const center: Point = { x: width / 2, y: height * 0.6 };

  const ring = (radius: number, color: string, lineWidth: number) => {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  switch (effect) {
    case "contactResolved": {
      const outcome = state.contactOutcome;
      if (outcome === null || !madeContact(outcome)) return;
      const k = clamp(age / 0.42, 0, 1);
      ring(
        shortestSide * (0.05 + k * 0.28),
        withAlpha(palette.cyan, 0.5 * (1 - k)),
        6 * (1 - k),
      );
      return;
    }

    case "boundary": {
      const six = state.lastResult?.boundary === 6;
      const color = six ? palette.gold : palette.cyan;
      for (let i = 0; i < 3; i += 1) {
        const k = clamp(t - i * 0.12, 0, 1);
        if (k <= 0) continue;
        ring(
          shortestSide * (0.1 + k * 0.55),
          withAlpha(color, 0.35 * (1 - k)),
          4 * (1 - k),
        );
      }
      return;
    }

    case "wicket":
    case "runOut": {
      // Shards out of the stumps.
      const random = seededRandom(seed);
      ctx.fillStyle = withAlpha(palette.danger, 0.7 * (1 - t));
      for (let i = 0; i < 14; i += 1) {
        const angle = random() * Math.PI * 2;
        const distance = shortestSide * (0.05 + t * (0.2 + random() * 0.3));
        const x = center.x + Math.cos(angle) * distance;
        const y = center.y + Math.sin(angle) * distance;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, 4 * (1 - t)), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    case "catchTaken":
    case "catchDropped": {
      const taken = effect === "catchTaken";
      ring(
        shortestSide * (0.08 + t * 0.2),
        withAlpha(taken ? palette.danger : palette.lime, 0.55 * (1 - t)),
        5 * (1 - t),
      );
      return;
    }

    default:
      return;
  }
}

/** One legal ball left. The world closes in. */
export function paintFinalBallVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seconds: number,
  palette: ScenePalette,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(seconds * 3.4);
  const longestSide = Math.max(width, height);
  const radius = longestSide * 0.62;
  const centerX = width / 2;
  const centerY = height * 0.62;

  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.55,
    centerX,
    centerY,
    radius,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(
    1,
    withAlpha(palette.danger, 0.1 * finalBallVignette * (0.6 + 0.4 * pulse)),
  );
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/** How loud the crowd goes for a given beat. */
export function crowdLoudness(effect: EffectKind): number {
  switch (effect) {
    case "boundary":
      return 1.0;
    case "wicket":
    case "runOut":
      return 0.85;
    case "catchTaken":
    case "catchDropped":
      return 0.6;
    default:
      return 0;
  }
}

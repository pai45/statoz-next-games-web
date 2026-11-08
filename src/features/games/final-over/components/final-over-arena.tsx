"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import { crowdHypeSeconds, runUpCycle } from "../constants";
import type { MatchController } from "../engine/match-controller";
import { visualSeed } from "../engine/random";
import type { FinalOverKit } from "../data/kits";
import { useMatchLoop } from "../state/use-match-engine";
import { clamp, isTerminal, type FieldVector, type MatchState } from "../types";

import {
  batterPoseFor,
  batterTrailAngles,
  paintBattingView,
} from "./renderer/batting-view";
import {
  cameraShake,
  cameraZoom,
  crowdLoudness,
  paintEffects,
  paintFinalBallVignette,
  type EffectKind,
} from "./renderer/effects";
import { paintFieldView } from "./renderer/field-view";
import { battingProjection } from "./renderer/geometry";
import { readScenePalette, type ScenePalette } from "./renderer/palette";
import { crowdHype } from "./renderer/stadium";
import { easeInCubicCurve, easeOutCubicCurve } from "../../shared/engine/curves";
import { backliftLoadMicros, swingPoseMicros } from "../constants";

/**
 * The canvas the match is drawn on, and the only thing in the module that runs
 * per frame.
 *
 * It owns the visual state Flutter keeps on `FinalOverGame` — the ball trail,
 * the current effect and when it started, the bowler's run-up phase, whether a
 * swing is being held — because none of it is a rule, and none of it should
 * cost a React render.
 *
 * The two cameras cross-fade. Flutter composites them with `saveLayer`, which
 * applies opacity to the finished group rather than to each draw call; the same
 * thing here means rendering each view into its own buffer during the blend and
 * compositing those. Outside the blend only one camera is live and it draws
 * straight to the screen.
 */

export type FinalOverArenaProps = {
  controller: MatchController;
  kit: FinalOverKit;
  opponentKit: FinalOverKit;
  strikerActorId: string;
  partnerActorId: string;
  /** Where the control deck starts, so the pitch never sits under it. */
  controlDeckTop: number | null;
  swingHeld: boolean;
  swingHeldAtMicros: number | null;
  /** Set by the orchestrator when an event worth a full-screen moment fires. */
  effect: { kind: EffectKind; startedAt: number; seed: number };
  /** Free-running seconds, shared with the orchestrator's sting timers. */
  onFrame: (seconds: number) => void;
};

type VisualState = {
  seconds: number;
  bowlerRunPhase: number;
  trail: FieldVector[];
  trailOrdinal: number;
};

export function FinalOverArena({
  controller,
  kit,
  opponentKit,
  strikerActorId,
  partnerActorId,
  controlDeckTop,
  swingHeld,
  swingHeldAtMicros,
  effect,
  onFrame,
}: FinalOverArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRefs = useRef<[HTMLCanvasElement | null, HTMLCanvasElement | null]>([
    null,
    null,
  ]);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const visual = useRef<VisualState>({
    seconds: 0,
    bowlerRunPhase: 0,
    trail: [],
    trailOrdinal: -1,
  });

  const reducedMotion = usePrefersReducedMotion();
  const paletteRef = useRef<ScenePalette | null>(null);

  // `ctx.filter` is the only way to blur on a 2D canvas, and Safari shipped it
  // late; a scene without the floodlight bloom is still the right scene.
  const allowBlur = useMemo(() => {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("canvas").getContext("2d");
    return probe !== null && "filter" in probe;
  }, []);

  /**
   * The loop reads these every frame but must not restart when they change, so
   * each lives in a ref that is only written from an effect. Writing them
   * during render would be a lie about when the value took hold, and React's
   * compiler rightly refuses it.
   */
  const deckTopRef = useRef(controlDeckTop);
  const swingHeldRef = useRef(swingHeld);
  const swingHeldAtRef = useRef(swingHeldAtMicros);
  const effectRef = useRef(effect);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    deckTopRef.current = controlDeckTop;
    swingHeldRef.current = swingHeld;
    swingHeldAtRef.current = swingHeldAtMicros;
    effectRef.current = effect;
    onFrameRef.current = onFrame;
  }, [controlDeckTop, swingHeld, swingHeldAtMicros, effect, onFrame]);

  /* ---- Sizing ----------------------------------------------------------- */

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const parent = canvas.parentElement;
    if (parent === null) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) return;

    sizeRef.current = { width, height, dpr };
    for (const surface of [canvas, ...bufferRefs.current]) {
      if (surface === null) continue;
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    bufferRefs.current = [document.createElement("canvas"), document.createElement("canvas")];
    paletteRef.current = readScenePalette();
    resize();

    const canvas = canvasRef.current;
    const parent = canvas?.parentElement ?? null;
    if (parent === null) return;

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    // The palette is resolved from CSS custom properties, so a theme swap has
    // to re-read it. It never changes per frame.
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      paletteRef.current = readScenePalette();
    };
    scheme.addEventListener("change", onScheme);

    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", onScheme);
    };
  }, [resize]);

  /* ---- The frame -------------------------------------------------------- */

  const paint = useCallback(
    (seconds: number, elapsed: number) => {
      const canvas = canvasRef.current;
      const palette = paletteRef.current;
      if (canvas === null || palette === null) return;

      const ctx = canvas.getContext("2d");
      if (ctx === null) return;

      const { width, height, dpr } = sizeRef.current;
      if (width === 0 || height === 0) return;

      const state = controller.getState();
      const tuning = controller.tuning;
      const scene = visual.current;

      scene.seconds = seconds;
      if (state.phase === "bowlerRunUp") {
        scene.bowlerRunPhase += elapsed * runUpCycle;
      }
      captureTrail(scene, state);
      onFrameRef.current(seconds);

      const transition = clamp(state.cameraTransition, 0, 1);
      const age = clamp(seconds - effectRef.current.startedAt, 0, 2);
      const shake = reducedMotion
        ? { x: 0, y: 0 }
        : cameraShake(effectRef.current.kind, age, effectRef.current.seed);
      const zoom = reducedMotion ? 1 : cameraZoom(effectRef.current.kind, age);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(shake.x, shake.y);
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      const hype = crowdHype(
        crowdLoudness(effectRef.current.kind),
        clamp((seconds - effectRef.current.startedAt) / crowdHypeSeconds, 0, 1),
      );

      const drawBatting = (target: CanvasRenderingContext2D) => {
        const pose = batterPoseFor(state, swingHeldRef.current);
        const progress = batterProgress(
          state,
          scene,
          swingHeldRef.current,
          swingHeldAtRef.current,
          effectRef.current.startedAt,
          tuning.incomingToContactMicros,
        );
        paintBattingView(target, {
          projection: battingProjection(width, height, deckTopRef.current),
          state,
          tuning,
          palette,
          kit,
          opponentKit,
          strikerActorId,
          seconds,
          bowlerRunPhase: scene.bowlerRunPhase,
          swingHeld: swingHeldRef.current,
          swingHeldAtMicros: swingHeldAtRef.current,
          batterProgress: progress,
          batterPose: pose,
          trailBatAngles: batterTrailAngles(pose, progress),
          effectStartedAt: effectRef.current.startedAt,
          reducedMotion,
          allowBlur,
          stadium: {
            width,
            height,
            seconds,
            hype,
            reducedMotion,
            allowBlur,
            palette,
          },
        });
      };

      const drawField = (target: CanvasRenderingContext2D) => {
        paintFieldView(target, {
          width,
          height,
          state,
          palette,
          kit,
          opponentKit,
          strikerActorId,
          partnerActorId,
          trail: scene.trail,
          seconds,
          allowBlur,
        });
      };

      if (transition <= 0) {
        drawBatting(ctx);
      } else if (transition >= 1) {
        drawField(ctx);
      } else {
        // Mid-blend: each camera gets its own buffer so the opacity applies to
        // the finished picture, exactly as Flutter's saveLayer does.
        const [battingBuffer, fieldBuffer] = bufferRefs.current;
        const battingCtx = battingBuffer?.getContext("2d") ?? null;
        const fieldCtx = fieldBuffer?.getContext("2d") ?? null;
        if (battingCtx !== null && fieldCtx !== null) {
          for (const buffer of [battingCtx, fieldCtx]) {
            buffer.setTransform(dpr, 0, 0, dpr, 0, 0);
            buffer.clearRect(0, 0, width, height);
          }
          drawBatting(battingCtx);
          drawField(fieldCtx);

          ctx.save();
          ctx.globalAlpha = 1 - easeInCubicCurve(transition);
          ctx.drawImage(battingBuffer as HTMLCanvasElement, 0, 0, width, height);
          ctx.globalAlpha = easeOutCubicCurve(transition);
          ctx.drawImage(fieldBuffer as HTMLCanvasElement, 0, 0, width, height);
          ctx.restore();
        } else {
          drawBatting(ctx);
        }
      }

      ctx.restore();

      paintEffects(ctx, {
        width,
        height,
        state,
        effect: effectRef.current.kind,
        age,
        seed: effectRef.current.seed,
        palette,
        reducedMotion,
      });

      if (state.maximumLegalBalls - state.legalBalls === 1 && !isTerminal(state)) {
        paintFinalBallVignette(ctx, width, height, seconds, palette);
      }
    },
    [
      controller,
      kit,
      opponentKit,
      strikerActorId,
      partnerActorId,
      reducedMotion,
      allowBlur,
    ],
  );

  useMatchLoop(controller, paint, true);

  return <canvas ref={canvasRef} className="absolute inset-0 block size-full" aria-hidden />;
}

/* ---- Visual bookkeeping --------------------------------------------------- */

function captureTrail(scene: VisualState, state: MatchState): void {
  const ordinal = state.currentDelivery?.ordinal ?? -1;
  if (ordinal !== scene.trailOrdinal) {
    scene.trailOrdinal = ordinal;
    scene.trail = [];
  }
  const position = state.ball?.position;
  if (position === undefined || position === null) return;

  const last = scene.trail[scene.trail.length - 1];
  if (
    last === undefined ||
    Math.hypot(last.x - position.x, last.y - position.y) >= 0.025
  ) {
    scene.trail.push(position);
    if (scene.trail.length > 30) scene.trail.shift();
  }
}

/** How far through its pose the batter is — a pure read of engine state. */
function batterProgress(
  state: MatchState,
  scene: VisualState,
  swingHeld: boolean,
  swingHeldAtMicros: number | null,
  effectStartedAt: number,
  incomingToContactMicros: number,
): number {
  if (state.phase === "won") return scene.seconds - effectStartedAt;
  if (state.ledger.dismissal === "bowled") return scene.seconds - effectStartedAt;
  if (state.runner.active) return scene.bowlerRunPhase;

  const swing = state.swingIntent;
  if (swing === null) {
    if (swingHeld) {
      if (swingHeldAtMicros === null) return 1;
      // Deliberately not clamped to 1: `backlift` clamps the 0→1 windup itself
      // and reads the overflow to drive an idle coil while the hold continues.
      return Math.max(0, (state.simulationMicros - swingHeldAtMicros) / backliftLoadMicros);
    }
    if (state.phase === "incomingBall" && state.currentDelivery !== null) {
      const release =
        state.currentDelivery.expectedContactMicros - incomingToContactMicros;
      return clamp(
        (state.simulationMicros - release) / incomingToContactMicros,
        0,
        1,
      );
    }
    return scene.seconds;
  }
  return clamp((state.simulationMicros - swing.inputMicros) / swingPoseMicros, 0, 1);
}

export { visualSeed };

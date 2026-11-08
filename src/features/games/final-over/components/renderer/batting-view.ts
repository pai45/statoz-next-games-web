/**
 * The batting camera: the pitch receding to the bowler's end, the two actors on
 * it, the stumps, and the ball.
 *
 * Every element is placed through the one shared projection in `geometry.ts`,
 * so the rope, the bowler's feet and the vanishing point all agree on which way
 * is *away*.
 */

import { bounceProgress, referenceHeightMetres, runUpCycle } from "../../constants";
import { lookFor, shirtNumberFor, type FinalOverKit } from "../../data/kits";
import type { GameplayTuning } from "../../tuning";
import {
  clamp,
  madeContact,
  type DeliverySpec,
  type Elevation,
  type MatchState,
  type ShotDirection,
} from "../../types";

import {
  bouncePoint,
  halfWidthAt,
  incomingPoint,
  pointAt,
  shouldShowBounceMarker,
  type BattingProjection,
  type Point,
} from "./geometry";
import { withAlpha, type ScenePalette } from "./palette";
import {
  batterFrame,
  bowlerPose,
  drawBatter,
  drawBowler,
  type BatterPoseKind,
  type BowlerPoseKind,
} from "./rig";
import { paintStadium, type StadiumFrame } from "./stadium";

export type BattingFrame = {
  projection: BattingProjection;
  state: MatchState;
  tuning: GameplayTuning;
  palette: ScenePalette;
  kit: FinalOverKit;
  opponentKit: FinalOverKit;
  strikerActorId: string;
  seconds: number;
  bowlerRunPhase: number;
  swingHeld: boolean;
  swingHeldAtMicros: number | null;
  batterProgress: number;
  batterPose: BatterPoseKind;
  trailBatAngles: readonly number[];
  effectStartedAt: number;
  reducedMotion: boolean;
  allowBlur: boolean;
  stadium: StadiumFrame;
};

/** How far the incoming delivery has travelled from the bowler's hand. */
export function incomingProgress(state: MatchState, tuning: GameplayTuning): number {
  const delivery = state.currentDelivery;
  if (delivery === null) return 0;
  const release = delivery.expectedContactMicros - tuning.incomingToContactMicros;
  return clamp(
    (state.simulationMicros - release) / tuning.incomingToContactMicros,
    0,
    1,
  );
}

/** The bowler's pose is a pure read of where the run-up has got to. */
export function bowlerPoseFor(
  state: MatchState,
  tuning: GameplayTuning,
  seconds: number,
): { kind: BowlerPoseKind; t: number } {
  const p = state.phaseElapsedMicros / Math.max(1, tuning.runUpMicros);
  if (state.phase === "deliveryPreparation") return { kind: "ready", t: seconds };
  if (state.phase === "bowlerRunUp") {
    if (p < 0.58) return { kind: "runUp", t: p / 0.58 };
    if (p < 0.8) return { kind: "gather", t: (p - 0.58) / 0.22 };
    return { kind: "release", t: (p - 0.8) / 0.2 };
  }
  if (
    state.phase === "incomingBall" ||
    state.phase === "contact" ||
    state.phase === "cameraTransition"
  ) {
    return { kind: "followThrough", t: incomingProgress(state, tuning) };
  }
  return { kind: "ready", t: seconds };
}

/** The presentation-only ball path during the contact beat. */
export function contactBallFlightPoint(options: {
  width: number;
  height: number;
  origin: Point;
  direction: ShotDirection;
  elevation: Elevation;
  power: number;
  progress: number;
}): Point {
  const { width, height, origin, direction, elevation, power, progress } = options;
  const flightProgress = clamp(progress, 0, 1);
  const normalizedPower = clamp(power, 0, 1);

  const directionVector: Point =
    direction === "offSide"
      ? { x: -1, y: 0 }
      : direction === "straight"
        ? { x: 0, y: -1 }
        : direction === "legSide"
          ? { x: 1, y: 0 }
          : { x: 0, y: 1 };

  const distanceToEdge =
    direction === "offSide"
      ? Math.max(0, origin.x)
      : direction === "straight"
        ? Math.max(0, origin.y)
        : direction === "legSide"
          ? Math.max(0, width - origin.x)
          : Math.max(0, height - origin.y);

  // A distance-relative lead, so even the longest route clears the viewport on
  // the last contact frame, before the controller starts the camera blend.
  const shortestSide = Math.min(width, height);
  const overshoot =
    distanceToEdge * 0.065 + shortestSide * (0.012 + normalizedPower * 0.02);
  const travel = (distanceToEdge + overshoot) * flightProgress;
  const loftLift =
    elevation === "loft" ? Math.sin(Math.PI * flightProgress) * height * 0.075 : 0;

  return {
    x: origin.x + directionVector.x * travel,
    y: origin.y + directionVector.y * travel - loftLift,
  };
}

export function paintBall(
  ctx: CanvasRenderingContext2D,
  at: Point,
  r: number,
  seconds: number,
  palette: ScenePalette,
): void {
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fillStyle = palette.ball;
  ctx.fill();

  // The seam, turning over as it comes.
  ctx.beginPath();
  const start = -Math.PI * 0.85 + seconds * 11;
  ctx.arc(at.x, at.y, r * 0.72, start, start + Math.PI * 0.8);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(at.x - r * 0.3, at.y - r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fill();
}

function paintPerspectivePitch(
  ctx: CanvasRenderingContext2D,
  frame: BattingFrame,
): void {
  const { projection: p, state, palette } = frame;
  const { centerX: cx, nearY, farY, nearHalfWidth: nearHalf, farHalfWidth: farHalf } = p;

  ctx.beginPath();
  ctx.moveTo(cx - nearHalf, nearY);
  ctx.lineTo(cx + nearHalf, nearY);
  ctx.lineTo(cx + farHalf, farY);
  ctx.lineTo(cx - farHalf, farY);
  ctx.closePath();

  const strip = ctx.createLinearGradient(cx, farY, cx, nearY);
  strip.addColorStop(0, palette.pitchFar);
  strip.addColorStop(1, palette.pitchNear);
  ctx.fillStyle = strip;
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.cyan, 0.16);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Creases — the batter's line, and the bowler's at the far end.
  const crease = (t: number, alpha: number) => {
    const point = pointAt(p, t);
    const half = halfWidthAt(p, t);
    ctx.beginPath();
    ctx.moveTo(cx - half * 1.08, point.y);
    ctx.lineTo(cx + half * 1.08, point.y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 1 + t * 2;
    ctx.stroke();
  };
  crease(0.14, 0.3);
  crease(0.78, 0.42);

  // The line the ball is on, shown only while it is in the air toward you.
  if (state.phase === "incomingBall" && state.currentDelivery !== null) {
    const from = incomingPoint(p, state.currentDelivery, 0);
    const to = incomingPoint(p, state.currentDelivery, 1);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = withAlpha(palette.cyan, 0.22);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function paintBounceMarker(
  ctx: CanvasRenderingContext2D,
  frame: BattingFrame,
  delivery: DeliverySpec,
): void {
  const { projection: p, state, palette, tuning, allowBlur } = frame;
  if (
    !shouldShowBounceMarker(
      state.phase,
      state.suspendedPhase,
      delivery.length,
      incomingProgress(state, tuning),
    )
  ) {
    return;
  }

  const point = bouncePoint(p, delivery);
  // The marker grows as the pitch point comes toward you, on the same depth the
  // projection placed it at.
  const depth = 0.08 + 0.78 * bounceProgress[delivery.length];
  const radius = 7.0 + 6.0 * depth;

  ctx.save();
  if (allowBlur) ctx.filter = "blur(5px)";
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, radius, radius * 0.36, 0, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(palette.cyan, 0.24);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(point.x, point.y, radius, radius * 0.36, 0, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha(palette.cyan, 0.88);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(point.x, point.y, Math.max(1.8, radius * 0.18), 0, Math.PI * 2);
  ctx.fillStyle = palette.cyan;
  ctx.fill();
}

function paintStumps(ctx: CanvasRenderingContext2D, frame: BattingFrame): void {
  const { projection: p, state, palette } = frame;
  const broken =
    state.ledger.dismissal === "bowled" || state.lastResult?.dismissal === "bowled";

  const cx = p.centerX;
  const baseY = pointAt(p, 0.875).y;
  const h = p.height * 0.095 * 0.85;
  const gap = p.width * 0.02 * 0.85;

  for (let i = -1; i <= 1; i += 1) {
    const lean = broken ? i * 0.28 : 0;
    const x = cx + i * gap;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + lean * h, baseY - h * (broken ? 0.82 : 1));
    ctx.strokeStyle = palette.stump;
    ctx.lineWidth = p.width * 0.011;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  if (!broken) {
    ctx.beginPath();
    ctx.moveTo(cx - gap, baseY - h);
    ctx.lineTo(cx + gap, baseY - h);
    ctx.strokeStyle = palette.amber;
    ctx.lineWidth = p.width * 0.008;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function paintPerspectiveBall(
  ctx: CanvasRenderingContext2D,
  frame: BattingFrame,
  delivery: DeliverySpec,
): void {
  const { projection: p, state, tuning, palette, seconds, reducedMotion } = frame;
  const width = p.width;
  const height = p.height;
  const shortestSide = Math.min(width, height);

  // During the blend the field camera owns the real physics ball.
  if (state.phase === "cameraTransition" || state.suspendedPhase === "cameraTransition") {
    return;
  }

  let x: number;
  let y: number;
  let r: number;

  const ball = state.ball;
  const outcome = state.contactOutcome;

  if (ball !== null) {
    const distance = clamp(Math.hypot(ball.position.x, ball.position.y), 0, 1);
    x = width * (0.5 + ball.position.x * 0.24);
    y = height * (0.77 - distance * 0.34 - ball.height * 0.22);
    r = shortestSide * (0.037 - distance * 0.012) * 0.5;
  } else if (state.phase === "contact" && outcome !== null && madeContact(outcome)) {
    const progress = clamp(
      state.phaseElapsedMicros / Math.max(1, tuning.impactHoldMicros),
      0,
      1,
    );
    const origin = incomingPoint(p, delivery, 1);
    const point = contactBallFlightPoint({
      width,
      height,
      origin,
      direction: outcome.direction,
      elevation: outcome.elevation,
      power: outcome.power,
      progress,
    });
    x = point.x;
    y = point.y;
    r = shortestSide * (0.018 - progress * 0.004);

    if (!reducedMotion && progress > 0.08) {
      for (let trail = 2; trail >= 1; trail -= 1) {
        const trailProgress = clamp(progress - trail * 0.06, 0, 1);
        const trailPoint = contactBallFlightPoint({
          width,
          height,
          origin,
          direction: outcome.direction,
          elevation: outcome.elevation,
          power: outcome.power,
          progress: trailProgress,
        });
        ctx.beginPath();
        ctx.arc(trailPoint.x, trailPoint.y, r * (1 - trail * 0.16), 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(palette.cyan, 0.18 / trail);
        ctx.fill();
      }
    }
  } else {
    // Hold the ball in the hand until the arm has actually come over.
    if (
      (state.phase === "deliveryPreparation" || state.phase === "bowlerRunUp") &&
      state.phaseElapsedMicros < tuning.runUpMicros * 0.78
    ) {
      return;
    }
    const progress = incomingProgress(state, tuning);
    const point = incomingPoint(p, delivery, progress);
    x = point.x;
    y = point.y;
    r = shortestSide * (0.018 + 0.026 * progress) * 0.5 * 0.85;
  }

  paintBall(ctx, { x, y }, r, seconds, palette);
}

/** Places an actor on the turf: ground shadow, then the rig. */
function paintActor(
  ctx: CanvasRenderingContext2D,
  ground: Point,
  px: number,
  facing: number,
  draw: (ctx: CanvasRenderingContext2D, facing: number) => void,
): void {
  ctx.save();
  ctx.translate(ground.x, ground.y);
  ctx.scale(facing, 1);

  ctx.beginPath();
  ctx.ellipse(0, 0, (px * 0.85) / 2, (px * 0.16) / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fill();

  draw(ctx, facing);
  ctx.restore();
}

export function paintBattingView(
  ctx: CanvasRenderingContext2D,
  frame: BattingFrame,
): void {
  const { projection: p, state, palette, kit, opponentKit, strikerActorId } = frame;

  paintStadium(ctx, frame.stadium);
  paintPerspectivePitch(ctx, frame);

  const delivery = state.currentDelivery;
  if (delivery !== null) paintBounceMarker(ctx, frame, delivery);
  paintStumps(ctx, frame);

  // Depth by size: the bowler stands twenty metres away, so it is drawn small
  // and high; the batter is at your shoulder.
  const bowlerPx = (p.height * 0.145 * 0.85) / referenceHeightMetres;
  const { kind: bowlerKind, t: bowlerT } = bowlerPoseFor(state, frame.tuning, frame.seconds);
  const bowler = state.bowlers[Math.min(state.bowlerIndex, state.bowlers.length - 1)] ?? null;
  const bowlerLookKey = bowler?.lookKey ?? "fo-bowler";
  const bowlerNumber = bowler?.jerseyNumber ?? shirtNumberFor("fo-bowler");

  paintActor(ctx, pointAt(p, 0.15, -0.065), bowlerPx, 1, (c, facing) => {
    drawBowler(c, bowlerPose(bowlerKind, bowlerT, frame.bowlerRunPhase), {
      kit: opponentKit,
      look: lookFor(bowlerLookKey),
      px: bowlerPx,
      heightM: referenceHeightMetres,
      number: bowlerNumber,
      facing,
      ballInHand:
        bowlerKind !== "followThrough" && !(bowlerKind === "release" && bowlerT > 0.72),
      palette,
    });
  });

  const batterPx = (p.height * 0.25 * 0.85) / referenceHeightMetres;
  const frameForBatter = batterFrame(frame.batterPose, frame.batterProgress, frame.bowlerRunPhase);

  paintActor(ctx, pointAt(p, 0.84, 0.115), batterPx, -1, (c, facing) => {
    drawBatter(c, frameForBatter, {
      kit,
      look: lookFor(strikerActorId),
      px: batterPx,
      heightM: referenceHeightMetres,
      number: shirtNumberFor(strikerActorId),
      facing,
      trailBatAngles: frame.trailBatAngles,
      palette,
    });
  });

  if (delivery !== null) paintPerspectiveBall(ctx, frame, delivery);
}

/** Which stroke the batter is playing — a projection of state, nothing more. */
export function batterPoseFor(
  state: MatchState,
  swingHeld: boolean,
): BatterPoseKind {
  if (state.phase === "won") return "celebrate";
  if (state.ledger.dismissal === "bowled") return "bowled";
  if (state.runner.active) return "running";

  const outcome = state.contactOutcome;
  if (outcome !== null && !madeContact(outcome)) return "miss";

  const swing = state.swingIntent;
  if (swing === null) {
    // Holding the swing makes the batter visibly load up, while an untouched
    // bat still lifts slightly as the ball approaches.
    if (swingHeld) return "backlift";
    return state.phase === "incomingBall" ? "backlift" : "stance";
  }

  const loft = state.selectedElevation === "loft";
  switch (swing.direction) {
    case "offSide":
      return loft ? "loftOff" : "groundOff";
    case "straight":
      return loft ? "loftStraight" : "groundStraight";
    case "legSide":
      return loft ? "loftLeg" : "groundLeg";
    case "behind":
      return loft ? "loftBack" : "groundBack";
  }
}

const trailPoses = new Set<BatterPoseKind>([
  "groundOff",
  "groundStraight",
  "groundLeg",
  "groundBack",
  "loftOff",
  "loftStraight",
  "loftLeg",
  "loftBack",
  // Still a full-speed swing through the zone.
  "miss",
]);

/**
 * Two recent past bat angles for a fading motion trail, oldest first. Only
 * during the fast middle of a committed swing, never during stance, backlift,
 * running, celebrate or bowled.
 */
export function batterTrailAngles(kind: BatterPoseKind, t: number): number[] {
  if (!trailPoses.has(kind)) return [];
  if (t < 0.15 || t > 0.85) return [];
  return [
    batterFrame(kind, clamp(t - 0.16, 0, 1)).batAngle,
    batterFrame(kind, clamp(t - 0.08, 0, 1)).batAngle,
  ];
}

export { runUpCycle };

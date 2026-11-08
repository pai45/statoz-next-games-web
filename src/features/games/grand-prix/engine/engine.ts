import {
  accel,
  bendCompression,
  brake as brakeRate,
  carLength,
  carWidth,
  coast,
  contactFrontDecel,
  contactPushRate,
  contactRearDecel,
  grassDrag,
  grassTopSpeedFactor,
  heavyContactClosingSpeed,
  maxCornerError,
  scrub,
  slipstreamAlign,
  slipstreamBoost,
  slipstreamMax,
  slipstreamMin,
  spinSeconds,
  spinSpeedFactor,
  steerRate,
  stuckSpeed,
  stuckTimeout,
  topSpeed,
  trackHalfWidth,
  wallHitSpeedFactor,
  wallLateral,
  wallSpinMinSpeed,
} from "../tuning";
import { lapLengthOf, type TrackSection } from "../types";

import {
  emptyTickEvents,
  isFinished,
  isOnGrass,
  isSpinning,
  positionOf,
  raceLengthOf,
  type CarState,
  type RaceField,
  type RaceInputs,
  type RaceTickEvents,
} from "./field";
import {
  lapLocalDistance,
  raceCenterlineX,
  sectionAt,
} from "./geometry";
import type { RaceRandom } from "./random";

/**
 * The race simulation — a port of `GrandPrixEngine` in
 * `games/grand_prix/grand_prix_engine.dart`.
 *
 * Deterministic given a seeded generator and a fixed step, and entirely free of
 * anything that draws, so the whole of it can be run headless and compared
 * against the Dart original tick for tick.
 *
 * Each car is a distance along the lap and a lateral offset. A corner reaches
 * the physics only through its safe speed; how sharply the road bends on screen
 * is the renderer's business, and the two are tied together by one shared
 * constant so the car and the road never disagree about where the corner is.
 */
export class GrandPrixEngine {
  constructor(private readonly random: RaceRandom) {}

  /** Advances the whole field by `dt` seconds and reports the tick's events. */
  tick(field: RaceField, playerInputs: RaceInputs, dt: number): RaceTickEvents {
    const events = emptyTickEvents();
    const player = field.player;
    const previousPosition = positionOf(field, player);
    const previouslyAhead = new Set<number>();
    for (const car of field.cars) {
      if (!car.isPlayer && !isFinished(player) && car.distance > player.distance) {
        previouslyAhead.add(car.index);
      }
    }

    field.raceClockMs += dt * 1000;

    for (const car of field.cars) {
      if (isFinished(car)) {
        // Coast over the line, so a finisher glides out of frame.
        car.speed = Math.max(0, car.speed - coast * dt);
        car.distance += car.speed * dt;
        continue;
      }
      const inputs = car.isPlayer ? playerInputs : this.cpuInputs(field, car);
      this.stepCar(field, car, inputs, dt, events);
    }

    this.resolveContacts(field, dt, events);
    this.detectFinishes(field, events);

    // Position and overtake diff — the player's only; the HUD wants no more.
    const newPosition = positionOf(field, player);
    if (newPosition !== previousPosition) events.playerPosition = newPosition;
    if (!isFinished(player)) {
      for (const car of field.cars) {
        if (car.isPlayer || !previouslyAhead.has(car.index)) continue;
        if (car.distance <= player.distance && !isFinished(car)) {
          events.overtakes.push({
            overtakenName: car.name,
            overtakenPosition: newPosition,
            atDistance: player.distance,
          });
        }
      }
    }

    // The stuck watchdog. Run off or into a barrier, grind to a crawl, and the
    // clock runs out; get moving again and it resets. Steering back onto the
    // track is the escape.
    if (!isFinished(player)) {
      if (player.speed < stuckSpeed) {
        field.playerStuckSeconds += dt;
        if (field.playerStuckSeconds >= stuckTimeout) {
          events.playerStuckOut = true;
        }
      } else {
        field.playerStuckSeconds = 0;
      }
    }
    return events;
  }

  /* ---- One car ------------------------------------------------------------ */

  private stepCar(
    field: RaceField,
    car: CarState,
    inputs: RaceInputs,
    dt: number,
    events: RaceTickEvents,
  ): void {
    const sections = field.circuit.sections;
    const lapLength = lapLengthOf(field.circuit);
    car.sectionIndex = sectionAt(
      field.sectionStarts,
      sections,
      lapLocalDistance(lapLength, car.distance),
    );
    const section = sections[car.sectionIndex];
    const previousLateral = car.lateral;

    // Timers.
    if (car.spinTimer > 0) {
      car.spinTimer = Math.max(0, car.spinTimer - dt);
      if (car.spinTimer === 0 && car.mode === "spinning") car.mode = "racing";
    }
    if (car.throttleCutTimer > 0) {
      car.throttleCutTimer = Math.max(0, car.throttleCutTimer - dt);
    }
    if (car.launchBoostTimer > 0) {
      car.launchBoostTimer = Math.max(0, car.launchBoostTimer - dt);
      if (car.launchBoostTimer === 0) car.launchAccelFactor = 1.0;
    }

    // Slipstream — straights only.
    car.slipstreaming = false;
    if (section.type === "straight" && !isSpinning(car)) {
      for (const other of field.cars) {
        if (other === car) continue;
        const gap = other.distance - car.distance;
        if (
          gap >= slipstreamMin &&
          gap <= slipstreamMax &&
          Math.abs(other.lateral - car.lateral) < slipstreamAlign
        ) {
          car.slipstreaming = true;
          break;
        }
      }
    }

    // Effective top speed.
    let effectiveTop = topSpeed;
    if (car.slipstreaming) effectiveTop *= 1 + slipstreamBoost;
    if (!car.isPlayer) effectiveTop *= 0.9 + 0.1 * car.strength + car.paceJitter;
    if (isOnGrass(car)) effectiveTop *= grassTopSpeedFactor;

    // Speed.
    const throttleOn =
      inputs.throttle && car.throttleCutTimer === 0 && !isSpinning(car);
    if (inputs.brake && !isSpinning(car)) {
      car.speed = Math.max(0, car.speed - brakeRate * dt);
    } else if (throttleOn) {
      const headroom = Math.max(0, 1 - car.speed / effectiveTop);
      car.speed += accel * car.launchAccelFactor * headroom * dt;
    } else {
      car.speed = Math.max(0, car.speed - coast * dt);
    }
    if (car.speed > effectiveTop) {
      // Ease down when a boost or a tow expires, rather than snapping.
      car.speed = Math.max(effectiveTop, car.speed - coast * 2 * dt);
    }
    if (isSpinning(car)) {
      car.speed = Math.min(car.speed, topSpeed * spinSpeedFactor);
    }

    // Corner resolution. Carrying more than the safe entry speed scrubs speed
    // but never moves the car sideways on its own: the driver keeps full
    // lateral control, so the car holds its line through a corner and only
    // leaves it when actually steered. Steering all the way into the outside
    // wall is what spins it, and that is handled at the wall clamp below.
    const safeSpeed = section.safeSpeed;
    if (safeSpeed !== null && !isSpinning(car) && car.speed > safeSpeed) {
      car.speed = Math.max(0, car.speed - scrub * (car.speed - safeSpeed) * dt);
      if (car.isPlayer) events.playerTireScrub = true;
    }

    // Lateral: the driver's steering, then the corner's curvature drift.
    if (!isSpinning(car)) {
      const steer = inputs.steer < -1 ? -1 : inputs.steer > 1 ? 1 : inputs.steer;
      car.lateral += steerRate * steer * dt;

      // The car holds a straight heading unless steered, so as the road bends
      // its centerline slides out from under it: without steering the car runs
      // to the OUTSIDE of the corner, matching the drawn bend, and the driver
      // has to steer INTO it to follow the road. Straights add no drift, so
      // there the car moves only on input.
      const ahead = car.distance + car.speed * dt;
      const centerShift =
        raceCenterlineX(field.circuit, field.sectionStarts, ahead) -
        raceCenterlineX(field.circuit, field.sectionStarts, car.distance);
      car.lateral -= centerShift * bendCompression;
    }
    if (isOnGrass(car)) {
      car.speed = Math.max(0, car.speed - grassDrag * dt);
    }
    if (Math.abs(car.lateral) >= wallLateral) {
      // A fresh hit means the car was strictly inside the wall last tick and
      // reached it this one. Landing exactly on the clamp still counts; once
      // pinned there the previous lateral equals the clamp, so it reads as a
      // graze rather than a second spin.
      const freshHit = Math.abs(previousLateral) < wallLateral;
      car.lateral = Math.max(-wallLateral, Math.min(wallLateral, car.lateral));
      if (
        freshHit &&
        section.type !== "straight" &&
        !isSpinning(car) &&
        car.speed > wallSpinMinSpeed
      ) {
        // Ran clean off the road into the outside barrier mid-corner: a big
        // loss and a spin. This is the only hard shake in a turn, and it cannot
        // fire until the car is past the kerb and genuinely into the wall.
        car.speed *= wallHitSpeedFactor;
        car.mode = "spinning";
        car.spinTimer = spinSeconds;
      } else {
        // A graze, or scraping the barrier down a straight, only bleeds speed.
        car.speed = Math.max(0, car.speed - brakeRate * 0.75 * dt);
      }
      if (car.isPlayer) events.playerWallContact = true;
    }

    car.distance += car.speed * dt;
  }

  /* ---- The CPU driver ----------------------------------------------------- */

  private cpuInputs(field: RaceField, car: CarState): RaceInputs {
    let brake = this.shouldBrake(
      field,
      car,
      maxCornerError * (1 - car.strength) * car.cornerNoise,
    );

    // Steering: ease toward the racing line, and defend the inside on straights.
    let target = this.racingLineLateral(field, car);
    const section = field.circuit.sections[car.sectionIndex];
    if (section.type === "straight" && car.strength > 0.5) {
      const attacker = this.attackerBehind(field, car);
      if (attacker !== null && this.random.nextDouble() < car.strength * 0.03) {
        // An occasional covering move toward the attacker's side.
        const limit = trackHalfWidth * 0.8;
        car.targetLateral = Math.max(-limit, Math.min(limit, attacker.lateral));
      }
      if (car.targetLateral !== 0) target = car.targetLateral;
    } else {
      car.targetLateral = 0;
    }

    // Never plough into a slower car ahead: pull to the free side — which on a
    // straight doubles as the overtake — and lift when right on its gearbox.
    const blocker = this.blockerAhead(field, car);
    if (blocker !== null) {
      if (section.type === "straight") {
        const passSide = blocker.lateral >= car.lateral ? -1 : 1;
        const wanted = car.lateral + passSide * carWidth * 1.6;
        target = Math.max(-trackHalfWidth, Math.min(trackHalfWidth, wanted));
      }
      if (blocker.distance - car.distance < carLength * 1.4) brake = true;
    }

    const delta = target - car.lateral;
    const steer =
      Math.abs(delta) < 0.25
        ? 0
        : Math.sign(delta) * Math.min(1, Math.abs(delta) / 2);
    return { steer, throttle: !brake, brake };
  }

  /**
   * The nearest meaningfully slower car directly ahead within a couple of car
   * lengths — the one this driver has to steer around or lift for.
   */
  private blockerAhead(field: RaceField, car: CarState): CarState | null {
    let nearest: CarState | null = null;
    let nearestGap = Number.POSITIVE_INFINITY;
    for (const other of field.cars) {
      if (other === car || isFinished(other)) continue;
      const gap = other.distance - car.distance;
      if (gap <= 0 || gap > carLength * 3) continue;
      if (Math.abs(other.lateral - car.lateral) > carWidth * 1.3) continue;
      if (other.speed > car.speed - 1) continue;
      if (gap < nearestGap) {
        nearest = other;
        nearestGap = gap;
      }
    }
    return nearest;
  }

  /**
   * A stopping-distance check against the next corner. `errorFactor` inflates
   * the speed this driver believes is safe — a weak one arrives hot and pays
   * for it in the corner resolution.
   */
  private shouldBrake(
    field: RaceField,
    car: CarState,
    errorFactor: number,
  ): boolean {
    const sections = field.circuit.sections;
    const lapLength = lapLengthOf(field.circuit);
    const localDistance = lapLocalDistance(lapLength, car.distance);
    const index = car.sectionIndex;
    const current = sections[index];
    const believed = (safe: number) => safe * (1 + errorFactor);

    // Already inside a corner and over the TRUE safe speed: back off. The error
    // inflation applies only to the entry lookahead below, so a weak driver
    // still brakes late and arrives hot — but no car holds the throttle pinned
    // above the grip limit and slowly runs itself off onto the grass.
    const currentSafe = current.safeSpeed;
    if (currentSafe !== null && car.speed > currentSafe) return true;

    // Look ahead to the next corner within braking range, wrapping across the
    // start/finish line on a multi-lap race. Every circuit opens with a long
    // straight, so the wrap never brakes for anything before the actual finish.
    for (
      let step = currentSafe !== null ? 1 : 0;
      step < sections.length;
      step += 1
    ) {
      const i = (index + step) % sections.length;
      let distanceTo = field.sectionStarts[i] - localDistance;
      if (i < index || (i === index && step > 0)) distanceTo += lapLength;
      if (distanceTo > 450) break;
      const nextSafe = sections[i].safeSpeed;
      if (nextSafe === null) continue;
      const target = believed(nextSafe);
      if (car.speed <= target) break;
      const need =
        (car.speed * car.speed - target * target) / (2 * brakeRate) +
        car.speed * 0.15;
      if (need >= distanceTo) return true;
      break;
    }
    return false;
  }

  /**
   * Where the racing line wants the car: the apex on the inside through a
   * corner or a chicane, the middle of the road down a straight.
   */
  private racingLineLateral(field: RaceField, car: CarState): number {
    const section: TrackSection = field.circuit.sections[car.sectionIndex];
    if (section.type === "straight") return 0;
    if (section.type === "corner") {
      const insideSign = section.direction === "left" ? -1 : 1;
      return insideSign * trackHalfWidth * 0.55;
    }
    // A chicane flicks to the entry side and then across; the entry side for
    // the first half and the exit side for the second is close enough.
    const start = field.sectionStarts[car.sectionIndex];
    const local = lapLocalDistance(lapLengthOf(field.circuit), car.distance);
    const t = (local - start) / section.length;
    const entrySign = section.direction === "left" ? -1 : 1;
    return (t < 0.5 ? entrySign : -entrySign) * trackHalfWidth * 0.45;
  }

  private attackerBehind(field: RaceField, car: CarState): CarState | null {
    let nearest: CarState | null = null;
    let nearestGap = Number.POSITIVE_INFINITY;
    for (const other of field.cars) {
      if (other === car || isFinished(other)) continue;
      const gap = car.distance - other.distance;
      if (gap > 0 && gap < slipstreamMax && gap < nearestGap) {
        nearest = other;
        nearestGap = gap;
      }
    }
    return nearest;
  }

  /* ---- Contact ------------------------------------------------------------ */

  private resolveContacts(
    field: RaceField,
    dt: number,
    events: RaceTickEvents,
  ): void {
    const ordered = [...field.cars].sort((a, b) => a.distance - b.distance);
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const rear = ordered[i];
      const front = ordered[i + 1];
      if (isFinished(rear) || isFinished(front)) continue;
      if (front.distance - rear.distance > carLength) continue;
      if (Math.abs(front.lateral - rear.lateral) > carWidth) continue;

      // Contact costs both cars speed — it is a downside, not a weapon. Two
      // CPUs touching is softened: full contact physics is a player experience,
      // and left unsoftened it bunches a strong field into slow contact trains.
      const playerInvolved = rear.isPlayer || front.isPlayer;
      const softening = playerInvolved ? 1.0 : 0.35;
      const closing = rear.speed - front.speed;
      rear.speed = Math.max(0, rear.speed - contactRearDecel * softening * dt);
      front.speed = Math.max(0, front.speed - contactFrontDecel * softening * dt);

      const push = (rear.lateral <= front.lateral ? -1 : 1) * contactPushRate * dt;
      rear.lateral = clampLateral(rear.lateral + push);
      front.lateral = clampLateral(front.lateral - push);

      if (closing > heavyContactClosingSpeed && !isSpinning(rear)) {
        rear.mode = "spinning";
        // A contact spin is lighter than a wall smash: a shorter spin and much
        // less speed lost, so a heavy rear-end is a setback, not a race-ender.
        rear.spinTimer = spinSeconds * 0.7;
        rear.speed = Math.min(rear.speed, front.speed * 0.78);
      }
      if (playerInvolved) events.playerContact = true;
    }
  }

  /* ---- The line ----------------------------------------------------------- */

  private detectFinishes(field: RaceField, events: RaceTickEvents): void {
    const raceLength = raceLengthOf(field);
    for (const car of field.cars) {
      if (isFinished(car) || car.distance < raceLength) continue;
      // Sub-tick interpolation, so the classification is fair.
      const overshoot = car.distance - raceLength;
      const overshootMs = car.speed > 0 ? (overshoot / car.speed) * 1000 : 0;
      car.mode = "finished";
      car.finishTimeMs = field.raceClockMs - overshootMs;
      if (car.isPlayer) events.playerCrossedLine = true;
    }
  }
}

function clampLateral(value: number): number {
  return value < -wallLateral ? -wallLateral : value > wallLateral ? wallLateral : value;
}

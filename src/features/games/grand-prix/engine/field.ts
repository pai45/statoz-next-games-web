import { cpuSmartness, fieldSize, gridGap, jumpStartCutSeconds, trackHalfWidth } from "../tuning";
import { lapLengthOf, type GrandPrixCircuit, type GrandPrixLivery, type LaunchGrade, type OvertakeEvent } from "../types";
import { cpuLiveries } from "../data/liveries";

import { cumulativeSectionStarts } from "./geometry";
import type { RaceRandom } from "./random";

/**
 * The grid, and what happens to it at lights out.
 *
 * A car is a distance along the lap centerline plus a lateral offset from it,
 * and the whole field is a flat list of them. Nothing here knows about drawing.
 */

export type CarMode = "racing" | "spinning" | "finished";

export type CarState = {
  index: number;
  isPlayer: boolean;
  name: string;
  livery: GrandPrixLivery;

  /** Metres along the lap; negative while still on the grid. */
  distance: number;
  /** Metres from the centerline; negative is left. */
  lateral: number;
  speed: number;
  sectionIndex: number;
  mode: CarMode;
  spinTimer: number;
  throttleCutTimer: number;
  launchBoostTimer: number;
  launchAccelFactor: number;
  slipstreaming: boolean;
  finishTimeMs: number;

  /* CPU personality, seeded at build. The player leaves these at zero. */
  /** `cpuSmartness(level)` with per-car spread. */
  strength: number;
  /** A small ± on top speed. */
  paceJitter: number;
  /** 0..1 — how hot this driver is willing to enter a corner. */
  cornerNoise: number;
  targetLateral: number;
};

export function isFinished(car: CarState): boolean {
  return car.mode === "finished";
}

export function isSpinning(car: CarState): boolean {
  return car.mode === "spinning";
}

export function isOnGrass(car: CarState): boolean {
  return Math.abs(car.lateral) > trackHalfWidth;
}

export type RaceInputs = {
  /** −1 hard left through +1 hard right. */
  steer: number;
  throttle: boolean;
  brake: boolean;
};

export const idleInputs: RaceInputs = { steer: 0, throttle: false, brake: false };

/**
 * Everything fixed at the moment a race is created. One seed rebuilds the whole
 * field, which is what makes a race reproducible.
 */
export type RaceSetup = {
  circuit: GrandPrixCircuit;
  playerLivery: GrandPrixLivery;
  playerLevel: number;
  /** The grid slot, P8 through P16. */
  startPosition: number;
  seed: number;
  laps: number;
};

export type RaceField = {
  circuit: GrandPrixCircuit;
  cars: CarState[];
  sectionStarts: number[];
  laps: number;
  raceClockMs: number;
  /**
   * How long the player has been below the stuck threshold without a break.
   * Resets the instant they are moving again.
   */
  playerStuckSeconds: number;
  player: CarState;
};

/** The finish line's position on the distance axis. */
export function raceLengthOf(field: RaceField): number {
  return lapLengthOf(field.circuit) * field.laps;
}

/** One plus the number of cars ahead. Finishers rank by time and always lead. */
export function positionOf(field: RaceField, car: CarState): number {
  let ahead = 0;
  for (const other of field.cars) {
    if (other === car) continue;
    if (isFinished(car)) {
      if (isFinished(other) && other.finishTimeMs < car.finishTimeMs) ahead += 1;
    } else if (isFinished(other) || other.distance > car.distance) {
      ahead += 1;
    }
  }
  return 1 + ahead;
}

/* ---- Launch grading ------------------------------------------------------- */

export function gradeLaunch(reactionMs: number): LaunchGrade {
  if (reactionMs < 150) return "perfect";
  if (reactionMs < 300) return "great";
  if (reactionMs < 500) return "good";
  return "slow";
}

export type LaunchBoost = {
  initialSpeed: number;
  accelFactor: number;
  boostSeconds: number;
};

/**
 * What a launch grade is worth: a rolling start speed off the line and a
 * temporary acceleration multiplier. A jump start gets neither — its throttle
 * cut is applied separately.
 */
export function launchBoost(grade: LaunchGrade): LaunchBoost {
  switch (grade) {
    case "perfect":
      return { initialSpeed: 14, accelFactor: 1.5, boostSeconds: 3.0 };
    case "great":
      return { initialSpeed: 10, accelFactor: 1.35, boostSeconds: 2.5 };
    case "good":
      return { initialSpeed: 7, accelFactor: 1.2, boostSeconds: 2.0 };
    case "slow":
      return { initialSpeed: 2, accelFactor: 1.0, boostSeconds: 0 };
    case "jump":
      return { initialSpeed: 0, accelFactor: 1.0, boostSeconds: 0 };
  }
}

/** A CPU reaction sample: a stronger field launches better, and never jumps. */
export function sampleCpuReactionMs(strength: number, random: RaceRandom): number {
  const bestMs = 140 + (1 - strength) * 160;
  const spreadMs = 120 + (1 - strength) * 240;
  return Math.round(bestMs + random.nextDouble() * spreadMs);
}

/* ---- Construction --------------------------------------------------------- */

function makeCar(car: Partial<CarState> & Pick<CarState, "index" | "isPlayer" | "name" | "livery" | "distance" | "lateral">): CarState {
  return {
    speed: 0,
    sectionIndex: 0,
    mode: "racing",
    spinTimer: 0,
    throttleCutTimer: 0,
    launchBoostTimer: 0,
    launchAccelFactor: 1.0,
    slipstreaming: false,
    finishTimeMs: -1,
    strength: 0,
    paceJitter: 0,
    cornerNoise: 0,
    targetLateral: 0,
    ...car,
  };
}

export function buildField(
  setup: RaceSetup,
  driverNames: string[],
  random: RaceRandom,
): RaceField {
  const baseStrength = cpuSmartness(setup.playerLevel);
  const rivalLiveries = cpuLiveries(setup.playerLivery);

  const cars: CarState[] = [];
  let cpuCount = 0;
  for (let slot = 1; slot <= fieldSize; slot += 1) {
    const isPlayerCar = slot === setup.startPosition;
    // A staggered two-wide grid behind the start line.
    const gridDistance = -gridGap * slot;
    const gridLateral = slot % 2 === 1 ? -1.8 : 1.8;
    if (isPlayerCar) {
      cars.push(
        makeCar({
          index: cars.length,
          isPlayer: true,
          name: "YOU",
          livery: setup.playerLivery,
          distance: gridDistance,
          lateral: gridLateral,
        }),
      );
    } else {
      const strength = baseStrength + (random.nextDouble() - 0.5) * 0.3;
      cars.push(
        makeCar({
          index: cars.length,
          isPlayer: false,
          name: driverNames[cpuCount],
          livery: rivalLiveries[cpuCount % rivalLiveries.length],
          distance: gridDistance,
          lateral: gridLateral,
          strength: strength < 0 ? 0 : strength > 1 ? 1 : strength,
          paceJitter: (random.nextDouble() - 0.5) * 0.04,
          cornerNoise: 0.2 + random.nextDouble() * 0.8,
        }),
      );
      cpuCount += 1;
    }
  }

  const player = cars.find((car) => car.isPlayer);
  if (player === undefined) {
    throw new Error("Grand Prix field built without a player car.");
  }

  return {
    circuit: setup.circuit,
    cars,
    sectionStarts: cumulativeSectionStarts(setup.circuit.sections),
    laps: setup.laps,
    raceClockMs: 0,
    playerStuckSeconds: 0,
    player,
  };
}

/**
 * Lights out. The player's graded boost — or their jump-start throttle cut —
 * and a sampled reaction for every other car on the grid.
 */
export function applyLaunch(
  field: RaceField,
  playerGrade: LaunchGrade,
  random: RaceRandom,
): void {
  for (const car of field.cars) {
    const grade = car.isPlayer
      ? playerGrade
      : gradeLaunch(sampleCpuReactionMs(car.strength, random));
    const boost = launchBoost(grade);
    car.speed = boost.initialSpeed;
    car.launchBoostTimer = boost.boostSeconds;
    car.launchAccelFactor = boost.accelFactor;
    if (car.isPlayer && grade === "jump") {
      car.throttleCutTimer = jumpStartCutSeconds;
    }
  }
}

/* ---- What one tick reports ------------------------------------------------ */

/**
 * The coarse per-tick events — everything the HUD and the session care about.
 * High-frequency values such as speed and exact distances are read straight off
 * the field instead, which is why they are absent here.
 */
export type RaceTickEvents = {
  /** Set only when it changed. */
  playerPosition: number | null;
  overtakes: OvertakeEvent[];
  playerWallContact: boolean;
  playerContact: boolean;
  playerTireScrub: boolean;
  playerCrossedLine: boolean;
  /** The player stayed stuck past the timeout — the race is over. */
  playerStuckOut: boolean;
};

export function emptyTickEvents(): RaceTickEvents {
  return {
    playerPosition: null,
    overtakes: [],
    playerWallContact: false,
    playerContact: false,
    playerTireScrub: false,
    playerCrossedLine: false,
    playerStuckOut: false,
  };
}

/** What the race reports when the player's day ends, one way or the other. */
export type PlayerRaceOutcome = {
  position: number;
  lapTimeMs: number;
  /** The highest-placed car the player passed on track. */
  bestOvertakeName: string | null;
  /** True when they never finished — stuck, and timed out. */
  dnf: boolean;
};

/**
 * Grand Prix Dash — the domain model, ported from `models/grand_prix.dart`.
 *
 * Pure data: the circuit geometry, the race result, and the persisted lifetime
 * record. Nothing here imports React or touches a canvas, so the simulation and
 * the differential harness can both read it.
 */

export type GrandPrixCircuitId =
  | "harbourStreet"
  | "desertMile"
  | "emeraldPark"
  | "mountainPass"
  | "coastalSprint";

export const grandPrixCircuitIds: GrandPrixCircuitId[] = [
  "harbourStreet",
  "desertMile",
  "emeraldPark",
  "mountainPass",
  "coastalSprint",
];

/**
 * The seven constructor liveries. These ids are the Shop's — `shopLiveries` in
 * `mocks/shop/catalog.ts` sells exactly these, at exactly these names — so what
 * a player buys is what the car wears, with no translation table in between.
 */
export type GrandPrixLivery =
  | "gridLine"
  | "scarlet"
  | "silverArrow"
  | "papaya"
  | "midnight"
  | "racingGreen"
  | "skyBlue";

export const grandPrixLiveryIds: GrandPrixLivery[] = [
  "gridLine",
  "scarlet",
  "silverArrow",
  "papaya",
  "midnight",
  "racingGreen",
  "skyBlue",
];

export type TrackSectionType = "straight" | "corner" | "chicane";
export type CornerDirection = "left" | "right";

/** Off the line: how close to lights-out the throttle came. */
export type LaunchGrade = "perfect" | "great" | "good" | "slow" | "jump";

export type GrandPrixVerdict = "win" | "podium" | "points" | "finished";

export function grandPrixVerdict(position: number): GrandPrixVerdict {
  if (position === 1) return "win";
  if (position <= 3) return "podium";
  if (position <= 10) return "points";
  return "finished";
}

export function grandPrixCircuitFromName(
  name: string | null | undefined,
): GrandPrixCircuitId {
  return grandPrixCircuitIds.find((id) => id === name) ?? "emeraldPark";
}

export function grandPrixLiveryFromName(
  name: string | null | undefined,
): GrandPrixLivery {
  return grandPrixLiveryIds.find((livery) => livery === name) ?? "gridLine";
}

/**
 * One stretch of track.
 *
 * The simulation is 1D — a distance along the lap plus a lateral offset — so a
 * corner reaches the physics only through `safeSpeed`, and reaches the pixels
 * only through `bend`, the sideways shift of the drawn centerline.
 */
export type TrackSection = {
  type: TrackSectionType;
  /** Section length in metres. */
  length: number;
  /** Entry flick direction; null on a straight. */
  direction: CornerDirection | null;
  /** Maximum clean entry speed (m/s); null on a straight. */
  safeSpeed: number | null;
  /** Overspeed above `safeSpeed` beyond which entry means wall contact. */
  wallThreshold: number;
  /** How far the centerline slides sideways through the section (m). */
  bend: number;
};

export function straight(length: number): TrackSection {
  return {
    type: "straight",
    length,
    direction: null,
    safeSpeed: null,
    wallThreshold: 14,
    bend: 0,
  };
}

export function corner(options: {
  length: number;
  direction: CornerDirection;
  safeSpeed: number;
  wallThreshold?: number;
  bend?: number;
}): TrackSection {
  return {
    type: "corner",
    length: options.length,
    direction: options.direction,
    safeSpeed: options.safeSpeed,
    wallThreshold: options.wallThreshold ?? 14,
    bend: options.bend ?? 24,
  };
}

export function chicane(options: {
  length: number;
  direction: CornerDirection;
  safeSpeed: number;
  wallThreshold?: number;
  bend?: number;
}): TrackSection {
  return {
    type: "chicane",
    length: options.length,
    direction: options.direction,
    safeSpeed: options.safeSpeed,
    wallThreshold: options.wallThreshold ?? 12,
    bend: options.bend ?? 14,
  };
}

export function isStraight(section: TrackSection): boolean {
  return section.type === "straight";
}

/** Signed bend: negative is left, positive right — the lateral axis's sense. */
export function signedBend(section: TrackSection): number {
  return section.direction === "left" ? -section.bend : section.bend;
}

export type GrandPrixCircuit = {
  id: GrandPrixCircuitId;
  name: string;
  /** Short type tag: STREET, SPEEDWAY, BALANCED… */
  character: string;
  /** The one-line lobby description. */
  flavor: string;
  difficultyStars: number;
  sections: TrackSection[];
};

export function lapLengthOf(circuit: GrandPrixCircuit): number {
  return circuit.sections.reduce((sum, section) => sum + section.length, 0);
}

/** One pass, kept for the result screen's MVP-move beat. */
export type OvertakeEvent = {
  overtakenName: string;
  /** The position the pass took — lower is a better move. */
  overtakenPosition: number;
  atDistance: number;
};

export type GrandPrixResult = {
  position: number;
  fieldSize: number;
  startPosition: number;
  /** Total race time over every lap; on a sprint, the lap time. */
  lapTimeMs: number;
  personalBest: boolean;
  launchGrade: LaunchGrade;
  circuit: GrandPrixCircuitId;
  xp: number;
  /** The distance the result was set over. */
  laps: number;
  bestOvertakeName: string | null;
  /** The player got stuck and timed out — a DNF, shown as GAME OVER. */
  retired: boolean;
};

export function placesGained(result: GrandPrixResult): number {
  return result.startPosition - result.position;
}

/** A lap time in ms as `m:ss.mmm`, or `--:--.---` when unset. */
export function formatLapTime(lapTimeMs: number | null | undefined): string {
  if (lapTimeMs === null || lapTimeMs === undefined || lapTimeMs <= 0) {
    return "--:--.---";
  }
  const minutes = Math.trunc(lapTimeMs / 60000);
  const seconds = Math.trunc((lapTimeMs % 60000) / 1000);
  const millis = lapTimeMs % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/* ---- Progression ---------------------------------------------------------- */

/** Longer races multiply the position payout. */
export function grandPrixXpMultiplier(laps: number): number {
  if (laps >= 5) return 3;
  if (laps >= 3) return 2;
  return 1;
}

/**
 * An arcade race pays by finishing position: a one-lap win matches Football
 * Chess's ceiling, a backmarker finish still earns a little, and a new personal
 * best on this circuit and distance adds three.
 */
export function calculateGrandPrixXp(
  position: number,
  options: { personalBest?: boolean; laps?: number } = {},
): number {
  const { personalBest = false, laps = 1 } = options;
  const base =
    position === 1
      ? 26
      : position === 2
        ? 22
        : position === 3
          ? 18
          : position <= 6
            ? 12
            : position <= 10
              ? 8
              : 4;
  return base * grandPrixXpMultiplier(laps) + (personalBest ? 3 : 0);
}

import type { Lane, Progress, Side } from "./types";

export const lanes: readonly Lane[] = ["left", "center", "right"];

export const zoneNames: Record<Progress, string> = {
  1: "OWN BOX",
  2: "OWN EDGE",
  3: "OWN THIRD",
  4: "OWN HALF",
  5: "THEIR HALF",
  6: "THEIR THIRD",
  7: "THEIR EDGE",
  8: "THEIR BOX",
};

export const laneNames: Record<Lane, string> = { left: "LEFT", center: "CENTRE", right: "RIGHT" };

export function opposite(side: Side): Side {
  return side === "home" ? "away" : "home";
}

export function clampProgress(value: number): Progress {
  return Math.min(8, Math.max(1, Math.round(value))) as Progress;
}

/** Ballers' lane rule: both boxes are centre-only. */
export function normalizeLane(progress: Progress, lane: Lane): Lane {
  return progress === 1 || progress === 8 ? "center" : lane;
}

export function isWing(lane: Lane): boolean {
  return lane !== "center";
}

export function oppositeWing(lane: Lane): Lane {
  return lane === "left" ? "right" : "left";
}

/** The same spot seen from the other team: the ladder flips, lanes stay put. */
export function mirror(progress: Progress): Progress {
  return (9 - progress) as Progress;
}

/**
 * Absolute pitch position, 1–8 left to right, for the minimap. Home attacks
 * right, so home progress is the position and away progress is mirrored.
 */
export function absoluteX(side: Side, progress: Progress): number {
  return side === "home" ? progress : 9 - progress;
}

export function band(progress: Progress): "build" | "attack" {
  return progress >= 6 ? "attack" : "build";
}

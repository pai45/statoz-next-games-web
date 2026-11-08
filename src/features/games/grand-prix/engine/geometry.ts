import {
  isStraight,
  lapLengthOf,
  signedBend,
  type GrandPrixCircuit,
  type TrackSection,
} from "../types";

/**
 * Where the road is.
 *
 * The simulation is one-dimensional, so all of this serves two purposes only:
 * telling the physics which section a car is in, and telling the renderer how
 * far sideways the centerline has wandered by a given distance. The car's
 * lateral offset is measured from that centerline, which is why the two must
 * agree exactly — a renderer that drew a different bend would show the car
 * drifting off a road the physics thinks it is on.
 */

/** Running start distance of each section, in lap-local metres. */
export function cumulativeSectionStarts(sections: TrackSection[]): number[] {
  const starts: number[] = [];
  let travelled = 0;
  for (const section of sections) {
    starts.push(travelled);
    travelled += section.length;
  }
  return starts;
}

/** Which section a lap-local distance falls in. */
export function sectionAt(
  sectionStarts: number[],
  sections: TrackSection[],
  s: number,
): number {
  if (s <= 0) return 0;
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    if (s >= sectionStarts[i]) return i;
  }
  return 0;
}

function smoothstep(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/**
 * Distance within the current lap. Grid distances — negative, behind the line —
 * pass through untouched so a car on the grid still resolves to section zero.
 */
export function lapLocalDistance(lapLength: number, distance: number): number {
  return distance <= 0 ? distance : distance % lapLength;
}

/**
 * The sideways world offset of the centerline at lap distance `s`.
 *
 * A straight holds its offset, a corner eases across by its signed bend, and a
 * chicane swings out and back for a net shift of zero.
 */
export function centerlineX(
  circuit: GrandPrixCircuit,
  sectionStarts: number[],
  s: number,
): number {
  let x = 0;
  const lapLength = lapLengthOf(circuit);
  const clamped = s < 0 ? 0 : s > lapLength ? lapLength : s;
  for (let i = 0; i < circuit.sections.length; i += 1) {
    const section = circuit.sections[i];
    const start = sectionStarts[i];
    const end = start + section.length;
    if (clamped <= start) break;
    const within = clamped < start ? start : clamped > end ? end : clamped;
    const t = (within - start) / section.length;
    if (section.type === "corner") {
      x += signedBend(section) * smoothstep(t);
    } else if (section.type === "chicane") {
      // Out by half the bend, then back — a net shift of nothing.
      x += signedBend(section) * Math.sin(t * Math.PI) * 0.5;
    }
  }
  return x;
}

/**
 * The multi-lap centerline: continuous across the start/finish line, so cars on
 * different laps agree on where the road is. Every completed lap contributes a
 * whole lap's shift and the current one adds the usual offset.
 */
export function raceCenterlineX(
  circuit: GrandPrixCircuit,
  sectionStarts: number[],
  s: number,
): number {
  if (s <= 0) return 0;
  const lapLength = lapLengthOf(circuit);
  const lap = Math.trunc(s / lapLength);
  const local = s - lap * lapLength;
  if (lap === 0) return centerlineX(circuit, sectionStarts, local);
  return (
    lap * centerlineX(circuit, sectionStarts, lapLength) +
    centerlineX(circuit, sectionStarts, local)
  );
}

export { isStraight };

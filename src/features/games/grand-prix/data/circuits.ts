import {
  chicane,
  corner,
  straight,
  type GrandPrixCircuit,
  type GrandPrixCircuitId,
} from "../types";

/**
 * The five-circuit calendar, ported from `data/grand_prix_circuits.dart`.
 *
 * The names are archetypes rather than real circuits. Lengths are metres and
 * speeds are m/s: the engine tops out near 88 m/s, so a safe speed of 24 is a
 * hairpin and 64 is a flat-out sweeper. Street sections carry a low
 * `wallThreshold`, which is why overcooking one there means barrier rather than
 * run-off.
 */
export const grandPrixCircuits: GrandPrixCircuit[] = [
  {
    id: "harbourStreet",
    name: "HARBOUR STREET",
    character: "STREET",
    flavor: "Slow corners, punishing walls. Hard to pass.",
    difficultyStars: 4,
    sections: [
      straight(400),
      corner({ length: 75, direction: "left", safeSpeed: 26, wallThreshold: 8, bend: 21 }),
      straight(180),
      corner({ length: 69, direction: "right", safeSpeed: 24, wallThreshold: 8, bend: 18 }),
      straight(240),
      chicane({ length: 113, direction: "left", safeSpeed: 24, wallThreshold: 8, bend: 18 }),
      straight(160),
      corner({ length: 81, direction: "right", safeSpeed: 28, wallThreshold: 8, bend: 21 }),
      corner({ length: 75, direction: "left", safeSpeed: 25, wallThreshold: 8, bend: 18 }),
      straight(320),
      corner({ length: 88, direction: "right", safeSpeed: 30, wallThreshold: 8, bend: 23 }),
      straight(150),
      corner({ length: 69, direction: "left", safeSpeed: 23, wallThreshold: 8, bend: 18 }),
      straight(200),
      corner({ length: 75, direction: "right", safeSpeed: 26, wallThreshold: 8, bend: 20 }),
      straight(340),
    ],
  },
  {
    id: "desertMile",
    name: "DESERT MILE",
    character: "SPEEDWAY",
    flavor: "Endless straights, heavy slipstream. Overtaking festival.",
    difficultyStars: 2,
    sections: [
      straight(900),
      corner({ length: 175, direction: "right", safeSpeed: 60, bend: 44 }),
      straight(780),
      corner({ length: 150, direction: "right", safeSpeed: 55, bend: 39 }),
      straight(950),
      chicane({ length: 163, direction: "right", safeSpeed: 34, bend: 18 }),
      straight(700),
      corner({ length: 188, direction: "right", safeSpeed: 58, bend: 44 }),
      straight(730),
    ],
  },
  {
    id: "emeraldPark",
    name: "EMERALD PARK",
    character: "BALANCED",
    flavor: "An even mix of straights and corners. The classic.",
    difficultyStars: 3,
    sections: [
      straight(420),
      corner({ length: 113, direction: "right", safeSpeed: 45, bend: 34 }),
      straight(300),
      corner({ length: 100, direction: "left", safeSpeed: 38, bend: 29 }),
      straight(520),
      corner({ length: 138, direction: "right", safeSpeed: 52, bend: 39 }),
      corner({ length: 113, direction: "left", safeSpeed: 40, bend: 31 }),
      straight(260),
      chicane({ length: 150, direction: "left", safeSpeed: 30, bend: 18 }),
      straight(340),
      corner({ length: 125, direction: "right", safeSpeed: 45, bend: 34 }),
      straight(300),
      corner({ length: 88, direction: "left", safeSpeed: 33, bend: 23 }),
      straight(380),
    ],
  },
  {
    id: "mountainPass",
    name: "MOUNTAIN PASS",
    character: "TECHNICAL",
    flavor: "Chicanes and quick flicks. Rewards braking control.",
    difficultyStars: 4,
    sections: [
      straight(460),
      chicane({ length: 138, direction: "right", safeSpeed: 32, bend: 18 }),
      straight(220),
      corner({ length: 94, direction: "left", safeSpeed: 34, bend: 26 }),
      corner({ length: 88, direction: "right", safeSpeed: 31, bend: 23 }),
      straight(300),
      chicane({ length: 150, direction: "left", safeSpeed: 29, bend: 18 }),
      straight(260),
      corner({ length: 106, direction: "right", safeSpeed: 38, bend: 29 }),
      chicane({ length: 138, direction: "right", safeSpeed: 31, bend: 18 }),
      straight(280),
      corner({ length: 113, direction: "left", safeSpeed: 36, bend: 29 }),
      corner({ length: 75, direction: "right", safeSpeed: 28, bend: 21 }),
      straight(500),
    ],
  },
  {
    id: "coastalSprint",
    name: "COASTAL SPRINT",
    character: "FLOWING",
    flavor: "Fast sweepers, one big stop. Carry the speed.",
    difficultyStars: 3,
    sections: [
      straight(450),
      corner({ length: 175, direction: "right", safeSpeed: 62, bend: 39 }),
      straight(280),
      corner({ length: 188, direction: "left", safeSpeed: 58, bend: 39 }),
      straight(360),
      corner({ length: 200, direction: "right", safeSpeed: 64, bend: 44 }),
      corner({ length: 150, direction: "left", safeSpeed: 55, bend: 34 }),
      straight(420),
      corner({ length: 113, direction: "right", safeSpeed: 42, bend: 29 }),
      straight(300),
      corner({ length: 188, direction: "left", safeSpeed: 60, bend: 39 }),
      straight(380),
    ],
  },
];

export function grandPrixCircuit(id: GrandPrixCircuitId): GrandPrixCircuit {
  return (
    grandPrixCircuits.find((circuit) => circuit.id === id) ??
    grandPrixCircuits[2]
  );
}

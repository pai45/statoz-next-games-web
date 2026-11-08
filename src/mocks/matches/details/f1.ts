import type { F1ClassificationRow, F1RaceReport } from "@/domain/matches";

import racePackage from "../../snapshots/card-game/f1-italian-gp.json";

type RawClassification = {
  position: number;
  driverId: string;
  constructor?: string;
  teamColor?: string;
  grid?: number;
  status?: { description?: string };
  stats: Record<string, Array<string | number>>;
};

function driver(id: string) {
  return racePackage.drivers[id as keyof typeof racePackage.drivers];
}

function constructor(id: string) {
  return racePackage.constructors[id as keyof typeof racePackage.constructors];
}

function row(raw: unknown): F1ClassificationRow {
  const entry = raw as RawClassification;
  const athlete = driver(String(entry.driverId));
  const team = athlete ? constructor(athlete.constructorId) : undefined;
  const stats = entry.stats;
  return {
    position: entry.position,
    driverId: String(entry.driverId),
    name: athlete?.displayName ?? `Driver ${entry.driverId}`,
    constructor: entry.constructor ?? team?.displayName ?? "—",
    color: `#${entry.teamColor || team?.color || "5cdfff"}`,
    grid: entry.grid ?? entry.position,
    status: entry.status?.description ?? "Classified",
    gap: String(stats.behindTime?.[1] ?? stats.behindLaps?.[1] ?? stats.totalTime?.[1] ?? ""),
    fastestLap: stats.fastestLap?.[1] === undefined ? undefined : String(stats.fastestLap[1]),
    pitStops: stats.pitsTaken?.[0] === undefined ? undefined : Number(stats.pitsTaken[0]),
  };
}

const sessions = racePackage.sessions.map((session) => ({
  id: String(session.id),
  label: session.type.abbreviation,
  classification: session.classification.map(row),
}));
const race = sessions.find((session) => session.label === "Race")?.classification ?? [];
const qualifying = sessions.find((session) => session.label === "Qual")?.classification
  ?? sessions.find((session) => session.label.toLowerCase().includes("qual"))?.classification
  ?? [];
const raceDriverIds = new Set(race.map((entry) => entry.driverId));
const weekendTicks = sessions.map((session) => session.label === "Race" ? "FIN" : session.label);

export const italianGpReport: F1RaceReport = {
  id: racePackage.race.id,
  name: racePackage.race.name,
  abbreviation: racePackage.race.abbreviation,
  season: racePackage.race.season,
  circuit: {
    fullName: racePackage.race.circuit.fullName,
    asset: "/assets/motorsport/monza-circuit.svg",
    laps: racePackage.race.circuit.laps,
    turns: racePackage.race.circuit.turns,
    lengthKm: racePackage.race.circuit.lengthKm,
    distanceKm: racePackage.race.circuit.distanceKm,
    direction: racePackage.race.circuit.direction,
    established: racePackage.race.circuit.established,
    lapRecord: racePackage.race.circuit.lapRecord.time,
    lapRecordDriver: driver(racePackage.race.circuit.lapRecord.driverId)?.displayName ?? "Unknown",
  },
  winner: race[0],
  pole: qualifying[0] ?? race.reduce((best, entry) => entry.grid < best.grid ? entry : best, race[0]),
  biggestGain: race.reduce((best, entry) => entry.grid - entry.position > best.grid - best.position ? entry : best, race[0]),
  race,
  sessions,
  weekendTicks,
  weekendDrivers: race.slice(0, 8).filter((entry) => raceDriverIds.has(entry.driverId)).map((entry) => ({
    id: entry.driverId,
    name: entry.name,
    abbreviation: driver(entry.driverId)?.abbreviation ?? entry.name.slice(0, 3).toUpperCase(),
    constructor: entry.constructor,
    color: entry.color,
    positions: sessions.map((session) => session.classification.find((candidate) => candidate.driverId === entry.driverId)?.position ?? 23),
  })),
};

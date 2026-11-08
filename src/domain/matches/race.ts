export type F1WeekendDriver = {
  id: string;
  name: string;
  abbreviation: string;
  constructor: string;
  color: string;
  positions: number[];
};

export type F1ClassificationRow = {
  position: number;
  driverId: string;
  name: string;
  constructor: string;
  color: string;
  grid: number;
  status: string;
  gap?: string;
  fastestLap?: string;
  pitStops?: number;
};

export type F1SessionResult = {
  id: string;
  label: string;
  classification: F1ClassificationRow[];
};

export type F1RaceReport = {
  id: string;
  name: string;
  abbreviation: string;
  season: number;
  circuit: {
    fullName: string;
    asset: string;
    laps: number;
    turns: number;
    lengthKm: number;
    distanceKm: number;
    direction: string;
    established: number;
    lapRecord: string;
    lapRecordDriver: string;
  };
  winner: F1ClassificationRow;
  pole: F1ClassificationRow;
  biggestGain: F1ClassificationRow;
  race: F1ClassificationRow[];
  sessions: F1SessionResult[];
  weekendTicks: string[];
  weekendDrivers: F1WeekendDriver[];
};

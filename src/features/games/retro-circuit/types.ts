/** Portable runtime contracts. No app stores, navigation, React or Three.js. */
export const BUILD_VERSION = "0.11.0-car-motion";
export const RULES_VERSION = 107;
export const STEP = 1 / 60;
export type TrackId = "coast" | "desert" | "city" | "vegas" | "harbour" | "night";
export type VehicleId = "vector" | "comet" | "kestrel" | "nomad";
export type RacePhase = "ready" | "countdown" | "racing" | "paused" | "finished" | "dnf";
export type RaceInput = { left: boolean; right: boolean; throttle: boolean; brake: boolean; nitro: boolean };
export const neutralInput = (): RaceInput => ({ left: false, right: false, throttle: false, brake: false, nitro: false });
export type TrackSector = { length: number; curve: number; scenery: "palms" | "rocks" | "buildings" | "lamps" };
export type TrackDefinition = { id: TrackId; profile?: "arcade" | "reference"; biome?: "desert" | "coast" | "city"; evidence?: string; name: string; description: string; sectors: readonly TrackSector[]; length: number; laps: 3; pit: { start: number; end: number }; sky: string; ground: string; verge: string; horizon: string; road: [string,string]; difficulty: string; elevation: [number,number,number]; controlPoints: readonly (readonly number[])[]; obstacles: readonly TrackObstacle[] };
export type TrackObstacle={id:string;s:number;x:number;kind:'cone'|'barrel'|'barrier'|'rock';radius:number};
export type VehicleDefinition = { id: VehicleId; name: string; role: string; maxSpeed: number; acceleration: number; grip: number; fuelRate: number; color: string; silhouette: "coupe" | "wedge" | "hatch" | "tourer" };
export type CarState = { pitLockUntil:number;steering:number;decisionTime:number; id: number; vehicle: VehicleId; distance: number; x: number; speed: number; fuel: number; nitro: number; boost: number; collisionCooldown: number; finishedAt: number | null; dnf: boolean; pitStops: number; inPit: boolean; pitRequested: boolean; pitFilled: boolean; targetX: number; skill: number; checkpoint: number; lapStart: number; lapTimes: number[] };
export type RaceEvent = { type: "countdown" | "go" | "nitro" | "collision" | "pit" | "refuel" | "skid" | "low-fuel" | "lap" | "finish" | "dnf"; time: number };
export type RaceResult = { schemaVersion: 1; sessionId: string; gameId: "retro-circuit"; buildVersion: string; rulesVersion: number; trackId: TrackId; vehicleId: VehicleId; outcome: "finished" | "dnf"; position: number; fieldSize: 20; elapsed: number; laps: number[]; pitStops: number; seed: number };
export type RaceSnapshot = { phase: RacePhase; elapsed: number; countdown: number; sequenceTime:number; player: CarState; cars: CarState[]; position: number; lap: number; notice: string; result: RaceResult | null };
export type RuntimeOptions = { trackId: TrackId; vehicleId: VehicleId; seed: number; sessionId: string; practice?: boolean; autoThrottle?: boolean };

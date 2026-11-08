export type { Point, World, Ball, Facing, Direction, View, Pose, AssetManifest, GameSettings, GameDefinition, Contact } from './common';
import type { Point, Ball, Facing, Direction, GameSettings, Contact, View } from './common';
export type Team = 0 | 1;
export interface Action {
    tackleStyle?: 'standing' | 'slide';
    kind: 'pass' | 'loft' | 'shot' | 'tackle' | 'throw' | 'control' | 'stagger';
    age: number;
    targetPlayer?: number;
    target: Point;
    released: boolean;
    cancelled?: boolean;
    hit: boolean;
    direction: Point;
}
export interface KeeperCycle { age:number; dropped:boolean; punted:boolean; releaseTick:number; }
export interface Player extends Point {
    strideDistance?: number;
    keeperCycle?: KeeperCycle;
    id: number;
    team: Team;
    role: 'outfield' | 'keeper';
    slot: number;
    facing: Facing;
    moving: boolean;
    motionAge: number;
    home: Point;
    action: Action | null;
    cooldown: number;
    decisionTick: number;
    aiCarryY?: number;
    contactView?: {
        view: View;
        ticks: number;
    };
}
export interface Restart {
    kind: 'kickoff' | 'throw-in' | 'corner' | 'goal-kick' | 'free-kick' | 'penalty';
    team: Team;
    point: Point;
    taker: number;
    age: number;
}
export interface AirDelivery {
    kicker: number;
    target: number | null;
    spot: Point;
    age: number;
    controlledBy: number | null;
}
export interface ShotView {
    direction: number;
    phase: 'aim' | 'windup' | 'flight' | 'parry' | 'goal';
    shooter: number;
    keeper: number;
    team: Team;
    aim: Point;
    age: number;
    depthScale: number;
    planeY: number;
}
export interface MatchState {
    aerial: AirDelivery | null;
    shotView: ShotView | null;
    airContacts: [
        number,
        number
    ];
    airCollections: [
        number,
        number
    ];
    status: 'ready' | 'playing' | 'paused' | 'halftime' | 'complete';
    phase: 'restart' | 'open' | 'goal';
    tick: number;
    eventSerial: number;
    round: number;
    seed: number;
    half: 1 | 2;
    halfTicks: number;
    score: [
        number,
        number
    ];
    players: Player[];
    selected: number;
    owner: number | null;
    ball: Ball;
    lastTouch: Team;
    lastKicker: number | null;
    releaseTick: number;
    restart: Restart | null;
    goalAge: number;
    held: Record<Direction, boolean>;
    inputSources: Record<Direction, string[]>;
    events: Contact[];
    message: string;
    passes: [
        number,
        number
    ];
    shots: [
        number,
        number
    ];
    saves: [
        number,
        number
    ];
    possessionTicks: [
        number,
        number
    ];
    camera: Point;
    pendingKickoff: Team;
    noDoubleTouch: number | null;
    lastContact: Contact | null;
}
export type Command = {
    type: 'start' | 'pause' | 'resume' | 'clear' | 'A' | 'B' | 'C' | 'pass' | 'loft' | 'shoot' | 'tackle' | 'switch' | 'slide' | 'next';
} | {
    type: 'hold';
    key: Direction;
    value: boolean;
    source: string;
};
export interface FootballResult {
    schemaVersion: 2;
    gameId: 'retro-football';
    mode: 'exhibition';
    outcome: 'win' | 'loss' | 'draw';
    airContacts: [
        number,
        number
    ];
    airCollections: [
        number,
        number
    ];
    score: [
        number,
        number
    ];
    halves: 2;
    activeSeconds: number;
    passes: [
        number,
        number
    ];
    shots: [
        number,
        number
    ];
    saves: [
        number,
        number
    ];
    rulesVersion: string;
    runtimeVersion: string;
    assetVersion: string;
}
export interface GameContext {
    onReady?: (session: GameSession) => void;
    onSettingsChange?: (settings: GameSettings) => void;
    onResult?: (result: FootballResult) => void;
    onExit?: () => void;
    onError?: (message: string) => void;
    onEvent?: (event: Readonly<Contact>) => void;
    settings?: Partial<GameSettings>;
}
export interface GameSession {
    start(): void;
    pause(): void;
    resume(): void;
    restart(): void;
    setSettings(settings: Partial<GameSettings>): void;
    dispose(): void;
}
export const DEFINITION = { id: 'retro-football', runtimeVersion: '0.11.0', rulesVersion: 'exhibition-explicit-controls-v1', assetVersion: 'football-chance-atlas-v2', simulationHz: 60 } as const;

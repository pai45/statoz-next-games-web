import { generateDriverNames } from "../data/drivers";
import {
  fieldSize,
  maxFrameSeconds,
  stuckTimeout,
  subStepSeconds,
} from "../tuning";
import { lapLengthOf, type LaunchGrade, type OvertakeEvent } from "../types";

import { GrandPrixEngine } from "./engine";
import {
  applyLaunch,
  buildField,
  isFinished,
  positionOf,
  type CarState,
  type PlayerRaceOutcome,
  type RaceField,
  type RaceInputs,
  type RaceSetup,
} from "./field";
import { raceRandom } from "./random";

/**
 * One race, from the grid to the flag.
 *
 * This is Flutter's `GrandPrixGame` with the drawing taken out. It owns the
 * field, the fixed-step accumulator, and the player's held inputs; the canvas
 * reads its state directly every frame, and React only hears about the coarse
 * beats — a position change, a pass, the flag.
 *
 * The split matters: the simulation runs at 120 Hz and a React tree cannot.
 */

export type RaceContactKind = "wall" | "car";

export class GrandPrixRace {
  readonly setup: RaceSetup;
  readonly field: RaceField;
  readonly reducedMotion: boolean;

  private readonly engine: GrandPrixEngine;
  private readonly listeners = new Set<() => void>();
  private readonly overtakeListeners = new Set<(event: OvertakeEvent) => void>();
  private readonly finishListeners = new Set<(outcome: PlayerRaceOutcome) => void>();

  private running = false;
  private finishedReported = false;
  private accumulator = 0;
  private bestOvertake: OvertakeEvent | null = null;

  private left = false;
  private right = false;
  private throttle = false;
  private brake = false;

  /**
   * Contact since the last frame, for the canvas to throw sparks from. Drained
   * rather than published, because it is scenery and must never cost a React
   * render.
   */
  private pendingContact: RaceContactKind | null = null;

  /** Reads the pending contact and clears it, in one move. */
  takeContact(): RaceContactKind | null {
    const contact = this.pendingContact;
    this.pendingContact = null;
    return contact;
  }

  constructor(setup: RaceSetup, reducedMotion: boolean) {
    this.setup = setup;
    this.reducedMotion = reducedMotion;
    const fieldRandom = raceRandom(setup.seed);
    this.field = buildField(
      setup,
      generateDriverNames(fieldSize - 1, fieldRandom),
      fieldRandom,
    );
    // A second stream, so the drivers' in-race decisions cannot be predicted
    // from the grid that was dealt — the app salts the same way.
    this.engine = new GrandPrixEngine(raceRandom(setup.seed ^ 0x51f15eed));
  }

  get player(): CarState {
    return this.field.player;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Lights out: the graded launches land and the simulation arms. */
  start(playerGrade: LaunchGrade): void {
    if (this.running || this.finishedReported) return;
    applyLaunch(this.field, playerGrade, raceRandom(this.setup.seed ^ 0x1a));
    this.running = true;
    this.publish();
  }

  stop(): void {
    this.running = false;
    this.publish();
  }

  /* ---- Inputs ------------------------------------------------------------- */

  setInput(
    input: Partial<{ left: boolean; right: boolean; throttle: boolean; brake: boolean }>,
  ): void {
    if (input.left !== undefined) this.left = input.left;
    if (input.right !== undefined) this.right = input.right;
    if (input.throttle !== undefined) this.throttle = input.throttle;
    if (input.brake !== undefined) this.brake = input.brake;
    this.publish();
  }

  releaseAll(): void {
    this.left = false;
    this.right = false;
    this.throttle = false;
    this.brake = false;
    this.publish();
  }

  get held(): { left: boolean; right: boolean; throttle: boolean; brake: boolean } {
    return {
      left: this.left,
      right: this.right,
      throttle: this.throttle,
      brake: this.brake,
    };
  }

  private get playerInputs(): RaceInputs {
    return {
      steer: (this.right ? 1 : 0) - (this.left ? 1 : 0),
      throttle: this.throttle,
      brake: this.brake,
    };
  }

  /* ---- The clock ---------------------------------------------------------- */

  /**
   * Advances the race by one animation frame.
   *
   * The frame is clamped and then spent in fixed substeps, so a dropped frame
   * cannot tunnel a braking zone and a backgrounded tab cannot resolve half a
   * race the moment it comes back.
   */
  step(rawSeconds: number): void {
    if (!this.running) return;
    this.accumulator += Math.min(rawSeconds, maxFrameSeconds);
    let changed = false;
    while (this.accumulator >= subStepSeconds && this.running) {
      this.accumulator -= subStepSeconds;
      const events = this.engine.tick(this.field, this.playerInputs, subStepSeconds);

      for (const overtake of events.overtakes) {
        if (
          this.bestOvertake === null ||
          overtake.overtakenPosition < this.bestOvertake.overtakenPosition
        ) {
          this.bestOvertake = overtake;
        }
        for (const listener of this.overtakeListeners) listener(overtake);
      }

      if (events.playerWallContact) {
        this.pendingContact = "wall";
      } else if (events.playerContact && this.pendingContact === null) {
        this.pendingContact = "car";
      }

      if (events.playerCrossedLine && !this.finishedReported) {
        this.finishedReported = true;
        this.running = false;
        const player = this.player;
        this.report({
          position: positionOf(this.field, player),
          lapTimeMs: Math.round(player.finishTimeMs),
          bestOvertakeName: this.bestOvertake?.overtakenName ?? null,
          dnf: false,
        });
      }

      if (events.playerStuckOut && !this.finishedReported) {
        // Stuck too long. Classified last, with no lap time to show for it.
        this.finishedReported = true;
        this.running = false;
        this.report({
          position: fieldSize,
          lapTimeMs: 0,
          bestOvertakeName: null,
          dnf: true,
        });
      }
      changed = true;
    }
    if (changed) this.publish();
  }

  private report(outcome: PlayerRaceOutcome): void {
    for (const listener of this.finishListeners) listener(outcome);
  }

  /* ---- What the HUD can see ----------------------------------------------- */

  view(): RaceView {
    const player = this.player;
    const lapLength = lapLengthOf(this.field.circuit);
    let currentLap: number;
    let lapProgress: number;
    if (isFinished(player)) {
      currentLap = this.field.laps;
      lapProgress = 1;
    } else {
      const lapIndex =
        player.distance <= 0
          ? 0
          : Math.min(this.field.laps - 1, Math.trunc(player.distance / lapLength));
      currentLap = lapIndex + 1;
      const raw = (player.distance - lapIndex * lapLength) / lapLength;
      lapProgress = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    }
    return {
      position: positionOf(this.field, player),
      speedKph: Math.round(player.speed * 3.6),
      lapProgress: Math.round(lapProgress * 200) / 200,
      currentLap,
      slipstreaming: player.slipstreaming,
      held: this.held,
      stuckSeconds: this.running
        ? Math.round(Math.min(this.field.playerStuckSeconds, stuckTimeout) * 10) / 10
        : 0,
      running: this.running,
    };
  }

  /* ---- Subscription -------------------------------------------------------- */

  onState(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onOvertake(listener: (event: OvertakeEvent) => void): () => void {
    this.overtakeListeners.add(listener);
    return () => this.overtakeListeners.delete(listener);
  }

  onFinished(listener: (outcome: PlayerRaceOutcome) => void): () => void {
    this.finishListeners.add(listener);
    return () => this.finishListeners.delete(listener);
  }

  private publish(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Everything the HUD is allowed to know, quantised so a hair moves nothing. */
export type RaceView = {
  position: number;
  speedKph: number;
  lapProgress: number;
  currentLap: number;
  slipstreaming: boolean;
  /**
   * Which pads are down. Published rather than kept in the deck's own state so
   * a key held on a desktop keyboard lights the same plate a thumb does.
   */
  held: { left: boolean; right: boolean; throttle: boolean; brake: boolean };
  stuckSeconds: number;
  running: boolean;
};

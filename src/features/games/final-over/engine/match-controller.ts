/**
 * The sole gameplay authority — the web port of the `final_over` package's
 * `application/match_controller.dart`.
 *
 * Rendering may send commands and observe state, but it never mutates score or
 * simulation data. Time enters through `step`, which feeds a fixed 60 Hz
 * accumulator, so the same seed and the same inputs always produce the same
 * over no matter what frame rate the browser managed.
 *
 * Flutter publishes state and events through broadcast `StreamController`s;
 * this takes plain listener callbacks, which is the same contract without
 * pulling a stream library into the bundle.
 */

import { bowlerAttack } from "../data/bowlers";
import {
  fieldLayoutFor,
  targetMaximum,
  targetMinimum,
  targetOptions,
  type GameplayTuning,
} from "../tuning";
import {
  addVectors,
  ballAtContact,
  canConfigureShot,
  canSwing,
  canTurnBack,
  currentBowler,
  currentOver,
  deliveryIsLegal,
  distanceBetween,
  emptyLedger,
  idleRunner,
  isProductiveContact as resultIsProductiveContact,
  isTerminal,
  isWicket as resultIsWicket,
  ledgerTotalRuns,
  lerpVectors,
  madeContact,
  normalizeVector,
  scaleVector,
  score as stateScore,
  subtractVectors,
  vectorLength,
  zeroVector,
  type BallKinematics,
  type BallResult,
  type BowlerProfile,
  type ContactOutcome,
  type ContactType,
  type DeliveryLedger,
  type DeliverySpec,
  type Elevation,
  type ExtraType,
  type FielderState,
  type FieldVector,
  type MatchPhase,
  type MatchState,
  type ObjectiveType,
  type RiskLevel,
  type ShotDirection,
  type SwingIntent,
  type TimingGrade,
} from "../types";

import type { GameCommand, GameplayEvent } from "./commands";
import { generateDelivery } from "./delivery-generator";
import { DeterministicRandom, randomForStream } from "./random";
import {
  boundaryValue,
  catchChance,
  chargeFor,
  historyToken,
  isRunOut,
  launchBall,
  nextCombo,
  reactionDelay,
  resolveContact as resolveContactOutcome,
  riskForMargin,
  selectChasers,
  starsForWin,
  stepBall,
  updateObjective,
} from "./resolvers";

const microsPerSecond = 1000000;

/**
 * Dart's `double.round()` rounds away from zero; JavaScript's `Math.round`
 * rounds towards positive infinity. They disagree on every negative half, and
 * the swing timing error is routinely negative — so this is not cosmetic.
 */
function dartRound(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

function firstOrNull<T>(values: readonly T[]): T | null {
  return values.length > 0 ? values[0] : null;
}

export function initialMatchState(): MatchState {
  return {
    matchSeed: 0,
    target: 48,
    phase: "idle",
    suspendedPhase: null,
    committedScore: 0,
    legalBalls: 0,
    physicalDeliveries: 0,
    wickets: 0,
    pendingRuns: 0,
    pendingExtras: 0,
    pendingBatRuns: 0,
    freeHit: false,
    currentDeliveryFreeHit: false,
    combo: 1,
    powerSegments: 0,
    powerShotArmed: false,
    selectedElevation: "ground",
    selectedDirection: "straight",
    objective: "completeDouble",
    objectiveProgress: 0,
    objectiveCompleted: false,
    stars: 0,
    simulationMicros: 0,
    phaseElapsedMicros: 0,
    currentDelivery: null,
    swingIntent: null,
    contactOutcome: null,
    ball: null,
    cameraTransition: 0,
    runner: idleRunner,
    fielders: [],
    ledger: emptyLedger,
    history: [],
    lastResult: null,
    deliveryFinalized: false,
    canRun: false,
    holdRequested: false,
    ballHeld: false,
    pickupDecisionMicros: 0,
    throwArrivalMicros: 0,
    endReason: null,
    maximumLegalBalls: 18,
    ballsPerOver: 6,
    maximumOvers: 3,
    bowlerIndex: 0,
    bowlers: bowlerAttack,
  };
}

export type StateListener = (state: MatchState) => void;
export type EventListener = (event: GameplayEvent) => void;

export class MatchController {
  readonly tuning: GameplayTuning;

  private state: MatchState = initialMatchState();
  private accumulatorMicros = 0;
  private disposed = false;
  private deliveries: DeliverySpec[] = [];
  private primaryChaserId: number | null = null;
  private backupChaserId: number | null = null;
  private catchResolved = false;

  private stateListeners = new Set<StateListener>();
  private eventListeners = new Set<EventListener>();

  constructor(tuning: GameplayTuning) {
    this.tuning = tuning;
  }

  getState(): MatchState {
    return this.state;
  }

  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  dispose(): void {
    this.disposed = true;
    this.stateListeners.clear();
    this.eventListeners.clear();
  }

  /* ---- Lifecycle -------------------------------------------------------- */

  /**
   * Starts at the intro. `target` is injectable from 32–66 for tests and debug
   * tooling; production callers omit it so the seeded ladder picks.
   *
   * Note the short-circuit: when a target is supplied the ladder draw never
   * happens, which shifts every later draw on this stream. That is the Dart
   * behaviour and the balance tooling depends on it.
   */
  startMatch(seed: number, target?: number | null): void {
    this.ensureAlive();
    if (target != null && (target < targetMinimum || target > targetMaximum)) {
      throw new RangeError(
        `target must be between ${targetMinimum} and ${targetMaximum}, got ${target}`,
      );
    }
    this.accumulatorMicros = 0;
    this.deliveries = [];
    this.resetTransientSimulation();

    const selectionRandom = randomForStream(seed, 0, "objective");
    const selectedTarget = target ?? selectionRandom.choose(targetOptions);

    const objectives: ObjectiveType[] = [];
    if (selectedTarget >= 8) objectives.push("twoBoundaries");
    if (selectedTarget >= 6) objectives.push("sixRunsFirstThreeLegalBalls");
    objectives.push("completeDouble");

    const objective = selectionRandom.choose(objectives);
    const bowlers = this.shuffleBowlers(selectionRandom);
    const openingField = fieldLayoutFor(seed, 1);

    this.setState({
      ...initialMatchState(),
      matchSeed: seed,
      target: selectedTarget,
      phase: "matchIntro",
      objective,
      fielders: openingField.fielders,
      maximumLegalBalls: this.tuning.maximumLegalBalls,
      ballsPerOver: this.tuning.ballsPerOver,
      maximumOvers: this.tuning.maximumOvers,
      bowlerIndex: 0,
      bowlers,
    });

    this.emit({
      type: "matchStarted",
      simulationMicros: this.state.simulationMicros,
      seed,
      target: selectedTarget,
      objective,
      bowler: bowlers[0].name,
    });
  }

  /** Fisher-Yates on the same stream the target and objective came from. */
  private shuffleBowlers(random: DeterministicRandom): BowlerProfile[] {
    const bowlers = [...bowlerAttack];
    for (let i = bowlers.length - 1; i > 0; i -= 1) {
      const j = random.nextInt(i + 1);
      const temporary = bowlers[i];
      bowlers[i] = bowlers[j];
      bowlers[j] = temporary;
    }
    return bowlers;
  }

  dispatch(command: GameCommand): void {
    this.ensureAlive();
    switch (command.type) {
      case "start":
        if (this.state.phase === "matchIntro") this.prepareDelivery();
        return;
      case "selectElevation":
        if (canConfigureShot(this.state)) {
          this.setState({ ...this.state, selectedElevation: command.elevation });
        }
        return;
      case "selectDirection":
        if (canConfigureShot(this.state)) {
          this.setState({ ...this.state, selectedDirection: command.direction });
        }
        return;
      case "swing":
        this.acceptSwing(
          command.direction,
          command.elevation ?? null,
          command.charge ?? null,
        );
        return;
      case "activatePowerShot":
        this.activatePowerShot();
        return;
      case "startRun":
        this.startRun();
        return;
      case "holdBall":
        this.holdBall();
        return;
      case "turnBack":
        this.turnBack();
        return;
      case "pause":
      case "appBackgrounded":
        this.pause();
        return;
      case "resume":
        this.resume();
        return;
      case "restart":
        this.startMatch(command.seed ?? this.state.matchSeed + 1, command.target);
        return;
      case "quitToHome":
        this.quit();
        return;
    }
  }

  /** Adds elapsed wall time to the deterministic fixed 60 Hz accumulator. */
  step(elapsedMicros: number): void {
    this.ensureAlive();
    if (elapsedMicros <= 0 || this.state.phase === "paused") return;
    const bounded = Math.min(elapsedMicros, this.tuning.maximumFrameMicros);
    this.accumulatorMicros += bounded;
    while (this.accumulatorMicros >= this.tuning.fixedStepMicros) {
      this.accumulatorMicros -= this.tuning.fixedStepMicros;
      this.fixedTick(this.tuning.fixedStepMicros);
    }
  }

  private fixedTick(micros: number): void {
    const phase = this.state.phase;
    if (
      isTerminal(this.state) ||
      phase === "idle" ||
      phase === "matchIntro" ||
      phase === "paused" ||
      phase === "quit"
    ) {
      return;
    }

    this.setState({
      ...this.state,
      simulationMicros: this.state.simulationMicros + micros,
      phaseElapsedMicros: this.state.phaseElapsedMicros + micros,
    });

    switch (this.state.phase) {
      case "deliveryPreparation":
        if (this.state.phaseElapsedMicros >= this.tuning.deliveryPreparationMicros) {
          this.enterPhase("bowlerRunUp");
        }
        return;
      case "bowlerRunUp":
        if (this.state.phaseElapsedMicros >= this.tuning.runUpMicros) {
          this.enterPhase("incomingBall");
          this.emit({
            type: "ballReleased",
            simulationMicros: this.state.simulationMicros,
            delivery: this.state.currentDelivery,
          });
        }
        return;
      case "incomingBall":
        this.advanceIncomingBall();
        return;
      case "contact":
        if (this.state.phaseElapsedMicros >= this.tuning.impactHoldMicros) {
          const contact = this.state.contactOutcome;
          if (contact !== null && madeContact(contact)) {
            this.launchContactedBall(contact);
          } else {
            this.finalizeDelivery();
          }
        }
        return;
      case "cameraTransition":
      case "fieldPlay":
      case "runDecision":
      case "runnersMoving":
      case "throwInProgress":
        this.advanceLiveBall(micros);
        return;
      case "deliveryResult":
        if (this.state.phaseElapsedMicros >= this.tuning.deliveryResultMicros) {
          this.enterPhase("betweenBalls");
        }
        return;
      case "betweenBalls":
        if (this.state.phaseElapsedMicros >= this.tuning.betweenBallsMicros) {
          this.prepareDelivery();
        }
        return;
      default:
        return;
    }
  }

  /* ---- The delivery ----------------------------------------------------- */

  private prepareDelivery(): void {
    if (isTerminal(this.state) || this.state.phase === "quit") return;

    const ordinal = this.state.physicalDeliveries + 1;
    const layout = fieldLayoutFor(this.state.matchSeed, ordinal);
    const expectedContact =
      this.state.simulationMicros +
      this.tuning.deliveryPreparationMicros +
      this.tuning.runUpMicros +
      this.tuning.incomingToContactMicros;

    const delivery = generateDelivery({
      matchSeed: this.state.matchSeed,
      physicalOrdinal: ordinal,
      legalBalls: this.state.legalBalls,
      score: stateScore(this.state),
      target: this.state.target,
      history: this.state.history,
      previousDeliveries: this.deliveries,
      expectedContactMicros: expectedContact,
      bowler: currentBowler(this.state),
      tuning: this.tuning,
    });
    this.deliveries.push(delivery);
    this.resetTransientSimulation();

    this.setState({
      ...this.state,
      phase: "deliveryPreparation",
      phaseElapsedMicros: 0,
      physicalDeliveries: ordinal,
      currentDelivery: delivery,
      currentDeliveryFreeHit: this.state.freeHit,
      swingIntent: null,
      contactOutcome: null,
      ball: null,
      cameraTransition: 0,
      runner: idleRunner,
      fielders: layout.fielders,
      ledger: emptyLedger,
      pendingRuns: 0,
      pendingExtras: 0,
      pendingBatRuns: 0,
      deliveryFinalized: false,
      canRun: false,
      holdRequested: false,
      ballHeld: false,
      pickupDecisionMicros: 0,
      throwArrivalMicros: 0,
      endReason: null,
    });

    this.emit({
      type: "deliveryPrepared",
      simulationMicros: this.state.simulationMicros,
      delivery,
    });
    if (ordinal > 1) {
      this.emit({
        type: "fieldLayoutChanged",
        simulationMicros: this.state.simulationMicros,
        id: layout.id,
        label: layout.label,
        deliveryOrdinal: ordinal,
      });
    }
  }

  private advanceIncomingBall(): void {
    const delivery = this.state.currentDelivery;
    if (delivery === null) return;
    const now = this.state.simulationMicros;

    if (now >= delivery.expectedContactMicros && !this.state.ledger.extraApplied) {
      if (delivery.extra !== "none") this.applyExtra(delivery.extra);
      if (isTerminal(this.state) || this.state.deliveryFinalized) return;
      if (delivery.extra === "wide") {
        // Wides are dead immediately: there is no wide running in this format.
        this.finalizeDelivery();
        return;
      }
    }

    const swing = this.state.swingIntent;
    if (swing !== null && now >= delivery.expectedContactMicros) {
      this.resolveContact(swing);
      return;
    }
    if (now >= delivery.expectedContactMicros + this.tuning.lateSwingGraceMicros) {
      this.resolveContact(null);
    }
  }

  private applyExtra(extra: ExtraType): void {
    if (this.state.ledger.extraApplied || extra === "none") return;
    const ledger: DeliveryLedger = {
      ...this.state.ledger,
      extraRuns: 1,
      extraApplied: true,
    };
    this.setState({ ...this.state, ledger, pendingExtras: 1 });
    this.emit({
      type: "extraAwarded",
      simulationMicros: this.state.simulationMicros,
      extra,
      runs: 1,
    });
    // A target-winning extra ends the delivery before contact or any later
    // wicket processing.
    if (stateScore(this.state) >= this.state.target) this.finalizeDelivery();
  }

  private acceptSwing(
    direction: ShotDirection,
    elevation: Elevation | null,
    charge: number | null,
  ): void {
    if (!canSwing(this.state)) return;

    const intent: SwingIntent = {
      direction,
      inputMicros: this.state.simulationMicros,
      powerShot: this.state.powerShotArmed,
      charge: charge === null ? null : Math.min(1, Math.max(0, charge)),
    };

    // The swing is the commit point: it chooses direction via the intent and
    // elevation here, bypassing the setup-phase gate. `resolveContact` reads
    // `selectedElevation`, so writing it now covers both the immediate and the
    // deferred resolution paths.
    this.setState({
      ...this.state,
      swingIntent: intent,
      selectedElevation: elevation ?? this.state.selectedElevation,
      powerShotArmed: intent.powerShot ? false : this.state.powerShotArmed,
      powerSegments: intent.powerShot ? 0 : this.state.powerSegments,
    });

    this.emit({
      type: "swingAccepted",
      simulationMicros: this.state.simulationMicros,
      direction,
      powerShot: intent.powerShot,
    });

    const delivery = this.state.currentDelivery;
    if (
      delivery !== null &&
      this.state.phase === "incomingBall" &&
      this.state.simulationMicros >= delivery.expectedContactMicros &&
      delivery.extra !== "wide"
    ) {
      this.resolveContact(intent);
    }
  }

  private resolveContact(swing: SwingIntent | null): void {
    if (
      this.state.phase !== "incomingBall" ||
      this.state.contactOutcome !== null ||
      this.state.deliveryFinalized
    ) {
      return;
    }
    const delivery = this.state.currentDelivery;
    if (delivery === null) return;

    const hasInput = swing !== null;
    const errorMs = hasInput
      ? dartRound((swing.inputMicros - delivery.expectedContactMicros) / 1000)
      : this.tuning.poorWindowMs + 1;

    const random = randomForStream(this.state.matchSeed, delivery.ordinal, "contact");
    const outcome = resolveContactOutcome({
      delivery,
      elevation: this.state.selectedElevation,
      direction: swing?.direction ?? "straight",
      timingErrorMs: errorMs,
      hasInput,
      powerShot: swing?.powerShot ?? false,
      random,
      charge: swing?.charge ?? null,
      tuning: this.tuning,
    });

    let ledger = this.state.ledger;
    const protectedDelivery =
      this.state.currentDeliveryFreeHit || delivery.extra === "noBall";
    if (outcome.type === "miss" && outcome.bowledThreat && !protectedDelivery) {
      ledger = { ...ledger, dismissal: "bowled" };
    }

    this.setState({
      ...this.state,
      phase: "contact",
      phaseElapsedMicros: 0,
      contactOutcome: outcome,
      ledger,
    });
    this.emit({
      type: "contactResolved",
      simulationMicros: this.state.simulationMicros,
      outcome,
    });
  }

  private launchContactedBall(contact: ContactOutcome): void {
    const ball = launchBall(contact, ballAtContact.position);
    const predicted = this.predictPosition(ball, 2.0);

    const fielders = this.state.fielders.map((fielder) => ({
      ...fielder,
      motion: "reacting" as const,
      reactionRemainingSeconds: reactionDelay(fielder, this.tuning),
    }));

    const chasers = selectChasers(fielders, predicted, this.tuning);
    this.primaryChaserId = chasers.primaryId;
    this.backupChaserId = chasers.backupId;

    this.setState({
      ...this.state,
      phase: "cameraTransition",
      phaseElapsedMicros: 0,
      ball,
      fielders,
      cameraTransition: 0,
      canRun: false,
    });
    this.emit({
      type: "cameraTransitionStarted",
      simulationMicros: this.state.simulationMicros,
      primaryFielder: this.primaryChaserId,
      backupFielder: this.backupChaserId,
    });
  }

  private predictPosition(initial: BallKinematics, seconds: number): FieldVector {
    let ball = initial;
    const steps = Math.max(1, dartRound(seconds * 60));
    for (let i = 0; i < steps; i += 1) {
      ball = stepBall(ball, 1 / 60, this.tuning);
      if (vectorLength(ball.position) >= this.tuning.boundaryRadius || ball.stopped) {
        break;
      }
    }
    return ball.position;
  }

  /* ---- The ball in play -------------------------------------------------- */

  private advanceLiveBall(micros: number): void {
    if (this.state.deliveryFinalized) return;
    if (this.advanceRunner(micros)) return;

    const seconds = micros / microsPerSecond;
    let camera = this.state.cameraTransition;
    if (camera < 1) {
      camera = Math.min(1, camera + micros / this.tuning.cameraTransitionMicros);
      this.setState({
        ...this.state,
        cameraTransition: camera,
        canRun:
          camera >= 0.7 &&
          !this.state.holdRequested &&
          !this.state.runner.active &&
          this.state.runner.completedRuns < this.tuning.maximumRuns,
      });
    }

    if (!this.state.ballHeld) {
      const currentBall = this.state.ball;
      if (currentBall === null) return;
      const nextBall = stepBall(currentBall, seconds, this.tuning);
      this.setState({ ...this.state, ball: nextBall });

      // Boundary is evaluated before pickup; an exact tie is a boundary.
      const contact = this.state.contactOutcome;
      if (contact === null) return;
      const boundary = boundaryValue(nextBall, contact.elevation, this.tuning);
      if (boundary > 0) {
        this.awardBoundary(boundary);
        return;
      }

      this.moveFielders(seconds);
      if (this.state.deliveryFinalized || this.state.ballHeld) return;
      this.resolveCatchOrPickup();
      if (this.state.deliveryFinalized) return;
    }

    if (this.state.ballHeld && !this.state.runner.active) {
      if (
        this.state.holdRequested ||
        this.state.runner.completedRuns >= this.tuning.maximumRuns ||
        (this.state.pickupDecisionMicros > 0 &&
          this.state.simulationMicros >= this.state.pickupDecisionMicros)
      ) {
        this.finalizeDelivery();
        return;
      }
    }

    if (this.state.canRun && !this.state.runner.active && !this.state.holdRequested) {
      this.setState({
        ...this.state,
        runner: { ...this.state.runner, risk: this.currentRisk() },
      });
    }

    if (this.state.cameraTransition >= 1 && this.state.phase === "cameraTransition") {
      this.enterPhase("fieldPlay");
    }
  }

  private moveFielders(seconds: number): void {
    const ball = this.state.ball;
    if (ball === null) return;

    const updated: FielderState[] = [];
    for (const fielder of this.state.fielders) {
      const isPrimary = fielder.id === this.primaryChaserId;
      const isBackup = fielder.id === this.backupChaserId;
      if (!isPrimary && !isBackup) {
        updated.push(fielder);
        continue;
      }

      const reaction = Math.max(0, fielder.reactionRemainingSeconds - seconds);
      if (reaction > 0) {
        updated.push({ ...fielder, reactionRemainingSeconds: reaction });
        continue;
      }

      // The backup does not chase the ball, it covers the angle behind it.
      const target = isPrimary
        ? ball.position
        : lerpVectors(fielder.homePosition, ball.position, 0.72);
      const delta = subtractVectors(target, fielder.position);
      const deltaLength = vectorLength(delta);
      const speed =
        this.tuning.fielderSpeed * (isPrimary ? 1 : this.tuning.backupSpeedFactor);
      const travel = Math.min(deltaLength, speed * seconds);
      const direction = deltaLength === 0 ? zeroVector : normalizeVector(delta);

      updated.push({
        ...fielder,
        position:
          deltaLength === 0
            ? fielder.position
            : addVectors(fielder.position, scaleVector(direction, travel)),
        velocity: deltaLength === 0 ? zeroVector : scaleVector(direction, speed),
        motion: isPrimary ? "chasing" : "backup",
        reactionRemainingSeconds: 0,
      });
    }
    this.setState({ ...this.state, fielders: updated });
  }

  private resolveCatchOrPickup(): void {
    const ball = this.state.ball;
    const delivery = this.state.currentDelivery;
    const contact = this.state.contactOutcome;
    if (ball === null || delivery === null || contact === null) return;

    const primary = this.state.fielders.find(
      (fielder) => fielder.id === this.primaryChaserId,
    );
    if (primary === undefined) return;

    const distance = distanceBetween(primary.position, ball.position);

    if (
      !this.catchResolved &&
      ball.aerial &&
      ball.height >= this.tuning.catchHeight &&
      distance <= this.tuning.catchRadius
    ) {
      this.catchResolved = true;
      const chance = catchChance({
        fielder: primary,
        contact,
        runningCatch: vectorLength(primary.velocity) > 0.02,
        arrivedEarly: distance < this.tuning.catchRadius * 0.55,
        tuning: this.tuning,
      });

      const catchRandom = randomForStream(
        this.state.matchSeed,
        delivery.ordinal,
        "catchOutcome",
      );
      if (catchRandom.nextBool(chance)) {
        const isProtected =
          this.state.currentDeliveryFreeHit || delivery.extra === "noBall";
        this.emit({
          type: "catchTaken",
          simulationMicros: this.state.simulationMicros,
          fielderId: primary.id,
          isProtected,
        });
        if (isProtected) {
          // A protected catch is just a pickup — the run-out is still live.
          this.pickUpBall(primary.id);
        } else {
          this.setState({
            ...this.state,
            ledger: { ...this.state.ledger, dismissal: "caught", completedRuns: 0 },
            pendingRuns: 0,
            runner: idleRunner,
          });
          this.finalizeDelivery();
        }
        return;
      }

      const dropRandom = randomForStream(this.state.matchSeed, delivery.ordinal, "drop");
      const retained = dropRandom.range(
        this.tuning.dropSpeedMinimum,
        this.tuning.dropSpeedMaximum,
      );
      this.setState({
        ...this.state,
        ball: {
          ...ball,
          velocity: scaleVector(ball.velocity, retained),
          height: 0,
          verticalVelocity: 0,
          aerial: false,
          firstBounceOccurred: true,
        },
      });
      this.emit({
        type: "catchDropped",
        simulationMicros: this.state.simulationMicros,
        fielderId: primary.id,
      });
      return;
    }

    if (!ball.aerial && distance <= this.tuning.ballPickupRadius) {
      this.pickUpBall(primary.id);
    }
  }

  private pickUpBall(fielderId: number): void {
    if (this.state.ballHeld || this.state.deliveryFinalized) return;

    const fielders = this.state.fielders.map((fielder) =>
      fielder.id === fielderId
        ? {
            ...fielder,
            hasBall: true,
            motion: "carrying" as const,
            velocity: zeroVector,
          }
        : fielder,
    );

    this.setState({
      ...this.state,
      fielders,
      ballHeld: true,
      ball:
        this.state.ball === null
          ? null
          : {
              ...this.state.ball,
              velocity: zeroVector,
              verticalVelocity: 0,
              aerial: false,
              stopped: true,
            },
      phase: this.state.runner.active ? "throwInProgress" : "runDecision",
      phaseElapsedMicros: 0,
      canRun:
        !this.state.holdRequested &&
        this.state.runner.completedRuns < this.tuning.maximumRuns,
      pickupDecisionMicros:
        this.state.simulationMicros + this.tuning.pickupDecisionMicros,
    });

    this.emit({
      type: "ballPickedUp",
      simulationMicros: this.state.simulationMicros,
      fielderId,
    });
    if (this.state.runner.active) this.startThrow(fielderId);
    if (this.state.holdRequested && !this.state.runner.active) this.finalizeDelivery();
  }

  private awardBoundary(boundary: number): void {
    this.setState({
      ...this.state,
      ledger: {
        ...this.state.ledger,
        batRuns: boundary,
        completedRuns: 0,
        boundary,
      },
      pendingBatRuns: boundary,
      pendingRuns: 0,
      runner: idleRunner,
      canRun: false,
    });
    this.emit({
      type: "boundary",
      simulationMicros: this.state.simulationMicros,
      runs: boundary,
    });
    this.finalizeDelivery();
  }

  /* ---- Running ----------------------------------------------------------- */

  private startRun(): void {
    if (
      !this.state.canRun ||
      this.state.runner.active ||
      this.state.holdRequested ||
      this.state.deliveryFinalized ||
      this.state.runner.completedRuns >= this.tuning.maximumRuns
    ) {
      return;
    }

    const runner = {
      ...this.state.runner,
      active: true,
      returning: false,
      runNumber: this.state.runner.completedRuns + 1,
      progress: 0,
      risk: this.currentRisk(),
    };

    this.setState({
      ...this.state,
      runner,
      canRun: false,
      phase: "runnersMoving",
      phaseElapsedMicros: 0,
      pickupDecisionMicros: 0,
    });
    this.emit({
      type: "runStarted",
      simulationMicros: this.state.simulationMicros,
      run: runner.runNumber,
    });

    if (this.state.ballHeld) {
      const holder = firstOrNull(this.state.fielders.filter((f) => f.hasBall));
      if (holder !== null) this.startThrow(holder.id);
    }
  }

  private startThrow(fielderId: number): void {
    if (!this.state.runner.active || this.state.throwArrivalMicros > 0) return;
    const holder = this.state.fielders.find((fielder) => fielder.id === fielderId);
    if (holder === undefined) return;

    const targetEnd: FieldVector =
      this.state.runner.runNumber % 2 !== 0 ? { x: 0, y: -0.21 } : { x: 0, y: 0.21 };
    const travelSeconds =
      distanceBetween(holder.position, targetEnd) / this.tuning.throwSpeed + 0.1;
    const arrival =
      this.state.simulationMicros + dartRound(travelSeconds * microsPerSecond);

    const fielders = this.state.fielders.map((fielder) =>
      fielder.id === fielderId ? { ...fielder, motion: "throwing" as const } : fielder,
    );

    this.setState({
      ...this.state,
      fielders,
      throwArrivalMicros: arrival,
      phase: "throwInProgress",
      phaseElapsedMicros: 0,
      runner: { ...this.state.runner, risk: this.currentRisk(arrival) },
    });
    this.emit({
      type: "throwStarted",
      simulationMicros: this.state.simulationMicros,
      fielderId,
      arrivalMicros: arrival,
    });
  }

  /** Returns true when the delivery ended inside this tick. */
  private advanceRunner(micros: number): boolean {
    const runner = this.state.runner;
    if (!runner.active) return false;

    const tickEnd = this.state.simulationMicros;
    const tickStart = tickEnd - micros;
    const durationMicros = dartRound(this.tuning.runDurationSeconds * microsPerSecond);
    const distanceRemaining = runner.returning ? runner.progress : 1 - runner.progress;
    const creaseMicros = tickStart + dartRound(distanceRemaining * durationMicros);
    const throwMicros = this.state.throwArrivalMicros;

    if (throwMicros > 0 && throwMicros <= tickEnd && isRunOut(throwMicros, creaseMicros)) {
      const elapsedFraction = (throwMicros - tickStart) / durationMicros;
      const progress = runner.returning
        ? Math.max(0, runner.progress - elapsedFraction)
        : Math.min(1, runner.progress + elapsedFraction);
      this.setState({
        ...this.state,
        runner: { ...runner, active: false, progress },
        ledger: { ...this.state.ledger, dismissal: "runOut" },
        canRun: false,
      });
      this.emit({
        type: "runOut",
        simulationMicros: this.state.simulationMicros,
        run: runner.runNumber,
      });
      this.finalizeDelivery();
      return true;
    }

    if (creaseMicros <= tickEnd) {
      if (runner.returning) {
        this.setState({
          ...this.state,
          runner: { ...runner, active: false, returning: false, progress: 0 },
          throwArrivalMicros: 0,
          phase: "runDecision",
          phaseElapsedMicros: 0,
          canRun: !this.state.holdRequested,
          pickupDecisionMicros: this.state.ballHeld
            ? tickEnd + this.tuning.pickupDecisionMicros
            : 0,
        });
        return false;
      }
      this.completeRun();
      return this.state.deliveryFinalized || isTerminal(this.state);
    }

    const delta = micros / durationMicros;
    const progress = runner.returning
      ? Math.max(0, runner.progress - delta)
      : Math.min(1, runner.progress + delta);
    this.setState({
      ...this.state,
      runner: { ...runner, progress, risk: this.currentRisk() },
    });
    return false;
  }

  private completeRun(): void {
    const completed = this.state.runner.completedRuns + 1;
    this.setState({
      ...this.state,
      ledger: { ...this.state.ledger, completedRuns: completed },
      pendingRuns: completed,
      runner: { ...idleRunner, completedRuns: completed },
      throwArrivalMicros: 0,
      phase: "runDecision",
      phaseElapsedMicros: 0,
      canRun: completed < this.tuning.maximumRuns && !this.state.holdRequested,
      pickupDecisionMicros: this.state.ballHeld
        ? this.state.simulationMicros + this.tuning.pickupDecisionMicros
        : 0,
    });
    this.emit({
      type: "runCompleted",
      simulationMicros: this.state.simulationMicros,
      run: completed,
    });

    // A completed winning run is authoritative before a later stump break.
    if (stateScore(this.state) >= this.state.target) {
      this.finalizeDelivery();
    } else if (this.state.ballHeld && completed >= this.tuning.maximumRuns) {
      this.finalizeDelivery();
    }
  }

  private currentRisk(knownThrowArrival?: number): RiskLevel {
    const durationMicros = dartRound(this.tuning.runDurationSeconds * microsPerSecond);
    const runner = this.state.runner;
    const remaining = runner.active
      ? runner.returning
        ? runner.progress
        : 1 - runner.progress
      : 1;
    const crease = this.state.simulationMicros + dartRound(remaining * durationMicros);
    const throwArrival =
      knownThrowArrival ??
      (this.state.throwArrivalMicros > 0
        ? this.state.throwArrivalMicros
        : this.estimatedThrowArrivalMicros());
    const margin = (throwArrival - crease) / microsPerSecond;
    return riskForMargin(margin, this.tuning);
  }

  private estimatedThrowArrivalMicros(): number {
    const ball = this.state.ball;
    if (ball === null) return this.state.simulationMicros + 2000000;

    const runNumber = this.state.runner.active
      ? this.state.runner.runNumber
      : this.state.runner.completedRuns + 1;
    const end: FieldVector =
      runNumber % 2 !== 0 ? { x: 0, y: -0.21 } : { x: 0, y: 0.21 };

    if (this.state.ballHeld) {
      const holder = firstOrNull(this.state.fielders.filter((f) => f.hasBall));
      const throwTime =
        distanceBetween(holder?.position ?? ball.position, end) / this.tuning.throwSpeed +
        0.1;
      return this.state.simulationMicros + dartRound(throwTime * microsPerSecond);
    }

    const primary = firstOrNull(
      this.state.fielders.filter((f) => f.id === this.primaryChaserId),
    );
    const chaser =
      primary ??
      this.state.fielders.reduce((a, b) =>
        distanceBetween(a.position, ball.position) <=
        distanceBetween(b.position, ball.position)
          ? a
          : b,
      );

    // Project the moving ball rather than treating its current position as a
    // stationary pickup point. The stationary estimate made every early run
    // look unsafe even when the ball was travelling into a gap.
    const predictedPickup = this.predictPosition(ball, 1.0);
    const pickup = Math.max(
      0.55,
      chaser.reactionRemainingSeconds +
        distanceBetween(chaser.position, predictedPickup) / this.tuning.fielderSpeed,
    );
    const throwTime = distanceBetween(predictedPickup, end) / this.tuning.throwSpeed + 0.1;
    return this.state.simulationMicros + dartRound((pickup + throwTime) * microsPerSecond);
  }

  private turnBack(): void {
    if (
      !canTurnBack(this.state.runner) ||
      this.state.runner.progress > this.tuning.turnBackLimit
    ) {
      return;
    }
    this.setState({
      ...this.state,
      runner: { ...this.state.runner, returning: true },
    });
    this.emit({
      type: "runnerTurnedBack",
      simulationMicros: this.state.simulationMicros,
      run: this.state.runner.runNumber,
    });
  }

  private holdBall(): void {
    if (
      this.state.deliveryFinalized ||
      !isLiveBallPhase(this.state.phase) ||
      this.state.runner.active
    ) {
      return;
    }
    this.setState({ ...this.state, holdRequested: true, canRun: false });
    // Before pickup, HOLD still lets a possible boundary finish.
    if (this.state.ballHeld || this.state.ball?.stopped === true) {
      this.finalizeDelivery();
    }
  }

  private activatePowerShot(): void {
    if (
      !canConfigureShot(this.state) ||
      this.state.powerSegments < this.tuning.powerShotSegments ||
      this.state.powerShotArmed
    ) {
      return;
    }
    this.setState({ ...this.state, powerShotArmed: true });
    this.emit({
      type: "powerShotActivated",
      simulationMicros: this.state.simulationMicros,
    });
  }

  /* ---- Settling the delivery --------------------------------------------- */

  private finalizeDelivery(): void {
    if (
      this.state.deliveryFinalized ||
      this.state.ledger.finalized ||
      this.state.currentDelivery === null
    ) {
      return;
    }

    const delivery = this.state.currentDelivery;
    const ledger: DeliveryLedger = { ...this.state.ledger, finalized: true };
    const contact = this.state.contactOutcome;
    const contactType: ContactType =
      contact === null || !contact.acceptedSwing ? "none" : contact.type;
    const timing: TimingGrade = contact === null ? "miss" : contact.timing;

    const token = historyToken({
      extra: delivery.extra,
      totalRuns: ledgerTotalRuns(ledger),
      batAndRunningRuns: ledger.batRuns + ledger.completedRuns,
      boundary: ledger.boundary,
      dismissal: ledger.dismissal,
    });

    const result: BallResult = {
      deliveryOrdinal: delivery.ordinal,
      legalBallsBefore: this.state.legalBalls,
      legal: deliveryIsLegal(delivery),
      extra: delivery.extra,
      extraRuns: ledger.extraRuns,
      runsOffBat: ledger.batRuns,
      completedRunningRuns: ledger.completedRuns,
      boundary: ledger.boundary,
      dismissal: ledger.dismissal,
      contactType,
      timing,
      freeHitDelivery: this.state.currentDeliveryFreeHit,
      historyToken: token,
    };

    const nextHistory = [...this.state.history, result];
    const legalBalls = this.state.legalBalls + (result.legal ? 1 : 0);
    const wickets = this.state.wickets + (resultIsWicket(result) ? 1 : 0);
    const committedScore = this.state.committedScore + ledgerTotalRuns(ledger);
    const objectiveUpdate = updateObjective(
      this.state.objective,
      this.state.objectiveProgress,
      result,
    );

    const increasedCombo = resultIsProductiveContact(result)
      ? Math.min(3, this.state.combo + 1)
      : this.state.combo;
    const charge = chargeFor(result, increasedCombo);
    const combo = resultIsWicket(result) ? 1 : nextCombo(this.state.combo, result);
    const powerSegments = Math.min(
      this.tuning.powerShotSegments,
      this.state.powerSegments + charge,
    );
    const nextFreeHit =
      delivery.extra === "noBall" ? true : delivery.extra === "wide" ? this.state.freeHit : false;

    // History and legal-ball consumption are committed before terminal checks.
    let next: MatchState = {
      ...this.state,
      committedScore,
      legalBalls,
      wickets,
      pendingRuns: 0,
      pendingExtras: 0,
      pendingBatRuns: 0,
      ledger,
      history: nextHistory,
      lastResult: result,
      deliveryFinalized: true,
      freeHit: nextFreeHit,
      combo,
      powerSegments,
      objectiveProgress: objectiveUpdate.progress,
      objectiveCompleted: objectiveUpdate.completed,
      runner: { ...idleRunner, completedRuns: ledger.completedRuns },
      canRun: false,
      throwArrivalMicros: 0,
      phase: "deliveryResult",
      phaseElapsedMicros: 0,
    };

    // Order matters: a chase completed on the same ball that lost the last
    // wicket is a win, and running out of balls is only checked after both.
    const won = committedScore >= next.target;
    const overComplete =
      result.legal && legalBalls > 0 && legalBalls % this.tuning.ballsPerOver === 0;

    if (won) {
      next = {
        ...next,
        phase: "won",
        stars: starsForWin({
          objectiveCompleted: objectiveUpdate.completed,
          legalBalls,
          wickets,
          maximumLegalBalls: this.tuning.maximumLegalBalls,
        }),
        endReason: "targetReached",
      };
    } else if (wickets >= this.tuning.maximumWickets) {
      next = { ...next, phase: "lost", endReason: "wicketsLost" };
    } else if (legalBalls >= this.tuning.maximumLegalBalls) {
      next = { ...next, phase: "lost", endReason: "ballsExhausted" };
    } else if (overComplete) {
      // Over complete — rotate to the next bowler before the next delivery.
      next = {
        ...next,
        bowlerIndex: Math.min(
          next.bowlerIndex + 1,
          Math.max(0, next.bowlers.length - 1),
        ),
      };
    }

    this.setState(next);
    this.emit({
      type: "deliveryCompleted",
      simulationMicros: this.state.simulationMicros,
      result,
    });
    if (resultIsWicket(result)) {
      this.emit({
        type: "wicket",
        simulationMicros: this.state.simulationMicros,
        dismissal: result.dismissal,
      });
    }
    if (overComplete && !isTerminal(next)) {
      const bowler = currentBowler(next);
      this.emit({
        type: "overComplete",
        simulationMicros: this.state.simulationMicros,
        over: Math.floor(legalBalls / this.tuning.ballsPerOver),
        nextOver: currentOver(next) + 1,
        bowler: bowler?.name ?? null,
        bowlerId: bowler?.id ?? null,
        lookKey: bowler?.lookKey ?? null,
        jerseyNumber: bowler?.jerseyNumber ?? null,
      });
    }
    if (isTerminal(next)) {
      this.emit({
        type: "matchEnded",
        simulationMicros: this.state.simulationMicros,
        won: next.phase === "won",
        reason: next.endReason,
        stars: next.stars,
      });
    }
  }

  /* ---- Pause, resume, quit ------------------------------------------------ */

  private pause(): void {
    const phase = this.state.phase;
    if (
      phase === "paused" ||
      isTerminal(this.state) ||
      phase === "idle" ||
      phase === "quit"
    ) {
      return;
    }
    this.setState({ ...this.state, suspendedPhase: phase, phase: "paused" });
    this.emit({ type: "paused", simulationMicros: this.state.simulationMicros });
  }

  private resume(): void {
    if (this.state.phase !== "paused" || this.state.suspendedPhase === null) return;
    this.setState({
      ...this.state,
      phase: this.state.suspendedPhase,
      suspendedPhase: null,
    });
    this.emit({ type: "resumed", simulationMicros: this.state.simulationMicros });
  }

  private quit(): void {
    if (this.state.phase === "quit") return;
    this.setState({ ...this.state, phase: "quit", endReason: "quit" });
    this.emit({ type: "quitToHome", simulationMicros: this.state.simulationMicros });
  }

  /* ---- Plumbing ----------------------------------------------------------- */

  private enterPhase(phase: MatchPhase): void {
    this.setState({ ...this.state, phase, phaseElapsedMicros: 0 });
  }

  private resetTransientSimulation(): void {
    this.primaryChaserId = null;
    this.backupChaserId = null;
    this.catchResolved = false;
  }

  private setState(state: MatchState): void {
    this.state = state;
    for (const listener of this.stateListeners) listener(state);
  }

  private emit(event: GameplayEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  private ensureAlive(): void {
    if (this.disposed) throw new Error("MatchController has been disposed");
  }
}

function isLiveBallPhase(phase: MatchPhase): boolean {
  return (
    phase === "cameraTransition" ||
    phase === "fieldPlay" ||
    phase === "runDecision" ||
    phase === "runnersMoving" ||
    phase === "throwInProgress"
  );
}

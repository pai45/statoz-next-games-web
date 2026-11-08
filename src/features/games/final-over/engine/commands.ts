/**
 * What the match can be told, and what it says back — the web port of the
 * `final_over` package's `application/game_command.dart` and
 * `application/gameplay_event.dart`.
 *
 * Flutter models commands as a sealed class hierarchy and events as a type tag
 * beside an untyped `Map<String, Object?>` payload. The commands become a
 * discriminated union unchanged; the events become one too, which is the same
 * information with the payload's shape actually checked — a renderer reading
 * `event.runs` off a `boundary` can no longer be handed a `wicket`.
 */

import type {
  BallResult,
  ContactOutcome,
  DeliverySpec,
  DismissalType,
  Elevation,
  ExtraType,
  MatchEndReason,
  ObjectiveType,
  ShotDirection,
} from "../types";

/* ---- Commands ------------------------------------------------------------ */

export type GameCommand =
  | { type: "start" }
  | { type: "selectElevation"; elevation: Elevation }
  | { type: "selectDirection"; direction: ShotDirection }
  /**
   * The commit point. A tap or swipe chooses direction and elevation at
   * release; `charge` is the backlift, which the shipped app never sends.
   */
  | {
      type: "swing";
      direction: ShotDirection;
      elevation?: Elevation | null;
      charge?: number | null;
    }
  | { type: "activatePowerShot" }
  | { type: "startRun" }
  | { type: "holdBall" }
  | { type: "turnBack" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart"; seed?: number | null; target?: number | null }
  | { type: "appBackgrounded" }
  | { type: "quitToHome" };

/* ---- Events -------------------------------------------------------------- */

/** Every event carries the simulation clock reading at the moment it fired. */
type Beat = { simulationMicros: number };

export type GameplayEvent =
  | (Beat & {
      type: "matchStarted";
      seed: number;
      target: number;
      objective: ObjectiveType;
      bowler: string;
    })
  | (Beat & { type: "deliveryPrepared"; delivery: DeliverySpec })
  | (Beat & { type: "ballReleased"; delivery: DeliverySpec | null })
  | (Beat & {
      type: "swingAccepted";
      direction: ShotDirection;
      powerShot: boolean;
    })
  | (Beat & { type: "powerShotActivated" })
  | (Beat & { type: "extraAwarded"; extra: ExtraType; runs: number })
  | (Beat & { type: "contactResolved"; outcome: ContactOutcome })
  | (Beat & {
      type: "cameraTransitionStarted";
      primaryFielder: number | null;
      backupFielder: number | null;
    })
  | (Beat & { type: "runStarted"; run: number })
  | (Beat & { type: "runCompleted"; run: number })
  | (Beat & { type: "runnerTurnedBack"; run: number })
  | (Beat & { type: "catchTaken"; fielderId: number; isProtected: boolean })
  | (Beat & { type: "catchDropped"; fielderId: number })
  | (Beat & { type: "ballPickedUp"; fielderId: number })
  | (Beat & { type: "throwStarted"; fielderId: number; arrivalMicros: number })
  | (Beat & { type: "runOut"; run: number })
  | (Beat & { type: "boundary"; runs: number })
  | (Beat & { type: "wicket"; dismissal: DismissalType })
  | (Beat & { type: "deliveryCompleted"; result: BallResult })
  | (Beat & {
      type: "overComplete";
      over: number;
      nextOver: number;
      bowler: string | null;
      bowlerId: string | null;
      lookKey: string | null;
      jerseyNumber: number | null;
    })
  | (Beat & {
      type: "fieldLayoutChanged";
      id: string;
      label: string;
      deliveryOrdinal: number;
    })
  | (Beat & { type: "paused" })
  | (Beat & { type: "resumed" })
  | (Beat & {
      type: "matchEnded";
      won: boolean;
      reason: MatchEndReason | null;
      stars: number;
    })
  | (Beat & { type: "quitToHome" });

export type GameplayEventType = GameplayEvent["type"];

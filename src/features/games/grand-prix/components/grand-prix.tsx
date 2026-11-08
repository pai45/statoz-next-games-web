"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { activeLoadout, useDecks } from "@/features/cards-decks";
import { equipCosmetic, settleCoinReward, useEconomy } from "@/features/economy";
import { racingPlayerCards } from "@/features/packs";
import { levelFromXp } from "@/domain/progression";

import { sportForGame, type GameEntry } from "@/mocks/games";
import type { GameId } from "../../types";
import { GameLandingAd } from "../../shared/components/game-landing-ad";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import { raceColumnMaxPx, resultDelayMs } from "../constants";
import { fieldSize, startPositionMin, startPositionSpan } from "../tuning";
import { grandPrixCircuit } from "../data/circuits";
import { ensureEquippedLiveryOwned } from "../data/liveries";
import { drawRaceSeed } from "../engine/random";
import type { PlayerRaceOutcome, RaceSetup } from "../engine/field";
import {
  isPersonalBest,
  readGrandPrixStats,
  recordGrandPrixRace,
  saveCircuit,
  saveLaps,
  useGrandPrixStats,
  useIsHydrated,
  type GrandPrixStats,
} from "../state/grand-prix-progress";
import { useStartSequence } from "../state/use-start-sequence";
import {
  useGrandPrixRace,
  useOvertakes,
  useRaceControls,
  useRaceFinish,
  useRaceView,
} from "../state/use-race-engine";
import {
  calculateGrandPrixXp,
  grandPrixLiveryFromName,
  grandPrixVerdict,
  type GrandPrixLivery,
  type GrandPrixResult,
  type OvertakeEvent,
} from "../types";

import { GrandPrixArena } from "./grand-prix-arena";
import { GrandPrixControls } from "./grand-prix-controls";
import { GrandPrixHud } from "./grand-prix-hud";
import { GrandPrixLobby } from "./grand-prix-lobby";
import { GrandPrixResultOverlay } from "./grand-prix-result";
import {
  LapFlash,
  LaunchFlash,
  LightsRig,
  OvertakeToast,
  StuckWarning,
} from "./race-overlays";

/**
 * Grand Prix Dash — a twenty-car, one-to-five-lap top-down arcade race.
 *
 * The orchestrator owns the lobby/session swap and nothing else. A rematch is a
 * new `key` rather than a reset, so the field, the canvas and every timer come
 * up fresh without a single state-resetting effect — and, because the seed is
 * drawn in the session's own lazy initialiser, a rematch is a genuinely
 * different race rather than the same one again.
 */

export type GrandPrixProps = {
  game: GameId;
  entry: GameEntry;
};

export function GrandPrix({ game }: GrandPrixProps) {
  const [view, setView] = useState<"lobby" | "racing">("lobby");
  const [session, setSession] = useState(0);
  const stats = useGrandPrixStats();
  const hydrated = useIsHydrated();
  const economy = useEconomy();
  const decks = useDecks();
  const sport = sportForGame(game);
  const goBack = useGameReturn();

  const ownedLiveryIds = useMemo(
    () => economy?.owned.liveryIds ?? ["gridLine"],
    [economy],
  );

  /**
   * The livery is a Shop cosmetic, so the equipped one is the economy's — with
   * the same guard Flutter's `ensureEquippedLiveryOwned` applies, in case an
   * equipped livery is no longer owned.
   */
  const livery = ensureEquippedLiveryOwned(
    ownedLiveryIds,
    grandPrixLiveryFromName(economy?.equipped.liveryId),
  );

  const driverId = activeLoadout(decks, "motorsport")?.driverId ?? null;
  const driver = useMemo(
    () =>
      driverId === null
        ? null
        : (racingPlayerCards.find((card) => card.id === driverId) ?? null),
    [driverId],
  );

  const race = useCallback(() => {
    setSession((value) => value + 1);
    setView("racing");
  }, [setSession, setView]);

  const selectLivery = useCallback(
    (next: GrandPrixLivery) => {
      equipCosmetic("livery", next);
    },
    [],
  );

  if (view !== "racing" || driver === null) {
    return (
      <>
        <GrandPrixLobby
          stats={stats}
          livery={livery}
          ownedLiveryIds={ownedLiveryIds}
          driverReady={driver !== null && hydrated}
          driverName={driver?.name ?? null}
          onBack={goBack}
          loadoutHref={`/decks/${sport}?returnTo=/play/grand-prix-dash`}
          onSelectCircuit={saveCircuit}
          onSelectLaps={saveLaps}
          onSelectLivery={selectLivery}
          onStart={race}
        />
        <GameLandingAd />
      </>
    );
  }

  return (
    <GrandPrixSession
      key={session}
      stats={stats}
      livery={livery}
      onRaceAgain={race}
      onExit={() => setView("lobby")}
    />
  );
}

/* ---- One race --------------------------------------------------------------- */

type SessionProps = {
  stats: GrandPrixStats;
  livery: GrandPrixLivery;
  onRaceAgain: () => void;
  onExit: () => void;
};

function GrandPrixSession({ stats, livery, onRaceAgain, onExit }: SessionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rewardId = `grand-prix-${useId()}`;

  /**
   * The whole race, fixed in one draw, in the browser. A grid rolled during a
   * server render would differ from the client's and every car with it.
   */
  const [setup] = useState<RaceSetup>(() => ({
    circuit: grandPrixCircuit(stats.lastCircuit),
    playerLivery: livery,
    playerLevel: levelFromXp(stats.xp),
    startPosition: startPositionMin + Math.floor(Math.random() * startPositionSpan),
    seed: drawRaceSeed(),
    laps: stats.lastLaps,
  }));

  const race = useGrandPrixRace(setup, reducedMotion);
  const raceView = useRaceView(race);
  const input = useRaceControls(race);
  const lights = useStartSequence(reducedMotion);

  const [overtake, setOvertake] = useState<OvertakeEvent | null>(null);
  const [overtakeSerial, setOvertakeSerial] = useState(0);
  const [result, setResult] = useState<GrandPrixResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [trackXp, setTrackXp] = useState(stats.xp);
  const settled = useRef(false);

  /* ---- Lights out ------------------------------------------------------- */

  useEffect(() => {
    if (lights.grade === null) return;
    race.start(lights.grade);
  }, [lights.grade, race]);

  /* ---- Beats ------------------------------------------------------------- */

  useOvertakes(
    race,
    useCallback(
      (event: OvertakeEvent) => {
        setOvertake(event);
        setOvertakeSerial((serial) => serial + 1);
      },
      [setOvertake, setOvertakeSerial],
    ),
  );

  useRaceFinish(
    race,
    useCallback(
      (outcome: PlayerRaceOutcome) => {
        // Settled the instant the flag falls, and guarded, so a re-render
        // cannot pay the same race out twice.
        if (settled.current) return;
        settled.current = true;

        const current = readGrandPrixStats();
        const circuitId = setup.circuit.id;
        // A retirement sets no lap, so it can never be a personal best.
        const personalBest =
          !outcome.dnf &&
          isPersonalBest(current, circuitId, outcome.lapTimeMs, setup.laps);
        const xp = calculateGrandPrixXp(outcome.position, {
          personalBest,
          laps: setup.laps,
        });

        recordGrandPrixRace({
          position: outcome.position,
          lapTimeMs: outcome.lapTimeMs,
          circuit: circuitId,
          laps: setup.laps,
          xp,
        });
        setTrackXp(current.xp + xp);

        settleCoinReward({
          id: rewardId,
          coins: outcome.position === 1 ? 50 : 10,
          title: "GRAND PRIX DASH",
          subtitle: outcome.dnf ? "DNF" : `P${outcome.position}`,
        });

        setResult({
          position: outcome.position,
          fieldSize,
          startPosition: setup.startPosition,
          lapTimeMs: outcome.lapTimeMs,
          personalBest,
          launchGrade: lights.grade ?? "slow",
          circuit: circuitId,
          xp,
          laps: setup.laps,
          bestOvertakeName: outcome.bestOvertakeName,
          retired: outcome.dnf,
        });
      },
      [lights.grade, rewardId, setResult, setTrackXp, setup],
    ),
  );

  /* The car holds on screen for a beat after the flag before the result rises. */
  useEffect(() => {
    if (result === null) return;
    const timer = window.setTimeout(() => setShowResult(true), resultDelayMs);
    return () => window.clearTimeout(timer);
  }, [result, setShowResult]);

  /* ---- Keyboard ---------------------------------------------------------- */

  /**
   * The app has no keyboard at all — it is a phone game — so this is an
   * addition rather than a port. The mapping is the one a racing game on a
   * desktop already implies, and it drives the same held inputs the pads do, so
   * a plate lights whether the key or the thumb is holding it.
   */
  useEffect(() => {
    const keys: Record<string, "left" | "right" | "throttle" | "brake"> = {
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      ArrowUp: "throttle",
      KeyW: "throttle",
      Space: "throttle",
      ArrowDown: "brake",
      KeyS: "brake",
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") return;
      const action = keys[event.code];
      if (action === undefined || event.repeat) return;
      event.preventDefault();
      race.setInput({ [action]: true });
      if (action === "throttle") lights.registerThrottle();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const action = keys[event.code];
      if (action === undefined) return;
      event.preventDefault();
      race.setInput({ [action]: false });
    };

    // A tab left mid-corner must not come back with the wheel still turned.
    const onBlur = () => race.releaseAll();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [race, lights]);

  /**
   * Leaving mid-race discards the attempt — no record, no reward — exactly as
   * the app does when the route is popped. Once the result is up there is
   * nothing left to lose, so the way out is just the way out.
   */
  const leave = useCallback(() => {
    race.stop();
    onExit();
  }, [race, onExit]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.code === "Escape") leave();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [leave]);

  return (
    /**
     * On a phone this is Flutter's layout exactly: the road is the viewport,
     * the HUD gradient sits over the top of it and the pads dock to the bottom.
     * On a wide screen the road stays a portrait column rather than stretching
     * — a top-down scroller given more width only shows more grass — and the
     * pit-lane wash fills the rest of the viewport behind it.
     */
    <div
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 70% at 50% 0%, color-mix(in srgb, var(--ds-color-accent-racing) 7%, transparent) 0%, transparent 60%), var(--ds-color-background-primary)",
      }}
    >
      <div
        className="relative mx-auto flex min-h-dvh w-full flex-col"
        style={{ maxWidth: raceColumnMaxPx }}
      >
        <div className="absolute inset-0">
          <GrandPrixArena race={race} active={!showResult} />
        </div>

        {/* The overlays share the whole column, as they share Flutter's Stack. */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <LightsRig
            phase={lights.phase}
            lightsOn={lights.lightsOn}
            lightsOut={lights.lightsOut}
          />
          <LaunchFlash grade={lights.grade} />
          <LapFlash lap={raceView.currentLap} laps={setup.laps} />
          <StuckWarning seconds={raceView.stuckSeconds} />
          <OvertakeToast overtake={overtake} serial={overtakeSerial} />
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col">
          <GrandPrixHud view={raceView} laps={setup.laps} onExit={leave} />
          <div className="flex-1" />
          <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <GrandPrixControls
              view={raceView}
              input={input}
              onThrottlePressed={lights.registerThrottle}
            />
          </div>
        </div>
      </div>

      {showResult && result !== null ? (
        <GrandPrixResultOverlay
          result={result}
          trackXp={trackXp}
          animate={!reducedMotion}
          onExit={onExit}
          onRaceAgain={onRaceAgain}
        />
      ) : null}
    </div>
  );
}

/** Exported for the profile, which names the verdict a race reached. */
export { grandPrixVerdict };

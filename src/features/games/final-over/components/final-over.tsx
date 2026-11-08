"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { accentVar, feedbackVar } from "@statoz/design-system/games";
import { activeLoadout, useDecks } from "@/features/cards-decks";
import { settleCoinReward, useEconomy } from "@/features/economy";
import { cricketBattingCards } from "@/features/packs";
import type { PlayerCard } from "@/domain/cards";

import { levelFromXp } from "@/domain/progression";

import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../../types";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import {
  GameMatchGate,
  matchmakingFighter,
  useMatchmakingPlayer,
} from "../../shared/components/matchmaking";
import { randomOpponentName } from "../../shared/data/opponent-names";
import { resultDelayMs, stingMajorMs, stingMinorMs } from "../constants";
import { kitById, opponentKit as opponentKitFor } from "../data/kits";
import type { GameplayEvent } from "../engine/commands";
import { visualSeed } from "../engine/random";
import {
  readFinalOverStats,
  recordFinalOver,
  saveLobbySelection,
  useFinalOverStats,
  useIsHydrated,
} from "../state/final-over-progress";
import {
  useHudSnapshot,
  useMatchCommands,
  useMatchController,
  useMatchEvents,
} from "../state/use-match-engine";
import { tierTargets, tierTuning, type FinalOverTier } from "../tuning";
import type { MatchState } from "../types";

import { FinalOverArena } from "./final-over-arena";
import { FinalOverControls } from "./final-over-controls";
import {
  FinalOverHud,
  OverdriveRail,
  StingLayer,
  type Sting,
} from "./final-over-hud";
import { FinalOverLobby } from "./final-over-lobby";
import { BowlerReveal, PauseOverlay, QuitDialog } from "./final-over-overlays";
import { FinalOverResult } from "./result-cinematic";
import type { EffectKind } from "./renderer/effects";
import { SwingSurface, type SwingGesture } from "./swing-surface";

/**
 * Final Over — a three-over, eighteen-ball run chase.
 *
 * The orchestrator owns the lobby/session swap and nothing else. A rematch is a
 * new `key` rather than a reset, so the engine, the canvas and every timer come
 * up fresh without a single state-resetting effect.
 */

export type FinalOverProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The five batters the cricket starter pack dealt. They are cosmetic identity
 * only — Final Over grades your timing, not your squad's ratings — so a partial
 * pack still fields a side as long as it dealt anyone at all.
 */
function squadFromClaim(
  playerCardIds: string[] | undefined,
): PlayerCard[] | null {
  if (playerCardIds === undefined || playerCardIds.length === 0) return null;
  const owned = playerCardIds
    .map((id) => cricketBattingCards.find((card) => card.id === id))
    .filter((card): card is PlayerCard => card !== undefined);
  return owned.length > 0 ? owned : null;
}

export function FinalOver({ game: _game }: FinalOverProps) {
  void _game;
  const [view, setView] = useState<"lobby" | "matchmaking" | "playing">("lobby");
  const [session, setSession] = useState(0);
  /** The rival the queue lands on. Drawn on the press, never on the server. */
  const [rival, setRival] = useState("");
  const decks = useDecks();
  const economy = useEconomy();
  const hydrated = useIsHydrated();
  const stats = useFinalOverStats();
  const goBack = useGameReturn();
  const level = levelFromXp(stats.xp);
  const player = useMatchmakingPlayer(`LV ${level}`);

  const selectedKitId = economy.owned.kitIds.includes(economy.equipped.kitId)
    ? economy.equipped.kitId
    : "voltage";
  const cricketLoadout = activeLoadout(decks, "cricket");
  const squad = useMemo(
    () => squadFromClaim(cricketLoadout?.batterIds),
    [cricketLoadout],
  );

  const play = useCallback(() => {
    setRival(randomOpponentName());
    setSession((value) => value + 1);
    setView("matchmaking");
  }, []);

  if (view === "lobby" || squad === null) {
    return (
      <FinalOverLobby
        stats={stats}
        tier={stats.tier}
        squadReady={squad !== null && hydrated}
        onBack={goBack}
        onTierChange={(tier) => saveLobbySelection(tier, selectedKitId)}
        onPlay={play}
      />
    );
  }

  if (view === "matchmaking") {
    return (
      <GameMatchGate
        goLabel="PLAY!"
        config={{
          title: "FINAL OVER",
          queueLabel: "SCANNING GLOBAL CRICKET QUEUE",
          player,
          opponent: matchmakingFighter(rival, `LV ${level}`),
        }}
        onReady={() => setView("playing")}
        onCancel={() => setView("lobby")}
      />
    );
  }

  return (
    <FinalOverSession
      key={session}
      squad={squad}
      tier={stats.tier}
      kitId={selectedKitId}
      hintsSeen={stats.hintsSeen}
      onPlayAgain={play}
      onExit={() => setView("lobby")}
    />
  );
}

/* ---- One chase ------------------------------------------------------------ */

type SessionProps = {
  squad: PlayerCard[];
  tier: FinalOverTier;
  kitId: string;
  hintsSeen: boolean;
  onPlayAgain: () => void;
  onExit: () => void;
};

type EffectState = { kind: EffectKind; startedAt: number; seed: number };

function FinalOverSession({
  squad,
  tier,
  kitId,
  hintsSeen,
  onPlayAgain,
  onExit,
}: SessionProps) {
  const tuning = tierTuning[tier];
  const rewardId = `final-over-${useId()}`;

  // Drawn once, in the browser, when the session mounts — never during a server
  // render, where the roll would differ from the client's. The tier chooses
  // which rungs of the approved ladder the target may come from.
  const [{ seed, target }] = useState(() => {
    const rungs = tierTargets[tier];
    return {
      seed: Math.floor(Math.random() * 2 ** 31),
      target: rungs[Math.floor(Math.random() * rungs.length)],
    };
  });

  const controller = useMatchController(tuning, seed, target);
  const hud = useHudSnapshot(controller, tuning);
  const commands = useMatchCommands(controller);

  const kit = useMemo(() => kitById(kitId), [kitId]);
  const opponentKit = useMemo(() => opponentKitFor(kitId), [kitId]);

  /* Visual state that must not cost a render per frame. */
  const secondsRef = useRef(0);
  const [sting, setSting] = useState<Sting | null>(null);
  const stingClearAt = useRef(-1);
  const [effect, setEffect] = useState<EffectState>({
    kind: null,
    startedAt: -10,
    seed: 0,
  });

  // The hold is only ever set by an input handler, and it stops meaning
  // anything the moment the swing window shuts — so that is derived below
  // rather than cleared by an effect chasing the phase.
  const [held, setHeld] = useState<{ atMicros: number } | null>(null);
  const [deckTop, setDeckTop] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const [reveal, setReveal] = useState<{ over: number; bowler: string } | null>(
    null,
  );
  const [resultShown, setResultShown] = useState(false);
  const [award, setAward] = useState({ xp: 0 });

  const deckRef = useRef<HTMLDivElement | null>(null);
  const recorded = useRef(false);
  const [tally, setTally] = useState({ sixes: 0, fours: 0, bestCombo: 1 });

  /* The match starts once the canvas is up — Flutter's intro overlay does the
   * same thing when its countdown reaches zero. */
  useEffect(() => {
    commands.start();
  }, [commands]);

  /* ---- Events --------------------------------------------------------- */

  const showSting = useCallback((next: Sting) => {
    setSting(next);
    stingClearAt.current =
      secondsRef.current + (next.major ? stingMajorMs : stingMinorMs) / 1000;
  }, []);

  const onEvent = useCallback(
    (event: GameplayEvent) => {
      const state = controller.getState();
      const seedForEffect = visualSeed(
        state.currentDelivery?.seed ?? BigInt(0),
      );

      const markEffect = (kind: EffectKind) =>
        setEffect({ kind, startedAt: secondsRef.current, seed: seedForEffect });

      switch (event.type) {
        case "contactResolved":
          markEffect("contactResolved");
          if (event.outcome.timing === "perfect") {
            showSting({
              label: "PERFECT",
              color: accentVar("lime"),
              major: false,
            });
          }
          return;

        case "boundary": {
          markEffect("boundary");
          const six = event.runs === 6;
          setTally((current) =>
            six
              ? { ...current, sixes: current.sixes + 1 }
              : { ...current, fours: current.fours + 1 },
          );
          showSting({
            label: six ? "SIX" : "FOUR",
            color: six ? accentVar("gold") : accentVar("cyan"),
            major: true,
          });
          return;
        }

        case "wicket":
          markEffect("wicket");
          showSting({
            label: "OUT",
            color: feedbackVar("danger"),
            major: true,
          });
          return;

        case "runOut":
          markEffect("runOut");
          showSting({
            label: "RUN OUT",
            color: feedbackVar("danger"),
            major: true,
          });
          return;

        case "catchTaken":
          markEffect("catchTaken");
          return;

        case "catchDropped":
          markEffect("catchDropped");
          showSting({
            label: "DROPPED",
            color: accentVar("lime"),
            major: false,
          });
          return;

        case "runCompleted":
          markEffect("runCompleted");
          return;

        case "powerShotActivated":
          showSting({
            label: "POWER SHOT",
            color: accentVar("violet"),
            major: true,
          });
          return;

        case "extraAwarded":
          showSting({
            label: event.extra === "noBall" ? "NO BALL · FREE HIT" : "WIDE",
            color: accentVar("orange"),
            major: false,
          });
          return;

        case "fieldLayoutChanged":
          showSting({
            label: `FIELD SHIFT · ${event.label}`,
            color: accentVar("cyan"),
            major: false,
          });
          return;

        case "deliveryCompleted": {
          const combo = controller.getState().combo;
          setTally((current) => ({
            ...current,
            bestCombo: Math.max(current.bestCombo, combo),
          }));
          return;
        }

        case "overComplete":
          setReveal({ over: event.nextOver, bowler: event.bowler ?? "VOLT" });
          return;

        default:
          return;
      }
    },
    [controller, showSting],
  );

  useMatchEvents(controller, onEvent);

  /* ---- Frame bookkeeping ------------------------------------------------ */

  const onFrame = useCallback((seconds: number) => {
    secondsRef.current = seconds;
    if (stingClearAt.current > 0 && seconds >= stingClearAt.current) {
      stingClearAt.current = -1;
      setSting(null);
    }
  }, []);

  /* The deck's height decides where the pitch may end, so it never sits under
   * the controls — Flutter measures the same thing with `_MeasureSize`. */
  useEffect(() => {
    const deck = deckRef.current;
    if (deck === null) return;
    let frame = 0;
    const measure = () => {
      const parent = deck.parentElement;
      if (parent === null) return;
      const next = parent.clientHeight - deck.offsetHeight;
      // Off the observer's own callback: its first delivery lands inside the
      // effect that started it, and setting state there cascades.
      frame = window.requestAnimationFrame(() => setDeckTop(next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(deck);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  /* ---- Settling --------------------------------------------------------- */

  // XP is applied the instant the result is decided, before the cinematic —
  // the same beat Flutter dispatches `FinalOverFinished` on, and guarded the
  // same way so a re-render cannot pay out twice.
  useEffect(() => {
    if (!hud.over || recorded.current) return;
    recorded.current = true;

    const state: MatchState = controller.getState();
    const ballsToSpare = hud.won
      ? Math.min(
          Math.max(state.maximumLegalBalls - state.legalBalls, 0),
          state.maximumLegalBalls,
        )
      : 0;

    const gained = recordFinalOver({
      won: hud.won,
      runs: state.committedScore,
      wickets: state.wickets,
      stars: state.stars,
      objectiveCompleted: state.objectiveCompleted,
      ballsToSpare,
      tier,
      sixes: tally.sixes,
      fours: tally.fours,
      bestCombo: tally.bestCombo,
    });
    settleCoinReward({ id: rewardId, coins: hud.won ? 50 : 10, title: "FINAL OVER", subtitle: hud.won ? "WIN" : "LOSS" });
    setAward({ xp: gained });

    const timer = window.setTimeout(() => setResultShown(true), resultDelayMs);
    return () => window.clearTimeout(timer);
  }, [hud.over, hud.won, controller, tier, tally, rewardId]);

  /* ---- Input ------------------------------------------------------------ */

  const beginSwing = useCallback(() => {
    const state = controller.getState();
    if (state.phase !== "incomingBall" || state.swingIntent !== null) return;
    setHeld({ atMicros: state.simulationMicros });
  }, [controller]);

  const releaseSwing = useCallback(
    (gesture: SwingGesture) => {
      setHeld(null);
      commands.swing(gesture.direction, gesture.elevation);
    },
    [commands],
  );

  const cancelSwing = useCallback(() => setHeld(null), []);

  // A hold outside the swing window is not a hold, so it can never leak into
  // the next delivery even before the state catches up.
  const swingHeld = held !== null && hud.canSwing;

  const pause = useCallback(() => {
    if (hud.over) return;
    cancelSwing();
    commands.pause();
    setPaused(true);
  }, [commands, cancelSwing, hud.over]);

  const resume = useCallback(() => {
    setPaused(false);
    commands.resume();
  }, [commands]);

  const requestExit = useCallback(() => {
    if (hud.over) {
      onExit();
      return;
    }
    pause();
    setQuitting(true);
  }, [hud.over, onExit, pause]);

  const state = controller.getState();
  const swingCommitted = state.swingIntent !== null;

  return (
    /**
     * On a phone the play column is the whole viewport. Wider than that, it
     * caps and centres rather than stretching: a pitch drawn 1440px wide is a
     * different game, not a bigger one. The route layout's gradient fills what
     * is left, so the arena reads as a screen inside a stadium.
     */
    <div className="relative flex min-h-dvh flex-col items-center">
      <div className="relative flex min-h-dvh w-full max-w-140 flex-col overflow-hidden">
        {/* The pitch. Everything else sits over it. */}
        <div className="absolute inset-0">
          <FinalOverArena
            controller={controller}
            kit={kit}
            opponentKit={opponentKit}
            strikerActorId={squad[0]?.id ?? "fo-striker"}
            partnerActorId={squad[1]?.id ?? squad[0]?.id ?? "fo-partner"}
            controlDeckTop={deckTop}
            swingHeld={swingHeld}
            swingHeldAtMicros={held?.atMicros ?? null}
            effect={effect}
            onFrame={onFrame}
          />
        </div>

        <SwingSurface
          live={hud.canSwing && !paused && !quitting}
          onBeginSwing={beginSwing}
          onReleaseSwing={releaseSwing}
          onCancelSwing={cancelSwing}
          onRun={commands.startRun}
          onHold={commands.holdBall}
          onPause={pause}
          canRun={hud.canRun}
        />

        <div className="relative z-10 flex min-h-dvh flex-col">
          <FinalOverHud hud={hud} onExit={requestExit} />

          <StingLayer sting={sting} />

          <div className="flex-1" />

          <div ref={deckRef} className="w-full">
            <OverdriveRail hud={hud} onArm={commands.activatePowerShot} />
            <div className="h-1.5" />
            <FinalOverControls
              hud={hud}
              currentLine={state.currentDelivery?.line ?? null}
              currentLength={state.currentDelivery?.length ?? null}
              swingCommitted={swingCommitted}
              showHints={!hintsSeen}
              rookieAssist={tier === "rookie"}
              onRun={commands.startRun}
              onHold={commands.holdBall}
              onTurnBack={commands.turnBack}
            />
          </div>
        </div>

        {reveal !== null && !hud.over ? (
          <BowlerReveal
            overNumber={reveal.over}
            bowlerName={reveal.bowler}
            onDone={() => setReveal(null)}
          />
        ) : null}

        {paused && !quitting && !hud.over ? (
          <PauseOverlay onResume={resume} onQuit={() => setQuitting(true)} />
        ) : null}

        {quitting ? (
          <QuitDialog
            onCancel={() => {
              setQuitting(false);
              resume();
            }}
            onConfirm={onExit}
          />
        ) : null}

        {resultShown ? (
          <FinalOverResult
            won={hud.won}
            runs={state.committedScore}
            wickets={state.wickets}
            target={state.target}
            legalBalls={state.legalBalls}
            maximumLegalBalls={state.maximumLegalBalls}
            stars={state.stars}
            objectiveCompleted={state.objectiveCompleted}
            sixes={tally.sixes}
            fours={tally.fours}
            bestCombo={tally.bestCombo}
            history={state.history}
            xpGained={award.xp}
            stats={readFinalOverStats()}
            onPlayAgain={onPlayAgain}
            onExit={onExit}
          />
        ) : null}
      </div>

      {/* Desktop only: the pitch is a drag target, so say what the keys do. */}
      <p
        className="pointer-events-none absolute bottom-6 left-6 hidden font-bold leading-body text-muted lg:block"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-tight)",
        }}
      >
        DRAG THE PITCH TO PLACE THE SHOT
        <br />← → PLACE · ↑ LOFT · ↓ BEHIND · SPACE DRIVE
        <br />R RUN · H HOLD · ESC PAUSE
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { activeLoadout, useDecks } from "@/features/cards-decks";
import { settleCoinReward } from "@/features/economy";
import { tennisPlayerCards } from "@/features/packs";
import type { PlayerCard } from "@/domain/cards";
import { levelFromXp } from "@/domain/progression";

import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../../types";
import { GameLandingAd } from "../../shared/components/game-landing-ad";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import { playColumnMaxWidth, resultDelayMs } from "../constants";
import { tennisAthleteById } from "../data/athletes";
import type { MatchSnapshot } from "../engine/tennis-game";
import {
  clearResumeSnapshot,
  readTennisProgress,
  saveResumeSnapshot,
  saveTennisPairing,
  saveTennisSettings,
  settleTennisMatch,
  useIsHydrated,
  useTennisProgress,
} from "../state/tennis-progress";
import {
  useTennisCommands,
  useTennisEvents,
  useTennisGame,
  useTennisHud,
} from "../state/use-tennis-engine";
import type {
  TennisMatchConfig,
  TennisMatchSummary,
  TennisReward,
  TennisSettings,
} from "../types";

import { TennisArena } from "./tennis-arena";
import { KeyboardLegend, TennisControls } from "./tennis-controls";
import { TennisHud, TennisStatusRails, TennisStingLayer } from "./tennis-hud";
import { TennisLobby } from "./tennis-lobby";
import {
  GameMatchGate,
  matchmakingFighter,
} from "../../shared/components/matchmaking";
import {
  PauseOverlay,
  QuitDialog,
  ResultOverlay,
  SettingsOverlay,
} from "./tennis-overlays";

/**
 * Tennis Rally — a one-set arcade match against a seeded rival.
 *
 * This is the live Flutter flow and only that: `app.dart` routes to
 * `TennisRallyHub`, which offers quick match and nothing else. The richer hub
 * with tournaments, training and practice modes (`TennisRallyV2Hub`) is dead
 * code in the Flutter source, referenced by a test and by nothing that ships.
 *
 * The orchestrator owns the three screens and the handoffs between them. A
 * rematch is a new `key` rather than a reset, so the engine, the canvas and
 * every timer come up fresh without a single state-resetting effect — the same
 * shape Final Over uses.
 */

export type TennisRallyProps = {
  game: GameId;
  entry: GameEntry;
};

type View = "lobby" | "matchmaking" | "playing";

/** The athlete the tennis starter pack dealt — it deals exactly one. */
function athleteFromClaim(playerCardIds: string[] | undefined): PlayerCard | null {
  if (playerCardIds === undefined || playerCardIds.length === 0) return null;
  for (const id of playerCardIds) {
    const card = tennisPlayerCards.find((entry) => entry.id === id);
    if (card !== undefined) return card;
  }
  return null;
}

/** A uniform pick from the full roster, excluding whoever is playing. */
function rollOpponent(playerId: string): PlayerCard {
  const rivals = tennisPlayerCards.filter((card) => card.id !== playerId);
  return rivals[Math.floor(Math.random() * rivals.length)];
}

export function TennisRally({ game: _game }: TennisRallyProps) {
  void _game;
  const [view, setView] = useState<View>("lobby");
  const [session, setSession] = useState(0);
  const [config, setConfig] = useState<TennisMatchConfig | null>(null);
  const [resume, setResume] = useState<MatchSnapshot | null>(null);

  const decks = useDecks();
  const hydrated = useIsHydrated();
  const progress = useTennisProgress();
  const goBack = useGameReturn();
  const tennisLoadout = activeLoadout(decks, "tennis");

  const athlete = useMemo(
    () => athleteFromClaim(tennisLoadout?.playerId ? [tennisLoadout.playerId] : undefined),
    [tennisLoadout],
  );

  const canResume =
    progress.resume !== null && athlete !== null && progress.resume.config.playerId === athlete.id;

  /**
   * Start a fresh match: re-roll the rival, mint a match id and a seed, and go
   * through the queue. Flutter re-rolls on every entry too — there is no rival
   * picker, so the draw is the variety.
   */
  const play = useCallback(() => {
    if (athlete === null) return;
    const opponent = rollOpponent(athlete.id);
    saveTennisPairing(athlete.id, opponent.id);

    setConfig({
      matchId: `tennis-${Date.now()}-${Math.floor(Math.random() * 2 ** 20)}`,
      mode: "quickMatch",
      playerId: athlete.id,
      opponentId: opponent.id,
      // The difficulty picker lives in the dead V2 hub, so this is always the
      // profile default, exactly as the live Flutter lobby leaves it.
      difficulty: "pro",
      seed: Math.floor(Math.random() * 0x7fffffff),
      trainingLesson: null,
    });
    setResume(null);
    setSession((value) => value + 1);
    setView("matchmaking");
  }, [athlete]);

  /** Resume skips the queue and drops straight back onto the saved point. */
  const resumeMatch = useCallback(() => {
    const snapshot = readTennisProgress().resume;
    if (snapshot === null) return;
    setConfig(snapshot.config);
    setResume(snapshot);
    setSession((value) => value + 1);
    setView("playing");
  }, []);

  const backToLobby = useCallback(() => {
    setView("lobby");
    setConfig(null);
    setResume(null);
  }, []);

  if (view === "lobby" || config === null) {
    const masteryXp = athlete === null ? 0 : (progress.masteryXp[athlete.id] ?? 0);
    return (
      <>
        <TennisLobby
          playerName={athlete?.name ?? "—"}
          difficulty="pro"
          masteryXp={masteryXp}
          setsWon={progress.setsWon}
          winStreak={progress.currentWinStreak}
          canResume={canResume}
          ready={hydrated && athlete !== null}
          onBack={goBack}
          onPlay={canResume ? resumeMatch : play}
        />
        <GameLandingAd />
      </>
    );
  }

  /*
   * Tennis banks per-athlete mastery rather than match XP, so the level the
   * queue shows is what that mastery adds up to — the same number the profile's
   * tennis track reports.
   */
  const level = levelFromXp(
    Object.values(progress.masteryXp).reduce((sum, xp) => sum + xp, 0),
  );
  const opponentName =
    tennisPlayerCards.find((card) => card.id === config.opponentId)?.name ?? "RIVAL";
  const playerName =
    tennisPlayerCards.find((card) => card.id === config.playerId)?.name ?? "PLAYER";

  if (view === "matchmaking") {
    return (
      <GameMatchGate
        goLabel="PLAY!"
        config={{
          title: "TENNIS RALLY",
          queueLabel: "SCANNING GLOBAL TENNIS QUEUE",
          player: matchmakingFighter(playerName, `LV ${level}`),
          opponent: matchmakingFighter(opponentName, `LV ${level}`),
        }}
        onReady={() => setView("playing")}
        onCancel={backToLobby}
      />
    );
  }

  return (
    <TennisMatch
      key={session}
      config={config}
      resume={resume}
      settings={progress.settings}
      playerName={playerName}
      opponentName={opponentName}
      onPlayAgain={play}
      onExit={backToLobby}
    />
  );
}

/* ---- One match ------------------------------------------------------------ */

type MatchProps = {
  config: TennisMatchConfig;
  resume: MatchSnapshot | null;
  settings: TennisSettings;
  playerName: string;
  opponentName: string;
  onPlayAgain: () => void;
  onExit: () => void;
};

type Overlay = "none" | "paused" | "settings" | "quitting";

function TennisMatch({
  config,
  resume,
  settings,
  playerName,
  opponentName,
  onPlayAgain,
  onExit,
}: MatchProps) {
  const game = useTennisGame(config, settings, resume);
  const hud = useTennisHud(game);
  const commands = useTennisCommands(game);

  const [overlay, setOverlay] = useState<Overlay>("none");
  const [result, setResult] = useState<{
    summary: TennisMatchSummary;
    reward: TennisReward;
  } | null>(null);

  const settled = useRef(false);
  const abandoned = useRef(false);

  /* ---- Settling ------------------------------------------------------- */

  // Paid out the instant the set is decided, before the result screen appears,
  // and guarded so a re-render cannot pay twice.
  useTennisEvents(
    game,
    useCallback(
      (events) => {
        if (settled.current) return;
        if (!events.some((event) => event.type === "setEnded")) return;
        settled.current = true;

        game.setPaused(true);
        const summary = game.summary();
        const athlete = tennisAthleteById(summary.playerId);
        const reward = settleTennisMatch(
          summary,
          athlete.archetype,
          athlete.archetype === "serveAndVolley",
        );
        settleCoinReward({ id: `tennis:${summary.matchId}`, coins: reward.coins, title: "TENNIS RALLY", subtitle: summary.won ? "WIN" : "LOSS" });

        window.setTimeout(() => setResult({ summary, reward }), resultDelayMs);
      },
      [game],
    ),
  );

  /* ---- Saving the point ------------------------------------------------ */

  const save = useCallback(() => {
    if (settled.current || abandoned.current) return;
    saveResumeSnapshot(game.toSnapshot());
  }, [game]);

  // The web has no `didChangeAppLifecycleState`. `pagehide` is the closest
  // thing that actually fires on mobile — `beforeunload` does not, when a phone
  // browser is backgrounded and later discarded.
  useEffect(() => {
    const onHide = () => save();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      save();
    };
  }, [save]);

  // Backgrounding the tab pauses, as Flutter pauses on `inactive`. Without it a
  // rally runs on unseen while the phone is locked.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      if (settled.current || game.engine.complete) return;
      game.setPaused(true);
      saveResumeSnapshot(game.toSnapshot());
      setOverlay((current) => (current === "none" ? "paused" : current));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [game]);

  /* ---- Overlay control -------------------------------------------------- */

  const pause = useCallback(() => {
    if (settled.current || game.engine.complete) return;
    commands.pause();
    save();
    setOverlay((current) => (current === "none" ? "paused" : current));
  }, [commands, game, save]);

  const resumePlay = useCallback(() => {
    setOverlay("none");
    commands.resume();
  }, [commands]);

  const quit = useCallback(() => {
    abandoned.current = true;
    clearResumeSnapshot();
    onExit();
  }, [onExit]);

  const restart = useCallback(() => {
    abandoned.current = true;
    clearResumeSnapshot();
    onPlayAgain();
  }, [onPlayAgain]);

  const changeSettings = useCallback(
    (next: TennisSettings) => {
      saveTennisSettings(next);
      game.applySettings(next);
    },
    [game],
  );

  const live = overlay === "none" && result === null && !hud.over;

  return (
    /**
     * On a phone the play column is the whole viewport. Wider than that, it
     * caps and centres rather than stretching: Flutter constrains the match to
     * 520px and every fixed size in the renderer — an 18px net, a 3.4px ball —
     * is drawn for that range. A court painted 1400px wide is a different game,
     * not a bigger one.
     */
    <div className="relative flex min-h-dvh flex-col items-center">
      <div
        className="relative flex min-h-dvh w-full flex-col overflow-hidden"
        style={{ maxWidth: playColumnMaxWidth }}
      >
        <div className="absolute inset-0">
          <TennisArena game={game} active={result === null} />
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col">
          <TennisHud
            hud={hud}
            mode={config.mode}
            playerName={playerName.toUpperCase()}
            opponentName={opponentName.toUpperCase()}
            onPause={pause}
          />

          <div className="flex-1" />

          <div
            className="w-full"
            style={{ pointerEvents: live ? "auto" : "none" }}
            aria-hidden={!live}
          >
            <TennisStatusRails hud={hud} />
            <TennisControls
              commands={commands}
              settings={settings}
              live={live}
              onPause={pause}
            />
          </div>
        </div>

        <TennisStingLayer sting={hud.sting} />

        {overlay === "paused" ? (
          <PauseOverlay
            onResume={resumePlay}
            onSettings={() => setOverlay("settings")}
            onRestart={restart}
            onQuit={() => setOverlay("quitting")}
          />
        ) : null}

        {overlay === "settings" ? (
          <SettingsOverlay
            settings={settings}
            onChange={changeSettings}
            onBack={() => setOverlay("paused")}
          />
        ) : null}

        {overlay === "quitting" ? (
          <QuitDialog onCancel={() => setOverlay("paused")} onConfirm={quit} />
        ) : null}

        {result !== null ? (
          <ResultOverlay
            summary={result.summary}
            reward={result.reward}
            onPlayAgain={onPlayAgain}
            onExit={onExit}
          />
        ) : null}
      </div>

      <KeyboardLegend />
    </div>
  );
}

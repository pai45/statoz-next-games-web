"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { activeLoadout, useDecks } from "@/features/cards-decks";
import { settleCoinReward, useEconomy } from "@/features/economy";

import { levelFromXp } from "@/domain/progression";

import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../../types";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import {
  GameMatchGate,
  matchmakingFighter,
  useMatchmakingPlayer,
} from "../../shared/components/matchmaking";
import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import { randomOpponentName } from "../../shared/data/opponent-names";
import { resultDelayMs } from "../constants";
import { athleteById, basketballAthletes } from "../data/athletes";
import { freeLiveryId, rivalLiveryId } from "../data/liveries";
import { drawSeed } from "../engine/random";
import {
  markHintsSeen,
  readHoopDuelStats,
  recordHoopDuel,
  saveDifficulty,
  useHoopDuelStats,
  useIsHydrated,
  type HoopDuelStats,
} from "../state/hoop-duel-progress";
import {
  useHoopDuelControls,
  useHoopDuelEvents,
  useHoopDuelGame,
  useHoopDuelHud,
} from "../state/use-hoop-duel-engine";
import type {
  BasketballAthlete,
  BasketballMatchConfig,
  BasketballMatchSummary,
} from "../types";

import { HoopDuelArena } from "./hoop-duel-arena";
import { HoopDuelControls } from "./hoop-duel-controls";
import { HoopDuelHudBar, ShotMeter, StaminaRail, StingLayer } from "./hoop-duel-hud";
import { HoopDuelLobby } from "./hoop-duel-lobby";
import {
  HalftimeOverlay,
  OvertimeOverlay,
  QuitDialog,
} from "./hoop-duel-overlays";
import { HoopDuelResult } from "./hoop-duel-result";

/**
 * Hoop Duel — a two-half, street 1-on-1 arcade basketball duel.
 *
 * The orchestrator owns the lobby/session swap and nothing else. A rematch is a
 * new `key` rather than a reset, so the engine, the canvas and every timer come
 * up fresh without a single state-resetting effect.
 */

export type HoopDuelProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The three athletes the basketball starter pack dealt.
 *
 * Flutter builds this roster in a deck builder that enforces one guard, one
 * wing and one big; `rollBasketballStarterPack` deals exactly that, so the
 * claim *is* the deck. Their ratings matter here — unlike Final Over, this game
 * simulates the players — so a partial claim cannot field a side.
 */
function rosterFromClaim(playerCardIds: string[] | undefined): BasketballAthlete[] | null {
  if (playerCardIds === undefined || playerCardIds.length < 3) return null;
  const roster = playerCardIds
    .slice(0, 3)
    .map((id) => basketballAthletes.find((athlete) => athlete.id === id))
    .filter((athlete): athlete is BasketballAthlete => athlete !== undefined);
  return roster.length === 3 ? roster : null;
}

export function HoopDuel({ game: _game }: HoopDuelProps) {
  void _game;
  const [view, setView] = useState<"lobby" | "playing">("lobby");
  const [session, setSession] = useState(0);
  const decks = useDecks();
  const economy = useEconomy();
  const hydrated = useIsHydrated();
  const stats = useHoopDuelStats();
  const goBack = useGameReturn();

  const basketballLoadout = activeLoadout(decks, "basketball");
  const roster = useMemo(() => rosterFromClaim(basketballLoadout?.playerIds), [basketballLoadout]);

  const play = useCallback(() => {
    setSession((value) => value + 1);
    setView("playing");
  }, []);

  if (view !== "playing" || roster === null) {
    // The starter is the best player on the card, which is who you would put
    // out there — Flutter's deck builder asks the same question explicitly.
    const starter = roster === null ? null : bestOf(roster);
    return (
      <HoopDuelLobby
        stats={stats}
        squadReady={roster !== null && hydrated}
        starterName={starter?.name ?? null}
        onBack={goBack}
        onDifficultyChange={saveDifficulty}
        onPlay={play}
      />
    );
  }

  return (
    <HoopDuelSession
      key={session}
      roster={roster}
      stats={stats}
      onRematch={play}
      onExit={() => setView("lobby")}
      jerseyId={economy.owned.jerseyIds.includes(economy.equipped.jerseyId) ? economy.equipped.jerseyId : "statoz"}
    />
  );
}

function bestOf(roster: BasketballAthlete[]): BasketballAthlete {
  return roster.reduce((best, athlete) => (athlete.ovr > best.ovr ? athlete : best));
}

/* ---- One match ------------------------------------------------------------- */

type Phase = "intro" | "playing" | "halftime" | "overtimeBreak" | "finished" | "result";

type SessionProps = {
  roster: BasketballAthlete[];
  stats: HoopDuelStats;
  onRematch: () => void;
  onExit: () => void;
  jerseyId: string;
};

function HoopDuelSession({ roster, stats, onRematch, onExit, jerseyId }: SessionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rewardId = `hoop-duel-${useId()}`;
  const level = levelFromXp(stats.xp);
  const player = useMatchmakingPlayer(`LV ${level}`);

  /**
   * Drawn once, in the browser, when the session mounts — never during a server
   * render, where the roll would differ from the client's.
   */
  const [{ config, rivalName }] = useState(() => buildMatch(roster, stats, jerseyId));

  const game = useHoopDuelGame(config, reducedMotion);
  const hud = useHoopDuelHud(game);
  const input = useHoopDuelControls(game);

  const [phase, setPhase] = useState<Phase>("intro");
  const [quitting, setQuitting] = useState(false);
  const [summary, setSummary] = useState<BasketballMatchSummary | null>(null);
  const [award, setAward] = useState(0);
  const settled = useRef(false);

  /* ---- Engine beats ----------------------------------------------------- */

  useHoopDuelEvents(
    game,
    useCallback(
      (events) => {
        for (const event of events) {
          if (event.type === "halfEnded") {
            if (event.halfIndex === 0) {
              // One full half is all the hints were ever for.
              markHintsSeen();
              setPhase("halftime");
            } else if (event.needsOvertime) {
              setPhase("overtimeBreak");
            }
            continue;
          }

          if (event.type === "matchEnded") {
            // XP is credited the instant the match is decided, before the
            // cinematic — and guarded, so a re-render cannot pay out twice.
            if (settled.current) continue;
            settled.current = true;
            const finished = game.summary();
            setSummary(finished);
            setAward(recordHoopDuel(finished));
            settleCoinReward({ id: rewardId, coins: finished.playerScore > finished.cpuScore ? 50 : 10, title: "HOOP DUEL", subtitle: finished.playerScore > finished.cpuScore ? "WIN" : "LOSS" });
            setPhase("finished");
          }
        }
      },
      [game, rewardId],
    ),
  );

  /* The court holds for a beat after the buzzer before the result lands. */
  useEffect(() => {
    if (phase !== "finished") return;
    const timer = window.setTimeout(() => setPhase("result"), resultDelayMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  /* ---- Phase transitions -------------------------------------------------- */

  const beginPlay = useCallback(() => {
    setPhase("playing");
    game.startHalf(0);
  }, [game]);

  const resumeSecondHalf = useCallback(
    (rosterIndex: number) => {
      game.halftimeRest();
      if (rosterIndex !== game.engine.teams[0].activeIndex) {
        game.substitutePlayer(rosterIndex);
      }
      game.cpuAutoSubstitute();
      setPhase("playing");
      game.startHalf(1);
    },
    [game],
  );

  const beginOvertime = useCallback(() => {
    setPhase("playing");
    game.startHalf(2);
  }, [game]);

  /**
   * Leaving mid-match abandons the attempt — no record, no XP. Once the result
   * is up there is nothing left to lose, so the way out is just the way out.
   */
  const requestExit = useCallback(() => {
    if (phase === "result" || phase === "finished") {
      onExit();
      return;
    }
    game.setPaused(true);
    setQuitting(true);
  }, [phase, game, onExit]);

  const cancelExit = useCallback(() => {
    setQuitting(false);
    game.setPaused(false);
  }, [game]);

  const live = phase === "playing" && !quitting;

  return (
    /**
     * The court is the whole viewport. On a phone that is Flutter's layout
     * exactly; on a wide screen the canvas simply reveals more floor and the
     * pads separate to the edges, which is why the deck is a full-width row
     * rather than a centred column.
     */
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="absolute inset-0">
        <HoopDuelArena game={game} active={phase !== "intro"} />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <HoopDuelHudBar hud={hud} onExit={requestExit} />

        <StingLayer sting={hud.sting} />

        <div className="flex-1" />

        {/* The meter rides above the ACTION pad, where the thumb already is. */}
        <div className="pointer-events-none flex justify-end px-5 pb-2 sm:px-8 lg:px-14">
          <ShotMeter view={hud.meter} />
        </div>

        <StaminaRail stamina={hud.stamina} />
        <div className="h-1.5" />
        <div className="mx-auto w-full max-w-4xl lg:max-w-none lg:px-6">
          <HoopDuelControls
            input={input}
            cue={hud.actionCue}
            showHints={config.showHints}
            live={live}
          />
        </div>
      </div>

      {/*
        * The queue sits over the warm canvas rather than replacing it, so the
        * court is already drawn the moment the tip-off stamp clears.
        */}
      {phase === "intro" ? (
        <div className="absolute inset-0 z-50">
          <GameMatchGate
            goLabel="TIP OFF!"
            config={{
              title: "HOOP DUEL",
              queueLabel: "SCANNING GLOBAL HOOP QUEUE",
              player,
              opponent: matchmakingFighter(rivalName, `LV ${level}`),
            }}
            onReady={beginPlay}
            onCancel={onExit}
          />
        </div>
      ) : null}

      {phase === "halftime" ? (
        <HalftimeOverlay game={game} onResume={resumeSecondHalf} />
      ) : null}

      {phase === "overtimeBreak" ? <OvertimeOverlay onBegin={beginOvertime} /> : null}

      {quitting ? <QuitDialog onCancel={cancelExit} onConfirm={onExit} /> : null}

      {phase === "result" && summary !== null ? (
        <HoopDuelResult
          summary={summary}
          xp={award}
          stats={readHoopDuelStats()}
          onRematch={onRematch}
          onExit={onExit}
        />
      ) : null}
    </div>
  );
}

/**
 * Everything one match needs, drawn once.
 *
 * The CPU's three come from the whole 180-athlete roster rather than a curated
 * pool, so a rival can be anyone — which is what makes the matchmaking beat
 * worth watching.
 */
function buildMatch(
  roster: BasketballAthlete[],
  stats: HoopDuelStats,
  jerseyId = freeLiveryId,
): { config: BasketballMatchConfig; rivalName: string } {
  const pool = [...basketballAthletes];
  const cpuRoster: BasketballAthlete[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i += 1) {
    const [drawn] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    cpuRoster.push(drawn);
  }

  const starter = bestOf(roster);
  const config: BasketballMatchConfig = {
    playerRoster: roster.map((athlete) => athleteById(athlete.id)),
    playerStarterIndex: roster.findIndex((athlete) => athlete.id === starter.id),
    cpuRoster,
    cpuStarterIndex: Math.floor(Math.random() * cpuRoster.length),
    difficulty: stats.difficulty,
    seed: drawSeed(),
    showHints: !stats.hintsSeen,
    teamId: jerseyId,
    cpuTeamId: rivalLiveryId(jerseyId, Math.random()),
  };

  return { config, rivalName: randomOpponentName() };
}

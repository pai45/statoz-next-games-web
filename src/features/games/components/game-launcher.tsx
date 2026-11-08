"use client";

import { MobileGameViewport } from "../shared/mobile-viewport/mobile-game-viewport";
import { usesMobileLandscape } from "../shared/mobile-viewport/policy";

import { isGameEnabled } from "@/domain/demo-product";
import { GameAssetGate } from "@/features/device-assets";
import { BundledGame } from '../shared/components/bundled-game';
import { isBundledGame } from '../shared/bundled-game-config';
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { accentVar } from "@statoz/design-system/games";
import { AuthBoundary } from "@/features/auth";
import { activeLoadout, isLoadoutComplete, useDecks } from "@/features/cards-decks";
import {
  claimPack,
  rollStarterPackFor,
  StarterPackReveal,
  useIsHydrated,
  useIsPackClaimed,
} from "@/features/packs";
import type { Sport } from "@/domain/sports";

// Rally Dash: the rally remake of Grand Prix Dash. The game id stays "grand-prix-dash" for the host.
import { sportForGame, type GameEntry } from "@/mocks/games";
import type { GameId } from "../types";
import { GameLandingAdProvider } from "../shared/components/game-landing-ad";

import { GamePlaceholder } from "./game-placeholder";
import { GameVisitTracker } from "./game-visit-tracker";

export type GameLauncherProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The games that exist. Anything absent falls through to the placeholder, which
 * says so plainly rather than 404ing — every tile in the app leads somewhere.
 */
export function GameSurface({game,entry}:GameLauncherProps){return <BundledGame game={game} entry={entry}/>;}

/**
 * What happens when a player opens a game.
 *
 * A game that fields a deck hands over its sport's starter pack the first time
 * it is entered, and only then; everything else goes straight through. This is
 * Flutter's `_enter*GameFlow` — check the sport's flag, run the reveal, and
 * re-issue the launch once it clears — with the flag in browser storage rather
 * than a bloc.
 */
export function GameLauncher(props: GameLauncherProps) {
  return <GameAssetGate game={props.game} title={props.entry.title}><ReadyGameLauncher {...props} /></GameAssetGate>;
}

function ReadyGameLauncher(props: GameLauncherProps) {
  if (isGameEnabled(props.game) && usesMobileLandscape(props.game)) return <MobileGameViewport key={props.game} title={props.entry.title}><GameLauncherContent {...props} /></MobileGameViewport>;
  return <GameLauncherContent {...props} />;
}

function GameLauncherContent({ game, entry }: GameLauncherProps) {
  if (!isGameEnabled(game)) return <div role="status">This mode belongs to the other StatOz demo. <Link href="/">Return home</Link></div>;
  return (
    <AuthBoundary allowGuest
      intent="play"
      message={`Log in to play ${entry.title} and save your progress.`}
      returnTo={entry.href}
      fullScreen
    >
      <GameLandingAdProvider>
        <GameVisitTracker game={game} />
        <GuestReadyGameLauncher game={game} entry={entry} />
      </GameLandingAdProvider>
    </AuthBoundary>
  );
}

function GuestReadyGameLauncher(props: GameLauncherProps) {
  if (props.game === 'open-golf') return <GameSurface {...props} />;
  if (props.game === 'archery-test' || props.game === 'longbow' || props.game === 'holdover' || props.game === 'rim-rush') return <GameSurface {...props} />;
  return <DeckGameLauncher {...props} />;
}
function DeckGameLauncher({ game, entry }: GameLauncherProps) {
  const sport = sportForGame(game);
  const hydrated = useIsHydrated();
  const claimed = useIsPackClaimed(sport);
  const decks = useDecks();

  // Storage is not readable on the server, so the gate cannot be decided there.
  // Rendering the game first would flash it before the pack, so the prerendered
  // frame names the game and nothing else, and the decision lands on hydration.
  if (!hydrated) return <GameOpening entry={entry} />;

  if (entry.requiresDeck && !claimed) {
    return <StarterPackGate game={game} entry={entry} sport={sport} />;
  }

  // Pitch Duel and Football Chess field their own academy players when a deck is short.
  if (game !== "pitch-duel" && game !== "football-chess" && entry.requiresDeck && !isLoadoutComplete(activeLoadout(decks, sport))) {
    return <DeckRequired sport={sport} entry={entry} />;
  }

  return <GameSurface game={game} entry={entry} />;
}

function DeckRequired({ sport, entry }: { sport: Sport; entry: GameEntry }) {
  const accent = accentVar(entry.accent);
  return <div className="grid min-h-dvh place-items-center px-5 text-center"><div className="max-w-md border border-border bg-surface-raised p-6"><p className="font-display text-2xs font-black tracking-ultra text-muted">{"// LOADOUT REQUIRED"}</p><h1 className="mt-3 font-display text-2xl font-black" style={{ color: accent }}>{entry.title}</h1><p className="mt-3 text-xs leading-relaxed text-muted">Your active deck profile is incomplete or stale. Repair every required slot before entering the game.</p><Link href={`/decks/${sport}?returnTo=${encodeURIComponent(entry.href)}`} className="mt-6 grid h-12 place-items-center font-display text-xs font-black text-background" style={{ background: accent }}>OPEN LOADOUT EDITOR</Link></div></div>;
}

/**
 * Mounted only after hydration, so the roll happens exactly once and only in
 * the browser — a pack drawn during render would differ between the server and
 * the client and React would report the mismatch.
 */
function StarterPackGate({
  game,
  entry,
  sport,
}: GameLauncherProps & { sport: Sport }) {
  const [reveal] = useState(() => rollStarterPackFor(sport));
  const [opened, setOpened] = useState(false);

  if (opened) return <GameSurface game={game} entry={entry} />;

  return (
    <StarterPackReveal
      reveal={reveal}
      compactSummary={game === "pitch-duel" || game === "football-chess"}
      contextLabel={
        game === "pitch-duel"
          ? "PITCH DUEL / DEBUT XI"
          : game === "football-chess"
            ? "FOOTBALL CHESS / MATCH SQUAD"
            : undefined
      }
      onComplete={() => {
        claimPack(sport, reveal);
        setOpened(true);
      }}
    />
  );
}

/**
 * The frame before the gate is known, and the whole of the prerendered HTML.
 *
 * It carries the game's name so the page is never blank — for a crawler, for a
 * slow connection, and for the beat before hydration decides what comes next.
 */
function GameOpening({ entry }: { entry: GameEntry }) {
  const accent = accentVar(entry.accent);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1
        className="font-display font-black leading-tight"
        style={{
          color: accent,
          fontSize: "var(--ds-text-2xl)",
          letterSpacing: "var(--ds-tracking-display)",
        }}
      >
        {entry.title}
      </h1>
      <p
        className="mt-3 font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        OPENING...
      </p>
    </div>
  );
}

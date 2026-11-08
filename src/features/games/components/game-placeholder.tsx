import Link from "next/link";

import { accentVar, Button, withAlpha } from "@statoz/design-system/games";
import { sportModuleFor } from "@/domain/sports";

import { sportForGame, type GameEntry } from "@/mocks/games";
import type { GameId } from "../types";

import { GameScene } from "./game-scenes";
import { useGameReturn } from "../shared/hooks/use-game-return";

export type GamePlaceholderProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * What a game's route shows until the game itself exists.
 *
 * Every tile in the app used to lead to a 404. This says plainly that the game
 * is not built rather than pretending otherwise, and is the seam the real game
 * replaces.
 */
export function GamePlaceholder({ game, entry }: GamePlaceholderProps) {
  const leave = useGameReturn();
  const accent = accentVar(entry.accent);
  const sport = sportForGame(game);
  const label = sportModuleFor(sport).label;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25">
        <GameScene game={game} washed={false} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${withAlpha(accent, 0.12)} 0%, transparent 60%)`,
        }}
      />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <p
          className="font-display font-extrabold leading-compact"
          style={{
            color: withAlpha(accent, 0.7),
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-max)",
          }}
        >
          {label.toUpperCase()}
        </p>

        <h1
          className="mt-3 font-display font-black leading-tight"
          style={{
            color: accent,
            fontSize: "var(--ds-text-3xl)",
            letterSpacing: "var(--ds-tracking-display)",
          }}
        >
          {entry.title}
        </h1>

        <p
          className="mt-4 font-bold leading-body text-muted"
          style={{ fontSize: "var(--ds-text-sm)" }}
        >
          {entry.subtitle} — not built yet. Your cards are safe; this is where
          the game will open.
        </p>

        <div className="mt-8 w-full max-w-64">
          <Button
            onClick={leave}
            variant="tonal"
            accent={accent}
            size="lg"
            fullWidth
            label="Back to Games"
          >
            BACK TO GAMES
          </Button>
        </div>

        <Link
          href="/"
          className="mt-4 font-bold leading-compact text-muted underline-offset-4 hover:underline"
          style={{ fontSize: "var(--ds-text-2xs)" }}
        >
          Home
        </Link>
      </div>
    </div>
  );
}
